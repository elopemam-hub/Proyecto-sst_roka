import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Download, FileText, AlertTriangle, Settings, TrendingDown, ChevronLeft } from 'lucide-react'
import api from '../../services/api'

const CLASIF_COLOR = {
  trivial:     { bg: 'bg-emerald-500', text: 'text-emerald-400' },
  tolerable:   { bg: 'bg-lime-500',    text: 'text-lime-400' },
  moderado:    { bg: 'bg-amber-500',   text: 'text-amber-400' },
  importante:  { bg: 'bg-orange-500',  text: 'text-orange-400' },
  intolerable: { bg: 'bg-red-500',     text: 'text-red-400' },
}

export default function IpercReportesPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [matriz, setMatriz] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/iperc/estadisticas'),
      api.get('/iperc/matriz-riesgos'),
    ]).then(([{ data: s }, { data: m }]) => {
      setStats(s)
      setMatriz(m)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

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
          className="inline-flex items-center gap-1.5 text-xs text-slate-200 hover:text-white bg-slate-600/80 hover:bg-slate-600 px-2.5 py-1.5 rounded-lg border border-slate-600/50 transition-colors mb-3"
        >
          <ChevronLeft size={13} /> Volver al módulo IPERC
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
        </>
      )}
    </div>
  )
}
