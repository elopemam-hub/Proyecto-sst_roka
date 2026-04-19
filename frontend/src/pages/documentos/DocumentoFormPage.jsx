import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Upload, X, Download } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const TIPOS = [
  { value: 'politica',      label: 'Política' },
  { value: 'procedimiento', label: 'Procedimiento' },
  { value: 'instructivo',   label: 'Instructivo' },
  { value: 'registro',      label: 'Registro' },
  { value: 'plan',          label: 'Plan' },
  { value: 'programa',      label: 'Programa' },
  { value: 'otro',          label: 'Otro' },
]

const TIPOS_CAMBIO = [
  { value: 'menor', label: 'Menor (1.0 → 1.1)' },
  { value: 'mayor', label: 'Mayor (1.0 → 2.0)' },
]

const MIME_ACEPTADOS = '.pdf,.doc,.docx,.xls,.xlsx'

export default function DocumentoFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const fileRef = useRef(null)

  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'procedimiento',
    area_id: '',
    fecha_revision: '',
    observaciones: '',
  })
  const [archivo, setArchivo] = useState(null)
  const [descripcionCambio, setDescripcionCambio] = useState('')
  const [tipoCambio, setTipoCambio] = useState('menor')
  const [archivoActual, setArchivoActual] = useState(null)
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(isEdit)

  useEffect(() => {
    cargarAreas()
    if (isEdit) cargarDocumento()
  }, [id])

  const cargarAreas = async () => {
    try {
      const { data } = await api.get('/areas')
      setAreas(data.data || data || [])
    } catch { /* silent */ }
  }

  const cargarDocumento = async () => {
    try {
      const { data } = await api.get(`/documentos/${id}`)
      setForm({
        titulo:         data.titulo,
        descripcion:    data.descripcion ?? '',
        tipo:           data.tipo,
        area_id:        data.area_id ?? '',
        fecha_revision: data.fecha_revision ?? '',
        observaciones:  data.observaciones ?? '',
      })
      if (data.archivo_nombre) {
        setArchivoActual({ nombre: data.archivo_nombre, version: data.version_actual })
      }
    } catch {
      toast.error('Error al cargar el documento')
      navigate('/documentos')
    } finally {
      setLoadingData(false)
    }
  }

  const handleArchivo = (e) => {
    const f = e.target.files?.[0]
    if (f) setArchivo(f)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const formData = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== null) formData.append(k, v)
      })
      if (archivo) {
        formData.append('archivo', archivo)
        if (isEdit) {
          formData.append('descripcion_cambio', descripcionCambio || 'Actualización de archivo')
          formData.append('tipo_cambio', tipoCambio)
        }
      }

      if (isEdit) {
        await api.put(`/documentos/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Documento actualizado')
        navigate(`/documentos/${id}`)
      } else {
        const { data } = await api.post('/documentos', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Documento creado')
        navigate(`/documentos/${data.id}`)
      }
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

  const handleDescargarActual = async () => {
    try {
      const response = await api.get(`/documentos/${id}/descargar`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = archivoActual?.nombre || 'documento'
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al descargar el archivo')
    }
  }

  if (loadingData) return <div className="p-12 text-center text-slate-400">Cargando...</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/documentos')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">
            {isEdit ? 'Editar Documento' : 'Nuevo Documento'}
          </h1>
          <p className="text-slate-400 text-sm">Gestión documental SST</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg p-6 space-y-5">
        {/* Título */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Título *</label>
          <input
            type="text"
            value={form.titulo}
            onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
            placeholder="Ej: Procedimiento de Trabajo en Altura"
            required maxLength={200}
          />
        </div>

        {/* Tipo + Área */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Tipo *</label>
            <select
              value={form.tipo}
              onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              required
            >
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Área (opcional)</label>
            <select
              value={form.area_id}
              onChange={e => setForm(f => ({ ...f, area_id: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="">Sin área específica</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Descripción</label>
          <textarea
            value={form.descripcion}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            rows={3}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm resize-none"
            placeholder="Descripción breve del documento..."
          />
        </div>

        {/* Fecha revisión */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Fecha de próxima revisión</label>
          <input
            type="date"
            value={form.fecha_revision}
            onChange={e => setForm(f => ({ ...f, fecha_revision: e.target.value }))}
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>

        {/* Archivo actual (edit mode) */}
        {isEdit && archivoActual && (
          <div className="bg-slate-900 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-2">Archivo actual (v{archivoActual.version})</div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300 truncate">{archivoActual.nombre}</span>
              <button
                type="button"
                onClick={handleDescargarActual}
                className="flex items-center gap-1 text-xs text-roka-400 hover:text-roka-300 ml-2 flex-shrink-0"
              >
                <Download size={13} /> Descargar
              </button>
            </div>
          </div>
        )}

        {/* Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {isEdit ? 'Reemplazar archivo' : 'Archivo (opcional)'}
          </label>
          <div
            className="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center cursor-pointer hover:border-roka-500 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {archivo ? (
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-slate-300">{archivo.name}</span>
                <span className="text-xs text-slate-500">({(archivo.size / 1024 / 1024).toFixed(2)} MB)</span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setArchivo(null); if (fileRef.current) fileRef.current.value = '' }}
                  className="text-slate-500 hover:text-red-400"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="text-slate-400 text-sm">
                <Upload size={20} className="mx-auto mb-1" />
                Haz clic para seleccionar un archivo
                <div className="text-xs mt-1">PDF, Word, Excel · Máx. 20 MB</div>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={MIME_ACEPTADOS}
            onChange={handleArchivo}
            className="hidden"
          />
        </div>

        {/* Si hay nuevo archivo en edit mode: descripción del cambio */}
        {isEdit && archivo && (
          <div className="space-y-3 border border-amber-800/50 rounded-lg p-4 bg-amber-900/10">
            <div className="text-xs text-amber-400 font-medium">Información del cambio de versión</div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Tipo de cambio</label>
              <select
                value={tipoCambio}
                onChange={e => setTipoCambio(e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              >
                {TIPOS_CAMBIO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Descripción del cambio</label>
              <input
                type="text"
                value={descripcionCambio}
                onChange={e => setDescripcionCambio(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="Ej: Actualización de procedimiento según nueva normativa"
                maxLength={300}
              />
            </div>
          </div>
        )}

        {/* Observaciones */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Observaciones</label>
          <textarea
            value={form.observaciones}
            onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
            rows={2}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm resize-none"
          />
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate('/documentos')}
            className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg text-sm">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-roka-600 hover:bg-roka-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            <Save size={15} />
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}
