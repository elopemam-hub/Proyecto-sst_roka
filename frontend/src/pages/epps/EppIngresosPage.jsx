import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Package, TrendingUp, History, Plus } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const TIPOS_INGRESO = [
  { value: 'compra', label: '🛒 Compra' },
  { value: 'donacion', label: '🎁 Donación' },
  { value: 'devolucion_proveedor', label: '↩️ Devolución de proveedor' },
  { value: 'ajuste', label: '⚙️ Ajuste de inventario' },
  { value: 'transferencia', label: '🔄 Transferencia' },
]

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

export default function EppIngresosPage() {
  const navigate = useNavigate()

  const [vista, setVista] = useState('formulario') // 'formulario' | 'historial'

  // Formulario
  const [form, setForm] = useState({
    inventario_id: '',
    cantidad: 1,
    tipo: 'compra',
    proveedor_id: '',
    documento_referencia: '',
    fecha_ingreso: new Date().toISOString().split('T')[0],
    observaciones: '',
  })

  const [eppList, setEppList] = useState([])
  const [proveedoresList, setProveedoresList] = useState([])
  const [eppSel, setEppSel] = useState(null)
  const [saving, setSaving] = useState(false)

  // Historial
  const [historial, setHistorial] = useState([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)

  // Cargar EPPs y proveedores
  useEffect(() => {
    cargarEpps()
    cargarProveedores()
  }, [])

  const cargarEpps = async () => {
    try {
      const { data } = await api.get('/epps', { params: { per_page: 500 } })
      setEppList(data.data || data || [])
    } catch (err) {
      console.error('Error al cargar EPPs:', err)
    }
  }

  const cargarProveedores = async () => {
    try {
      const { data } = await api.get('/epps/proveedores')
      setProveedoresList(data.data || data || [])
    } catch (err) {
      console.error('Error al cargar proveedores:', err)
    }
  }

  const cargarHistorial = async () => {
    setLoadingHistorial(true)
    try {
      const { data } = await api.get('/epps/movimientos', {
        params: { tipo: 'ingreso', limit: 50 }
      })
      setHistorial(data.data || data || [])
    } catch (err) {
      console.error('Error al cargar historial:', err)
      toast.error('Error al cargar historial')
    } finally {
      setLoadingHistorial(false)
    }
  }

  useEffect(() => {
    if (vista === 'historial' && historial.length === 0) {
      cargarHistorial()
    }
  }, [vista])

  const elegirEpp = (id) => {
    const epp = eppList.find(e => String(e.id) === String(id))
    setEppSel(epp || null)
    setForm(f => ({ ...f, inventario_id: id }))
  }

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.inventario_id) {
      toast.error('Debes seleccionar un EPP')
      return
    }

    if (form.cantidad < 1) {
      toast.error('La cantidad debe ser mayor a 0')
      return
    }

    setSaving(true)
    try {
      await api.post('/epps/ingresos', {
        ...form,
        cantidad: Number(form.cantidad),
        proveedor_id: form.proveedor_id || null,
      })

      toast.success('✅ Ingreso registrado correctamente')

      // Limpiar formulario
      setForm({
        inventario_id: '',
        cantidad: 1,
        tipo: 'compra',
        proveedor_id: '',
        documento_referencia: '',
        fecha_ingreso: new Date().toISOString().split('T')[0],
        observaciones: '',
      })
      setEppSel(null)

      // Recargar EPPs para actualizar stock
      cargarEpps()

      // Si está en historial, recargar
      if (vista === 'historial') {
        cargarHistorial()
      }
    } catch (err) {
      console.error('Error ingreso:', err.response?.data)
      const errores = err.response?.data?.errors
      if (errores) {
        const primer = Object.entries(errores)[0]
        toast.error(`Error en "${primer[0]}": ${primer[1][0]}`)
      } else {
        toast.error(err.response?.data?.message || 'Error al registrar ingreso')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/epps/inventario')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Inventario
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Package className="w-7 h-7 text-green-600" />
              Registro de Ingresos EPPs
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Compras, donaciones, ajustes y devoluciones
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setVista('formulario')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                vista === 'formulario'
                  ? 'bg-white text-purple-700 shadow'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Plus className="w-4 h-4" />
              Registrar Ingreso
            </button>
            <button
              onClick={() => setVista('historial')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                vista === 'historial'
                  ? 'bg-white text-purple-700 shadow'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <History className="w-4 h-4" />
              Historial
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      {vista === 'formulario' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* EPP */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    EPP a ingresar *
                  </label>
                  <select
                    value={form.inventario_id}
                    onChange={(e) => elegirEpp(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  >
                    <option value="">-- Seleccionar EPP --</option>
                    {eppList.map((epp) => (
                      <option key={epp.id} value={epp.id}>
                        {epp.nombre} {epp.talla ? `(${epp.talla})` : ''} — Stock: {epp.stock_disponible}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo y Cantidad */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tipo de ingreso *
                    </label>
                    <select
                      value={form.tipo}
                      onChange={(e) => set('tipo', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      {TIPOS_INGRESO.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cantidad *
                    </label>
                    <input
                      type="number"
                      value={form.cantidad}
                      onChange={(e) => set('cantidad', e.target.value)}
                      min="1"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>

                {/* Proveedor */}
                {(form.tipo === 'compra' || form.tipo === 'devolucion_proveedor') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Proveedor
                    </label>
                    <select
                      value={form.proveedor_id}
                      onChange={(e) => set('proveedor_id', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">-- Sin proveedor --</option>
                      {proveedoresList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre || p.razon_social || '—'} {p.ruc ? `— ${p.ruc}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Documento y Fecha */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Documento (Factura, Guía, etc.)
                    </label>
                    <input
                      type="text"
                      value={form.documento_referencia}
                      onChange={(e) => set('documento_referencia', e.target.value)}
                      placeholder="Ej: FACT-001-2026"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Fecha de ingreso *
                    </label>
                    <input
                      type="date"
                      value={form.fecha_ingreso}
                      onChange={(e) => set('fecha_ingreso', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>

                {/* Observaciones */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    value={form.observaciones}
                    onChange={(e) => set('observaciones', e.target.value)}
                    rows={3}
                    placeholder="Detalles adicionales del ingreso..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>

                {/* Botón */}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Registrar Ingreso
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow p-6 sticky top-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Resumen
              </h3>

              {eppSel ? (
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">EPP Seleccionado</p>
                    <p className="font-bold text-gray-800">{eppSel.nombre}</p>
                    {eppSel.talla && (
                      <p className="text-sm text-gray-600">Talla: {eppSel.talla}</p>
                    )}
                  </div>

                  <div className="bg-white rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Stock Actual</p>
                    <p className="text-2xl font-bold text-gray-800">{eppSel.stock_disponible}</p>
                  </div>

                  <div className="bg-white rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Nuevo Stock</p>
                    <p className="text-2xl font-bold text-green-600">
                      {Number(eppSel.stock_disponible) + Number(form.cantidad || 0)}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      +{form.cantidad || 0} unidades
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Selecciona un EPP para ver el resumen</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Historial */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Últimos 50 ingresos</h3>
            <button
              onClick={cargarHistorial}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Actualizar
            </button>
          </div>

          {loadingHistorial ? (
            <div className="p-12 text-center">
              <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-gray-500 text-sm">Cargando historial...</p>
            </div>
          ) : historial.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No hay ingresos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">FECHA</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">EPP</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">TIPO</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">CANTIDAD</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">STOCK</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">DOCUMENTO</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">USUARIO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historial.map((mov) => (
                    <tr key={mov.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {formatDate(mov.created_at)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {mov.inventario?.nombre || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                          {mov.motivo}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-green-600">+{mov.cantidad}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {mov.stock_anterior} → {mov.stock_nuevo}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {mov.documento_referencia || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {mov.usuario?.name || '—'}
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
