import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, ArrowLeft } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function SimulacroFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [loading, setLoading] = useState(false)
  const [areas, setAreas]     = useState([])
  const [personal, setPersonal] = useState([])
  const [form, setForm] = useState({
    tipo: 'sismo', nombre: '', descripcion: '',
    fecha_programada: '', hora_inicio: '', hora_fin: '',
    lugar: '', area_id: '', coordinador_id: '', observaciones: '',
  })

  useEffect(() => {
    cargarAreas()
    cargarPersonal()
    if (isEdit) cargarSimulacro()
  }, [id])

  const cargarAreas = async () => {
    try {
      const { data } = await api.get('/areas')
      setAreas(data.data || data)
    } catch { /* silent */ }
  }

  const cargarPersonal = async () => {
    try {
      const { data } = await api.get('/personal', { params: { per_page: 100, estado: 'activo' } })
      setPersonal(data.data || data)
    } catch { /* silent */ }
  }

  const cargarSimulacro = async () => {
    try {
      const { data } = await api.get(`/simulacros/${id}`)
      setForm({
        tipo:             data.tipo || 'sismo',
        nombre:           data.nombre || '',
        descripcion:      data.descripcion || '',
        fecha_programada: data.fecha_programada?.split('T')[0] || '',
        hora_inicio:      data.hora_inicio?.substring(0, 5) || '',
        hora_fin:         data.hora_fin?.substring(0, 5) || '',
        lugar:            data.lugar || '',
        area_id:          data.area_id?.toString() || '',
        coordinador_id:   data.coordinador_id?.toString() || '',
        observaciones:    data.observaciones || '',
      })
    } catch { toast.error('Error al cargar simulacro') }
  }

  const handleChange = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        area_id: form.area_id || null,
        coordinador_id: form.coordinador_id || null,
        hora_inicio: form.hora_inicio || null,
        hora_fin: form.hora_fin || null,
      }
      if (isEdit) {
        await api.put(`/simulacros/${id}`, payload)
        toast.success('Simulacro actualizado')
      } else {
        await api.post('/simulacros', payload)
        toast.success('Simulacro creado')
      }
      navigate('/simulacros')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setLoading(false) }
  }

  const inputClass = 'w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-roka-500/50 focus:border-roka-500 outline-none transition-colors'
  const labelClass = 'block text-sm font-medium text-slate-300 mb-1.5'

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/simulacros')}
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEdit ? 'Editar Simulacro' : 'Nuevo Simulacro'}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Planificación de simulacro de emergencia</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-5">
        {/* Tipo y Nombre */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Tipo de emergencia *</label>
            <select value={form.tipo} onChange={handleChange('tipo')} className={inputClass}>
              <option value="sismo">🌍 Sismo</option>
              <option value="incendio">🔥 Incendio</option>
              <option value="derrame">☠️ Derrame</option>
              <option value="evacuacion">🚨 Evacuación</option>
              <option value="primeros_auxilios">🩺 Primeros Auxilios</option>
              <option value="otro">📋 Otro</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Nombre *</label>
            <input type="text" required value={form.nombre} onChange={handleChange('nombre')}
              placeholder="Ej: Simulacro de sismo - Planta Norte" className={inputClass} />
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className={labelClass}>Descripción</label>
          <textarea rows={3} value={form.descripcion} onChange={handleChange('descripcion')}
            placeholder="Descripción del escenario y objetivos del simulacro..." className={inputClass} />
        </div>

        {/* Fecha y Horarios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Fecha programada *</label>
            <input type="date" required value={form.fecha_programada}
              onChange={handleChange('fecha_programada')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Hora inicio</label>
            <input type="time" value={form.hora_inicio}
              onChange={handleChange('hora_inicio')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Hora fin</label>
            <input type="time" value={form.hora_fin}
              onChange={handleChange('hora_fin')} className={inputClass} />
          </div>
        </div>

        {/* Coordinador, Área, Lugar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Coordinador</label>
            <select value={form.coordinador_id} onChange={handleChange('coordinador_id')} className={inputClass}>
              <option value="">Sin coordinador</option>
              {personal.map(p => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Área</label>
            <select value={form.area_id} onChange={handleChange('area_id')} className={inputClass}>
              <option value="">Todas las áreas</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Lugar</label>
            <input type="text" value={form.lugar} onChange={handleChange('lugar')}
              placeholder="Ej: Zona de evacuación" className={inputClass} />
          </div>
        </div>

        {/* Observaciones */}
        <div>
          <label className={labelClass}>Observaciones</label>
          <textarea rows={2} value={form.observaciones} onChange={handleChange('observaciones')}
            placeholder="Notas adicionales..." className={inputClass} />
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
          <button type="button" onClick={() => navigate('/simulacros')}
            className="px-4 py-2.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors shadow-lg shadow-roka-500/20">
            <Save size={16} />
            {loading ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear Simulacro')}
          </button>
        </div>
      </form>
    </div>
  )
}
