import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, HardHat, AlertTriangle, Package, TrendingDown, Truck, Wrench, BarChart3, Settings, Download, PackagePlus, Search, User } from 'lucide-react'
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
  const [ingresos, setIngresos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [stats, setStats]       = useState(null)
  const [editandoConsumo, setEditandoConsumo] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [filtroCat, setFiltroCat]   = useState('')
  const [filtroCritico, setFiltroCritico] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina]     = useState(1)
  const [meta, setMeta]         = useState(null)

  // Estados para tab Tallas
  const [busquedaPersonal, setBusquedaPersonal] = useState('')
  const [resultadosPersonal, setResultadosPersonal] = useState([])
  const [personalSel, setPersonalSel] = useState(null)
  const [tallas, setTallas] = useState([])
  const [editandoTalla, setEditandoTalla] = useState(null)
  const [formTalla, setFormTalla] = useState({ categoria_epp_id: '', talla: '', observaciones: '' })
  const [todosPersonal, setTodosPersonal] = useState([])
  const [loadingPersonal, setLoadingPersonal] = useState(false)
  const [categoriasMatriz, setCategoriasMatriz] = useState([])

  useEffect(() => {
    cargarStats()
    cargarCategorias()
  }, [])

  useEffect(() => {
    if (tab === 'inventario') cargarInventario()
    else if (tab === 'entregas') cargarEntregas()
    else if (tab === 'ingresos') cargarIngresos()
    else if (tab === 'tallas') cargarTodosPersonal()
  }, [tab, filtroCat, filtroCritico, pagina, busqueda])

  // Buscar personal con debounce
  useEffect(() => {
    if (tab !== 'tallas') return
    const timer = setTimeout(() => buscarPersonal(busquedaPersonal), 300)
    return () => clearTimeout(timer)
  }, [busquedaPersonal, tab])

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
      const params = { per_page: 9, page: pagina }
      if (busqueda) params.buscar = busqueda

      const { data } = await api.get('/epps/entregas/todas', { params })
      console.log('Entregas recibidas:', data)
      setEntregas(data.data || [])
      setMeta({
        total: data.total,
        current_page: data.current_page,
        last_page: data.last_page,
        per_page: data.per_page
      })
    } catch (err) {
      console.error('Error al cargar entregas:', err)
      console.error('Detalles:', err.response?.data)
      setEntregas([])
      setMeta(null)
    } finally {
      setLoading(false)
    }
  }

  const cargarIngresos = async () => {
    setLoading(true)
    try {
      const params = { tipo: 'ingreso', limit: 50 }
      const { data } = await api.get('/epps/movimientos', { params })
      setIngresos(data.data || data || [])
      setMeta(null) // Los movimientos no tienen paginación
    } catch (err) {
      console.error('Error al cargar ingresos:', err)
      setIngresos([])
      setMeta(null)
    } finally {
      setLoading(false)
    }
  }

  const actualizarConsumoAnual = async (itemId, consumoAnual) => {
    try {
      await api.patch(`/epps/${itemId}`, { consumo_anual: consumoAnual })
      setItems(items.map(item => item.id === itemId ? { ...item, consumo_anual: consumoAnual } : item))
      setEditandoConsumo(null)
    } catch (err) {
      alert('Error al actualizar consumo anual')
    }
  }

  // Funciones para tab Tallas
  const buscarPersonal = async (query) => {
    if (query.length < 2) { setResultadosPersonal([]); return }
    try {
      const { data } = await api.get('/personal', { params: { search: query, per_page: 10 } })
      setResultadosPersonal(data.data || data || [])
    } catch (err) {
      setResultadosPersonal([])
    }
  }

  const seleccionarPersonal = async (personal) => {
    setPersonalSel(personal)
    setBusquedaPersonal(`${personal.nombres} ${personal.apellidos} - ${personal.dni}`)
    setResultadosPersonal([])
    await cargarTallasPersonal(personal.id)
  }

  const cargarTallasPersonal = async (personalId) => {
    setLoading(true)
    try {
      const { data } = await api.get(`/epps/tallas/personal/${personalId}`)
      setTallas(data || [])
    } catch (err) {
      console.error('Error al cargar tallas:', err)
    } finally {
      setLoading(false)
    }
  }

  const cargarTodosPersonal = async () => {
    setLoadingPersonal(true)
    try {
      const { data } = await api.get('/epps/tallas/matriz')
      setCategoriasMatriz(data.categorias || [])
      setTodosPersonal(data.personal || [])
    } catch (err) {
      console.error('Error al cargar personal:', err)
      setTodosPersonal([])
      setCategoriasMatriz([])
    } finally {
      setLoadingPersonal(false)
    }
  }

  const guardarTalla = async (e) => {
    e.preventDefault()
    if (!personalSel) return alert('Seleccione un trabajador primero')
    if (!formTalla.categoria_epp_id) return alert('Seleccione una categoría')
    if (!formTalla.talla) return alert('Ingrese la talla')

    try {
      console.log('Guardando talla:', { personal_id: personalSel.id, ...formTalla })

      const response = await api.post('/epps/tallas', {
        personal_id: personalSel.id,
        ...formTalla
      })

      console.log('Talla guardada:', response.data)

      await cargarTallasPersonal(personalSel.id)
      setFormTalla({ categoria_epp_id: '', talla: '', observaciones: '' })
      setEditandoTalla(null)
      alert('✅ Talla guardada correctamente')
    } catch (err) {
      console.error('Error al guardar talla:', err)
      console.error('Detalles:', err.response?.data)

      const errorMsg = err.response?.data?.message
        || err.response?.data?.error
        || 'Error al guardar talla'
      alert(`❌ ${errorMsg}`)
    }
  }

  const eliminarTalla = async (tallaId) => {
    if (!confirm('¿Eliminar este registro de talla?')) return
    try {
      await api.delete(`/epps/tallas/${tallaId}`)
      await cargarTallasPersonal(personalSel.id)
      alert('✅ Talla eliminada')
    } catch (err) {
      alert('Error al eliminar talla')
    }
  }

  const iniciarEdicionTalla = (talla) => {
    setEditandoTalla(talla.id)
    setFormTalla({
      categoria_epp_id: talla.categoria_epp_id,
      talla: talla.talla,
      observaciones: talla.observaciones || ''
    })
  }

  const guardarTallaInline = async (personalId, categoriaId, talla) => {
    try {
      console.log('Guardando talla inline:', { personalId, categoriaId, talla })

      await api.post('/epps/tallas', {
        personal_id: personalId,
        categoria_epp_id: categoriaId,
        talla: talla,
        observaciones: ''
      })

      console.log('Talla guardada exitosamente')

      // Recargar matriz
      await cargarTodosPersonal()
    } catch (err) {
      console.error('Error al guardar talla inline:', err)
      console.error('Detalles del error:', err.response?.data)

      const errorMsg = err.response?.data?.message
        || err.response?.data?.error
        || Object.values(err.response?.data?.errors || {}).flat().join(', ')
        || 'Error al guardar talla'

      alert(`❌ ${errorMsg}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-2">
          <h1 className="text-2xl font-bold text-gray-900">EPPs</h1>
          <div className="flex items-center gap-2 flex-wrap">
          {/* Navegación Principal */}
          <button onClick={() => navigate('/epps')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium">
            ← Dashboard
          </button>

          <div className="w-px h-6 bg-gray-300" />

          {/* Secciones de Gestión */}
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/epps/inventario-inicial')}
              className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-2.5 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
              <PackagePlus size={13} /> Inventario Inicial
            </button>
            <button onClick={() => navigate('/epps/proveedores')}
              className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-2.5 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
              <Truck size={13} /> Proveedores
            </button>
            <button onClick={() => navigate('/epps/mantenimiento')}
              className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-2.5 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
              <Wrench size={13} /> Mantenimiento
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300" />

          {/* Herramientas */}
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/epps/reportes')}
              className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-2.5 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
              <BarChart3 size={13} /> Reportes
            </button>
            <button onClick={() => navigate('/epps/configuracion')}
              className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-2.5 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
              <Settings size={13} /> Configuración
            </button>
          </div>

          <div className="flex-1" />

          {/* Acciones Principales */}
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/epps/ingresos')}
              className="flex items-center gap-1.5 text-sm border-2 border-green-500 text-green-700 bg-green-50 px-3 py-2 rounded-lg hover:bg-green-100 transition-colors font-medium">
              <PackagePlus size={15} /> Registrar Ingreso
            </button>
            <button onClick={() => navigate('/epps/entrega')}
              className="flex items-center gap-1.5 text-sm border-2 border-blue-500 text-blue-700 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors font-medium">
              <Package size={15} /> Registrar Entrega
            </button>
            <button onClick={() => navigate('/epps/nuevo')}
              className="flex items-center gap-2 bg-gradient-to-r from-roka-500 to-roka-600 hover:from-roka-600 hover:to-roka-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg">
              <Plus size={16} /> Nuevo EPP
            </button>
          </div>
        </div>
        </div>
        <p className="text-gray-500 text-sm">Inventario y control de entrega · Ley 29783 Art. 61</p>
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
        {['inventario', 'entregas', 'ingresos', 'tallas'].map(t => {
          const esActivo = tab === t
          let colorClasses = ''

          if (esActivo) {
            if (t === 'inventario') colorClasses = 'bg-teal-100 text-teal-700 shadow-sm border-b-4 border-teal-500'
            else if (t === 'entregas') colorClasses = 'bg-blue-100 text-blue-700 shadow-sm border-b-4 border-blue-500'
            else if (t === 'ingresos') colorClasses = 'bg-amber-100 text-amber-700 shadow-sm border-b-4 border-amber-500'
            else if (t === 'tallas') colorClasses = 'bg-purple-100 text-purple-700 shadow-sm border-b-4 border-purple-500'
          } else {
            colorClasses = 'bg-gray-50 text-gray-500 hover:bg-gray-100 border-b-4 border-transparent'
          }

          return (
            <button key={t} onClick={() => { setTab(t); setPagina(1) }}
              className={`px-6 py-3 rounded-t-lg text-sm font-semibold transition-all ${colorClasses}`}>
              {t === 'inventario' ? 'Inventario' : t === 'entregas' ? 'Entregas' : t === 'ingresos' ? 'Ingresos' : 'Tallas'}
            </button>
          )
        })}
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-auto max-h-[calc(100vh-280px)]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                {['Código', 'Nombre', 'Categoría', 'Talla', 'Consumo Anual', 'Stock Mín.', 'Stock Máx.', 'Stock Disp.', 'Estado'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">Cargando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">No hay EPPs registrados</td></tr>
              ) : items.map(item => {
                const stockDisponible = item.stock_total - (item.total_entregas_activas || 0)
                const stockMinimo = item.stock_minimo_calculado || 0
                const stockMaximo = item.stock_maximo_calculado || 0
                const critico = stockDisponible <= stockMinimo
                return (
                  <tr key={item.id}
                    className={`hover:bg-gray-50 transition-colors ${critico ? 'bg-red-50/50' : ''}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 cursor-pointer" onClick={() => navigate(`/epps/${item.id}/editar`)}>{item.codigo_interno || '—'}</td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/epps/${item.id}/editar`)}>
                      <div className="text-gray-800 font-medium">{item.nombre}</div>
                      {item.marca && <div className="text-xs text-gray-500">{item.marca} {item.modelo || ''}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 cursor-pointer" onClick={() => navigate(`/epps/${item.id}/editar`)}>{item.categoria?.nombre || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 cursor-pointer" onClick={() => navigate(`/epps/${item.id}/editar`)}>{item.talla || '—'}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {editandoConsumo === item.id ? (
                        <input
                          type="number"
                          defaultValue={item.consumo_anual || ''}
                          onBlur={(e) => actualizarConsumoAnual(item.id, parseInt(e.target.value) || 0)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') actualizarConsumoAnual(item.id, parseInt(e.target.value) || 0)
                            if (e.key === 'Escape') setEditandoConsumo(null)
                          }}
                          autoFocus
                          className="w-20 px-2 py-1 border border-roka-300 rounded focus:outline-none focus:ring-2 focus:ring-roka-500 text-sm"
                        />
                      ) : (
                        <div
                          onClick={() => setEditandoConsumo(item.id)}
                          className="cursor-text hover:bg-gray-100 px-2 py-1 rounded"
                        >
                          <span className="text-purple-600 font-semibold">{item.consumo_anual || 0}</span>
                          <div className="text-[10px] text-gray-400">unidades/año</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/epps/${item.id}/editar`)}>
                      <span className="text-orange-600 font-semibold">{stockMinimo}</span>
                      <div className="text-[10px] text-gray-400">consumo×10%</div>
                    </td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/epps/${item.id}/editar`)}>
                      <span className="text-blue-600 font-semibold">{stockMaximo}</span>
                      <div className="text-[10px] text-gray-400">consumo×20%</div>
                    </td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/epps/${item.id}/editar`)}>
                      <span className={critico ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                        {stockDisponible}
                      </span>
                      <div className="text-[10px] text-gray-400">disponible</div>
                    </td>
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
        <div className="space-y-4">
          {/* Buscador */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por EPP, personal o DNI..."
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  setPagina(1)
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-auto max-h-[calc(100vh-360px)]">
            <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                {['Fecha Entrega', 'EPP', 'Código', 'Categoría', 'Personal', 'DNI', 'Cargo', 'Cantidad', 'Estado', 'Observaciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400">Cargando...</td></tr>
              ) : entregas.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400">No hay entregas registradas</td></tr>
              ) : entregas.map(entrega => (
                <tr key={entrega.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-700">
                    {entrega.fecha_entrega ? format(new Date(entrega.fecha_entrega), 'dd/MM/yyyy', { locale: es }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-800 font-medium">{entrega.inventario?.nombre || '—'}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{entrega.inventario?.codigo_interno || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{entrega.inventario?.categoria?.nombre || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="text-gray-800">{entrega.personal?.nombres} {entrega.personal?.apellidos}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{entrega.personal?.dni || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{entrega.personal?.cargo?.nombre || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg bg-blue-100 text-blue-700 font-bold">
                      {entrega.cantidad || 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {ESTADO_ENTREGA[entrega.estado] ? (
                      <span className={`text-xs font-medium px-2 py-1 rounded-full border ${ESTADO_ENTREGA[entrega.estado].color}`}>
                        {ESTADO_ENTREGA[entrega.estado].label}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{entrega.observaciones || '—'}</td>
                </tr>
              ))}
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
        </div>
      )}

      {/* Tab Ingresos */}
      {tab === 'ingresos' && (
        <div className="space-y-4">
          {/* Tabla */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-auto max-h-[calc(100vh-360px)]">
            <table className="w-full text-sm">
            <thead className="bg-green-50 border-b border-green-200 sticky top-0 z-10">
              <tr>
                {['Fecha', 'EPP', 'Tipo Ingreso', 'Cantidad', 'Stock Anterior', 'Stock Nuevo', 'Documento', 'Usuario', 'Observaciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-green-700 uppercase tracking-wider bg-green-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">Cargando...</td></tr>
              ) : ingresos.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">No hay ingresos registrados</td></tr>
              ) : ingresos.map(ingreso => (
                <tr key={ingreso.id} className="hover:bg-green-50 transition-colors">
                  <td className="px-4 py-3 text-gray-700">
                    {ingreso.created_at ? format(new Date(ingreso.created_at), 'dd/MM/yyyy HH:mm', { locale: es }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-800 font-medium">{ingreso.inventario?.nombre || '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                      {ingreso.motivo || 'Ingreso'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg bg-green-100 text-green-700 font-bold">
                      +{ingreso.cantidad || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-center font-mono">
                    {ingreso.stock_anterior || 0}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-green-600">
                      {ingreso.stock_nuevo || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {ingreso.documento_referencia || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {ingreso.usuario?.name || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                    {ingreso.observaciones || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Tab Tallas */}
      {tab === 'tallas' && (
        <div className="space-y-4">
          {/* Buscador de personal */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🔍 Buscar trabajador por nombre o DNI
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Ej: Juan Pérez o 12345678"
                value={busquedaPersonal}
                onChange={(e) => setBusquedaPersonal(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Tabla de todos los trabajadores */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-purple-50 border-b border-purple-200">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-600" />
                Todos los Trabajadores
              </h3>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 uppercase sticky left-0 bg-gray-50 z-20">Colaborador</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 uppercase">DNI</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Cargo</th>
                    {(() => {
                      // Filtrar categorías permitidas
                      const categoriasPermitidas = categoriasMatriz.filter(cat => {
                        const nombreUpper = cat.nombre.toUpperCase()
                        return (
                          nombreUpper.includes('CASCO') ||
                          nombreUpper.includes('ZAPATO') ||
                          nombreUpper.includes('CALZADO') ||
                          nombreUpper.includes('CHALECO') ||
                          nombreUpper.includes('LENTE') ||
                          nombreUpper.includes('GUANTE')
                        )
                      })

                      // Filtrar para mostrar solo UNA categoría por tipo
                      const tiposVistos = new Set()
                      const categoriasUnicas = categoriasPermitidas.filter(cat => {
                        const nombreUpper = cat.nombre.toUpperCase()
                        let tipo = null
                        if (nombreUpper.includes('CASCO')) tipo = 'CASCO'
                        else if (nombreUpper.includes('LENTE')) tipo = 'LENTES'
                        else if (nombreUpper.includes('GUANTE')) tipo = 'GUANTES'
                        else if (nombreUpper.includes('CHALECO')) tipo = 'CHALECO'
                        else if (nombreUpper.includes('ZAPATO') || nombreUpper.includes('CALZADO')) tipo = 'ZAPATOS'

                        if (tiposVistos.has(tipo)) return false
                        tiposVistos.add(tipo)
                        return true
                      })

                      // Ordenar por prioridad
                      return categoriasUnicas
                        .sort((a, b) => {
                          const getPrioridad = (cat) => {
                            const nombreUpper = cat.nombre.toUpperCase()
                            if (nombreUpper.includes('CASCO')) return 0
                            if (nombreUpper.includes('LENTE')) return 1
                            if (nombreUpper.includes('GUANTE')) return 2
                            if (nombreUpper.includes('CHALECO')) return 3
                            if (nombreUpper.includes('ZAPATO') || nombreUpper.includes('CALZADO')) return 4
                            return 5
                          }
                          return getPrioridad(a) - getPrioridad(b)
                        })
                        .map(cat => {
                          // Normalizar nombres
                          const nombreUpper = cat.nombre.toUpperCase()
                          let nombreCorto = 'EPP'
                          if (nombreUpper.includes('CALZADO') || nombreUpper.includes('ZAPATO')) nombreCorto = 'ZAPATOS'
                          else if (nombreUpper.includes('CASCO')) nombreCorto = 'CASCO'
                          else if (nombreUpper.includes('CHALECO')) nombreCorto = 'CHALECO'
                          else if (nombreUpper.includes('LENTE')) nombreCorto = 'LENTES'
                          else if (nombreUpper.includes('GUANTE')) nombreCorto = 'GUANTES'

                          return (
                            <th key={cat.id} className="text-center px-2 py-2 text-xs font-semibold text-purple-600 uppercase bg-purple-50">
                              {nombreCorto}
                            </th>
                          )
                        })
                    })()}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingPersonal ? (
                    <tr><td colSpan={3 + categoriasMatriz.length} className="text-center py-8 text-gray-400">Cargando trabajadores...</td></tr>
                  ) : (() => {
                    // Filtrar trabajadores según búsqueda
                    const personalFiltrado = todosPersonal.filter(p => {
                      if (!busquedaPersonal.trim()) return true // Mostrar todos si no hay búsqueda
                      const busqueda = busquedaPersonal.toLowerCase()

                      // ✅ MISMO ORDEN QUE EN LA TABLA (apellidos primero)
                      const nombreCompleto = `${p.apellidos} ${p.nombres}`.toLowerCase()

                      // ✅ DNI también en minúsculas
                      const dni = (p.dni || '').toLowerCase()

                      // ✅ Buscar también en partes individuales para mayor flexibilidad
                      const apellidos = (p.apellidos || '').toLowerCase()
                      const nombres = (p.nombres || '').toLowerCase()

                      return nombreCompleto.includes(busqueda)
                        || apellidos.includes(busqueda)
                        || nombres.includes(busqueda)
                        || dni.includes(busqueda)
                    })

                    if (personalFiltrado.length === 0) {
                      return <tr><td colSpan={3 + categoriasMatriz.length} className="text-center py-8 text-gray-400">No se encontraron trabajadores</td></tr>
                    }

                    return personalFiltrado.map(p => (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        personalSel?.id === p.id
                          ? 'bg-purple-100 border-l-4 border-l-purple-600'
                          : 'hover:bg-purple-50'
                      }`}
                    >
                      <td
                        className="px-3 py-2 sticky left-0 bg-white cursor-pointer"
                        onClick={() => seleccionarPersonal(p)}
                      >
                        <div className="font-medium text-gray-800 uppercase text-xs">{p.apellidos} {p.nombres}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{p.dni}</td>
                      <td className="px-3 py-2 text-gray-600 text-xs">{p.cargo}</td>
                      {(() => {
                        // Filtrar categorías permitidas
                        const categoriasPermitidas = categoriasMatriz.filter(cat => {
                          const nombreUpper = cat.nombre.toUpperCase()
                          return (
                            nombreUpper.includes('CASCO') ||
                            nombreUpper.includes('ZAPATO') ||
                            nombreUpper.includes('CALZADO') ||
                            nombreUpper.includes('CHALECO') ||
                            nombreUpper.includes('LENTE') ||
                            nombreUpper.includes('GUANTE')
                          )
                        })

                        // Filtrar para mostrar solo UNA categoría por tipo
                        const tiposVistos = new Set()
                        const categoriasUnicas = categoriasPermitidas.filter(cat => {
                          const nombreUpper = cat.nombre.toUpperCase()
                          let tipo = null
                          if (nombreUpper.includes('CASCO')) tipo = 'CASCO'
                          else if (nombreUpper.includes('LENTE')) tipo = 'LENTES'
                          else if (nombreUpper.includes('GUANTE')) tipo = 'GUANTES'
                          else if (nombreUpper.includes('CHALECO')) tipo = 'CHALECO'
                          else if (nombreUpper.includes('ZAPATO') || nombreUpper.includes('CALZADO')) tipo = 'ZAPATOS'

                          if (tiposVistos.has(tipo)) return false
                          tiposVistos.add(tipo)
                          return true
                        })

                        // Ordenar y renderizar
                        return categoriasUnicas
                          .sort((a, b) => {
                            const getPrioridad = (cat) => {
                              const nombreUpper = cat.nombre.toUpperCase()
                              if (nombreUpper.includes('CASCO')) return 0
                              if (nombreUpper.includes('LENTE')) return 1
                              if (nombreUpper.includes('GUANTE')) return 2
                              if (nombreUpper.includes('CHALECO')) return 3
                              if (nombreUpper.includes('ZAPATO') || nombreUpper.includes('CALZADO')) return 4
                              return 5
                            }
                            return getPrioridad(a) - getPrioridad(b)
                          })
                          .map(cat => (
                            <td
                              key={cat.id}
                              className="px-2 py-2 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="text"
                                defaultValue={p.tallas[cat.id] || ''}
                                placeholder="—"
                                onBlur={(e) => {
                                  const talla = e.target.value.trim()
                                  if (talla && talla !== (p.tallas[cat.id] || '')) {
                                    guardarTallaInline(p.id, cat.id, talla)
                                  } else if (!talla && p.tallas[cat.id]) {
                                    // Opcional: eliminar talla si se borra
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.target.blur()
                                  }
                                }}
                                className="w-16 text-center px-2 py-1 text-xs font-bold bg-yellow-400 text-gray-800 border border-yellow-500 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none placeholder:text-gray-400 placeholder:font-normal"
                              />
                            </td>
                          ))
                      })()}
                    </tr>
                    ))
                  })()}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
