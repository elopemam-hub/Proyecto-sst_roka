import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const TIPOS = [
  { value: 'reg_01', label: 'Registro 01 - Accidentes de Trabajo', manual: false },
  { value: 'reg_02', label: 'Registro 02 - Enfermedades Ocupacionales', manual: true },
  { value: 'reg_03', label: 'Registro 03 - Incidentes Peligrosos e Incidentes', manual: false },
  { value: 'reg_04', label: 'Registro 04 - Investigación de Accidentes e Incidentes', manual: false },
  { value: 'reg_05', label: 'Registro 05 - Monitoreo de Agentes Ocupacionales', manual: true },
  { value: 'reg_06', label: 'Registro 06 - Inspecciones Internas de SST', manual: false },
  { value: 'reg_07', label: 'Registro 07 - Equipos de Atención de Emergencias', manual: true },
  { value: 'reg_08', label: 'Registro 08 - Auditorías', manual: false },
  { value: 'reg_09', label: 'Registro 09 - Capacitaciones, Inducciones y Simulacros', manual: false },
  { value: 'reg_10', label: 'Registro 10 - Estadísticas de Seguridad y Salud', manual: false },
]

const MESES = [
  { value: '', label: 'Todo el año' },
  { value: '1', label: 'Enero' }, { value: '2', label: 'Febrero' }, { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' }, { value: '5', label: 'Mayo' }, { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' }, { value: '8', label: 'Agosto' }, { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' }, { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
]

export default function FormatoFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [form, setForm] = useState({
    tipo_registro: 'reg_01',
    titulo: '',
    periodo_anio: new Date().getFullYear(),
    periodo_mes: '',
    observaciones: '',
    datos_json: null,
  })
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(isEdit)

  useEffect(() => {
    if (isEdit) cargarFormato()
  }, [id])

  const cargarFormato = async () => {
    try {
      const { data } = await api.get(`/formatos/${id}`)
      setForm({
        tipo_registro: data.tipo_registro,
        titulo: data.titulo,
        periodo_anio: data.periodo_anio,
        periodo_mes: data.periodo_mes ?? '',
        observaciones: data.observaciones ?? '',
        datos_json: data.datos_json,
      })
    } catch {
      toast.error('Error al cargar el registro')
      navigate('/formatos')
    } finally {
      setLoadingData(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        periodo_mes: form.periodo_mes ? Number(form.periodo_mes) : null,
      }
      if (isEdit) {
        await api.put(`/formatos/${id}`, payload)
        toast.success('Registro actualizado')
      } else {
        const { data } = await api.post('/formatos', payload)
        toast.success('Registro creado')
        navigate(`/formatos/${data.id}`)
        return
      }
      navigate(`/formatos/${id}`)
    } catch (e) {
      const errors = e.response?.data?.errors
      if (errors) {
        Object.values(errors).flat().forEach(msg => toast.error(msg))
      } else {
        toast.error(e.response?.data?.message || 'Error al guardar')
      }
    } finally {
      setLoading(false)
    }
  }

  const tipoActual = TIPOS.find(t => t.value === form.tipo_registro)

  if (loadingData) {
    return <div className="p-12 text-center text-slate-400">Cargando...</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/formatos')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">
            {isEdit ? 'Editar Registro' : 'Nuevo Registro RM 050'}
          </h1>
          <p className="text-slate-400 text-sm">Registro manual de formato SST</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg p-6 space-y-5">
        {/* Tipo de registro */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Tipo de Registro *</label>
          <select
            value={form.tipo_registro}
            onChange={e => setForm(f => ({ ...f, tipo_registro: e.target.value }))}
            disabled={isEdit}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-60"
            required
          >
            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {tipoActual && !tipoActual.manual && (
            <p className="text-xs text-amber-400 mt-1">
              Este tipo puede generarse automáticamente desde datos del sistema usando el botón "Generar" en la lista.
            </p>
          )}
        </div>

        {/* Título */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Título *</label>
          <input
            type="text"
            value={form.titulo}
            onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
            placeholder="Ej: Registro 02 - Enfermedades Ocupacionales 2026"
            required maxLength={250}
          />
        </div>

        {/* Periodo */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Año *</label>
            <input
              type="number"
              value={form.periodo_anio}
              onChange={e => setForm(f => ({ ...f, periodo_anio: Number(e.target.value) }))}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              min="2000" max="2100" required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Mes (opcional)</label>
            <select
              value={form.periodo_mes}
              onChange={e => setForm(f => ({ ...f, periodo_mes: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
            >
              {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        {/* Observaciones */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Observaciones</label>
          <textarea
            value={form.observaciones}
            onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
            rows={3}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm resize-none"
            placeholder="Observaciones adicionales..."
          />
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/formatos')}
            className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-roka-600 hover:bg-roka-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Save size={15} />
            {loading ? 'Guardando...' : 'Guardar como borrador'}
          </button>
        </div>
      </form>
    </div>
  )
}
