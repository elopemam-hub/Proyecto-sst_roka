import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, GraduationCap, Clock, CheckCircle, XCircle,
  Calendar, Award, BookOpen, ChevronRight, AlertTriangle, Loader2,
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const TIPO_COLOR = {
  induccion: 'bg-blue-50 text-blue-700', especifica: 'bg-purple-50 text-purple-700',
  general: 'bg-emerald-50 text-emerald-700', sensibilizacion: 'bg-amber-50 text-amber-700',
}
const TIPO_LABEL = { induccion:'Inducción', especifica:'Específica', general:'General', sensibilizacion:'Sensibilización' }
const MODALIDAD_ICON = { presencial: '🏫', virtual: '💻', mixto: '🔀' }

// ── Componente de evaluación ──────────────────────────────────────
function EvaluacionQuiz({ eval: evalData, capacitacionId, onCompletado }) {
  const [respuestas, setResp] = useState({})
  const [saving, setSaving]   = useState(false)
  const [resultado, setRes]   = useState(null)

  const responder = async () => {
    if (Object.keys(respuestas).length < evalData.total_preguntas) {
      toast.error(`Responde las ${evalData.total_preguntas} preguntas antes de enviar`)
      return
    }
    setSaving(true)
    try {
      const { data } = await api.post(`/capacitaciones/${capacitacionId}/evaluacion/responder`, { respuestas })
      setRes(data)
      onCompletado()
    } catch (err) { toast.error(err.response?.data?.message || 'Error al enviar')
    } finally { setSaving(false) }
  }

  // Cargar preguntas reales
  const [preguntas, setPreguntas] = useState(null)
  useEffect(() => {
    api.get(`/capacitaciones/${capacitacionId}`)
      .then(({ data }) => setPreguntas(data.evaluacion?.preguntas || []))
      .catch(() => {})
  }, [capacitacionId])

  if (!preguntas) return <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-gray-400" /></div>

  if (resultado) return (
    <div className="text-center py-8 space-y-3">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${resultado.aprobado ? 'bg-emerald-100' : 'bg-red-100'}`}>
        {resultado.aprobado ? <CheckCircle size={28} className="text-emerald-600" /> : <XCircle size={28} className="text-red-500" />}
      </div>
      <h3 className={`text-xl font-bold ${resultado.aprobado ? 'text-emerald-600' : 'text-red-500'}`}>
        {resultado.aprobado ? '¡Aprobado!' : 'No aprobado'}
      </h3>
      <p className="text-gray-600">
        Puntaje: <strong>{resultado.puntaje}/20</strong> · {resultado.correctas}/{resultado.total} correctas
      </p>
      <p className="text-sm text-gray-400">Nota mínima requerida: {resultado.nota_minima}/20</p>
    </div>
  )

  return (
    <div className="space-y-5">
      {preguntas.map((p, pi) => (
        <div key={pi} className="space-y-3">
          <p className="text-sm font-medium text-gray-800">{pi + 1}. {p.pregunta}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {p.opciones.map((op, oi) => (
              <label key={oi}
                className={`flex items-center gap-2 border rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${respuestas[pi] === oi ? 'border-roka-500 bg-roka-50 text-roka-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                <input type="radio" name={`q-${pi}`} checked={respuestas[pi] === oi}
                  onChange={() => setResp(prev => ({ ...prev, [pi]: oi }))}
                  className="text-roka-500 flex-shrink-0" />
                <span className="text-sm">{op}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <button onClick={responder} disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-roka-500 hover:bg-roka-600 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
        Enviar evaluación
      </button>
    </div>
  )
}

export default function MisCapacitacionesPage() {
  const navigate = useNavigate()
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('proximas')
  const [evalAbierta, setEval]  = useState(null)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data: d } = await api.get('/capacitaciones/mis-capacitaciones')
      setData(d)
    } catch (err) {
      if (err.response?.status === 422) {
        toast.error('Tu usuario no está vinculado a un trabajador. Contacta al administrador.')
      } else {
        toast.error('Error al cargar capacitaciones')
      }
    } finally { setLoading(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const stats  = data?.stats || {}
  const proximas = data?.proximas || []
  const historial = data?.historial || []
  const evalPend = data?.evaluaciones_pendientes || []

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/capacitaciones')} className="btn-back">
          <ArrowLeft size={14} /> Capacitaciones
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Capacitaciones</h1>
          <p className="text-gray-500 text-sm mt-0.5">Tu historial y próximas capacitaciones</p>
        </div>
      </div>

      {/* KPIs personales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Asignadas', value: stats.total_asignadas || 0, color:'text-gray-700', icon: GraduationCap },
          { label:'Asistidas', value: stats.asistidas || 0, color:'text-emerald-600', icon: CheckCircle },
          { label:'Aprobadas', value: stats.aprobadas || 0, color:'text-blue-600', icon: Award },
          { label:'Horas acum.', value:`${stats.horas_acumuladas?.toFixed(1) || 0}h`, color:'text-purple-600', icon: Clock },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <Icon size={18} className={`${color} flex-shrink-0`} />
            <div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Evaluaciones pendientes — alerta */}
      {evalPend.length > 0 && !evalAbierta && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-600" />
            <h3 className="font-semibold text-amber-800">
              {evalPend.length} evaluación{evalPend.length > 1 ? 'es' : ''} pendiente{evalPend.length > 1 ? 's' : ''}
            </h3>
          </div>
          <div className="space-y-2">
            {evalPend.map(e => (
              <div key={e.evaluacion_id}
                className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border border-amber-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">{e.titulo}</p>
                  <p className="text-xs text-gray-400">{e.eval_titulo} · {e.total_preguntas} preguntas</p>
                </div>
                <button onClick={() => setEval(e)}
                  className="flex items-center gap-1 text-sm font-medium text-roka-600 hover:text-roka-700">
                  Rendir <ChevronRight size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evaluación abierta */}
      {evalAbierta && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800">{evalAbierta.eval_titulo}</h3>
              <p className="text-xs text-gray-400">{evalAbierta.titulo}</p>
            </div>
            <button onClick={() => setEval(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
          </div>
          <EvaluacionQuiz eval={evalAbierta} capacitacionId={evalAbierta.capacitacion_id} onCompletado={() => { cargar(); setTimeout(() => setEval(null), 3000) }} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key:'proximas', label:`Próximas (${proximas.length})` },
          { key:'historial', label:`Historial (${historial.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-roka-500 text-roka-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Próximas */}
      {tab === 'proximas' && (
        <div className="space-y-3">
          {proximas.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
              <Calendar size={28} className="mx-auto mb-2 text-gray-300" />
              <p className="text-gray-500 text-sm">No tienes capacitaciones próximas asignadas</p>
            </div>
          ) : proximas.map(cap => (
            <div key={cap.id} onClick={() => navigate(`/capacitaciones/${cap.id}`)}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-start gap-4 cursor-pointer hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-roka-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-lg">{MODALIDAD_ICON[cap.modalidad] || '📋'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{cap.titulo}</p>
                    {cap.tema && <p className="text-xs text-gray-400 mt-0.5">{cap.tema}</p>}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${TIPO_COLOR[cap.tipo]}`}>
                    {TIPO_LABEL[cap.tipo]}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {format(new Date(cap.fecha_programada), 'd MMM yyyy', { locale: es })}
                  </span>
                  <span className="flex items-center gap-1"><Clock size={11} />{cap.duracion_horas}h</span>
                  {cap.expositor && <span>{cap.expositor}</span>}
                  {cap.lugar && <span>{cap.lugar}</span>}
                  {cap.area?.nombre && <span className="bg-gray-100 px-2 py-0.5 rounded">{cap.area.nombre}</span>}
                </div>
              </div>
              <ChevronRight size={14} className="text-gray-300 flex-shrink-0 mt-1" />
            </div>
          ))}
        </div>
      )}

      {/* Tab: Historial */}
      {tab === 'historial' && (
        <div className="space-y-3">
          {historial.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
              <BookOpen size={28} className="mx-auto mb-2 text-gray-300" />
              <p className="text-gray-500 text-sm">Aún no tienes capacitaciones ejecutadas en tu historial</p>
            </div>
          ) : historial.map(cap => (
            <div key={cap.id} onClick={() => navigate(`/capacitaciones/${cap.id}`)}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cap.asistio ? 'bg-emerald-50' : 'bg-gray-100'}`}>
                {cap.asistio
                  ? <CheckCircle size={18} className="text-emerald-600" />
                  : <XCircle size={18} className="text-gray-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{cap.titulo}</p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                  <span>{format(new Date(cap.fecha_ejecutada), 'd MMM yyyy', { locale: es })}</span>
                  <span>{cap.duracion_horas}h</span>
                  <span className={`${TIPO_COLOR[cap.tipo]} px-1.5 py-0.5 rounded text-[10px]`}>{TIPO_LABEL[cap.tipo]}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {cap.nota != null && (
                  <span className={`text-sm font-bold ${cap.aprobado ? 'text-emerald-600' : 'text-red-500'}`}>
                    {cap.nota}/20
                  </span>
                )}
                {cap.aprobado === true && (
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">Aprobado</span>
                )}
                {cap.aprobado === false && (
                  <span className="text-[10px] text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">Desaprobado</span>
                )}
                {!cap.asistio && <span className="text-[10px] text-gray-400">No asistió</span>}
              </div>
              <ChevronRight size={14} className="text-gray-300" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
