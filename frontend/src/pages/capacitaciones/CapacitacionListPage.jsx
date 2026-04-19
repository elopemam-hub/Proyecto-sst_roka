import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, GraduationCap, CalendarCheck, Clock, Users, TrendingUp, Search } from 'lucide-react'
import api from '../../services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADOS = {
  programada:   { label: 'Programada',   color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  ejecutada:    { label: 'Ejecutada',    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cancelada:    { label: 'Cancelada',    color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  reprogramada: { label: 'Reprogramada', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
}

const TIPOS = {
  induccion:       'Inducción',
  especifica:      'Específica',
  general:         'General',
  sensibilizacion: 'Sensibilización',
}

const MODALIDADES = {
  presencial: 'Presencial',
  virtual:    'Virtual',
  mixto:      'Mixto',
}

export default function CapacitacionListPage() {
  const navigate = useNavigate()
  const [capacitaciones, setCapacitaciones] = useState([])
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado]       = useState('')
  const [filtroTipo, setFiltroTipo]           = useState('')
  const [filtroSearch, setFiltroSearch]       = useState('')
  const [pagina, setPagina]   = useState(1)
  const [meta, setMeta]       = useState(null)

  useEffect(() => { cargarStats() }, [])
  useEffect(() => { cargarCapacitaciones() }, [filtroEstado, filtroTipo, pagina])

  const cargarStats = async () => {
    try {
      const { data } = await api.get('/capacitaciones/estadisticas')
      setStats(data)
    } catch { /* silent */ }
  }

  const cargarCapacitaciones = async () => {
    setLoading(true)
    try {
      const params = { page: pagina, per_page: 15 }
      if (filtroEstado)  params.estado = filtroEstado
      if (filtroTipo)    params.tipo   = filtroTipo
      if (filtroSearch)  params.search = filtroSearch
      const { data } = await api.get('/capacitaciones', { params })
      setCapacitaciones(data.data || data)
      setMeta(data.meta || null)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const buscar = (e) => {
    e.preventDefault()
    setPagina(1)
    cargarCapacitaciones()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Capacitaciones</h1>
          <p className="text-slate-400 text-sm mt-1">Programa de capacitación SST · Art. 35 Ley 29783</p>
        </div>
        <button
          onClick={() => navigate('/capacitaciones/nueva')}
          className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-roka-500/20"
        >
          <Plus size={16} /> Nueva Capacitación
        </button>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Programadas',    valor: stats.programadas,            icon: CalendarCheck,  color: 'text-blue-400' },
            { label: 'Ejecutadas',     valor: stats.ejecutadas,             icon: GraduationCap,  color: 'text-emerald-400' },
            { label: 'Cumplimiento',   valor: `${stats.cumplimiento}%`,     icon: TrendingUp,     color: 'text-roka-400' },
            { label: 'Horas acumuladas', valor: stats.horas_acumuladas,     icon: Clock,          color: 'text-amber-400' },
            { label: '% Asistencia',   valor: stats.porcentaje_asistencia != null ? `${stats.porcentaje_asistencia}%` : '—', icon: Users, color: 'text-violet-400' },
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
            <input
              type="text" placeholder="Buscar por título, tema..."
              value={filtroSearch} onChange={e => setFiltroSearch(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg pl-9 pr-3 py-2 w-56"
            />
          </div>
          <button type="submit" className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors">
            Buscar
          </button>
        </form>
      </div>

      {/* Tabla */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              {['Título', 'Tipo', 'Modalidad', 'Fecha Prog.', 'Expositor', 'Duración', 'Asistencia', 'Estado'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-500">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
                  Cargando...
                </div>
              </td></tr>
            ) : capacitaciones.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-500">No hay capacitaciones registradas</td></tr>
            ) : capacitaciones.map(c => (
              <tr key={c.id} onClick={() => navigate(`/capacitaciones/${c.id}`)}
                className="hover:bg-slate-700/50 cursor-pointer transition-colors">
                <td className="px-4 py-3">
                  <div className="text-slate-200 font-medium">{c.titulo}</div>
                  {c.tema && <div className="text-xs text-slate-500 truncate max-w-48">{c.tema}</div>}
                </td>
                <td className="px-4 py-3 text-slate-400">{TIPOS[c.tipo] || c.tipo}</td>
                <td className="px-4 py-3 text-slate-400">{MODALIDADES[c.modalidad] || c.modalidad}</td>
                <td className="px-4 py-3 text-slate-400">
                  {c.fecha_programada ? format(new Date(c.fecha_programada), 'dd/MM/yyyy') : '—'}
                </td>
                <td className="px-4 py-3 text-slate-400">{c.expositor || '—'}</td>
                <td className="px-4 py-3 text-slate-300 font-mono">{c.duracion_horas}h</td>
                <td className="px-4 py-3 text-slate-400">
                  {c.porcentaje_asistencia != null
                    ? <span className={`font-medium ${c.porcentaje_asistencia >= 80 ? 'text-emerald-400' : c.porcentaje_asistencia >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                        {c.porcentaje_asistencia}%
                      </span>
                    : <span className="text-slate-600">—</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full border ${ESTADOS[c.estado]?.color}`}>
                    {ESTADOS[c.estado]?.label || c.estado}
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
