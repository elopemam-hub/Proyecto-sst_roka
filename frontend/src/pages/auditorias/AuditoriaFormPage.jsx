import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, ArrowLeft, Plus, X } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function AuditoriaFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [loading, setLoading] = useState(false)
  const [areas, setAreas]     = useState([])
  const [form, setForm] = useState({
    tipo: 'interna', norma_referencia: 'Ley 29783', auditor_lider: '',
    equipo_auditor: [], fecha_programada: '', area_id: '',
    alcance: '', objetivo: '', observaciones: '',
  })
  const [nuevoMiembro, setNuevoMiembro] = useState('')

  useEffect(() => {
    cargarAreas()
    if (isEdit) cargarAuditoria()
  }, [id])

  const cargarAreas = async () => {
    try {
      const { data } = await api.get('/areas')
      setAreas(data.data || data)
    } catch { /* silent */ }
  }

  const cargarAuditoria = async () => {
    try {
      const { data } = await api.get(`/auditorias/${id}`)
      setForm({
        tipo:              data.tipo || 'interna',
        norma_referencia:  data.norma_referencia || '',
        auditor_lider:     data.auditor_lider || '',
        equipo_auditor:    data.equipo_auditor || [],
        fecha_programada:  data.fecha_programada?.split('T')[0] || '',
        area_id:           data.area_id?.toString() || '',
        alcance:           data.alcance || '',
        objetivo:          data.objetivo || '',
        observaciones:     data.observaciones || '',
      })
    } catch { toast.error('Error al cargar auditoría') }
  }

  const handleChange = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const agregarMiembro = () => {
    if (!nuevoMiembro.trim()) return
    setForm(prev => ({ ...prev, equipo_auditor: [...prev.equipo_auditor, nuevoMiembro.trim()] }))
    setNuevoMiembro('')
  }

  const quitarMiembro = (index) => {
    setForm(prev => ({
      ...prev,
      equipo_auditor: prev.equipo_auditor.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        area_id: form.area_id || null,
      }
      if (isEdit) {
        await api.put(`/auditorias/${id}`, payload)
        toast.success('Auditoría actualizada')
      } else {
        await api.post('/auditorias', payload)
        toast.success('Auditoría programada')
      }
      navigate('/auditorias')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setLoading(false) }
  }

  const inputClass = 'w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-roka-500/50 focus:border-roka-500 outline-none transition-colors'
  const labelClass = 'block text-sm font-medium text-slate-300 mb-1.5'

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/auditorias')}
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEdit ? 'Editar Auditoría' : 'Programar Auditoría'}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Art. 43 Ley 29783 · ISO 45001</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-5">
        {/* Tipo, Norma, Área */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Tipo *</label>
            <select value={form.tipo} onChange={handleChange('tipo')} className={inputClass}>
              <option value="interna">Interna</option>
              <option value="externa">Externa</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Norma de referencia</label>
            <input type="text" value={form.norma_referencia} onChange={handleChange('norma_referencia')}
              placeholder="Ej: Ley 29783, ISO 45001" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Área</label>
            <select value={form.area_id} onChange={handleChange('area_id')} className={inputClass}>
              <option value="">Todas las áreas</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
        </div>

        {/* Auditor y Fecha */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Auditor líder *</label>
            <input type="text" required value={form.auditor_lider} onChange={handleChange('auditor_lider')}
              placeholder="Nombre del auditor líder" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Fecha programada *</label>
            <input type="date" required value={form.fecha_programada}
              onChange={handleChange('fecha_programada')} className={inputClass} />
          </div>
        </div>

        {/* Equipo auditor */}
        <div>
          <label className={labelClass}>Equipo auditor</label>
          <div className="flex gap-2 mb-2">
            <input type="text" value={nuevoMiembro} onChange={e => setNuevoMiembro(e.target.value)}
              placeholder="Nombre del auditor" className={inputClass}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), agregarMiembro())} />
            <button type="button" onClick={agregarMiembro}
              className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors flex-shrink-0">
              <Plus size={16} />
            </button>
          </div>
          {form.equipo_auditor.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.equipo_auditor.map((m, i) => (
                <span key={i} className="flex items-center gap-1.5 bg-slate-900 text-slate-300 text-xs px-3 py-1.5 rounded-full border border-slate-700">
                  {m}
                  <button type="button" onClick={() => quitarMiembro(i)}
                    className="text-slate-500 hover:text-red-400 transition-colors">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Alcance y Objetivo */}
        <div>
          <label className={labelClass}>Alcance de la auditoría</label>
          <textarea rows={2} value={form.alcance} onChange={handleChange('alcance')}
            placeholder="Ej: Verificar cumplimiento de procedimientos de trabajo seguro en planta A" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Objetivo</label>
          <textarea rows={2} value={form.objetivo} onChange={handleChange('objetivo')}
            placeholder="Ej: Evaluar la eficacia del sistema de gestión de SST" className={inputClass} />
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
          <button type="button" onClick={() => navigate('/auditorias')}
            className="px-4 py-2.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors shadow-lg shadow-roka-500/20">
            <Save size={16} />
            {loading ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Programar Auditoría')}
          </button>
        </div>
      </form>
    </div>
  )
}
