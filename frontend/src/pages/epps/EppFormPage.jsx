import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function EppFormPage() {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const esEdicion = Boolean(id)

  const [form, setForm] = useState({
    categoria_id: '', nombre: '', marca: '', modelo: '',
    codigo_interno: '', talla: '',
    stock_total: '', stock_disponible: '', stock_minimo: '5', unidad: 'unidad',
    costo_unitario: '', proveedor: '',
  })
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const { data } = await api.get('/epps/categorias')
        setCategorias(data)
        if (esEdicion) {
          const { data: item } = await api.get(`/epps/${id}`)
          setForm({
            categoria_id:    item.categoria_id   || '',
            nombre:          item.nombre         || '',
            marca:           item.marca          || '',
            modelo:          item.modelo         || '',
            codigo_interno:  item.codigo_interno || '',
            talla:           item.talla          || '',
            stock_total:     item.stock_total     ?? '',
            stock_disponible: item.stock_disponible ?? '',
            stock_minimo:    item.stock_minimo    ?? 5,
            unidad:          item.unidad         || 'unidad',
            costo_unitario:  item.costo_unitario || '',
            proveedor:       item.proveedor      || '',
          })
        }
      } catch { toast.error('Error al cargar datos') } finally { setLoading(false) }
    }
    init()
  }, [id])

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.categoria_id || !form.nombre || form.stock_total === '') {
      toast.error('Categoría, nombre y stock total son obligatorios')
      return
    }
    setSaving(true)
    try {
      if (esEdicion) {
        await api.put(`/epps/${id}`, form)
        toast.success('EPP actualizado')
        navigate('/epps')
      } else {
        await api.post('/epps', form)
        toast.success('EPP registrado en inventario')
        navigate('/epps')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">{esEdicion ? 'Editar EPP' : 'Nuevo EPP'}</h1>
          <p className="text-sm text-slate-400">Inventario de Equipos de Protección Personal</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Clasificación */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Clasificación</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Categoría *</label>
              <select value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Seleccionar categoría...</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nombre *</label>
              <input type="text" value={form.nombre} onChange={e => set('nombre', e.target.value)}
                placeholder="Ej: Casco de seguridad tipo II"
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Marca</label>
              <input type="text" value={form.marca} onChange={e => set('marca', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Modelo</label>
              <input type="text" value={form.modelo} onChange={e => set('modelo', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Código interno</label>
              <input type="text" value={form.codigo_interno} onChange={e => set('codigo_interno', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Talla</label>
              <input type="text" value={form.talla} onChange={e => set('talla', e.target.value)}
                placeholder="Ej: M, 42, Única..."
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        {/* Stock */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Control de Stock</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { field: 'stock_total',      label: 'Stock Total *',     min: 0 },
              { field: 'stock_disponible', label: 'Stock Disponible *', min: 0 },
              { field: 'stock_minimo',     label: 'Stock Mínimo *',    min: 0 },
            ].map(({ field, label, min }) => (
              <div key={field}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <input type="number" min={min} value={form[field]} onChange={e => set(field, e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm text-center" />
              </div>
            ))}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Unidad *</label>
              <select value={form.unidad} onChange={e => set('unidad', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm">
                {['unidad', 'par', 'juego', 'caja', 'paquete', 'rollo'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Proveedor */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Proveedor y Costo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Proveedor</label>
              <input type="text" value={form.proveedor} onChange={e => set('proveedor', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Costo unitario (S/.)</label>
              <input type="number" min={0} step={0.01} value={form.costo_unitario}
                onChange={e => set('costo_unitario', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium">
            <Save size={16} />
            {saving ? 'Guardando...' : (esEdicion ? 'Actualizar EPP' : 'Registrar EPP')}
          </button>
        </div>
      </form>
    </div>
  )
}
