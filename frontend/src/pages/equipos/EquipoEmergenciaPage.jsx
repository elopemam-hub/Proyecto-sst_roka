import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Flame, HeartPulse, DoorOpen, Radio,
  ChevronDown, ChevronRight, ClipboardCheck, AlertTriangle,
  CheckCircle2, Package, Search,
} from 'lucide-react'
import api from '../../services/api'

const CATEGORIAS = [
  {
    key: 'contra_incendio',
    label: 'Contra Incendio',
    icon: Flame,
    color: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500', header: 'bg-red-600', badge: 'bg-red-100 text-red-700 border-red-200' },
  },
  {
    key: 'primeros_auxilios',
    label: 'Primeros Auxilios',
    icon: HeartPulse,
    color: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', header: 'bg-emerald-600', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  },
  {
    key: 'evacuacion',
    label: 'Evacuación',
    icon: DoorOpen,
    color: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', header: 'bg-amber-600', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  },
  {
    key: 'comunicaciones',
    label: 'Comunicaciones',
    icon: Radio,
    color: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500', header: 'bg-blue-600', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  },
]

const ESTADO_CFG = {
  operativo:     { label: 'Operativo',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  mantenimiento: { label: 'Mantenimiento', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  baja:          { label: 'Baja',          cls: 'bg-red-50 text-red-700 border-red-200' },
}

function TarjetaTipo({ catalogo, activos, color, onInspeccionar }) {
  const [abierto, setAbierto] = useState(false)
  const operativos = activos.filter(a => a.estado === 'operativo').length

  return (
    <div className={`rounded-xl border ${color.border} overflow-hidden`}>
      <button
        onClick={() => setAbierto(!abierto)}
        className={`w-full flex items-center gap-3 px-4 py-3 ${color.bg} hover:brightness-95 transition-all text-left`}>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {catalogo.codigo && (
              <span className="text-[10px] font-mono font-bold text-gray-500 bg-white/70 px-1.5 py-0.5 rounded border border-gray-200">
                {catalogo.codigo}
              </span>
            )}
            <span className={`text-sm font-semibold ${color.text}`}>{catalogo.nombre}</span>
          </div>
          <span className="text-xs text-gray-400 mt-0.5">
            {catalogo.preguntas_count ?? 0} preguntas checklist
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {activos.length > 0 ? (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${color.badge}`}>
              {activos.length} unidad{activos.length !== 1 ? 'es' : ''}
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-gray-100 text-gray-400 border-gray-200">
              Sin unidades
            </span>
          )}
          {abierto ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
        </div>
      </button>

      {abierto && (
        <div className="bg-white border-t border-gray-100">
          {activos.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-3 text-gray-400 text-xs">
              <Package size={14} /> Sin unidades físicas registradas
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Código', 'Nombre', 'Área', 'Estado', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-[11px] font-medium text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activos.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs text-gray-500">{a.codigo || '—'}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 font-medium">{a.nombre}</td>
                    <td className="px-4 py-2 text-xs text-gray-400">{a.area?.nombre || '—'}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ESTADO_CFG[a.estado]?.cls || ''}`}>
                        {ESTADO_CFG[a.estado]?.label || a.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {catalogo.preguntas_count > 0 && (
                        <button
                          onClick={() => onInspeccionar(catalogo.id)}
                          className={`inline-flex items-center gap-1 text-xs font-medium border px-2 py-0.5 rounded-full transition-colors ${color.badge} hover:brightness-95`}>
                          <ClipboardCheck size={11} /> Inspeccionar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function SeccionCategoria({ categoria, catalogos, inventario, onInspeccionar }) {
  const { label, icon: Icon, color } = categoria
  const totalUnidades  = catalogos.reduce((s, c) => s + (inventario[c.id]?.length || 0), 0)
  const totalOperativos = catalogos.reduce((s, c) =>
    s + (inventario[c.id]?.filter(a => a.estado === 'operativo').length || 0), 0)
  const sinUnidades = catalogos.filter(c => !(inventario[c.id]?.length)).length

  return (
    <div className={`rounded-2xl border ${color.border} overflow-hidden shadow-sm`}>
      {/* Header de categoría */}
      <div className={`${color.header} px-5 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Icon size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">{label}</h3>
            <p className="text-white/70 text-xs">{catalogos.length} tipo{catalogos.length !== 1 ? 's' : ''} de equipo</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="text-2xl font-black text-white">{totalUnidades}</p>
            <p className="text-white/70 text-[10px] leading-tight">unidades</p>
          </div>
          <div className="flex flex-col gap-1">
            {totalOperativos > 0 && (
              <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">
                {totalOperativos} operativo{totalOperativos !== 1 ? 's' : ''}
              </span>
            )}
            {sinUnidades > 0 && (
              <span className="text-[10px] bg-white/10 text-white/80 px-2 py-0.5 rounded-full font-medium">
                {sinUnidades} sin unidades
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Lista de tipos */}
      <div className={`${color.bg} p-3 space-y-2`}>
        {catalogos.map(cat => (
          <TarjetaTipo
            key={cat.id}
            catalogo={cat}
            activos={inventario[cat.id] || []}
            color={color}
            onInspeccionar={onInspeccionar}
          />
        ))}
      </div>
    </div>
  )
}

export default function EquipoEmergenciaPage() {
  const navigate = useNavigate()
  const [catalogos, setCatalogos]   = useState([])
  const [inventario, setInventario] = useState({})
  const [loading, setLoading]       = useState(true)
  const [tabActivo, setTabActivo]   = useState('todos')
  const [busq, setBusq]             = useState('')

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/checklist/inventario-resumen')
      const emergencia = (Array.isArray(data) ? data : []).filter(c => c.submodulo?.codigo === 'C')
      setCatalogos(emergencia)
      const inv = {}
      emergencia.forEach(c => { inv[c.id] = c.activos || [] })
      setInventario(inv)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const onInspeccionar = (catalogoId) => {
    navigate(`/inspecciones/checklist/nueva?catalogo_id=${catalogoId}`)
  }

  // Estadísticas globales
  const totalUnidades   = Object.values(inventario).flat().length
  const totalOperativos = Object.values(inventario).flat().filter(a => a.estado === 'operativo').length
  const totalMant       = Object.values(inventario).flat().filter(a => a.estado === 'mantenimiento').length

  const filtrarCatalogos = (catKey) => {
    let lista = catKey === 'todos'
      ? catalogos
      : catalogos.filter(c => c.categoria_emergencia === catKey)
    if (busq) lista = lista.filter(c =>
      c.nombre.toLowerCase().includes(busq.toLowerCase()) ||
      c.codigo?.toLowerCase().includes(busq.toLowerCase()))
    return lista
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/equipos')} className="btn-back">
            <ArrowLeft size={14} /> Equipos
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventario de Emergencia</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Equipos de emergencia clasificados por categoría · Sub-módulo C
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total unidades',   val: totalUnidades,   color: 'text-gray-800',    bg: 'bg-white' },
          { label: 'Operativas',       val: totalOperativos, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'En mantenimiento', val: totalMant,       color: 'text-amber-600',   bg: 'bg-amber-50' },
          { label: 'Tipos catalogados',val: catalogos.length,color: 'text-blue-600',    bg: 'bg-blue-50' },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl border border-gray-200 shadow-sm p-4 text-center`}>
            <p className={`text-3xl font-black ${color}`}>{val}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs de categoría */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex gap-1 p-2 border-b border-gray-100 overflow-x-auto">
          <button
            onClick={() => setTabActivo('todos')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              tabActivo === 'todos' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}>
            Todos
          </button>
          {CATEGORIAS.map(c => {
            const Icon = c.icon
            const count = catalogos.filter(cat => cat.categoria_emergencia === c.key).length
            return (
              <button key={c.key} onClick={() => setTabActivo(c.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  tabActivo === c.key
                    ? `${c.color.header} text-white`
                    : `text-gray-500 hover:bg-gray-100`
                }`}>
                <Icon size={14} />
                {c.label}
                <span className={`text-[10px] px-1.5 rounded-full font-bold ${tabActivo === c.key ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Buscador */}
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 max-w-xs">
            <Search size={13} className="text-gray-400" />
            <input value={busq} onChange={e => setBusq(e.target.value)}
              placeholder="Buscar equipo..."
              className="bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400 flex-1" />
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tabActivo === 'todos' ? (
            /* Vista "Todos": 4 secciones coloreadas */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {CATEGORIAS.map(cat => {
                const cats = filtrarCatalogos(cat.key)
                return (
                  <SeccionCategoria
                    key={cat.key}
                    categoria={cat}
                    catalogos={cats}
                    inventario={inventario}
                    onInspeccionar={onInspeccionar}
                  />
                )
              })}
            </div>
          ) : (
            /* Vista por categoría seleccionada */
            (() => {
              const cat = CATEGORIAS.find(c => c.key === tabActivo)
              const cats = filtrarCatalogos(tabActivo)
              return (
                <SeccionCategoria
                  categoria={cat}
                  catalogos={cats}
                  inventario={inventario}
                  onInspeccionar={onInspeccionar}
                />
              )
            })()
          )}
        </div>
      </div>
    </div>
  )
}
