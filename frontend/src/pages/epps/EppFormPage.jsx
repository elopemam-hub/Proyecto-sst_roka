import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, ImagePlus, Trash2 } from 'lucide-react'
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

  // Imagen del EPP
  const inputImagenRef = useRef(null)
  const [imagenFile, setImagenFile]       = useState(null)   // archivo pendiente de subir
  const [imagenPreview, setImagenPreview] = useState(null)   // preview local del archivo elegido
  const [imagenUrl, setImagenUrl]         = useState(null)   // imagen ya guardada en el servidor

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
          setImagenUrl(item.imagen_url || null)
        }
      } catch { toast.error('Error al cargar datos') } finally { setLoading(false) }
    }
    init()
  }, [id])

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const setStockTotal = (value) => {
    setForm(f => ({
      ...f,
      stock_total: value,
      stock_disponible: f.stock_disponible === '' ? value : f.stock_disponible,
    }))
  }

  const elegirImagen = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      toast.error('La imagen no debe superar 4 MB')
      return
    }
    setImagenFile(file)
    setImagenPreview(URL.createObjectURL(file))
  }

  const quitarImagen = async () => {
    // Solo hay archivo pendiente: basta con descartarlo
    if (imagenFile) {
      setImagenFile(null)
      setImagenPreview(null)
      return
    }
    if (!esEdicion || !imagenUrl) return
    if (!confirm('¿Eliminar la imagen de este EPP?')) return
    try {
      await api.delete(`/epps/${id}/imagen`)
      setImagenUrl(null)
      toast.success('Imagen eliminada')
    } catch {
      toast.error('Error al eliminar la imagen')
    }
  }

  const subirImagen = async (eppId) => {
    const formData = new FormData()
    formData.append('imagen', imagenFile)
    await api.post(`/epps/${eppId}/imagen`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.categoria_id || !form.nombre) {
      toast.error('Categoría y nombre son obligatorios')
      return
    }
    if (form.stock_total === '' || form.stock_disponible === '' || form.stock_minimo === '') {
      toast.error('Stock total, stock disponible y stock mínimo son obligatorios')
      return
    }
    setSaving(true)
    try {
      if (esEdicion) {
        await api.put(`/epps/${id}`, form)
        if (imagenFile) await subirImagen(id)
        toast.success('EPP actualizado')
        navigate('/epps')
      } else {
        const { data } = await api.post('/epps', form)
        if (imagenFile) await subirImagen(data.id)
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
        <button onClick={() => navigate(-1)} className="btn-back">
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

        {/* Imagen */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Imagen del EPP</h2>
          <input ref={inputImagenRef} type="file" accept="image/jpeg,image/png,image/webp"
            onChange={elegirImagen} className="hidden" />
          <div className="flex items-center gap-5">
            <div className="w-28 h-28 rounded-xl border border-slate-700 bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
              {(imagenPreview || imagenUrl) ? (
                <img src={imagenPreview || imagenUrl} alt="Imagen del EPP" className="w-full h-full object-cover" />
              ) : (
                <ImagePlus size={26} className="text-slate-600" />
              )}
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <button type="button" onClick={() => inputImagenRef.current?.click()}
                  className="flex items-center gap-2 text-sm border border-slate-700 text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-700">
                  <ImagePlus size={15} />
                  {(imagenPreview || imagenUrl) ? 'Cambiar imagen' : 'Seleccionar imagen'}
                </button>
                {(imagenPreview || imagenUrl) && (
                  <button type="button" onClick={quitarImagen}
                    className="flex items-center gap-2 text-sm border border-red-500/40 text-red-400 px-3 py-2 rounded-lg hover:bg-red-500/10">
                    <Trash2 size={15} /> Quitar
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500">JPG, PNG o WEBP · máximo 4 MB</p>
              {imagenFile && <p className="text-xs text-amber-400">Se subirá al guardar el EPP</p>}
            </div>
          </div>
        </div>

        {/* Stock */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Control de Stock</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Stock Total *</label>
              <input type="number" min={0} value={form.stock_total}
                onChange={e => setStockTotal(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm text-center" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Stock Disponible *</label>
              <input type="number" min={0} value={form.stock_disponible}
                onChange={e => set('stock_disponible', e.target.value)}
                placeholder="0"
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm text-center" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Stock Mínimo *</label>
              <input type="number" min={0} value={form.stock_minimo}
                onChange={e => set('stock_minimo', e.target.value)}
                placeholder="0"
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm text-center" />
            </div>
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
