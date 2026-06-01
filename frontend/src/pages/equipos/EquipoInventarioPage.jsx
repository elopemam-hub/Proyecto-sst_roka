import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, ChevronRight, Wrench, CheckCircle2,
  AlertTriangle, Search, Link, BookOpen, Package,
} from 'lucide-react'
import api from '../../services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_CFG = {
  operativo:     { label: 'Operativo',     color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  mantenimiento: { label: 'Mantenimiento', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  baja:          { label: 'Baja',          color: 'bg-red-50 text-red-700 border-red-200' },
}

function TarjetaCatalogo({ catalogo, activos, onVerEquipo, onNuevoEquipo }) {
  const [abierto, setAbierto] = useState(false)
  const operativos    = activos.filter(a => a.estado === 'operativo').length
  const mantenimiento = activos.filter(a => a.estado === 'mantenimiento').length

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setAbierto(!abierto)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left">
        <div className="w-10 h-10 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center flex-shrink-0">
          <BookOpen size={18} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {catalogo.codigo && <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{catalogo.codigo}</span>}
            <p className="font-semibold text-gray-800">{catalogo.nombre}</p>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {catalogo.submodulo?.nombre && <span className="mr-2">Sub-módulo {catalogo.submodulo.codigo}</span>}
            {catalogo.preguntas_count > 0 && <span>{catalogo.preguntas_count} preguntas checklist</span>}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Contador de activos */}
          <div className="text-center">
            <p className="text-xl font-bold text-gray-800">{activos.length}</p>
            <p className="text-[10px] text-gray-400 leading-tight">activos</p>
          </div>
          <div className="flex flex-col gap-1">
            {operativos > 0 && (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                {operativos} operativo{operativos > 1 ? 's' : ''}
              </span>
            )}
            {mantenimiento > 0 && (
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                {mantenimiento} en mant.
              </span>
            )}
          </div>
          <button
            onClick={e => { e.stopPropagation(); onNuevoEquipo(catalogo.id) }}
            className="p-1.5 text-roka-500 hover:bg-roka-50 rounded-lg transition-colors"
            title="Agregar activo de este tipo">
            <Plus size={15} />
          </button>
          <ChevronRight size={15} className={`text-gray-400 transition-transform ${abierto ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {/* Lista de activos */}
      {abierto && (
        <div className="border-t border-gray-100">
          {activos.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin activos de este tipo</p>
              <button onClick={() => onNuevoEquipo(catalogo.id)}
                className="mt-2 text-xs text-roka-500 hover:text-roka-600 font-medium flex items-center gap-1 mx-auto">
                <Plus size={12} /> Agregar primer activo
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Código','Nombre','Serie','Área','Responsable','Últ. mantenimiento','Estado',''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activos.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{a.codigo || '—'}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{a.nombre}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{a.serie || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{a.area?.nombre || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {a.responsable ? `${a.responsable.nombres} ${a.responsable.apellidos}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">
                      {a.fecha_ultimo_mantenimiento
                        ? format(new Date(a.fecha_ultimo_mantenimiento), 'd MMM yyyy', { locale: es })
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ESTADO_CFG[a.estado]?.color || 'bg-gray-100 text-gray-500'}`}>
                        {ESTADO_CFG[a.estado]?.label || a.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => onVerEquipo(a.id)}
                        className="text-xs text-roka-500 hover:text-roka-600 font-medium">
                        Ver
                      </button>
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

export default function EquipoInventarioPage() {
  const navigate = useNavigate()
  const [catalogos, setCatalogos]   = useState([])
  const [inventario, setInventario] = useState({})   // { catalogo_id: [activos] }
  const [sinVincular, setSinVincular] = useState([]) // equipos sin catalogo_id
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      // Solo 2 llamadas en paralelo — sin N+1
      const [{ data: resumen }, { data: todos }] = await Promise.all([
        api.get('/checklist/inventario-resumen'),
        api.get('/equipos', { params: { per_page: 500 } }),
      ])

      // El resumen ya trae los activos embebidos por catálogo
      const catList = Array.isArray(resumen) ? resumen : []
      setCatalogos(catList)

      // Mapear inventario desde el resumen (activos ya incluidos)
      const invMap = {}
      catList.forEach(cat => { invMap[cat.id] = cat.activos || [] })
      setInventario(invMap)

      // Equipos sin catálogo
      const lista = todos.data || todos
      setSinVincular(lista.filter(e => !e.equipo_catalogo_id))

    } catch { } finally { setLoading(false) }
  }

  const catalogosFiltrados = catalogos.filter(c =>
    !search || c.nombre.toLowerCase().includes(search.toLowerCase()) || c.codigo?.toLowerCase().includes(search.toLowerCase())
  )

  const totalActivos    = Object.values(inventario).flat().length
  const totalVinculados = totalActivos
  const totalSinVincular= sinVincular.length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/equipos')} className="btn-back">
            <ArrowLeft size={14} /> Equipos
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventario por Tipo</h1>
            <p className="text-gray-500 text-sm mt-0.5">Activos físicos organizados por tipo de checklist de inspección</p>
          </div>
        </div>
        <button onClick={() => navigate('/equipos/nuevo')}
          className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={15} /> Nuevo equipo
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:'Tipos de equipo (catálogo)', value: catalogos.length,     color:'text-blue-600',    icon: BookOpen },
          { label:'Activos vinculados',          value: totalVinculados,      color:'text-emerald-600', icon: Link },
          { label:'Activos sin tipo asignado',   value: totalSinVincular,     color: totalSinVincular > 0 ? 'text-amber-600' : 'text-gray-400', icon: AlertTriangle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <Icon size={20} className={`${color} flex-shrink-0`} />
            <div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar tipo de equipo..."
          className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
      </div>

      {/* Lista por tipo */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {catalogosFiltrados.map(cat => (
            <TarjetaCatalogo
              key={cat.id}
              catalogo={cat}
              activos={inventario[cat.id] || []}
              onVerEquipo={(id) => navigate(`/equipos/${id}/editar`)}
              onNuevoEquipo={(catId) => navigate(`/equipos/nuevo?catalogo_id=${catId}`)}
            />
          ))}

          {/* Equipos sin tipo vinculado */}
          {sinVincular.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                    <AlertTriangle size={16} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-800">Sin tipo de checklist asignado</p>
                    <p className="text-xs text-amber-600">{sinVincular.length} equipo{sinVincular.length > 1 ? 's' : ''} sin vincular a un tipo de inspección</p>
                  </div>
                </div>
              </div>
              <div className="border-t border-amber-200 divide-y divide-amber-100">
                {sinVincular.map(e => (
                  <div key={e.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-amber-100/50 transition-colors">
                    <span className="text-xs font-mono text-amber-700 w-20">{e.codigo || '—'}</span>
                    <span className="flex-1 text-sm text-amber-800 font-medium">{e.nombre}</span>
                    <span className="text-xs text-amber-600">{e.area?.nombre || '—'}</span>
                    <button onClick={() => navigate(`/equipos/${e.id}/editar`)}
                      className="text-xs text-amber-700 hover:text-amber-900 font-medium border border-amber-300 hover:bg-amber-100 px-2 py-1 rounded-lg transition-colors">
                      Asignar tipo
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
