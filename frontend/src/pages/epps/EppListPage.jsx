import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, HardHat, AlertTriangle, Package, TrendingDown, Truck, Wrench, GraduationCap, BarChart3, Settings, Download, PackagePlus } from 'lucide-react'
import api from '../../services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_ENTREGA = {
  entregado: { label: 'Entregado', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  devuelto:  { label: 'Devuelto',  color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  perdido:   { label: 'Perdido',   color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

export default function EppListPage() {
  const navigate = useNavigate()
  const [tab, setTab]           = useState('inventario')
  const [items, setItems]       = useState([])
  const [entregas, setEntregas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [filtroCat, setFiltroCat]   = useState('')
  const [filtroCritico, setFiltroCritico] = useState(false)
  const [pagina, setPagina]     = useState(1)
  const [meta, setMeta]         = useState(null)

  useEffect(() => {
    cargarStats()
    cargarCategorias()
  }, [])

  useEffect(() => {
    if (tab === 'inventario') cargarInventario()
    else cargarEntregas()
  }, [tab, filtroCat, filtroCritico, pagina])

  const cargarStats = async () => {
    try {
      const { data } = await api.get('/epps/estadisticas')
      setStats(data)
    } catch { /* silent */ }
  }

  const cargarCategorias = async () => {
    try {
      const { data } = await api.get('/epps/categorias')
      setCategorias(data)
    } catch { /* silent */ }
  }

  const cargarInventario = async () => {
    setLoading(true)
    try {
      const params = { page: pagina, per_page: 20 }
      if (filtroCat)     params.categoria_id  = filtroCat
      if (filtroCritico) params.stock_critico = 1
      const { data } = await api.get('/epps', { params })
      setItems(data.data || data)
      setMeta(data.meta || null)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const cargarEntregas = async () => {
    setLoading(true)
    try {
      // Cargamos entregas de todos los EPPs (endpoint general no existe — usamos inventario + detalle)
      // Aquí se haría GET /api/epps/entregas si existiera; como workaround usamos items y sus entregas
      setEntregas([])
    } catch { /* silent */ } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">EPPs</h1>
          <p className="text-gray-500 text-sm mt-1">Inventario y control de entrega · Ley 29783 Art. 61</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => navigate('/epps/inventario-inicial')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <PackagePlus size={14} /> Inventario Inicial
          </button>
          <button onClick={() => navigate('/epps/proveedores')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Truck size={14} /> Proveedores
          </button>
          <button onClick={() => navigate('/epps/mantenimiento')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Wrench size={14} /> Mantenimiento
          </button>
          <button onClick={() => navigate('/epps/capacitacion')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <GraduationCap size={14} /> Capacitación
          </button>
          <button onClick={() => navigate('/epps/reportes')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <BarChart3 size={14} /> Reportes
          </button>
          <button onClick={() => navigate('/epps/configuracion')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Settings size={14} /> Configuración
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <button onClick={() => navigate('/epps')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            ← Dashboard
          </button>
          <button onClick={() => navigate('/epps/entrega')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Package size={14} /> Registrar Entrega
          </button>
          <button onClick={() => navigate('/epps/nuevo')}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Nuevo EPP
          </button>
        </div>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Items',      valor: stats.total_items,    icon: HardHat,      color: 'text-roka-600',    bg: 'bg-roka-50'    },
            { label: 'Stock Crítico',    valor: stats.stock_critico,  icon: AlertTriangle,color: 'text-red-600',     bg: 'bg-red-50'     },
            { label: 'Entregas este mes',valor: stats.entregas_mes,   icon: Package,      color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Categorías',       valor: stats.por_categoria?.length ?? 0, icon: TrendingDown, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map(({ label, valor, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon size={18} className={color} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${color}`}>{valor}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {['inventario', 'entregas'].map(t => (
          <button key={t} onClick={() => { setTab(t); setPagina(1) }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'inventario' ? 'Inventario' : 'Entregas'}
          </button>
        ))}
      </div>

      {/* Filtros inventario */}
      {tab === 'inventario' && (
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-wrap gap-3">
          <select value={filtroCat} onChange={e => { setFiltroCat(e.target.value); setPagina(1) }}
            className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500">
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={filtroCritico} onChange={e => setFiltroCritico(e.target.checked)}
              className="w-4 h-4" />
            Solo stock crítico
          </label>
        </div>
      )}

      {/* Tabla Inventario */}
      {tab === 'inventario' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Código', 'Nombre', 'Categoría', 'Talla', 'Stock Disp/Total', 'Mínimo', 'Estado'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Cargando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No hay EPPs registrados</td></tr>
              ) : items.map(item => {
                const critico = item.stock_critico || item.stock_disponible <= item.stock_minimo
                return (
                  <tr key={item.id}
                    onClick={() => navigate(`/epps/${item.id}/editar`)}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${critico ? 'bg-red-50/50' : ''}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.codigo_interno || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-800 font-medium">{item.nombre}</div>
                      {item.marca && <div className="text-xs text-gray-500">{item.marca} {item.modelo || ''}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.categoria?.nombre || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{item.talla || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={critico ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                        {item.stock_disponible}
                      </span>
                      <span className="text-gray-400"> / {item.stock_total}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.stock_minimo}</td>
                    <td className="px-4 py-3">
                      {critico ? (
                        <span className="text-xs font-medium px-2 py-1 rounded-full border bg-red-50 text-red-600 border-red-200">
                          Crítico
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-1 rounded-full border bg-emerald-50 text-emerald-600 border-emerald-200">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {meta && meta.last_page > 1 && (
            <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-gray-400">Total: {meta.total}</span>
              <div className="flex gap-2">
                <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-gray-50 text-xs">Anterior</button>
                <button disabled={pagina === meta.last_page} onClick={() => setPagina(p => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-gray-50 text-xs">Siguiente</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Entregas */}
      {tab === 'entregas' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <Package size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Para ver las entregas, usa el módulo</p>
          <button onClick={() => navigate('/epps/reportes')}
            className="mt-4 text-roka-600 hover:text-roka-700 text-sm font-medium">
            Ver Reportes y Trazabilidad →
          </button>
        </div>
      )}
    </div>
  )
}
