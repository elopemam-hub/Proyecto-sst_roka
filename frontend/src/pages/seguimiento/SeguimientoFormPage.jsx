import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function SeguimientoFormPage() {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const esEdicion = Boolean(id)

  const [form, setForm] = useState({
    origen_tipo: 'otro', origen_id: '',
    tipo: 'correctiva', titulo: '', descripcion: '',
    responsable_id: '', area_id: '',
    prioridad: 'media',
    fecha_programada: new Date().toISOString().split('T')[0],
    fecha_limite: '',
    observaciones: '',
  })
  const [areas, setAreas]       = useState([])
  const [personal, setPersonal] = useState([])
  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const [ra, rp] = await Promise.all([
          api.get('/areas', { params: { per_page: 200 } }),
          api.get('/personal', { params: { per_page: 200 } }),
        ])
        setAreas(ra.data.data || ra.data)
        setPersonal(rp.data.data || rp.data)
      } catch { toast.error('Error cargando datos') } finally { setLoading(false) }
    }
    init()
  }, [])

  useEffect(() => {
    if (esEdicion) {
      api.get(`/seguimiento/${id}`).then(({ data }) => {
        setForm({
          origen_tipo: data.origen_tipo, origen_id: data.origen_id || '',
          tipo: data.tipo, titulo: data.titulo, descripcion: data.descripcion,
          responsable_id: data.responsable_id, area_id: data.area_id,
          prioridad: data.prioridad,
          fecha_programada: data.fecha_programada,
          fecha_limite: data.fecha_limite,
          observaciones: data.observaciones || '',
        })
      }).catch(() => toast.error('Error al cargar acción'))
    }
  }, [id])

  const set = (f, v) => setForm(prev => ({ ...prev, [f]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.titulo || !form.responsable_id || !form.area_id || !form.fecha_limite) {
      toast.error('Título, responsable, área y fecha límite son obligatorios')
      return
    }
    setSaving(true)
    try {
      if (esEdicion) {
        await api.put(`/seguimiento/${id}`, form)
        toast.success('Acción actualizada')
        navigate(`/seguimiento/${id}`)
      } else {
        const { data } = await api.post('/seguimiento', form)
        toast.success(`Acción ${data.codigo} creada`)
        navigate(`/seguimiento/${data.id}`)
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
          <h1 className="text-xl font-bold text-white">{esEdicion ? 'Editar Acción' : 'Nueva Acción de Seguimiento'}</h1>
          <p className="text-sm text-slate-400">Gestión centralizada de acciones correctivas, preventivas y de mejora</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Clasificación</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tipo de acción</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm">
                {['correctiva', 'preventiva', 'mejora', 'legal'].map(t => (
                  <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Prioridad</label>
              <select value={form.prioridad} onChange={e => set('prioridad', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm">
                {['baja', 'media', 'alta', 'critica'].map(p => (
                  <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Origen</label>
              <select value={form.origen_tipo} onChange={e => set('origen_tipo', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm">
                {['inspeccion', 'accidente', 'auditoria', 'iperc', 'ats', 'otro'].map(o => (
                  <option key={o} value={o} className="capitalize">{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Título *</label>
              <input value={form.titulo} onChange={e => set('titulo', e.target.value)}
                placeholder="Describe brevemente la acción a tomar..."
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Descripción detallada *</label>
              <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                rows={3} className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Asignación y Plazos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Responsable *</label>
              <select value={form.responsable_id} onChange={e => set('responsable_id', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Seleccionar responsable...</option>
                {personal.map(p => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Área *</label>
              <select value={form.area_id} onChange={e => set('area_id', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Seleccionar área...</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fecha programada</label>
              <input type="date" value={form.fecha_programada} onChange={e => set('fecha_programada', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fecha límite *</label>
              <input type="date" value={form.fecha_limite} onChange={e => set('fecha_limite', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Observaciones</label>
              <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)}
                rows={2} className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm resize-none" />
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
            {saving ? 'Guardando...' : (esEdicion ? 'Actualizar' : 'Crear Acción')}
          </button>
        </div>
      </form>
    </div>
  )
}
