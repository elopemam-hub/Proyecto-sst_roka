import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Search, CalendarPlus, Paperclip, X, FileText } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const TIPOS = [
  { value: 'pre_ocupacional',        label: 'Pre-ocupacional' },
  { value: 'periodico',              label: 'Periódico' },
  { value: 'retiro',                 label: 'Retiro' },
  { value: 'por_cambio_ocupacional', label: 'Por cambio ocupacional' },
]

const RESULTADOS = [
  { value: 'apto',                   label: 'Apto' },
  { value: 'apto_con_restricciones', label: 'Apto con restricciones' },
  { value: 'no_apto',                label: 'No apto' },
]

export default function SaludFormPage() {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const esEdicion = Boolean(id)

  const [form, setForm] = useState({
    personal_id: '', tipo: 'periodico',
    fecha_examen: new Date().toISOString().split('T')[0],
    fecha_vencimiento: '', clinica: '', medico: '',
    resultado: 'apto', restricciones: '', observaciones: '',
  })
  const [personalSearch, setPersonalSearch] = useState('')
  const [personalList, setPersonalList]     = useState([])
  const [selectedPersonal, setSelectedPersonal] = useState(null)
  const [archivo, setArchivo]         = useState(null)
  const [archivoActual, setArchivoActual] = useState(null)
  const fileRef = useRef()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (esEdicion) {
      setLoading(true)
      api.get(`/salud/${id}`).then(({ data }) => {
        setForm({
          personal_id: data.personal_id || '',
          tipo: data.tipo || 'periodico',
          fecha_examen: data.fecha_examen?.split('T')[0] || '',
          fecha_vencimiento: data.fecha_vencimiento?.split('T')[0] || '',
          clinica: data.clinica || '',
          medico: data.medico || '',
          resultado: data.resultado || 'apto',
          restricciones: data.restricciones || '',
          observaciones: data.observaciones || '',
        })
        if (data.archivo_path) setArchivoActual(data.archivo_path)
        if (data.personal) {
          setSelectedPersonal(data.personal)
          setPersonalSearch(`${data.personal.nombres} ${data.personal.apellidos}`)
        }
      }).catch(() => toast.error('Error al cargar EMO'))
        .finally(() => setLoading(false))
    }
  }, [id])

  useEffect(() => {
    if (personalSearch.length >= 2 && !selectedPersonal) {
      api.get('/personal', { params: { search: personalSearch, per_page: 10 } })
        .then(({ data }) => setPersonalList(data.data || data))
        .catch(() => {})
    } else {
      setPersonalList([])
    }
  }, [personalSearch])

  const seleccionarPersonal = (p) => {
    setSelectedPersonal(p)
    setForm(f => ({ ...f, personal_id: p.id }))
    setPersonalSearch(`${p.nombres} ${p.apellidos}`)
    setPersonalList([])
  }

  const autoFechaVencimiento = () => {
    if (!form.fecha_examen) return
    const d = new Date(form.fecha_examen)
    d.setFullYear(d.getFullYear() + 1)
    setForm(f => ({ ...f, fecha_vencimiento: d.toISOString().split('T')[0] }))
  }

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.personal_id) {
      toast.error('Selecciona un trabajador')
      return
    }
    setSaving(true)
    try {
      const payload = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null) payload.append(k, v) })
      if (archivo) payload.append('archivo', archivo)

      const config = { headers: { 'Content-Type': 'multipart/form-data' } }

      if (esEdicion) {
        payload.append('_method', 'PUT')
        await api.post(`/salud/${id}`, payload, config)
        toast.success('EMO actualizado')
        navigate(`/salud/${id}`)
      } else {
        const { data } = await api.post('/salud', payload, config)
        toast.success('EMO registrado')
        navigate(`/salud/${data.id}`)
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
          <h1 className="text-xl font-bold text-white">{esEdicion ? 'Editar EMO' : 'Nuevo EMO'}</h1>
          <p className="text-sm text-slate-400">Examen médico ocupacional · Ley 29783 Art. 49</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Trabajador</h2>
          <div className="relative">
            <label className="block text-xs text-slate-400 mb-1">Buscar personal *</label>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
              <Search size={14} className="text-slate-500" />
              <input type="text" value={personalSearch}
                onChange={e => { setPersonalSearch(e.target.value); setSelectedPersonal(null); setForm(f => ({ ...f, personal_id: '' })) }}
                placeholder="Buscar por nombre o DNI..."
                className="bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none flex-1"
              />
            </div>
            {personalList.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
                {personalList.map(p => (
                  <button type="button" key={p.id} onClick={() => seleccionarPersonal(p)}
                    className="w-full text-left px-4 py-2 hover:bg-slate-800 text-sm">
                    <span className="text-slate-200">{p.nombres} {p.apellidos}</span>
                    <span className="text-slate-500 ml-2 text-xs font-mono">{p.dni}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedPersonal && (
              <p className="mt-2 text-xs text-emerald-400">
                ✓ {selectedPersonal.nombres} {selectedPersonal.apellidos} — DNI: {selectedPersonal.dni}
              </p>
            )}
          </div>
        </div>

        {/* Datos del examen */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Datos del Examen</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tipo de examen *</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm">
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Resultado *</label>
              <select value={form.resultado} onChange={e => set('resultado', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm">
                {RESULTADOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fecha del examen *</label>
              <input type="date" value={form.fecha_examen} onChange={e => set('fecha_examen', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fecha vencimiento</label>
              <div className="flex gap-2">
                <input type="date" value={form.fecha_vencimiento} onChange={e => set('fecha_vencimiento', e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
                <button type="button" onClick={autoFechaVencimiento}
                  className="p-2 bg-slate-900 border border-slate-700 text-slate-400 hover:text-roka-300 rounded-lg"
                  title="Auto: +1 año">
                  <CalendarPlus size={16} />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Clínica</label>
              <input type="text" value={form.clinica} onChange={e => set('clinica', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Médico responsable</label>
              <input type="text" value={form.medico} onChange={e => set('medico', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {form.resultado === 'apto_con_restricciones' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Descripción de restricciones *</label>
              <textarea value={form.restricciones} onChange={e => set('restricciones', e.target.value)}
                rows={3} placeholder="Describir las restricciones médicas del trabajador..."
                className="w-full bg-slate-900 border border-amber-500/30 text-slate-200 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-1">Observaciones</label>
            <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)}
              rows={2} className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm resize-none" />
          </div>

          {/* Archivo adjunto */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Archivo adjunto (PDF, JPG, PNG — máx. 5MB)</label>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
              onChange={e => setArchivo(e.target.files[0] || null)} />
            {archivo ? (
              <div className="flex items-center gap-2 bg-slate-900 border border-roka-500/40 rounded-lg px-3 py-2">
                <FileText size={14} className="text-roka-400 flex-shrink-0" />
                <span className="text-sm text-slate-200 flex-1 truncate">{archivo.name}</span>
                <button type="button" onClick={() => { setArchivo(null); fileRef.current.value = '' }}
                  className="text-slate-500 hover:text-red-400"><X size={14} /></button>
              </div>
            ) : archivoActual ? (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
                <FileText size={14} className="text-slate-400 flex-shrink-0" />
                <a href={`/storage/${archivoActual}`} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-roka-400 hover:underline flex-1 truncate">Ver archivo actual</a>
                <button type="button" onClick={() => fileRef.current.click()}
                  className="text-xs text-slate-400 hover:text-slate-200 border border-slate-600 rounded px-2 py-0.5">Reemplazar</button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current.click()}
                className="flex items-center gap-2 w-full bg-slate-900 border border-dashed border-slate-600 hover:border-roka-500 text-slate-400 hover:text-roka-300 rounded-lg px-3 py-3 text-sm transition-colors">
                <Paperclip size={14} />
                Adjuntar informe EMO
              </button>
            )}
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
            {saving ? 'Guardando...' : (esEdicion ? 'Actualizar EMO' : 'Registrar EMO')}
          </button>
        </div>
      </form>
    </div>
  )
}
