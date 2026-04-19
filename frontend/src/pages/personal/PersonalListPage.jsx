import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Users, UserCheck, AlertTriangle, ShieldAlert } from 'lucide-react'
import api from '../../services/api'

const ESTADOS = {
  activo:   { label: 'Activo',   color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  inactivo: { label: 'Inactivo', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  vacaciones: { label: 'Vacaciones', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  licencia:   { label: 'Licencia',   color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
}

export default function PersonalListPage() {
  const navigate = useNavigate()
  const [personal, setPersonal]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filtroArea, setFiltroArea]     = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [areas, setAreas]         = useState([])
  const [pagina, setPagina]       = useState(1)
  const [meta, setMeta]           = useState(null)
  const [stats, setStats]         = useState(null)

  useEffect(() => { cargarAreas() }, [])
  useEffect(() => { cargar() }, [search, filtroArea, filtroEstado, pagina])

  const cargarAreas = async () => {
    try {
      const { data } = await api.get('/areas')
      setAreas(data.data || data)
    } catch { /* silent */ }
  }

  const cargar = async () => {
    setLoading(true)
    try {
      const params = { page: pagina, per_page: 20 }
      if (search)       params.search  = search
      if (filtroArea)   params.area_id = filtroArea
      if (filtroEstado) params.estado  = filtroEstado
      const { data } = await api.get('/personal', { params })
      setPersonal(data.data || data)
      setMeta(data.meta || data)
      if (!stats) buildStats(data.data || data)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const buildStats = (lista) => {
    const activos = lista.filter(p => p.estado === 'activo').length
    setStats({ activos, total: lista.length })
  }

  const iniciales = (p) => {
    const n = p.nombres?.split(' ')[0] || ''
    const a = p.apellidos?.split(' ')[0] || ''
    return `${n[0] || ''}${a[0] || ''}`.toUpperCase()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestión Humana</h1>
          <p className="text-slate-400 text-sm mt-1">Personal activo · Ley 29783</p>
        </div>
        <button
          onClick={() => navigate('/personal/nuevo')}
          className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Nuevo Personal
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Personal', valor: meta?.total ?? '—', icon: Users, color: 'text-roka-400' },
          { label: 'Activos',        valor: stats?.activos ?? '—', icon: UserCheck, color: 'text-emerald-400' },
          { label: 'EMO Vencido',    valor: '—', icon: AlertTriangle, color: 'text-red-400' },
          { label: 'Con Restricciones', valor: '—', icon: ShieldAlert, color: 'text-amber-400' },
        ].map(({ label, valor, icon: Icon, color }) => (
          <div key={label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3">
              <Icon size={20} className={color} />
              <div>
                <p className="text-2xl font-bold text-white">{valor}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-48 bg-slate-900 rounded-lg px-3 py-2">
          <Search size={16} className="text-slate-500" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPagina(1) }}
            placeholder="Buscar por nombre o DNI..."
            className="bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none flex-1"
          />
        </div>
        <select
          value={filtroArea}
          onChange={e => { setFiltroArea(e.target.value); setPagina(1) }}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2"
        >
          <option value="">Todas las áreas</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
        <select
          value={filtroEstado}
          onChange={e => { setFiltroEstado(e.target.value); setPagina(1) }}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              {['Personal', 'DNI', 'Cargo', 'Área', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-500">Cargando...</td></tr>
            ) : personal.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-500">No se encontró personal</td></tr>
            ) : personal.map(p => (
              <tr key={p.id} className="hover:bg-slate-700/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-roka-500/20 text-roka-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {iniciales(p)}
                    </div>
                    <div>
                      <div className="text-slate-200 font-medium">{p.nombres} {p.apellidos}</div>
                      <div className="text-xs text-slate-500">{p.email || ''}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.dni}</td>
                <td className="px-4 py-3 text-slate-300">{p.cargo?.nombre || p.cargo || '—'}</td>
                <td className="px-4 py-3 text-slate-400">{p.area?.nombre || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full border ${ESTADOS[p.estado]?.color || ESTADOS.activo.color}`}>
                    {ESTADOS[p.estado]?.label || p.estado}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/personal/${p.id}`)}
                      className="text-xs text-roka-400 hover:text-roka-300 px-2 py-1 rounded hover:bg-slate-700"
                    >Ver</button>
                    <button
                      onClick={() => navigate(`/personal/${p.id}/editar`)}
                      className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-700"
                    >Editar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {meta && meta.last_page > 1 && (
          <div className="border-t border-slate-700 px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-slate-400">
              Mostrando {meta.from}–{meta.to} de {meta.total}
            </span>
            <div className="flex gap-2">
              <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}
                className="px-3 py-1 rounded bg-slate-700 text-slate-300 disabled:opacity-40">Anterior</button>
              <button disabled={pagina === meta.last_page} onClick={() => setPagina(p => p + 1)}
                className="px-3 py-1 rounded bg-slate-700 text-slate-300 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
