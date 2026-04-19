import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const TIPOS = [
  { value: 'incidente',               label: 'Incidente (sin lesión)' },
  { value: 'incidente_peligroso',     label: 'Incidente Peligroso' },
  { value: 'accidente_leve',          label: 'Accidente Leve' },
  { value: 'accidente_incapacitante', label: 'Accidente Incapacitante' },
  { value: 'accidente_mortal',        label: 'Accidente Mortal' },
]

const HORAS_MINTRA = { accidente_mortal: 24, incidente_peligroso: 24, accidente_incapacitante: 48 }

export default function AccidenteFormPage() {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const esEdicion = Boolean(id)

  const [form, setForm] = useState({
    tipo: 'incidente',
    fecha_accidente: '', lugar_exacto: '', descripcion_evento: '',
    accidentado_id: '', testigos: '',
    sede_id: '', area_id: '',
    dias_perdidos: 0, parte_cuerpo_afectada: '', tipo_lesion: '',
    agente_causante: '', descripcion_lesion: '',
    requiere_hospitalizacion: false, centro_medico: '', descripcion_atencion: '',
    costo_atencion: '', costo_dias_perdidos: '', costo_danos_materiales: '',
  })
  const [sedes, setSedes]     = useState([])
  const [areas, setAreas]     = useState([])
  const [personal, setPersonal] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const [rs, rp] = await Promise.all([
          api.get('/sedes'),
          api.get('/personal', { params: { per_page: 200 } }),
        ])
        setSedes(rs.data.data || rs.data)
        setPersonal(rp.data.data || rp.data)
      } catch { toast.error('Error cargando datos') } finally { setLoading(false) }
    }
    init()
  }, [])

  useEffect(() => {
    if (form.sede_id) {
      api.get('/areas', { params: { sede_id: form.sede_id } })
        .then(r => setAreas(r.data.data || r.data)).catch(() => {})
    }
  }, [form.sede_id])

  const set = (f, v) => setForm(prev => ({ ...prev, [f]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.fecha_accidente || !form.accidentado_id || !form.area_id) {
      toast.error('Fecha, accidentado y área son obligatorios')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        testigos: form.testigos ? form.testigos.split(',').map(t => t.trim()).filter(Boolean) : [],
        dias_perdidos: Number(form.dias_perdidos) || 0,
        costo_atencion: form.costo_atencion ? Number(form.costo_atencion) : undefined,
        costo_dias_perdidos: form.costo_dias_perdidos ? Number(form.costo_dias_perdidos) : undefined,
        costo_danos_materiales: form.costo_danos_materiales ? Number(form.costo_danos_materiales) : undefined,
      }
      if (esEdicion) {
        await api.put(`/accidentes/${id}`, payload)
        toast.success('Accidente actualizado')
        navigate(`/accidentes/${id}`)
      } else {
        const { data } = await api.post('/accidentes', payload)
        toast.success(`Accidente ${data.codigo} registrado`)
        navigate(`/accidentes/${data.id}`)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const horasMintra = HORAS_MINTRA[form.tipo]

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">{esEdicion ? 'Editar Evento' : 'Registrar Accidente / Incidente'}</h1>
          <p className="text-sm text-slate-400">Ley 29783 Art. 82-88 · Registro inmediato</p>
        </div>
      </div>

      {horasMintra && !esEdicion && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">
            <strong>Atención:</strong> Este tipo de evento requiere notificación a MINTRA en un plazo máximo de <strong>{horasMintra} horas</strong>.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Clasificación */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Clasificación del Evento</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tipo de evento *</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm">
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fecha y hora del evento *</label>
              <input type="datetime-local" value={form.fecha_accidente} onChange={e => set('fecha_accidente', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Sede *</label>
              <select value={form.sede_id} onChange={e => set('sede_id', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Seleccionar...</option>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Área *</label>
              <select value={form.area_id} onChange={e => set('area_id', e.target.value)}
                disabled={!form.sede_id}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm disabled:opacity-50">
                <option value="">Seleccionar...</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Lugar exacto *</label>
              <input value={form.lugar_exacto} onChange={e => set('lugar_exacto', e.target.value)}
                placeholder="Ej: Pasillo B — zona de carga"
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Accidentado *</label>
              <select value={form.accidentado_id} onChange={e => set('accidentado_id', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Seleccionar personal...</option>
                {personal.map(p => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos} — {p.dni}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Descripción del evento *</label>
              <textarea value={form.descripcion_evento} onChange={e => set('descripcion_evento', e.target.value)}
                rows={3} placeholder="Describa detalladamente cómo ocurrió el evento..."
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Testigos (separados por coma)</label>
              <input value={form.testigos} onChange={e => set('testigos', e.target.value)}
                placeholder="Juan Pérez, María García, ..."
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        {/* Consecuencias */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Consecuencias</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Días perdidos</label>
              <input type="number" min={0} value={form.dias_perdidos} onChange={e => set('dias_perdidos', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Parte del cuerpo afectada</label>
              <input value={form.parte_cuerpo_afectada} onChange={e => set('parte_cuerpo_afectada', e.target.value)}
                placeholder="Ej: Mano derecha"
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tipo de lesión</label>
              <input value={form.tipo_lesion} onChange={e => set('tipo_lesion', e.target.value)}
                placeholder="Ej: Fractura, Contusión, Laceración..."
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Agente causante</label>
              <input value={form.agente_causante} onChange={e => set('agente_causante', e.target.value)}
                placeholder="Ej: Montacarga, Piso mojado, Carga manual..."
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="hospitalizacion" checked={form.requiere_hospitalizacion}
                onChange={e => set('requiere_hospitalizacion', e.target.checked)} className="w-4 h-4" />
              <label htmlFor="hospitalizacion" className="text-sm text-slate-300">Requiere hospitalización</label>
            </div>
            {form.requiere_hospitalizacion && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Centro médico</label>
                <input value={form.centro_medico} onChange={e => set('centro_medico', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            )}
          </div>
        </div>

        {/* Costos */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Costos estimados (S/.)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { field: 'costo_atencion', label: 'Atención médica' },
              { field: 'costo_dias_perdidos', label: 'Días perdidos' },
              { field: 'costo_danos_materiales', label: 'Daños materiales' },
            ].map(({ field, label }) => (
              <div key={field}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <input type="number" min={0} step="0.01" value={form[field]}
                  onChange={e => set(field, e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium">
            <Save size={16} />
            {saving ? 'Guardando...' : (esEdicion ? 'Actualizar' : 'Registrar Evento')}
          </button>
        </div>
      </form>
    </div>
  )
}
