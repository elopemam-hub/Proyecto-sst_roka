import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, AlertCircle, AlertTriangle, Skull, Activity } from 'lucide-react'
import api from '../../services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const TIPOS = {
  accidente_leve:           { label: 'Accidente Leve',          color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  accidente_incapacitante:  { label: 'Accidente Incapacitante', color: 'text-amber-400',  bg: 'bg-amber-500/10' },
  accidente_mortal:         { label: 'Accidente Mortal',        color: 'text-red-500',    bg: 'bg-red-500/10' },
  incidente_peligroso:      { label: 'Incidente Peligroso',     color: 'text-orange-400', bg: 'bg-orange-500/10' },
  incidente:                { label: 'Incidente',               color: 'text-slate-400',  bg: 'bg-slate-500/10' },
}

const ESTADOS = {
  registrado:        'Registrado',
  en_investigacion:  'En Investigación',
  investigado:       'Investigado',
  notificado_mintra: 'Notificado MINTRA',
  cerrado:           'Cerrado',
}

export default function AccidenteListPage() {
  const navigate   = useNavigate()
  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [pagina, setPagina]       = useState(1)
  const [meta, setMeta]           = useState(null)
  const [stats, setStats]         = useState(null)

  useEffect(() => { cargar() }, [search, filtroTipo, filtroEstado, pagina])
  useEffect(() => { cargarStats() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const params = { page: pagina, per_page: 20 }
      if (search)      params.search = search
      if (filtroTipo)  params.tipo   = filtroTipo
      if (filtroEstado)params.estado = filtroEstado
      const { data } = await api.get('/accidentes', { params })
      setItems(data.data)
      setMeta(data.meta || data)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const cargarStats = async () => {
    try {
      const { data } = await api.get('/accidentes/estadisticas')
      setStats(data)
    } catch { /* silent */ }
  }

  const totalPorTipo = (tipo) => stats?.por_tipo?.find(t => t.tipo === tipo)?.total ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Accidentes e Incidentes</h1>
          <p className="text-slate-400 text-sm mt-1">Ley 29783 Art. 82 · RM-050-2013-TR Registros 01–03</p>
        </div>
        <button
          onClick={() => navigate('/accidentes/nuevo')}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Registrar Evento
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Leve',          valor: totalPorTipo('accidente_leve'),          icon: Activity,      color: 'text-blue-400' },
          { label: 'Incapacitante', valor: totalPorTipo('accidente_incapacitante'), icon: AlertCircle,   color: 'text-amber-400' },
          { label: 'Mortal',        valor: totalPorTipo('accidente_mortal'),        icon: Skull,         color: 'text-red-400' },
          { label: 'Sin notificar', valor: stats?.sin_notificar ?? 0,               icon: AlertTriangle, color: 'text-orange-400' },
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
            placeholder="Buscar por código o descripción..."
            className="bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none flex-1"
          />
        </div>
        <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPagina(1) }}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2">
          <option value="">Todos los tipos</option>
          {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPagina(1) }}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              {['Código', 'Tipo', 'Fecha', 'Accidentado', 'Área', 'Días perdidos', 'MINTRA', 'Estado'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-500">Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-500">No se encontraron registros</td></tr>
            ) : items.map(acc => (
              <tr key={acc.id} onClick={() => navigate(`/accidentes/${acc.id}`)}
                className="hover:bg-slate-700/50 cursor-pointer transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-roka-300">{acc.codigo}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${TIPOS[acc.tipo]?.bg} ${TIPOS[acc.tipo]?.color}`}>
                    {TIPOS[acc.tipo]?.label || acc.tipo}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {format(new Date(acc.fecha_accidente), 'dd MMM yyyy HH:mm', { locale: es })}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {acc.accidentado ? `${acc.accidentado.nombres} ${acc.accidentado.apellidos}` : '—'}
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">{acc.area?.nombre}</td>
                <td className="px-4 py-3 text-center">
                  {acc.dias_perdidos > 0 ? (
                    <span className="text-amber-400 font-medium">{acc.dias_perdidos}</span>
                  ) : <span className="text-slate-600">0</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {acc.notificado_mintra
                    ? <span className="text-emerald-400 text-xs">✓ Notificado</span>
                    : ['accidente_mortal','accidente_incapacitante','incidente_peligroso'].includes(acc.tipo)
                    ? <span className="text-red-400 text-xs">Pendiente</span>
                    : <span className="text-slate-600 text-xs">N/A</span>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">{ESTADOS[acc.estado] || acc.estado}</td>
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
