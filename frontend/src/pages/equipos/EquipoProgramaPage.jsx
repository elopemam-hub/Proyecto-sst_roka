import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CalendarClock, AlertTriangle, CheckCircle2, MinusCircle, Clock,
  ChevronLeft, ChevronRight, RefreshCw, Search, Info, Target,
} from 'lucide-react'
import api from '../../services/api'

// ─── Constantes de UI ───────────────────────────────────────────────────────

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const ESTADO_CFG = {
  completo:     { label: 'Al día',       color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  parcial:      { label: 'Parcial',      color: 'bg-amber-50 text-amber-700 border-amber-200',       icon: AlertTriangle },
  en_plazo:     { label: 'En plazo',     color: 'bg-blue-50 text-blue-700 border-blue-200',          icon: Clock },
  sin_ejecutar: { label: 'Sin ejecutar', color: 'bg-red-50 text-red-700 border-red-200',             icon: AlertTriangle },
  sin_periodo:  { label: 'Fuera de período', color: 'bg-gray-100 text-gray-500 border-gray-200',     icon: MinusCircle },
}

const FREC_CFG = {
  diaria:     { label: 'D',  title: 'Diaria',     color: 'bg-red-100 text-red-700 border-red-200' },
  semanal:    { label: 'S',  title: 'Semanal',    color: 'bg-orange-100 text-orange-700 border-orange-200' },
  mensual:    { label: 'M',  title: 'Mensual',    color: 'bg-blue-100 text-blue-700 border-blue-200' },
  trimestral: { label: 'T',  title: 'Trimestral', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  semestral:  { label: '6M', title: 'Semestral',  color: 'bg-purple-100 text-purple-700 border-purple-200' },
  anual:      { label: 'A',  title: 'Anual',      color: 'bg-gray-100 text-gray-600 border-gray-200' },
}

const pctColor = (v) =>
  v == null ? 'text-gray-300' : v >= 80 ? 'text-emerald-600' : v >= 50 ? 'text-amber-600' : 'text-red-600'

const barColor = (v) =>
  v == null ? 'bg-gray-200' : v >= 80 ? 'bg-emerald-500' : v >= 50 ? 'bg-amber-500' : 'bg-red-500'

const fmtFecha = (d) => {
  if (!d) return '—'
  const [a, m, dd] = String(d).slice(0, 10).split('-')
  return `${dd}/${m}/${a}`
}

// ─── Componente principal ───────────────────────────────────────────────────

export default function EquipoProgramaPage() {
  const navigate = useNavigate()
  const hoy      = new Date()

  // Período
  const [mes, setMes]   = useState(hoy.getMonth() + 1)
  const [anio, setAnio] = useState(hoy.getFullYear())

  // Datos
  const [resumen, setResumen] = useState(null)
  const [filas, setFilas]     = useState([])
  const [meta, setMeta]       = useState(null)
  const [loadingResumen, setLoadingResumen] = useState(true)
  const [loadingFilas, setLoadingFilas]     = useState(true)

  // Filtros
  const [filtroFrec, setFiltroFrec]     = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busqueda, setBusqueda]         = useState('')
  const [pagina, setPagina]             = useState(1)

  // ── Carga ──────────────────────────────────────────────────────────────────

  const cargarResumen = useCallback(async () => {
    setLoadingResumen(true)
    try {
      const { data } = await api.get('/programa-inspecciones/resumen', { params: { anio, mes } })
      setResumen(data)
    } catch { /* silent */ } finally { setLoadingResumen(false) }
  }, [anio, mes])

  const cargarFilas = useCallback(async () => {
    setLoadingFilas(true)
    try {
      const params = { anio, mes, page: pagina, per_page: 25 }
      if (filtroFrec)   params.frecuencia = filtroFrec
      if (filtroEstado) params.estado     = filtroEstado
      if (busqueda)     params.q          = busqueda
      const { data } = await api.get('/programa-inspecciones/detalle', { params })
      setFilas(data.data || [])
      setMeta({ current_page: data.current_page, last_page: data.last_page, total: data.total, from: data.from, to: data.to })
    } catch { /* silent */ } finally { setLoadingFilas(false) }
  }, [anio, mes, pagina, filtroFrec, filtroEstado, busqueda])

  useEffect(() => { cargarResumen() }, [cargarResumen])
  useEffect(() => { cargarFilas() }, [cargarFilas])
  useEffect(() => { setPagina(1) }, [anio, mes, filtroFrec, filtroEstado, busqueda])

  const cambiarMes = (d) => {
    let m = mes + d, a = anio
    if (m < 1)  { m = 12; a-- }
    if (m > 12) { m = 1;  a++ }
    setMes(m); setAnio(a)
  }

  const recargar = () => { cargarResumen(); cargarFilas() }

  const t = resumen?.totales
  const p = resumen?.periodo

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/equipos')}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarClock size={22} className="text-roka-500" />
              Programa de Inspecciones
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Planificado vs ejecutado, según la frecuencia configurada en cada equipo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Navegador de mes */}
          <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg px-1 py-1">
            <button onClick={() => cambiarMes(-1)} className="p-1 rounded hover:bg-gray-100" title="Mes anterior">
              <ChevronLeft size={16} className="text-gray-500" />
            </button>
            <span className="text-sm font-semibold text-gray-700 px-2 min-w-[130px] text-center">
              {MESES_ES[mes - 1]} {anio}
            </span>
            <button onClick={() => cambiarMes(1)} className="p-1 rounded hover:bg-gray-100" title="Mes siguiente">
              <ChevronRight size={16} className="text-gray-500" />
            </button>
          </div>
          <button onClick={recargar}
            className="p-2 border border-gray-300 text-gray-500 hover:bg-gray-50 rounded-lg" title="Recargar">
            <RefreshCw size={15} className={loadingResumen || loadingFilas ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Aviso de solo lectura */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <Info size={15} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-800 leading-relaxed">
          Esta vista es de <strong>solo lectura</strong>: se calcula en vivo cruzando la frecuencia de cada
          par equipo–plantilla contra las inspecciones realmente ejecutadas. No hay nada que generar ni cerrar
          a mano. Las inspecciones se ejecutan desde <strong>Mis equipos hoy</strong> y aparecen aquí solas.
          {p?.es_mes_actual && ' En el mes en curso solo se exige lo ya vencido: lo mensual o superior figura como “En plazo” hasta que cierre su ventana.'}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label={p?.es_mes_actual ? 'Esperadas a hoy' : 'Esperadas'} valor={t?.esperadas}
          icon={Target} color="text-gray-700" bg="bg-gray-100" loading={loadingResumen}
          nota={t && p?.es_mes_actual ? `${t.esperadas_periodo} en el mes completo` : null} />
        <KpiCard label="Ejecutadas" valor={t?.ejecutadas}
          icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" loading={loadingResumen} />
        <KpiCard label="Equipos al día" valor={t?.completos}
          icon={CheckCircle2} color="text-blue-600" bg="bg-blue-50" loading={loadingResumen}
          onClick={() => setFiltroEstado('completo')}
          nota={t?.en_plazo ? `${t.en_plazo} aún en plazo` : null} />
        <KpiCard label="Sin ejecutar" valor={t?.sin_ejecutar}
          icon={AlertTriangle} color="text-red-600" bg="bg-red-50" loading={loadingResumen}
          onClick={() => setFiltroEstado('sin_ejecutar')} />

        {/* Cumplimiento */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col justify-center">
          <p className="text-xs text-gray-500 mb-1">Cumplimiento del mes</p>
          {loadingResumen ? (
            <div className="w-16 h-6 bg-gray-100 animate-pulse rounded" />
          ) : t?.cumplimiento != null ? (
            <>
              <p className={`text-2xl font-bold ${pctColor(t.cumplimiento)}`}>{t.cumplimiento}%</p>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1.5">
                <div className={`h-1.5 rounded-full transition-all ${barColor(t.cumplimiento)}`}
                  style={{ width: `${Math.min(t.cumplimiento, 100)}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{t.ejecutadas} / {t.esperadas}</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">Sin datos</p>
          )}
        </div>
      </div>

      {/* Desglose por frecuencia */}
      {resumen?.por_frecuencia?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Cumplimiento por frecuencia</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {resumen.por_frecuencia.map(f => {
              const cfg = FREC_CFG[f.frecuencia] || {}
              return (
                <button key={f.frecuencia}
                  onClick={() => setFiltroFrec(filtroFrec === f.frecuencia ? '' : f.frecuencia)}
                  className={`text-left border rounded-lg p-3 transition-colors ${
                    filtroFrec === f.frecuencia ? 'border-roka-400 bg-roka-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-2">
                      {cfg.label && (
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${cfg.color}`}>{cfg.label}</span>
                      )}
                      <span className="text-sm font-medium text-gray-700">{cfg.title || f.frecuencia}</span>
                    </span>
                    <span className={`text-sm font-bold ${pctColor(f.cumplimiento)}`}>
                      {f.cumplimiento != null ? `${f.cumplimiento}%` : '—'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${barColor(f.cumplimiento)}`}
                      style={{ width: `${Math.min(f.cumplimiento ?? 0, 100)}%` }} />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {f.ejecutadas} / {f.esperadas} · {f.pares} equipo{f.pares !== 1 ? 's' : ''}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Nota de inspecciones no atribuibles */}
      {t?.ejecutadas_sin_equipo > 0 && (
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          <Info size={12} className="text-gray-400" />
          {t.ejecutadas_sin_equipo} inspección{t.ejecutadas_sin_equipo !== 1 ? 'es' : ''} ejecutada{t.ejecutadas_sin_equipo !== 1 ? 's' : ''} este
          mes sin equipo específico asignado — no se pueden imputar a un equipo del programa.
        </p>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar equipo o plantilla..."
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-roka-500"
          />
        </div>
        <select value={filtroFrec} onChange={e => setFiltroFrec(e.target.value)}
          className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todas las frecuencias</option>
          {Object.entries(FREC_CFG).map(([k, v]) => <option key={k} value={k}>{v.title}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {(filtroFrec || filtroEstado || busqueda) && (
          <button onClick={() => { setFiltroFrec(''); setFiltroEstado(''); setBusqueda('') }}
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50">
            Limpiar
          </button>
        )}
        {meta && (
          <span className="ml-auto text-xs text-gray-400">{meta.total} equipo{meta.total !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Equipo', 'Área', 'Plantilla', 'Frec.', 'Esperadas', 'Ejecutadas', 'Cumplimiento', 'Última', 'Estado'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingFilas ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">Cargando...</td></tr>
              ) : filas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <CalendarClock size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">Sin equipos en el programa</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Asigna plantillas con frecuencia a los equipos para que aparezcan aquí
                    </p>
                  </td>
                </tr>
              ) : filas.map(f => {
                const cfg   = ESTADO_CFG[f.estado] || ESTADO_CFG.sin_periodo
                const badge = FREC_CFG[f.frecuencia]
                const IconEstado = cfg.icon

                return (
                  <tr key={`${f.equipo_id}-${f.plantilla_id}`}
                    className={`hover:bg-gray-50 transition-colors ${f.estado === 'sin_ejecutar' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800 text-sm">{f.equipo_nombre || '—'}</div>
                      <div className="text-xs text-gray-400 font-mono">{f.equipo_codigo || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{f.area_nombre || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700">{f.plantilla_nombre || '—'}</div>
                      {f.plantilla_codigo && (
                        <div className="text-xs font-mono text-gray-400">{f.plantilla_codigo}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {badge ? (
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${badge.color}`} title={badge.title}>
                          {badge.label}
                        </span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 tabular-nums">{f.esperadas}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800 tabular-nums">{f.ejecutadas}</td>
                    <td className="px-4 py-3 min-w-[120px]">
                      {f.cumplimiento != null ? (
                        <>
                          <span className={`text-sm font-bold ${pctColor(f.cumplimiento)}`}>{f.cumplimiento}%</span>
                          <div className="w-full bg-gray-100 rounded-full h-1 mt-1">
                            <div className={`h-1 rounded-full ${barColor(f.cumplimiento)}`}
                              style={{ width: `${Math.min(f.cumplimiento, 100)}%` }} />
                          </div>
                        </>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtFecha(f.ultima_ejecucion)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${cfg.color}`}>
                        <IconEstado size={10} /> {cfg.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              {meta.total > 0 ? `Mostrando ${meta.from}–${meta.to} de ${meta.total}` : 'Sin resultados'}
            </p>
            <div className="flex items-center gap-1">
              <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100 text-gray-600">
                ← Anterior
              </button>
              <span className="text-xs text-gray-500 px-2">{pagina} / {meta.last_page}</span>
              <button disabled={pagina === meta.last_page} onClick={() => setPagina(p => p + 1)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100 text-gray-600">
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Subcomponentes ─────────────────────────────────────────────────────────

function KpiCard({ label, valor, icon: Icon, color, bg, onClick, loading, nota }) {
  return (
    <div onClick={onClick}
      className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={20} className={color} />
        </div>
        <div className="min-w-0">
          {loading ? (
            <div className="w-8 h-6 bg-gray-100 animate-pulse rounded" />
          ) : (
            <p className={`text-2xl font-bold ${color}`}>{valor ?? 0}</p>
          )}
          <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          {nota && !loading && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{nota}</p>}
        </div>
      </div>
    </div>
  )
}
