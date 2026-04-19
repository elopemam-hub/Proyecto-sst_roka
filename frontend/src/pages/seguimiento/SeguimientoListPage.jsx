import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Clock, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react'
import api from '../../services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADOS = {
  pendiente:  { label: 'Pendiente',  color: 'text-slate-400',   bg: 'bg-slate-500/10' },
  en_proceso: { label: 'En proceso', color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  completada: { label: 'Completada', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  vencida:    { label: 'Vencida',    color: 'text-red-400',     bg: 'bg-red-500/10' },
  validada:   { label: 'Validada',   color: 'text-purple-400',  bg: 'bg-purple-500/10' },
  cancelada:  { label: 'Cancelada',  color: 'text-slate-600',   bg: 'bg-slate-700/10' },
}

const PRIORIDAD_COLOR = {
  baja: 'text-slate-400', media: 'text-blue-400', alta: 'text-amber-400', critica: 'text-red-400',
}

const ORIGEN_LABEL = {
  inspeccion: 'Inspección', accidente: 'Accidente', auditoria: 'Auditoría',
  iperc: 'IPERC', ats: 'ATS', otro: 'Otro',
}

export default function SeguimientoListPage() {
  const navigate = useNavigate()
  const [items, setItems]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroPrioridad, setFiltroPrioridad] = useState('')
  const [soloVencidas, setSoloVencidas] = useState(false)
  const [pagina, setPagina]         = useState(1)
  const [meta, setMeta]             = useState(null)
  const [resumen, setResumen]       = useState(null)

  useEffect(() => { cargar() }, [search, filtroEstado, filtroTipo, filtroPrioridad, soloVencidas, pagina])
  useEffect(() => { cargarResumen() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const params = { page: pagina, per_page: 20 }
      if (search)          params.search   = search
      if (filtroEstado)    params.estado   = filtroEstado
      if (filtroTipo)      params.tipo     = filtroTipo
      if (filtroPrioridad) params.prioridad = filtroPrioridad
      if (soloVencidas)    params.vencidas = 1
      const { data } = await api.get('/seguimiento', { params })
      setItems(data.data)
      setMeta(data.meta || data)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const cargarResumen = async () => {
    try {
      const { data } = await api.get('/seguimiento/resumen')
      setResumen(data)
    } catch { /* silent */ }
  }

  const avanceColor = (pct) => {
    if (pct >= 100) return 'bg-emerald-500'
    if (pct >= 50)  return 'bg-blue-500'
    if (pct >= 25)  return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Seguimiento de Acciones</h1>
          <p className="text-slate-400 text-sm mt-1">Acciones correctivas, preventivas y de mejora</p>
        </div>
        <button
          onClick={() => navigate('/seguimiento/nueva')}
          className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> Nueva Acción
        </button>
      </div>

      {/* KPIs */}
      {resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Pendientes',  valor: resumen.totales?.pendiente ?? 0,  icon: Clock,          color: 'text-slate-400' },
            { label: 'En proceso',  valor: resumen.totales?.en_proceso ?? 0, icon: TrendingUp,     color: 'text-blue-400' },
            { label: 'Vencidas',    valor: resumen.vencidas ?? 0,            icon: AlertTriangle,  color: 'text-red-400' },
            { label: 'Próximas (7d)',valor: resumen.proximas ?? 0,           icon: CheckCircle,    color: 'text-amber-400' },
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
      )}

      {/* Filtros */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-48 bg-slate-900 rounded-lg px-3 py-2">
          <Search size={16} className="text-slate-500" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPagina(1) }}
            placeholder="Buscar por código o título..."
            className="bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none flex-1"
          />
        </div>
        <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPagina(1) }}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPagina(1) }}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2">
          <option value="">Todos los tipos</option>
          {['correctiva', 'preventiva', 'mejora', 'legal'].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
        </select>
        <select value={filtroPrioridad} onChange={e => { setFiltroPrioridad(e.target.value); setPagina(1) }}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2">
          <option value="">Todas las prioridades</option>
          {['critica', 'alta', 'media', 'baja'].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input type="checkbox" checked={soloVencidas} onChange={e => { setSoloVencidas(e.target.checked); setPagina(1) }}
            className="w-4 h-4" />
          Solo vencidas
        </label>
      </div>

      {/* Tabla */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              {['Código', 'Título', 'Tipo', 'Origen', 'Responsable', 'Fecha límite', 'Avance', 'Prioridad', 'Estado'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12 text-slate-500">Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-slate-500">No se encontraron acciones</td></tr>
            ) : items.map(acc => (
              <tr key={acc.id} onClick={() => navigate(`/seguimiento/${acc.id}`)}
                className="hover:bg-slate-700/50 cursor-pointer transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-roka-300">{acc.codigo}</td>
                <td className="px-4 py-3 text-slate-200 max-w-48 truncate">{acc.titulo}</td>
                <td className="px-4 py-3 text-slate-400 text-xs capitalize">{acc.tipo}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{ORIGEN_LABEL[acc.origen_tipo] || acc.origen_tipo}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {acc.responsable ? `${acc.responsable.nombres} ${acc.responsable.apellidos}` : '—'}
                </td>
                <td className="px-4 py-3 text-xs">
                  <span className={acc.esta_vencida ? 'text-red-400 font-medium' : 'text-slate-400'}>
                    {format(new Date(acc.fecha_limite), 'dd/MM/yyyy')}
                  </span>
                  {acc.esta_vencida && <span className="ml-1 text-red-400">⚠</span>}
                </td>
                <td className="px-4 py-3 w-24">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full rounded-full ${avanceColor(acc.porcentaje_avance)}`}
                        style={{ width: `${acc.porcentaje_avance}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">{acc.porcentaje_avance}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold capitalize ${PRIORIDAD_COLOR[acc.prioridad]}`}>
                    {acc.prioridad}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${ESTADOS[acc.estado]?.bg} ${ESTADOS[acc.estado]?.color}`}>
                    {ESTADOS[acc.estado]?.label || acc.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {meta?.last_page > 1 && (
          <div className="border-t border-slate-700 px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-slate-400">Mostrando {meta.from}–{meta.to} de {meta.total}</span>
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
