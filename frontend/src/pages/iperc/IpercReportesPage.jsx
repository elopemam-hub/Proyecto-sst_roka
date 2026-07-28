import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Download, FileText, AlertTriangle, Settings, TrendingDown, ArrowLeft, Grid3x3, ClipboardList } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const CLASIF_COLOR = {
  trivial:     { bg: 'bg-emerald-500', text: 'text-emerald-400' },
  tolerable:   { bg: 'bg-lime-500',    text: 'text-lime-400' },
  moderado:    { bg: 'bg-amber-500',   text: 'text-amber-400' },
  importante:  { bg: 'bg-orange-500',  text: 'text-orange-400' },
  intolerable: { bg: 'bg-red-500',     text: 'text-red-400' },
}

const CLASIF_HEX = {
  trivial: '#10b981', tolerable: '#84cc16', moderado: '#f59e0b',
  importante: '#f97316', intolerable: '#ef4444',
}

function clasificarNivel(nivel) {
  if (nivel <= 4)  return 'trivial'
  if (nivel <= 8)  return 'tolerable'
  if (nivel <= 16) return 'moderado'
  if (nivel <= 24) return 'importante'
  return 'intolerable'
}

export default function IpercReportesPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [matriz, setMatriz] = useState(null)
  const [grid, setGrid] = useState([])
  const [plan, setPlan] = useState(null)
  const [exposicion, setExposicion] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/iperc/estadisticas'),
      api.get('/iperc/matriz-riesgos'),
      api.get('/iperc/matriz-grid'),
      api.get('/iperc/plan-accion'),
      api.get('/iperc/exposicion'),
    ]).then(([{ data: s }, { data: m }, { data: g }, { data: p }, { data: e }]) => {
      setStats(s)
      setMatriz(m)
      setGrid(g.celdas || [])
      setPlan(p)
      setExposicion(e.areas || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const cargarPlan = async () => {
    try {
      const { data } = await api.get('/iperc/plan-accion')
      setPlan(data)
    } catch (_) {}
  }

  const actualizarControl = async (controlId, estado) => {
    try {
      await api.patch(`/iperc/controles/${controlId}`, { estado_implementacion: estado })
      toast.success('Control actualizado')
      cargarPlan()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al actualizar control')
    }
  }

  // Buscar total de peligros en una celda (ip, is)
  const celdaTotal = (ip, is) => grid.find(c => c.ip === ip && c.is === is)?.total || 0

  const porEstado = stats?.por_estado || {}
  const controles = stats?.controles_por_estado || {}
  const totalControles = Object.values(controles).reduce((a, b) => a + b, 0)

  const handleExportCSV = () => {
    if (!stats) return
    const lineas = [
      ['Indicador', 'Valor'],
      ['Total IPERC', stats.total_iperc],
      ['Total procesos', stats.total_procesos],
      ['Total peligros', stats.total_peligros],
      ['Riesgos significativos', stats.significativos],
      ['IPERC vencidos', stats.vencidos],
      ['', ''],
      ['Estado', 'Total'],
      ...Object.entries(porEstado).map(([k, v]) => [k, v]),
      ['', ''],
      ['Clasificación riesgo', 'Peligros'],
      ...['trivial','tolerable','moderado','importante','intolerable'].map(c => [c, stats.por_clasificacion?.[c] || 0]),
      ['', ''],
      ['Estado control', 'Total'],
      ...Object.entries(controles).map(([k, v]) => [k, v]),
    ]
    const csv = lineas.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `IPERC_Reporte_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
        <button
          onClick={() => navigate('/iperc')}
          className="btn-back mb-3"
        >
          <ArrowLeft size={16} /> Volver a IPERC
        </button>
          <h1 className="text-2xl font-bold text-white">Reportes IPERC</h1>
          <p className="text-slate-400 text-sm mt-1">Estadísticas y resúmenes del sistema de gestión de riesgos</p>
        </div>
        <button onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg border border-slate-600 transition-colors">
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Generando reporte...</div>
      ) : !stats ? (
        <div className="text-center py-12 text-slate-500">No se pudo cargar el reporte</div>
      ) : (
        <>
          {/* Resumen ejecutivo */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <p className="text-sm font-semibold text-slate-300 mb-4">Resumen Ejecutivo IPERC</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: 'Matrices registradas', valor: stats.total_iperc,    icon: FileText,       color: 'text-blue-400' },
                { label: 'Procesos evaluados',   valor: stats.total_procesos, icon: BarChart3,      color: 'text-violet-400' },
                { label: 'Peligros identificados',valor: stats.total_peligros, icon: AlertTriangle,  color: 'text-red-400' },
                { label: 'Riesgos significativos',valor: stats.significativos, icon: AlertTriangle,  color: 'text-orange-400' },
                { label: 'Controles totales',    valor: totalControles,       icon: Settings,       color: 'text-teal-400' },
              ].map(({ label, valor, icon: Icon, color }) => (
                <div key={label} className="text-center">
                  <Icon size={20} className={`${color} mx-auto mb-2`} />
                  <p className={`text-2xl font-bold ${color}`}>{valor ?? 0}</p>
                  <p className="text-xs text-slate-400 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Distribución por clasificación */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
              <p className="text-sm font-semibold text-slate-300 mb-4">Distribución de peligros por nivel de riesgo</p>
              <div className="space-y-3">
                {['intolerable','importante','moderado','tolerable','trivial'].map(c => {
                  const val = stats.por_clasificacion?.[c] || 0
                  const pct = stats.total_peligros > 0 ? Math.round(val / stats.total_peligros * 100) : 0
                  const { bg, text } = CLASIF_COLOR[c]
                  return (
                    <div key={c}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium capitalize ${text}`}>{c}</span>
                        <span className="text-xs text-slate-400">{val} ({pct}%)</span>
                      </div>
                      <div className="bg-slate-700 rounded-full h-2">
                        <div className={`${bg} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Estado de controles */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
              <p className="text-sm font-semibold text-slate-300 mb-4">Estado de implementación de controles</p>
              {totalControles === 0 ? (
                <p className="text-slate-500 text-sm">No hay controles registrados</p>
              ) : (
                <div className="space-y-3">
                  {[
                    { key: 'verificado',   label: 'Verificado',    bg: 'bg-blue-500',    text: 'text-blue-400' },
                    { key: 'implementado', label: 'Implementado',  bg: 'bg-emerald-500', text: 'text-emerald-400' },
                    { key: 'en_proceso',   label: 'En proceso',    bg: 'bg-amber-500',   text: 'text-amber-400' },
                    { key: 'pendiente',    label: 'Pendiente',     bg: 'bg-red-500',     text: 'text-red-400' },
                  ].map(({ key, label, bg, text }) => {
                    const val = controles[key] || 0
                    const pct = Math.round(val / totalControles * 100)
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-medium ${text}`}>{label}</span>
                          <span className="text-xs text-slate-400">{val} ({pct}%)</span>
                        </div>
                        <div className="bg-slate-700 rounded-full h-2">
                          <div className={`${bg} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Por estado de IPERC */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <p className="text-sm font-semibold text-slate-300 mb-4">Matrices IPERC por estado</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {['borrador','en_revision','aprobado','vencido','archivado'].map(e => (
                <div key={e} className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-slate-200">{porEstado[e] || 0}</p>
                  <p className="text-xs text-slate-400 capitalize mt-1">{e.replace('_', ' ')}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Indicadores de eficacia */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <p className="text-sm font-semibold text-slate-300 mb-4">Indicadores de eficacia SST</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  label: 'Tasa de controles implementados',
                  valor: totalControles > 0 ? `${Math.round(((controles['implementado'] || 0) + (controles['verificado'] || 0)) / totalControles * 100)}%` : '—',
                  meta: '≥80%',
                  color: 'text-emerald-400',
                },
                {
                  label: 'Ratio de riesgos significativos',
                  valor: stats.total_peligros > 0 ? `${Math.round(stats.significativos / stats.total_peligros * 100)}%` : '—',
                  meta: '<20%',
                  color: 'text-amber-400',
                },
                {
                  label: 'IPERC vigentes vs total',
                  valor: stats.total_iperc > 0 ? `${Math.round(((porEstado['aprobado'] || 0)) / stats.total_iperc * 100)}%` : '—',
                  meta: '≥70%',
                  color: 'text-blue-400',
                },
              ].map(({ label, valor, meta, color }) => (
                <div key={label} className="bg-slate-700/50 rounded-xl p-4">
                  <p className={`text-3xl font-bold ${color}`}>{valor}</p>
                  <p className="text-sm text-slate-300 mt-2">{label}</p>
                  <p className="text-xs text-slate-500 mt-1">Meta: {meta}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Heatmap P×S — matriz de calor real */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <p className="text-sm font-semibold text-slate-300 mb-1 flex items-center gap-2">
              <Grid3x3 size={15} className="text-roka-400" /> Matriz de calor — Probabilidad × Severidad
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Distribución de peligros por Índice de Probabilidad (4–16) y Severidad (1–4). El color indica la clasificación del riesgo.
            </p>
            <div className="overflow-x-auto">
              <table className="border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="p-1 text-slate-500 font-medium text-right pr-2">IS \ IP</th>
                    {Array.from({ length: 13 }, (_, i) => 4 + i).map(ip => (
                      <th key={ip} className="p-1 text-slate-500 font-medium w-9 text-center">{ip}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[4, 3, 2, 1].map(is => (
                    <tr key={is}>
                      <td className="p-1 text-slate-500 font-medium text-right pr-2">{is}</td>
                      {Array.from({ length: 13 }, (_, i) => 4 + i).map(ip => {
                        const nivel = ip * is
                        const clasif = clasificarNivel(nivel)
                        const total = celdaTotal(ip, is)
                        const hex = CLASIF_HEX[clasif]
                        return (
                          <td key={ip} className="p-0.5">
                            <div
                              title={`IP ${ip} × IS ${is} = ${nivel} (${clasif}) — ${total} peligro(s)`}
                              className="w-9 h-9 rounded flex items-center justify-center font-bold transition-transform hover:scale-110 cursor-default"
                              style={{
                                background: total > 0 ? hex : `${hex}22`,
                                color: total > 0 ? '#fff' : `${hex}66`,
                                boxShadow: `inset 0 0 0 1px ${hex}40`,
                              }}
                            >
                              {total > 0 ? total : ''}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              {['trivial','tolerable','moderado','importante','intolerable'].map(c => (
                <div key={c} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded" style={{ background: CLASIF_HEX[c] }} />
                  <span className="text-xs text-slate-400 capitalize">{c}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Plan de acción — controles que requieren seguimiento */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
              <p className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <ClipboardList size={15} className="text-roka-400" /> Plan de acción — controles pendientes
              </p>
              {plan && (
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">{plan.total} pendientes</span>
                  {plan.significativos > 0 && <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">{plan.significativos} de riesgo significativo</span>}
                  {plan.vencidos > 0 && <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400">{plan.vencidos} vencidos</span>}
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-4">Priorizados por riesgo significativo y nivel. Cambia el estado para dar seguimiento.</p>

            {!plan || plan.items.length === 0 ? (
              <p className="text-slate-500 text-sm py-4 text-center">✓ No hay controles pendientes de implementación</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-slate-500 border-b border-slate-700">
                    <tr>
                      {['Peligro', 'Proceso', 'Área', 'Control', 'Jerarquía', 'Estado'].map(h => (
                        <th key={h} className="text-left px-2 py-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {plan.items.map(it => (
                      <tr key={it.id} className="hover:bg-slate-700/30">
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1.5">
                            {it.es_riesgo_significativo && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" title="Riesgo significativo" />}
                            <span className="text-slate-200">{it.descripcion_peligro}</span>
                          </div>
                          <button onClick={() => navigate(`/iperc/${it.iperc_id}`)} className="text-[10px] text-roka-400 hover:text-roka-300 font-mono">{it.codigo}</button>
                        </td>
                        <td className="px-2 py-2 text-slate-400">{it.proceso}</td>
                        <td className="px-2 py-2 text-slate-400">{it.area_nombre}</td>
                        <td className="px-2 py-2 text-slate-300">{it.descripcion}</td>
                        <td className="px-2 py-2 text-slate-400 capitalize">{it.tipo_control}</td>
                        <td className="px-2 py-2">
                          <select
                            value={it.estado_implementacion}
                            onChange={(e) => actualizarControl(it.id, e.target.value)}
                            className="input text-xs py-1"
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="en_proceso">En proceso</option>
                            <option value="implementado">Implementado</option>
                            <option value="verificado">Verificado</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Matriz de exposición — peligros por área ↔ cargos/personal */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <p className="text-sm font-semibold text-slate-300 mb-1 flex items-center gap-2">
              <AlertTriangle size={15} className="text-roka-400" /> Matriz de exposición por área
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Peligros de IPERC aprobados y el personal expuesto en cada área. Útil para exámenes médicos y profesiograma.
            </p>
            {exposicion.length === 0 ? (
              <p className="text-slate-500 text-sm py-4 text-center">No hay áreas con IPERC aprobado y personal asignado</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {exposicion.map(area => (
                  <div key={area.area_id} className="bg-slate-900/40 border border-slate-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-slate-200">{area.area_nombre}</p>
                      <div className="flex gap-2 text-[10px]">
                        <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">{area.total_personal} personas</span>
                        {area.significativos > 0 && <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">{area.significativos} signif.</span>}
                      </div>
                    </div>

                    {area.cargos?.length > 0 && (
                      <p className="text-xs text-slate-400 mb-2">
                        <span className="text-slate-500">Cargos: </span>
                        {area.cargos.map(c => `${c.nombre} (${c.total_personal})`).join(' · ')}
                      </p>
                    )}

                    {area.peligros?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {area.peligros.map((p, i) => (
                          <span
                            key={i}
                            title={`${p.descripcion_peligro} — ${p.clasificacion_inicial}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
                            style={{
                              background: `${CLASIF_HEX[p.clasificacion_inicial]}18`,
                              color: CLASIF_HEX[p.clasificacion_inicial],
                              boxShadow: `inset 0 0 0 1px ${CLASIF_HEX[p.clasificacion_inicial]}40`,
                            }}
                          >
                            {p.es_riesgo_significativo && <span className="w-1 h-1 rounded-full" style={{ background: CLASIF_HEX[p.clasificacion_inicial] }} />}
                            {p.descripcion_peligro}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 italic">Sin peligros en IPERC aprobado</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
