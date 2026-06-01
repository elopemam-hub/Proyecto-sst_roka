import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Wrench, CheckCircle2, AlertTriangle, Clock, LayoutList, BookOpen, ClipboardList, ClipboardCheck, ShieldAlert, Search, X, MapPin } from 'lucide-react'
import api from '../../services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const TIPOS = {
  maquinaria: 'Maquinaria', herramienta: 'Herramienta',
  instrumento: 'Instrumento', equipo_medicion: 'Eq. medición',
  electrico: 'Eléctrico', vehiculo: 'Vehículo',
  extintor: '🔥 Extintor', emergencias: '🚨 Emergencias', otro: 'Otro',
}
const ESTADOS = {
  operativo:      { label: 'Operativo',       color: 'bg-emerald-50 text-emerald-700' },
  mantenimiento:  { label: 'Mantenimiento',   color: 'bg-amber-50 text-amber-700' },
  baja:           { label: 'Baja',            color: 'bg-red-50 text-red-700' },
}

const fechaColor = (fecha) => {
  if (!fecha) return 'text-gray-400'
  const dias = Math.ceil((new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24))
  if (dias < 0)   return 'text-red-600 font-semibold'
  if (dias <= 30) return 'text-amber-600 font-semibold'
  return 'text-gray-700'
}

