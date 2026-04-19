import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Siren, CalendarCheck, Clock, Star, TrendingUp, Search } from 'lucide-react'
import api from '../../services/api'
import { format } from 'date-fns'

const ESTADOS = {
  programado: { label: 'Programado', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  ejecutado:  { label: 'Ejecutado',  color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cancelado:  { label: 'Cancelado',  color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const TIPOS = {
  sismo:             'Sismo',
  incendio:          'Incendio',
  derrame:           'Derrame',
  evacuacion:        'Evacuación',
  primeros_auxilios: 'Primeros Auxilios',
  otro:              'Otro',
}

const TIPO_ICONOS = {
  sismo:             '🌍',
  incendio:          '🔥',
  derrame:           '☠️',
  evacuacion:        '🚨',
  primeros_auxilios: '🩺',
  otro:              '📋',
}

export default function SimulacroListPage() {
  const navigate = useNavigate()
  const [simulacros, setSimulacros] = useState([])
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
      const { data } = await api.get('/simulacros/estadisticas')
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
      const { data } = await api.get('/simulacros', { params })
      setSimulacros(data.data || data)
      setMeta(data.meta || null)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const buscar = (e) => { e.preventDefault(); setPagina(1); cargar() }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Simulacros</h1>
          <p className="text-slate-400 text-sm mt-1">Simulacros de emergencia · Art. 74 DS 005-2012-TR</p>
        </div>
        <button onClick={() => navigate('/simulacros/nuevo')}
          className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-roka-500/20">
          <Plus size={16} /> Nuevo Simulacro
        </button>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Programados',   valor: stats.programados,        icon: CalendarCheck,  color: 'text-blue-400' },
            { label: 'Ejecutados',    valor: stats.ejecutados,         icon: Siren,          color: 'text-emerald-400' },
            { label: 'Cumplimiento',  valor: `${stats.cumplimiento}%`, icon: TrendingUp,     color: 'text-roka-400' },
            { label: 'Eval. promedio', valor: stats.promedio_evaluacion ? `${stats.promedio_evaluacion}/5` : '—', icon: Star, color: 'text-amber-400' },
            { label: 'Tpo. respuesta', valor: stats.promedio_tiempo_respuesta ? `${stats.promedio_tiempo_respuesta} min` : '—', icon: Clock, color: 'text-violet-400' },
          ].map(({ label, valor, icon: Icon, color }) => (
            <div key={label} className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-slate-900 ${color}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{valor ?? '—'}</p>
                  <p className="text-xs text-slate-400">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Próximo simulacro */}
      {stats?.proximo && (
        <div className="bg-gradient-to-r from-roka-500/10 to-blue-500/10 rounded-xl border border-roka-500/20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{TIPO_ICONOS[stats.proximo.tipo]}</span>
            <div>
              <p className="text-sm text-slate-400">Próximo simulacro</p>
              <p className="text-white font-medium">{stats.proximo.nombre}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-roka-400 font-medium">{format(new Date(stats.proximo.fecha_programada), 'dd/MM/yyyy')}</p>
            <p className="text-xs text-slate-400">{TIPOS[stats.proximo.tipo]}</p>
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
              {['Tipo', 'Nombre', 'Fecha', 'Lugar', 'Coordinador', 'Eval.', 'Estado'].map(h => (
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
            ) : simulacros.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-500">No hay simulacros registrados</td></tr>
            ) : simulacros.map(s => (
              <tr key={s.id} onClick={() => navigate(`/simulacros/${s.id}`)}
                className="hover:bg-slate-700/50 cursor-pointer transition-colors">
                <td className="px-4 py-3">
                  <span className="text-lg mr-1">{TIPO_ICONOS[s.tipo]}</span>
                  <span className="text-slate-400 text-xs">{TIPOS[s.tipo]}</span>
                </td>
                <td className="px-4 py-3 text-slate-200 font-medium">{s.nombre}</td>
                <td className="px-4 py-3 text-slate-400">
                  {s.fecha_programada ? format(new Date(s.fecha_programada), 'dd/MM/yyyy') : '—'}
                </td>
                <td className="px-4 py-3 text-slate-400">{s.lugar || '—'}</td>
                <td className="px-4 py-3 text-slate-400">
                  {s.coordinador ? `${s.coordinador.nombres} ${s.coordinador.apellidos}` : '—'}
                </td>
                <td className="px-4 py-3">
                  {s.promedio_evaluacion != null ? (
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-amber-400 fill-amber-400" />
                      <span className="text-amber-400 font-medium">{s.promedio_evaluacion}</span>
                    </div>
                  ) : <span className="text-slate-600">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full border ${ESTADOS[s.estado]?.color}`}>
                    {ESTADOS[s.estado]?.label || s.estado}
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
