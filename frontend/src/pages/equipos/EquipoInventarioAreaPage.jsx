import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MapPin, ChevronDown, ChevronRight,
  ClipboardCheck, Package, Search, CheckCircle2,
  AlertTriangle, Wrench, X,
} from 'lucide-react'
import api from '../../services/api'

const TIPO_LABEL = {
  maquinaria:     { label: 'Maquinaria',      color: 'bg-blue-50 text-blue-700' },
  herramienta:    { label: 'Herramienta',      color: 'bg-teal-50 text-teal-700' },
  instrumento:    { label: 'Instrumento',      color: 'bg-indigo-50 text-indigo-700' },
  equipo_medicion:{ label: 'Eq. medición',     color: 'bg-violet-50 text-violet-700' },
  electrico:      { label: 'Eléctrico',        color: 'bg-yellow-50 text-yellow-700' },
  vehiculo:       { label: 'Vehículo',         color: 'bg-orange-50 text-orange-700' },
  extintor:       { label: '🔥 Extintor',      color: 'bg-red-50 text-red-700' },
  emergencias:    { label: '🚨 Emergencias',   color: 'bg-rose-50 text-rose-700' },
  otro:           { label: 'Otro',             color: 'bg-gray-50 text-gray-600' },
}

const ESTADO_CFG = {
  operativo:     { label: 'Operativo',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  mantenimiento: { label: 'Mantenimiento', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  baja:          { label: 'Baja',          cls: 'bg-red-50 text-red-700 border-red-200' },
}

// Colores de área rotando por índice — paleta clara/suave
const AREA_COLORS = [
  { bg: 'bg-blue-50',    light: 'bg-white',    border: 'border-blue-200',    text: 'text-blue-700',    badge: 'bg-blue-100 text-blue-700 border-blue-200',    head: 'text-blue-800' },
  { bg: 'bg-emerald-50', light: 'bg-white',    border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', head: 'text-emerald-800' },
  { bg: 'bg-violet-50',  light: 'bg-white',    border: 'border-violet-200',  text: 'text-violet-700',  badge: 'bg-violet-100 text-violet-700 border-violet-200',  head: 'text-violet-800' },
  { bg: 'bg-amber-50',   light: 'bg-white',    border: 'border-amber-200',   text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-700 border-amber-200',     head: 'text-amber-800' },
  { bg: 'bg-rose-50',    light: 'bg-white',    border: 'border-rose-200',    text: 'text-rose-700',    badge: 'bg-rose-100 text-rose-700 border-rose-200',        head: 'text-rose-800' },
  { bg: 'bg-teal-50',    light: 'bg-white',    border: 'border-teal-200',    text: 'text-teal-700',    badge: 'bg-teal-100 text-teal-700 border-teal-200',        head: 'text-teal-800' },
  { bg: 'bg-orange-50',  light: 'bg-white',    border: 'border-orange-200',  text: 'text-orange-700',  badge: 'bg-orange-100 text-orange-700 border-orange-200',  head: 'text-orange-800' },
  { bg: 'bg-cyan-50',    light: 'bg-white',    border: 'border-cyan-200',    text: 'text-cyan-700',    badge: 'bg-cyan-100 text-cyan-700 border-cyan-200',        head: 'text-cyan-800' },
]

function TarjetaArea({ area, equipos, color, onInspeccionar, onEditar }) {
  const [abierto, setAbierto] = useState(false)
  const operativos    = equipos.filter(e => e.estado === 'operativo').length
  const mantenimiento = equipos.filter(e => e.estado === 'mantenimiento').length
  const conChecklist  = equipos.filter(e => e.equipo_catalogo_id).length

  return (
    <div className={`rounded-2xl border ${color.border} overflow-hidden shadow-sm`}>
      {/* Header de área */}
      <button
        onClick={() => setAbierto(!abierto)}
        className={`w-full flex items-center gap-4 px-5 py-4 ${color.bg} hover:brightness-97 transition-all text-left`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${color.border}`}>
          <MapPin size={16} className={color.text} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-base leading-tight ${color.head || color.text}`}>{area}</h3>
          <p className="text-gray-400 text-xs mt-0.5">{equipos.length} equipo{equipos.length !== 1 ? 's' : ''} registrados</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {operativos > 0 && (
            <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
              {operativos} operativo{operativos !== 1 ? 's' : ''}
            </span>
          )}
          {mantenimiento > 0 && (
            <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
              {mantenimiento} mant.
            </span>
          )}
          {conChecklist > 0 && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${color.badge}`}>
              {conChecklist} 📋
            </span>
          )}
          {abierto
            ? <ChevronDown size={15} className="text-gray-400" />
            : <ChevronRight size={15} className="text-gray-400" />}
        </div>
      </button>

      {/* Lista de equipos */}
      {abierto && (
        <div className={`${color.light}`}>
          {equipos.length === 0 ? (
            <div className="flex items-center gap-2 px-5 py-4 text-gray-400 text-sm">
              <Package size={14} /> Sin equipos en esta área
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/60">
                  <tr>
                    {['Código', 'Nombre', 'Tipo', 'Checklist', 'Estado', 'Acciones'].map(h => (
                      <th key={h} className={`text-left px-4 py-2.5 text-[11px] font-semibold uppercase ${color.text}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/50">
                  {equipos.map(e => (
                    <tr key={e.id} className="hover:bg-white/50 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-600 font-semibold">{e.codigo || '—'}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-800 font-medium max-w-[220px]">
                        <span className="block truncate" title={e.nombre}>{e.nombre}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        {e.tipo && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_LABEL[e.tipo]?.color || 'bg-gray-50 text-gray-600'}`}>
                            {TIPO_LABEL[e.tipo]?.label || e.tipo}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {e.equipo_catalogo ? (
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${color.badge}`}>
                            <span className="font-mono">{e.equipo_catalogo.codigo}</span>
                            <span className="hidden sm:inline">{e.equipo_catalogo.nombre}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ESTADO_CFG[e.estado]?.cls || ''}`}>
                          {ESTADO_CFG[e.estado]?.label || e.estado}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => onEditar(e.id)}
                            className="text-xs text-gray-500 hover:text-gray-700 font-medium">
                            Editar
                          </button>
                          {e.equipo_catalogo_id && (
                            <button onClick={() => onInspeccionar(e.equipo_catalogo_id)}
                              className={`inline-flex items-center gap-1 text-xs font-medium border px-2 py-0.5 rounded-full transition-colors ${color.badge} hover:brightness-95`}>
                              <ClipboardCheck size={10} /> Inspeccionar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function EquipoInventarioAreaPage() {
  const navigate = useNavigate()
  const [todos, setTodos]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [busq, setBusq]           = useState('')

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/equipos', { params: { per_page: 500 } })
      setTodos(data.data || data)
    } catch { } finally { setLoading(false) }
  }

  // Agrupar por área, filtrar por búsqueda
  const equiposFiltrados = busq.trim()
    ? todos.filter(e =>
        e.nombre.toLowerCase().includes(busq.toLowerCase()) ||
        e.codigo?.toLowerCase().includes(busq.toLowerCase()) ||
        e.area?.nombre?.toLowerCase().includes(busq.toLowerCase()))
    : todos

  // Agrupar por nombre de área
  const porArea = {}
  equiposFiltrados.forEach(e => {
    const areaNombre = e.area?.nombre || 'Sin área asignada'
    if (!porArea[areaNombre]) porArea[areaNombre] = []
    porArea[areaNombre].push(e)
  })

  // Ordenar áreas: las que tienen equipos primero, luego alfabético
  const areasOrdenadas = Object.keys(porArea).sort((a, b) => {
    if (a === 'Sin área asignada') return 1
    if (b === 'Sin área asignada') return -1
    return porArea[b].length - porArea[a].length || a.localeCompare(b)
  })

  // KPIs globales
  const totalEquipos    = todos.length
  const totalAreas      = Object.keys(porArea).filter(a => a !== 'Sin área asignada').length
  const operativos      = todos.filter(e => e.estado === 'operativo').length
  const sinArea         = todos.filter(e => !e.area_id).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/equipos')} className="btn-back">
            <ArrowLeft size={14} /> Equipos
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventario por Área</h1>
            <p className="text-gray-500 text-sm mt-0.5">Equipos clasificados por área de ubicación</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total equipos',    val: totalEquipos, color: 'text-gray-800',    bg: 'bg-white',        icon: Wrench },
          { label: 'Áreas con equipos',val: totalAreas,   color: 'text-blue-600',    bg: 'bg-blue-50',      icon: MapPin },
          { label: 'Operativos',       val: operativos,   color: 'text-emerald-600', bg: 'bg-emerald-50',   icon: CheckCircle2 },
          { label: 'Sin área asignada',val: sinArea,      color: sinArea > 0 ? 'text-amber-600' : 'text-gray-400', bg: sinArea > 0 ? 'bg-amber-50' : 'bg-gray-50', icon: AlertTriangle },
        ].map(({ label, val, color, bg, icon: Icon }) => (
          <div key={label} className={`${bg} rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3`}>
            <Icon size={20} className={`${color} flex-shrink-0`} />
            <div>
              <p className={`text-2xl font-black ${color}`}>{val}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={busq} onChange={e => setBusq(e.target.value)}
          placeholder="Buscar equipo o área..."
          className="w-full border border-gray-300 rounded-lg pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
        {busq && (
          <button onClick={() => setBusq('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Lista por área */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {areasOrdenadas.map((area, idx) => (
            <TarjetaArea
              key={area}
              area={area}
              equipos={porArea[area]}
              color={area === 'Sin área asignada'
                ? { bg: 'bg-gray-50', light: 'bg-white', border: 'border-gray-200', text: 'text-gray-500', head: 'text-gray-600', badge: 'bg-gray-100 text-gray-600 border-gray-200' }
                : AREA_COLORS[idx % AREA_COLORS.length]}
              onInspeccionar={catId => navigate(`/inspecciones/checklist/nueva?catalogo_id=${catId}`)}
              onEditar={id => navigate(`/equipos/${id}/editar`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
