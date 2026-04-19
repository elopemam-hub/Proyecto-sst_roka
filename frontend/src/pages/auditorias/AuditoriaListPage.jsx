import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileSearch, AlertTriangle, CheckCircle2, Clock, TrendingUp, Search, XCircle } from 'lucide-react'
import api from '../../services/api'
import { format } from 'date-fns'

const ESTADOS = {
  programada:  { label: 'Programada',  color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  en_proceso:  { label: 'En proceso',  color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  completada:  { label: 'Completada',  color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cancelada:   { label: 'Cancelada',   color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const TIPOS = {
  interna: 'Interna',
  externa: 'Externa',
}

export default function AuditoriaListPage() {
  const navigate = useNavigate()
  const [auditorias, setAuditorias] = useState([])
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTipo, setFiltroTipo]     = useState('')
  const [filtroSearch, setFiltroSearch] = useState('')
  const [pagina, setPagina]   = useState(1)
  const [meta, setMeta]       = useState(null)

  useEffect(() => { cargarStats() }, [])
  useEffect(() => { cargar() }, [filtroEstado, filtroTipo, pagina])

  const cargarStats = async () => {
    try {
      const { data } = await api.get('/auditorias/estadisticas')
      setStats(data)
    } catch { /* silent */ }
  }

  const cargar = async () => {
    setLoading(true)
    try {
      const params = { page: pagina, per_page: 15 }
      if (filtroEstado) params.estado = filtroEstado
      if (filtroTipo)   params.tipo   = filtroTipo
      if (filtroSearch) params.search = filtroSearch
      const { data } = await api.get('/auditorias', { params })
      setAuditorias(data.data || data)
      setMeta(data.meta || null)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const buscar = (e) => { e.preventDefault(); setPagina(1); cargar() }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Auditorías SST</h1>
          <p className="text-slate-400 text-sm mt-1">Programa de auditorías · Art. 43 Ley 29783</p>
        </div>
        <button onClick={() => navigate('/auditorias/nueva')}
          className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-roka-500/20">
          <Plus size={16} /> Nueva Auditoría
        </button>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Completadas',     valor: stats.completadas,        icon: CheckCircle2,   color: 'text-emerald-400' },
            { label: 'En proceso',      valor: stats.en_proceso,         icon: Clock,          color: 'text-amber-400' },
            { label: 'Cumplimiento',    valor: `${stats.cumplimiento}%`, icon: TrendingUp,     color: 'text-roka-400' },
            { label: 'Hallazgos abtos', valor: stats.hallazgos_abiertos, icon: AlertTriangle,  color: 'text-orange-400' },
            { label: 'Hall. vencidos',  valor: stats.hallazgos_vencidos, icon: XCircle,        color: 'text-red-400' },
          ].map(({ label, valor, icon: Icon, color }) => (
            <div key={label} className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-slate-900 ${color}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${label.includes('vencidos') && valor > 0 ? 'text-red-400' : 'text-white'}`}>{valor ?? '—'}</p>
                  <p className="text-xs text-slate-400">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Gráfico de hallazgos por tipo (mini-barras) */}
      {stats?.por_tipo_hallazgo?.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Hallazgos por tipo</h3>
          <div className="space-y-2">
            {stats.por_tipo_hallazgo.map(h => {
              const maxTotal = Math.max(...stats.por_tipo_hallazgo.map(x => x.total))
              const pct = maxTotal > 0 ? (h.total / maxTotal) * 100 : 0
              const colorMap = {
                no_conformidad_mayor: 'bg-red-500',
                no_conformidad_menor: 'bg-orange-500',
                observacion: 'bg-amber-500',
                oportunidad_mejora: 'bg-blue-500',
              }
              const labelMap = {
                no_conformidad_mayor: 'NC Mayor',
                no_conformidad_menor: 'NC Menor',
                observacion: 'Observación',
                oportunidad_mejora: 'Oportunidad de Mejora',
              }
              return (
                <div key={h.tipo_hallazgo} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-36 text-right">{labelMap[h.tipo_hallazgo] || h.tipo_hallazgo}</span>
                  <div className="flex-1 h-6 bg-slate-900 rounded-full overflow-hidden">
                    <div className={`h-full ${colorMap[h.tipo_hallazgo] || 'bg-slate-500'} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm text-white font-medium w-8 text-right">{h.total}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-wrap gap-3 items-end">
        <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPagina(1) }}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPagina(1) }}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2">
          <option value="">Todos los tipos</option>
          {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <form onSubmit={buscar} className="flex gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Buscar..."
              value={filtroSearch} onChange={e => setFiltroSearch(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg pl-9 pr-3 py-2 w-48" />
          </div>
          <button type="submit" className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors">Buscar</button>
        </form>
      </div>

      {/* Tabla */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              {['Tipo', 'Norma', 'Auditor líder', 'Fecha', 'Área', 'Hallazgos', 'Estado'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-500">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
                  Cargando...
                </div>
              </td></tr>
            ) : auditorias.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-500">No hay auditorías registradas</td></tr>
            ) : auditorias.map(a => (
              <tr key={a.id} onClick={() => navigate(`/auditorias/${a.id}`)}
                className="hover:bg-slate-700/50 cursor-pointer transition-colors">
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded border ${
                    a.tipo === 'interna' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                  }`}>{TIPOS[a.tipo]}</span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">{a.norma_referencia || '—'}</td>
                <td className="px-4 py-3 text-slate-200 font-medium">{a.auditor_lider}</td>
                <td className="px-4 py-3 text-slate-400">
                  {a.fecha_programada ? format(new Date(a.fecha_programada), 'dd/MM/yyyy') : '—'}
                </td>
                <td className="px-4 py-3 text-slate-400">{a.area?.nombre || '—'}</td>
                <td className="px-4 py-3">
                  {a.hallazgos_count != null ? (
                    <span className={`font-medium ${a.hallazgos_abiertos_count > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {a.hallazgos_count}
                    </span>
                  ) : <span className="text-slate-600">0</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full border ${ESTADOS[a.estado]?.color}`}>
                    {ESTADOS[a.estado]?.label || a.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {meta && meta.last_page > 1 && (
          <div className="border-t border-slate-700 px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-slate-400">Total: {meta.total}</span>
            <div className="flex gap-2">
              <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}
                className="px-3 py-1 rounded bg-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-600 transition-colors">Anterior</button>
              <span className="px-3 py-1 text-slate-400">{pagina} / {meta.last_page}</span>
              <button disabled={pagina === meta.last_page} onClick={() => setPagina(p => p + 1)}
                className="px-3 py-1 rounded bg-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-600 transition-colors">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
