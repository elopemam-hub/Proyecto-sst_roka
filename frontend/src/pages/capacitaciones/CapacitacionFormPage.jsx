import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, ArrowLeft } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function CapacitacionFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [loading, setLoading] = useState(false)
  const [areas, setAreas]     = useState([])
  const [form, setForm] = useState({
    titulo: '', tema: '', tipo: 'general', modalidad: 'presencial',
    fecha_programada: '', duracion_horas: '2', expositor: '',
    expositor_cargo: '', lugar: '', area_id: '', max_participantes: '',
    observaciones: '',
  })

  useEffect(() => {
    cargarAreas()
    if (isEdit) cargarCapacitacion()
  }, [id])

  const cargarAreas = async () => {
    try {
      const { data } = await api.get('/areas')
      setAreas(data.data || data)
    } catch { /* silent */ }
  }

  const cargarCapacitacion = async () => {
    try {
      const { data } = await api.get(`/capacitaciones/${id}`)
      setForm({
        titulo:            data.titulo || '',
        tema:              data.tema || '',
        tipo:              data.tipo || 'general',
        modalidad:         data.modalidad || 'presencial',
        fecha_programada:  data.fecha_programada?.split('T')[0] || '',
        duracion_horas:    data.duracion_horas?.toString() || '2',
        expositor:         data.expositor || '',
        expositor_cargo:   data.expositor_cargo || '',
        lugar:             data.lugar || '',
        area_id:           data.area_id?.toString() || '',
        max_participantes: data.max_participantes?.toString() || '',
        observaciones:     data.observaciones || '',
      })
    } catch { toast.error('Error al cargar capacitación') }
  }

  const handleChange = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        duracion_horas: parseFloat(form.duracion_horas),
        area_id: form.area_id || null,
        max_participantes: form.max_participantes ? parseInt(form.max_participantes) : null,
      }
      if (isEdit) {
        await api.put(`/capacitaciones/${id}`, payload)
        toast.success('Capacitación actualizada')
      } else {
        await api.post('/capacitaciones', payload)
        toast.success('Capacitación creada')
      }
      navigate('/capacitaciones')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setLoading(false) }
  }

  const inputClass = 'w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-roka-500/50 focus:border-roka-500 outline-none transition-colors'
  const labelClass = 'block text-sm font-medium text-slate-300 mb-1.5'

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/capacitaciones')}
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEdit ? 'Editar Capacitación' : 'Nueva Capacitación'}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Programa de capacitación SST</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-5">
        {/* Título y Tema */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Título *</label>
            <input type="text" required value={form.titulo} onChange={handleChange('titulo')}
              placeholder="Ej: Prevención de riesgos en trabajo en altura" className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Tema</label>
            <input type="text" value={form.tema} onChange={handleChange('tema')}
              placeholder="Tema o contenido de la capacitación" className={inputClass} />
          </div>
        </div>

        {/* Tipo, Modalidad, Área */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Tipo *</label>
            <select value={form.tipo} onChange={handleChange('tipo')} className={inputClass}>
              <option value="induccion">Inducción</option>
              <option value="especifica">Específica</option>
              <option value="general">General</option>
              <option value="sensibilizacion">Sensibilización</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Modalidad *</label>
            <select value={form.modalidad} onChange={handleChange('modalidad')} className={inputClass}>
              <option value="presencial">Presencial</option>
              <option value="virtual">Virtual</option>
              <option value="mixto">Mixto</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Área</label>
            <select value={form.area_id} onChange={handleChange('area_id')} className={inputClass}>
              <option value="">Todas las áreas</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
        </div>

        {/* Fecha, Duración, Participantes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Fecha programada *</label>
            <input type="date" required value={form.fecha_programada} onChange={handleChange('fecha_programada')}
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Duración (horas) *</label>
            <input type="number" required step="0.5" min="0.5" max="99"
              value={form.duracion_horas} onChange={handleChange('duracion_horas')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Máx. participantes</label>
            <input type="number" min="1" value={form.max_participantes}
              onChange={handleChange('max_participantes')} className={inputClass} />
          </div>
        </div>

        {/* Expositor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Expositor</label>
            <input type="text" value={form.expositor} onChange={handleChange('expositor')}
              placeholder="Nombre del expositor" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Cargo del expositor</label>
            <input type="text" value={form.expositor_cargo} onChange={handleChange('expositor_cargo')}
              placeholder="Ej: Ing. Seguridad" className={inputClass} />
          </div>
        </div>

        {/* Lugar */}
        <div>
          <label className={labelClass}>Lugar</label>
          <input type="text" value={form.lugar} onChange={handleChange('lugar')}
            placeholder="Ej: Sala de capacitación Planta A" className={inputClass} />
        </div>

        {/* Observaciones */}
        <div>
          <label className={labelClass}>Observaciones</label>
          <textarea rows={3} value={form.observaciones} onChange={handleChange('observaciones')}
            placeholder="Notas adicionales..." className={inputClass} />
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
          <button type="button" onClick={() => navigate('/capacitaciones')}
            className="px-4 py-2.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors shadow-lg shadow-roka-500/20">
            <Save size={16} />
            {loading ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear Capacitación')}
          </button>
        </div>
      </form>
    </div>
  )
}
