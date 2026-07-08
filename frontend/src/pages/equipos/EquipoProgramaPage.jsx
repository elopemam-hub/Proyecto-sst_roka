import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CalendarClock, Play, SkipForward, Trash2,
  AlertTriangle, CheckCircle2, Clock, Calendar, ChevronDown,
  ClipboardCheck, RefreshCw, X, Loader2,
} from 'lucide-react'
import api from '../../services/api'
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Constantes de UI ───────────────────────────────────────────────────────

const ESTADO_CFG = {
  pendiente: { label: 'Pendiente',  color: 'bg-blue-50 text-blue-700 border-blue-200',   icon: Clock },
  vencida:   { label: 'Vencida',   color: 'bg-red-50 text-red-700 border-red-200',       icon: AlertTriangle },
  realizada: { label: 'Realizada', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  omitida:   { label: 'Omitida',   color: 'bg-gray-100 text-gray-500 border-gray-200',   icon: SkipForward },
}

const FREC_CFG = {
  diaria:     { label: 'D',  title: 'Diaria',      color: 'bg-red-100 text-red-700 border-red-200' },
  semanal:    { label: 'S',  title: 'Semanal',     color: 'bg-orange-100 text-orange-700 border-orange-200' },
  mensual:    { label: 'M',  title: 'Mensual',     color: 'bg-blue-100 text-blue-700 border-blue-200' },
  trimestral: { label: 'T',  title: 'Trimestral',  color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  semestral:  { label: '6M', title: 'Semestral',   color: 'bg-purple-100 text-purple-700 border-purple-200' },
  anual:      { label: 'A',  title: 'Anual',       color: 'bg-gray-100 text-gray-600 border-gray-200' },
}

const PERIODOS = [
  { value: 'hoy',     label: 'Hoy' },
  { value: 'semana',  label: 'Esta semana' },
  { value: 'mes',     label: 'Este mes' },
  { value: 'vencidas',label: 'Solo vencidas' },
  { value: '',        label: 'Todas' },
]

const hoy = new Date()
const fmt  = (d) => format(new Date(d), 'dd/MM/yyyy', { locale: es })

// ─── Componente principal ───────────────────────────────────────────────────

export default function EquipoProgramaPage() {
  const navigate = useNavigate()

  // Estado lista
  const [programas, setprogramas]   = useState([])
  const [meta, setMeta]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [pagina, setPagina]         = useState(1)

  // Estado filtros
  const [periodo, setPeriodo]           = useState('mes')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroFrec, setFiltroFrec]     = useState('')

  // Dashboard
  const [dash, setDash]       = useState(null)
  const [dashLoading, setDashLoading] = useState(true)

  // Modal generar
  const [modalGenerar, setModalGenerar] = useState(false)
  const [genForm, setGenForm] = useState({
    fecha_inicio:    format(hoy, 'yyyy-MM-dd'),
    fecha_fin:       format(endOfMonth(hoy), 'yyyy-MM-dd'),
    solo_operativos: true,
  })
  const [generando, setGenerando]   = useState(false)
  const [genResultado, setGenResultado] = useState(null)

  // Modal omitir
  const [omitirId, setOmitirId]         = useState(null)
  const [omitirMotivo, setOmitirMotivo] = useState('')
  const [omitiendo, setOmitiendo]       = useState(false)

  // ── Carga ──────────────────────────────────────────────────────────────────

  const cargarDashboard = useCallback(async () => {
    setDashLoading(true)
    try {
      const { data } = await api.get('/inspecciones-programadas/dashboard')
      setDash(data)
    } catch { /* silent */ } finally { setDashLoading(false) }
  }, [])

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = { per_page: 20, page: pagina }
      if (periodo)      params.periodo      = periodo
      if (filtroEstado) params.estado       = filtroEstado
      if (filtroFrec)   params.frecuencia   = filtroFrec
      const { data } = await api.get('/inspecciones-programadas', { params })
      setprogramas(data.data || [])
      setMeta(data.last_page ? { current_page: data.current_page, last_page: data.last_page, total: data.total, from: data.from, to: data.to } : null)
    } catch { /* silent */ } finally { setLoading(false) }
  }, [pagina, periodo, filtroEstado, filtroFrec])

  useEffect(() => { cargarDashboard() }, [cargarDashboard])
  useEffect(() => { setPagina(1) }, [periodo, filtroEstado, filtroFrec])
  useEffect(() => { cargar() }, [cargar])

  // ── Acciones ───────────────────────────────────────────────────────────────

  const realizar = async (prog) => {
    try {
      await api.put(`/inspecciones-programadas/${prog.id}/realizar`)
      cargar()
      cargarDashboard()
    } catch { /* silent */ }
  }

  const confirmarOmitir = async () => {
    if (!omitirMotivo.trim()) return
    setOmitiendo(true)
    try {
      await api.put(`/inspecciones-programadas/${omitirId}/omitir`, { observaciones: omitirMotivo })
      setOmitirId(null)
      setOmitirMotivo('')
      cargar()
      cargarDashboard()
    } catch { /* silent */ } finally { setOmitiendo(false) }
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta programación?')) return
    try {
      await api.delete(`/inspecciones-programadas/${id}`)
      cargar()
      cargarDashboard()
    } catch { /* silent */ }
  }

  const generarPrograma = async () => {
    setGenerando(true)
    setGenResultado(null)
    try {
      const { data } = await api.post('/inspecciones-programadas/generar', genForm)
      setGenResultado({ ok: true, ...data })
      cargar()
      cargarDashboard()
    } catch (err) {
      setGenResultado({ ok: false, message: err.response?.data?.message || 'Error al generar' })
    } finally { setGenerando(false) }
  }

  const inspeccionar = (prog) => {
    navigate(`/inspecciones/checklist/nueva?catalogo_id=${prog.plantilla_id}&equipo_id=${prog.equipo_id}&prog_id=${prog.id}`)
  }

  const gf = (k, v) => setGenForm(p => ({ ...p, [k]: v }))

  // ── KPI Cards ──────────────────────────────────────────────────────────────

  const KpiCard = ({ label, valor, icon: Icon, color, bg, onClick, loading }) => (
    <div onClick={onClick}
      className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={20} className={color} />
        </div>
        <div>
          {loading ? (
            <div className="w-8 h-6 bg-gray-100 animate-pulse rounded" />
          ) : (
            <p className={`text-2xl font-bold ${color}`}>{valor ?? 0}</p>
          )}
          <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
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
              Seguimiento automático de inspecciones por equipo y frecuencia
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { cargar(); cargarDashboard() }}
            className="p-2 border border-gray-300 text-gray-500 hover:bg-gray-50 rounded-lg" title="Recargar">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => { setGenResultado(null); setModalGenerar(true) }}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Calendar size={15} /> Generar programa
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Pendientes hoy"    valor={dash?.pendientes_hoy}   icon={Clock}        color="text-blue-600"    bg="bg-blue-50"    loading={dashLoading} onClick={() => { setPeriodo('hoy'); setFiltroEstado('pendiente') }} />
        <KpiCard label="Vencidas"          valor={dash?.vencidas}         icon={AlertTriangle}color="text-red-600"     bg="bg-red-50"     loading={dashLoading} onClick={() => { setPeriodo('vencidas'); setFiltroEstado('') }} />
        <KpiCard label="Próximos 7 días"   valor={dash?.proximos_7_dias}  icon={Calendar}     color="text-amber-600"   bg="bg-amber-50"   loading={dashLoading} onClick={() => { setPeriodo('semana'); setFiltroEstado('pendiente') }} />
        <KpiCard label="Realizadas (mes)"  valor={dash?.realizadas_mes}   icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" loading={dashLoading} onClick={() => { setPeriodo('mes'); setFiltroEstado('realizada') }} />
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col justify-center">
          <p className="text-xs text-gray-500 mb-1">Cumplimiento del mes</p>
          {dashLoading ? (
            <div className="w-16 h-6 bg-gray-100 animate-pulse rounded" />
          ) : dash?.cumplimiento_mes != null ? (
            <>
              <p className={`text-2xl font-bold ${dash.cumplimiento_mes >= 80 ? 'text-emerald-600' : dash.cumplimiento_mes >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                {dash.cumplimiento_mes}%
              </p>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${dash.cumplimiento_mes >= 80 ? 'bg-emerald-500' : dash.cumplimiento_mes >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(dash.cumplimiento_mes, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{dash.realizadas_mes} / {dash.total_mes}</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">Sin datos</p>
          )}
        </div>
      </div>

      {/* Pendientes de hoy — preview rápido */}
      {dash?.detalle_hoy?.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={15} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-blue-800">
              {dash.pendientes_hoy} inspección{dash.pendientes_hoy !== 1 ? 'es' : ''} pendiente{dash.pendientes_hoy !== 1 ? 's' : ''} hoy
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {dash.detalle_hoy.map(p => {
              const frec = p.plantilla?.frecuencia_inspeccion
              const badge = FREC_CFG[frec]
              return (
                <div key={p.id}
                  className="inline-flex items-center gap-1.5 bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-xs">
                  {badge && (
                    <span className={`font-bold px-1 py-0.5 rounded border ${badge.color}`}>{badge.label}</span>
                  )}
                  <span className="font-medium text-gray-700">{p.equipo?.nombre || '—'}</span>
                  <span className="text-gray-400">{p.equipo?.area?.nombre}</span>
                  <button
                    onClick={() => navigate(`/inspecciones/checklist/nueva?catalogo_id=${p.plantilla_id}&equipo_id=${p.equipo_id}`)}
                    className="ml-1 text-blue-600 hover:text-blue-800 font-medium">
                    Ir →
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="flex gap-1">
          {PERIODOS.map(p => (
            <button key={p.value}
              onClick={() => setPeriodo(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                periodo === p.value
                  ? 'bg-roka-500 text-white'
                  : 'text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filtroFrec} onChange={e => setFiltroFrec(e.target.value)}
          className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todas las frecuencias</option>
          {Object.entries(FREC_CFG).map(([k, v]) => <option key={k} value={k}>{v.title}</option>)}
        </select>
        {(filtroEstado || filtroFrec) && (
          <button onClick={() => { setFiltroEstado(''); setFiltroFrec('') }}
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50">
            Limpiar
          </button>
        )}
        {meta && (
          <span className="ml-auto text-xs text-gray-400">{meta.total} registro{meta.total !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Fecha', 'Equipo', 'Área', 'Plantilla', 'Frec.', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            ) : programas.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <CalendarClock size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">Sin inspecciones programadas</p>
                  <p className="text-gray-400 text-xs mt-1">Usa "Generar programa" para crear el calendario</p>
                  <button onClick={() => setModalGenerar(true)}
                    className="mt-3 text-roka-500 hover:text-roka-600 text-sm font-medium">
                    + Generar programa
                  </button>
                </td>
              </tr>
            ) : programas.map(prog => {
              const cfg  = ESTADO_CFG[prog.estado] || ESTADO_CFG.pendiente
              const frec = prog.plantilla?.frecuencia_inspeccion
              const badge = FREC_CFG[frec]
              const IconEstado = cfg.icon
              const esAccionable = ['pendiente', 'vencida'].includes(prog.estado)

              return (
                <tr key={prog.id} className={`hover:bg-gray-50 transition-colors ${prog.estado === 'vencida' ? 'bg-red-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <span className={`font-medium text-sm ${prog.estado === 'vencida' ? 'text-red-600' : 'text-gray-800'}`}>
                      {fmt(prog.fecha_programada)}
                    </span>
                    {prog.dias_restantes != null && prog.dias_restantes >= 0 && (
                      <p className="text-[10px] text-gray-400 mt-0.5">en {prog.dias_restantes} día{prog.dias_restantes !== 1 ? 's' : ''}</p>
                    )}
                    {prog.estado === 'vencida' && (
                      <p className="text-[10px] text-red-500 mt-0.5">Vencida</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800 text-sm">{prog.equipo?.nombre || '—'}</div>
                    <div className="text-xs text-gray-400 font-mono">{prog.equipo?.codigo || ''}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{prog.equipo?.area?.nombre || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-700">{prog.plantilla?.nombre || '—'}</div>
                    {prog.plantilla?.codigo && (
                      <div className="text-xs font-mono text-gray-400">{prog.plantilla.codigo}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {badge ? (
                      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${badge.color}`} title={badge.title}>
                        {badge.label}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}>
                      <IconEstado size={10} /> {cfg.label}
                    </span>
                    {prog.estado === 'realizada' && prog.fecha_realizada && (
                      <p className="text-[10px] text-gray-400 mt-0.5">{fmt(prog.fecha_realizada)}</p>
                    )}
                    {prog.observaciones && (
                      <p className="text-[10px] text-gray-400 mt-0.5 max-w-[120px] truncate" title={prog.observaciones}>
                        {prog.observaciones}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {esAccionable ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Ir al wizard */}
                        <button
                          onClick={() => inspeccionar(prog)}
                          className="inline-flex items-center gap-1 text-xs text-roka-600 hover:text-roka-700 font-medium border border-roka-200 hover:border-roka-400 bg-roka-50 hover:bg-roka-100 px-2 py-0.5 rounded-full transition-colors"
                          title="Realizar inspección">
                          <ClipboardCheck size={11} /> Inspeccionar
                        </button>
                        {/* Marcar realizada sin wizard */}
                        <button
                          onClick={() => realizar(prog)}
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium border border-emerald-200 hover:border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-full transition-colors"
                          title="Marcar como realizada">
                          <CheckCircle2 size={11} /> Hecho
                        </button>
                        {/* Omitir */}
                        <button
                          onClick={() => { setOmitirId(prog.id); setOmitirMotivo('') }}
                          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 px-2 py-0.5 rounded-full transition-colors"
                          title="Omitir con motivo">
                          <SkipForward size={11} /> Omitir
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => eliminar(prog.id)}
                        className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

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
              <span className="text-xs text-gray-500 px-2">
                {pagina} / {meta.last_page}
              </span>
              <button disabled={pagina === meta.last_page} onClick={() => setPagina(p => p + 1)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100 text-gray-600">
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Generar Programa ── */}
      {modalGenerar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Calendar size={16} className="text-roka-500" />
                Generar programa de inspecciones
              </h2>
              <button onClick={() => setModalGenerar(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500">
                Se crearán registros de inspección para todos los equipos operativos
                con plantillas asignadas, según su frecuencia.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fecha inicio *</label>
                  <input type="date" value={genForm.fecha_inicio}
                    onChange={e => gf('fecha_inicio', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fecha fin *</label>
                  <input type="date" value={genForm.fecha_fin}
                    onChange={e => gf('fecha_fin', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </div>
              </div>

              {/* Atajos de período */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'Este mes',   ini: format(startOfMonth(hoy), 'yyyy-MM-dd'), fin: format(endOfMonth(hoy), 'yyyy-MM-dd') },
                  { label: 'Próx. mes',  ini: format(startOfMonth(addDays(endOfMonth(hoy), 1)), 'yyyy-MM-dd'), fin: format(endOfMonth(addDays(endOfMonth(hoy), 1)), 'yyyy-MM-dd') },
                  { label: '3 meses',    ini: format(hoy, 'yyyy-MM-dd'), fin: format(addDays(hoy, 89), 'yyyy-MM-dd') },
                ].map(({ label, ini, fin }) => (
                  <button key={label} type="button"
                    onClick={() => { gf('fecha_inicio', ini); gf('fecha_fin', fin) }}
                    className="text-xs border border-gray-300 rounded-lg px-2.5 py-1 hover:bg-gray-50 text-gray-600 transition-colors">
                    {label}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={genForm.solo_operativos}
                  onChange={e => gf('solo_operativos', e.target.checked)}
                  className="w-4 h-4 rounded accent-roka-500" />
                <span className="text-sm text-gray-700">Solo equipos operativos</span>
                <span className="text-xs text-gray-400">(excluye baja, mantenimiento, inactivo)</span>
              </label>

              {/* Resultado anterior */}
              {genResultado && (
                <div className={`rounded-lg p-3 text-sm ${genResultado.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {genResultado.ok ? (
                    <>
                      <p className="font-semibold">✓ {genResultado.insertadas} inspecciones generadas</p>
                      <p className="text-xs mt-0.5 opacity-80">
                        {genResultado.omitidas} omitidas (ya existían) · {genResultado.pares} par(es) equipo-plantilla
                      </p>
                    </>
                  ) : (
                    <p>{genResultado.message}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setModalGenerar(false)}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                Cerrar
              </button>
              <button onClick={generarPrograma} disabled={generando}
                className="flex items-center gap-2 px-4 py-2 bg-roka-500 hover:bg-roka-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {generando ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
                {generando ? 'Generando...' : 'Generar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Omitir ── */}
      {omitirId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800">Omitir inspección</h2>
              <button onClick={() => setOmitirId(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs text-gray-500">Indica el motivo por el que se omite esta inspección.</p>
              <textarea
                value={omitirMotivo}
                onChange={e => setOmitirMotivo(e.target.value)}
                placeholder="Ej: Equipo en mantenimiento, área sin acceso..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-roka-500 resize-none"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setOmitirId(null)}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={confirmarOmitir} disabled={!omitirMotivo.trim() || omitiendo}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {omitiendo ? <Loader2 size={14} className="animate-spin" /> : <SkipForward size={14} />}
                Omitir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