export default function EquipoListPage() {
  const navigate = useNavigate()
  const [equipos, setEquipos] = useState([])
  const [stats, setStats]     = useState(null)
  const [areas, setAreas]     = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo]     = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroArea, setFiltroArea]     = useState('')
  const [busqueda, setBusqueda]         = useState('')
  const [pagina, setPagina]             = useState(1)
  const [meta, setMeta]                 = useState(null)

  useEffect(() => { setPagina(1) }, [filtroTipo, filtroEstado, filtroArea, busqueda])
  useEffect(() => { cargar() }, [filtroTipo, filtroEstado, filtroArea, busqueda, pagina])
  useEffect(() => { cargarStats(); cargarAreas() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const params = { per_page: 15, page: pagina }
      if (filtroTipo)   params.tipo    = filtroTipo
      if (filtroEstado) params.estado  = filtroEstado
      if (filtroArea)   params.area_id = filtroArea
      if (busqueda.trim()) params.search = busqueda.trim()
      const { data } = await api.get('/equipos', { params })
      setEquipos(data.data || [])
      // Laravel devuelve paginación en la raíz: { data, current_page, last_page, total, from, to }
      if (data.last_page) {
        setMeta({
          current_page: data.current_page,
          last_page:    data.last_page,
          total:        data.total,
          from:         data.from,
          to:           data.to,
        })
      } else {
        setMeta(null)
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const cargarStats = async () => {
    try {
      const { data } = await api.get('/equipos/estadisticas')
      setStats(data)
    } catch { /* silent */ }
  }

  const cargarAreas = async () => {
    try {
      const { data } = await api.get('/areas').catch(() => ({ data: [] }))
      setAreas(Array.isArray(data) ? data : (data.data || []))
    } catch { /* silent */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipos</h1>
          <p className="text-gray-500 text-sm mt-1">Control de equipos, maquinaria e instrumentos</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button onClick={() => navigate('/equipos/catalogo')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <BookOpen size={14} /> Catálogo de tipos
          </button>
          <button onClick={() => navigate('/equipos/preguntas')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <ClipboardList size={14} /> Banco de preguntas
          </button>
          <button onClick={() => navigate('/equipos/inventario')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <LayoutList size={15} /> Inventario por tipo
          </button>
          <button onClick={() => navigate('/equipos/inventario-area')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <MapPin size={15} /> Inventario por área
          </button>
          <button onClick={() => navigate('/equipos/emergencia')}
            className="flex items-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-medium">
            <ShieldAlert size={15} /> Inventario Emergencia
          </button>
          <button onClick={() => navigate('/equipos/nuevo')}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Nuevo Equipo
          </button>
        </div>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total equipos',       valor: stats.total,           icon: Wrench,       color: 'text-gray-700',    bg: 'bg-gray-100' },
            { label: 'Operativos',          valor: stats.operativos,      icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'En mantenimiento',    valor: stats.mantenimiento,   icon: AlertTriangle,color: 'text-amber-600',   bg: 'bg-amber-50' },
            { label: 'Próx. calibración',   valor: stats.prox_calibracion,icon: Clock,        color: 'text-blue-600',    bg: 'bg-blue-50' },
          ].map(({ label, valor, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon size={18} className={color} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${color}`}>{valor ?? 0}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        {/* Buscador */}
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por código o nombre..."
            className="w-full border border-gray-300 text-gray-700 text-sm rounded-lg pl-8 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todos los tipos</option>
          {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)}
          className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todas las áreas</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
        {(busqueda || filtroTipo || filtroEstado || filtroArea) && (
          <button
            onClick={() => { setBusqueda(''); setFiltroTipo(''); setFiltroEstado(''); setFiltroArea('') }}
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Código', 'Nombre', 'Tipo', 'Checklist', 'Área', 'Últ. mantenimiento', 'Próx. calibración', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            ) : equipos.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">No se encontraron equipos</td></tr>
            ) : equipos.map(e => (
              <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{e.codigo || '—'}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{e.nombre}</td>
                <td className="px-4 py-3 text-gray-500">{TIPOS[e.tipo] || e.tipo || '—'}</td>
                <td className="px-4 py-3">
                  {e.equipo_catalogo ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                      {e.equipo_catalogo.codigo && <span className="font-mono">{e.equipo_catalogo.codigo}</span>}
                      {e.equipo_catalogo.nombre}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">Sin checklist</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">{e.area?.nombre || '—'}</td>
                <td className={`px-4 py-3 ${fechaColor(e.fecha_ultimo_mantenimiento)}`}>
                  {e.fecha_ultimo_mantenimiento
                    ? format(new Date(e.fecha_ultimo_mantenimiento), 'dd MMM yyyy', { locale: es })
                    : '—'}
                </td>
                <td className={`px-4 py-3 ${fechaColor(e.fecha_proxima_calibracion)}`}>
                  {e.fecha_proxima_calibracion
                    ? format(new Date(e.fecha_proxima_calibracion), 'dd MMM yyyy', { locale: es })
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADOS[e.estado]?.color || 'bg-gray-100 text-gray-600'}`}>
                    {ESTADOS[e.estado]?.label || e.estado}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/equipos/${e.id}/editar`)}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium">Editar</button>
                    {e.equipo_catalogo_id && (
                      <button
                        onClick={() => navigate(`/inspecciones/checklist/nueva?catalogo_id=${e.equipo_catalogo_id}`)}
                        className="inline-flex items-center gap-1 text-xs text-roka-600 hover:text-roka-700 font-medium border border-roka-200 hover:border-roka-400 bg-roka-50 hover:bg-roka-100 px-2 py-0.5 rounded-full transition-colors"
                        title="Iniciar inspección checklist">
                        <ClipboardCheck size={11} /> Inspeccionar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paginación */}
        {meta && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              {meta.total > 0
                ? `Mostrando ${meta.from}–${meta.to} de ${meta.total} equipos`
                : 'Sin resultados'}
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={pagina === 1}
                onClick={() => setPagina(p => p - 1)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100 text-gray-600 transition-colors">
                ← Anterior
              </button>
              {Array.from({ length: meta.last_page }, (_, i) => i + 1)
                .filter(p => p === 1 || p === meta.last_page || Math.abs(p - pagina) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) => p === '...'
                  ? <span key={`e${i}`} className="px-2 text-xs text-gray-400">…</span>
                  : <button key={p}
                      onClick={() => setPagina(p)}
                      className={`w-8 h-7 text-xs rounded-lg border transition-colors ${pagina === p ? 'bg-roka-500 text-white border-roka-500' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}>
                      {p}
                    </button>
                )}
              <button
                disabled={pagina === meta.last_page}
                onClick={() => setPagina(p => p + 1)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100 text-gray-600 transition-colors">
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
