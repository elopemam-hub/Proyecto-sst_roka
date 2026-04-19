import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit, HeartPulse, ShieldAlert, History, Plus, X, Save } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const RESULTADOS = {
  apto:                   { label: 'Apto',                color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  apto_con_restricciones: { label: 'Apto c/Restricciones', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  no_apto:                { label: 'No apto',             color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const TIPOS_ATENCION = [
  { value: 'primeros_auxilios', label: 'Primeros auxilios' },
  { value: 'consulta',          label: 'Consulta' },
  { value: 'emergencia',        label: 'Emergencia' },
  { value: 'seguimiento',       label: 'Seguimiento' },
]

export default function SaludDetailPage() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const [emo, setEmo]             = useState(null)
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [atencion, setAtencion]   = useState({
    personal_id: '', fecha: new Date().toISOString().slice(0, 16),
    tipo: 'consulta', descripcion: '', tratamiento: '',
    baja_laboral: false, dias_descanso: 0, observaciones: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get(`/salud/${id}`)
      .then(({ data }) => {
        setEmo(data)
        setAtencion(a => ({ ...a, personal_id: data.personal_id }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const handleRegistrarAtencion = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/salud/atenciones', atencion)
      toast.success('Atención registrada')
      setShowModal(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar atención')
    } finally { setSaving(false) }
  }

  const setAt = (field, value) => setAtencion(a => ({ ...a, [field]: value }))

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>
  if (!emo) return <div className="text-center py-12 text-slate-500">EMO no encontrado</div>

  const res = RESULTADOS[emo.resultado] || RESULTADOS.apto
  const vencimientoColor = emo.esta_vencida ? 'text-red-400'
    : emo.dias_para_vencer != null && emo.dias_para_vencer <= 30 ? 'text-amber-400'
    : 'text-emerald-400'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1" />
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 border border-slate-700 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-sm">
          <Plus size={16} /> Registrar Atención
        </button>
        <button onClick={() => navigate(`/salud/${id}/editar`)}
          className="flex items-center gap-2 border border-slate-700 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-sm">
          <Edit size={16} /> Editar
        </button>
      </div>

      {/* Perfil EMO */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-white">
                {emo.personal?.nombres} {emo.personal?.apellidos}
              </h1>
              <span className={`text-xs font-medium px-2 py-1 rounded-full border ${res.color}`}>
                {res.label}
              </span>
            </div>
            <p className="text-slate-400 mt-1 capitalize">{emo.tipo?.replace(/_/g, ' ')} · DNI: {emo.personal?.dni}</p>
          </div>
          <HeartPulse size={28} className="text-roka-400" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-slate-700">
          <div>
            <p className="text-xs text-slate-500">Fecha examen</p>
            <p className="text-slate-200 font-medium mt-1">
              {emo.fecha_examen ? format(new Date(emo.fecha_examen), 'dd/MM/yyyy') : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Vencimiento</p>
            <p className={`font-medium mt-1 ${emo.fecha_vencimiento ? vencimientoColor : 'text-slate-500'}`}>
              {emo.fecha_vencimiento ? format(new Date(emo.fecha_vencimiento), 'dd/MM/yyyy') : 'Sin vencimiento'}
              {emo.esta_vencida && ' ✕'}
              {!emo.esta_vencida && emo.dias_para_vencer != null && emo.dias_para_vencer <= 30 && (
                <span className="text-xs ml-1">({emo.dias_para_vencer}d)</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Clínica</p>
            <p className="text-slate-200 mt-1">{emo.clinica || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Médico</p>
            <p className="text-slate-200 mt-1">{emo.medico || '—'}</p>
          </div>
        </div>

        {emo.observaciones && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-500 mb-1">Observaciones</p>
            <p className="text-slate-300 text-sm">{emo.observaciones}</p>
          </div>
        )}
      </div>

      {/* Restricciones */}
      {(emo.restricciones || emo.restricciones_relacion?.length > 0) && (
        <div className="bg-slate-800 rounded-xl border border-amber-500/20 p-6">
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2 mb-4">
            <ShieldAlert size={14} /> Restricciones
          </h2>
          {emo.restricciones && (
            <p className="text-slate-300 text-sm mb-4">{emo.restricciones}</p>
          )}
          {emo.restricciones_relacion?.length > 0 && (
            <div className="space-y-2">
              {emo.restricciones_relacion.map(r => (
                <div key={r.id} className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200 text-sm">{r.descripcion}</span>
                    <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">{r.tipo_restriccion}</span>
                  </div>
                  {r.area && <p className="text-xs text-slate-500 mt-1">Área: {r.area.nombre}</p>}
                  <p className="text-xs text-slate-600 mt-1">
                    Desde: {r.fecha_inicio ? format(new Date(r.fecha_inicio), 'dd/MM/yyyy') : '—'}
                    {r.fecha_fin && ` · Hasta: ${format(new Date(r.fecha_fin), 'dd/MM/yyyy')}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Historial */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-4">
          <History size={14} /> Historial de EMO
        </h2>
        <p className="text-slate-500 text-sm">
          Ver todos los EMO del trabajador desde su{' '}
          <button onClick={() => navigate(`/personal/${emo.personal_id}`)}
            className="text-roka-400 hover:text-roka-300">perfil de personal →</button>
        </p>
      </div>

      {/* Modal Atención */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h3 className="text-lg font-bold text-white">Registrar Atención Médica</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRegistrarAtencion} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Tipo *</label>
                  <select value={atencion.tipo} onChange={e => setAt('tipo', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm">
                    {TIPOS_ATENCION.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Fecha *</label>
                  <input type="datetime-local" value={atencion.fecha} onChange={e => setAt('fecha', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Descripción *</label>
                <textarea value={atencion.descripcion} onChange={e => setAt('descripcion', e.target.value)}
                  rows={2} className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Tratamiento</label>
                <textarea value={atencion.tratamiento} onChange={e => setAt('tratamiento', e.target.value)}
                  rows={2} className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={atencion.baja_laboral}
                    onChange={e => setAt('baja_laboral', e.target.checked)} className="w-4 h-4" />
                  Baja laboral
                </label>
                {atencion.baja_laboral && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400">Días de descanso:</label>
                    <input type="number" min={0} value={atencion.dias_descanso}
                      onChange={e => setAt('dias_descanso', Number(e.target.value))}
                      className="w-16 bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-sm text-center" />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-400 border border-slate-700 rounded-lg">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium">
                  <Save size={14} />
                  {saving ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
