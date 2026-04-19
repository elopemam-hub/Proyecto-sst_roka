import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Play, Star, Users, Clock, MapPin, AlertTriangle } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const ESTADOS = {
  programado: { label: 'Programado', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  ejecutado:  { label: 'Ejecutado',  color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cancelado:  { label: 'Cancelado',  color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const TIPOS = {
  sismo: '🌍 Sismo', incendio: '🔥 Incendio', derrame: '☠️ Derrame',
  evacuacion: '🚨 Evacuación', primeros_auxilios: '🩺 Primeros Auxilios', otro: '📋 Otro',
}

const CRITERIOS_DEFAULT = [
  'Tiempo de activación de alarma',
  'Organización de la evacuación',
  'Señalización y rutas de escape',
  'Comunicación durante la emergencia',
  'Atención de heridos simulados',
  'Tiempo total de evacuación',
  'Coordinación de brigadas',
  'Punto de reunión y conteo',
]

export default function SimulacroDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [sim, setSim] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEjecucion, setShowEjecucion] = useState(false)
  const [showEvaluacion, setShowEvaluacion] = useState(false)
  const [ejecucionForm, setEjecucionForm] = useState({
    tiempo_respuesta_min: '', personas_evacuadas: '',
    observaciones: '', lecciones_aprendidas: '',
  })
  const [evaluacionData, setEvaluacionData] = useState(
    CRITERIOS_DEFAULT.map(c => ({ criterio: c, calificacion: 3, observacion: '' }))
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => { cargar() }, [id])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/simulacros/${id}`)
      setSim(data)
      if (data.evaluaciones?.length > 0) {
        setEvaluacionData(data.evaluaciones.map(e => ({
          criterio: e.criterio, calificacion: e.calificacion, observacion: e.observacion || '',
        })))
      }
    } catch { toast.error('Error al cargar') } finally { setLoading(false) }
  }

  const ejecutar = async () => {
    setSaving(true)
    try {
      await api.post(`/simulacros/${id}/ejecutar`, {
        tiempo_respuesta_min: ejecucionForm.tiempo_respuesta_min ? parseInt(ejecucionForm.tiempo_respuesta_min) : null,
        personas_evacuadas: ejecucionForm.personas_evacuadas ? parseInt(ejecucionForm.personas_evacuadas) : null,
        observaciones: ejecucionForm.observaciones || null,
        lecciones_aprendidas: ejecucionForm.lecciones_aprendidas || null,
      })
      toast.success('Simulacro ejecutado exitosamente')
      setShowEjecucion(false)
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error')
    } finally { setSaving(false) }
  }

  const guardarEvaluacion = async () => {
    setSaving(true)
    try {
      await api.post(`/simulacros/${id}/evaluacion`, {
        criterios: evaluacionData,
      })
      toast.success('Evaluación guardada exitosamente')
      setShowEvaluacion(false)
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error')
    } finally { setSaving(false) }
  }

  const setCalificacion = (index, cal) => {
    setEvaluacionData(prev => prev.map((e, i) =>
      i === index ? { ...e, calificacion: cal } : e
    ))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!sim) return <div className="text-slate-500 text-center py-12">No encontrado</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/simulacros')}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{sim.nombre}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-xs font-medium px-2 py-1 rounded-full border ${ESTADOS[sim.estado]?.color}`}>
                {ESTADOS[sim.estado]?.label}
              </span>
              <span className="text-sm text-slate-400">{TIPOS[sim.tipo]}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {sim.estado === 'programado' && (
            <button onClick={() => setShowEjecucion(true)}
              className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition-colors">
              <Play size={16} /> Ejecutar
            </button>
          )}
          {sim.estado === 'ejecutado' && (
            <button onClick={() => setShowEvaluacion(true)}
              className="flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-500/20 transition-colors">
              <Star size={16} /> Evaluar
            </button>
          )}
          <button onClick={() => navigate(`/simulacros/${id}/editar`)}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            <Edit size={16} /> Editar
          </button>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-3">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Detalles</h3>
          {sim.descripcion && <p className="text-sm text-slate-300">{sim.descripcion}</p>}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-slate-500">Fecha programada</span>
              <p className="text-slate-200">{format(new Date(sim.fecha_programada), 'dd/MM/yyyy')}</p>
            </div>
            {sim.fecha_ejecutada && <div>
              <span className="text-xs text-slate-500">Fecha ejecutada</span>
              <p className="text-emerald-400">{format(new Date(sim.fecha_ejecutada), 'dd/MM/yyyy')}</p>
            </div>}
            {sim.hora_inicio && <div className="flex items-center gap-2">
              <Clock size={14} className="text-slate-500" />
              <div>
                <span className="text-xs text-slate-500">Horario</span>
                <p className="text-slate-200">{sim.hora_inicio?.substring(0,5)} — {sim.hora_fin?.substring(0,5) || '?'}</p>
              </div>
            </div>}
            {sim.lugar && <div className="flex items-center gap-2">
              <MapPin size={14} className="text-slate-500" />
              <div>
                <span className="text-xs text-slate-500">Lugar</span>
                <p className="text-slate-200">{sim.lugar}</p>
              </div>
            </div>}
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-3">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Resultados</h3>
          <div className="space-y-3 text-sm">
            {sim.coordinador && <div className="flex items-center gap-2">
              <Users size={14} className="text-slate-500" />
              <div>
                <span className="text-xs text-slate-500">Coordinador</span>
                <p className="text-slate-200">{sim.coordinador.nombres} {sim.coordinador.apellidos}</p>
              </div>
            </div>}
            {sim.tiempo_respuesta_min != null && <div>
              <span className="text-xs text-slate-500">Tiempo de respuesta</span>
              <p className="text-lg font-bold text-roka-400">{sim.tiempo_respuesta_min} min</p>
            </div>}
            {sim.personas_evacuadas != null && <div>
              <span className="text-xs text-slate-500">Personas evacuadas</span>
              <p className="text-lg font-bold text-white">{sim.personas_evacuadas}</p>
            </div>}
            {sim.promedio_evaluacion != null && <div>
              <span className="text-xs text-slate-500">Evaluación promedio</span>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={18}
                    className={s <= Math.round(sim.promedio_evaluacion) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'} />
                ))}
                <span className="text-amber-400 font-bold ml-2">{sim.promedio_evaluacion}/5</span>
              </div>
            </div>}
          </div>
        </div>
      </div>

      {/* Lecciones aprendidas */}
      {sim.lecciones_aprendidas && (
        <div className="bg-amber-500/5 rounded-xl border border-amber-500/20 p-5">
          <h3 className="text-sm font-medium text-amber-400 flex items-center gap-2 mb-2">
            <AlertTriangle size={16} /> Lecciones Aprendidas
          </h3>
          <p className="text-slate-300 text-sm whitespace-pre-wrap">{sim.lecciones_aprendidas}</p>
        </div>
      )}

      {/* Evaluación por criterios */}
      {sim.evaluaciones?.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-5 border-b border-slate-700">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <Star size={16} className="text-amber-400" /> Evaluación del Simulacro
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Criterio</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Calificación</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Observación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {sim.evaluaciones.map((ev, i) => (
                <tr key={i} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 text-slate-200">{ev.criterio}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={14}
                          className={s <= ev.calificacion ? 'text-amber-400 fill-amber-400' : 'text-slate-600'} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{ev.observacion || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Participantes */}
      {sim.participantes?.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-5 border-b border-slate-700">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <Users size={16} className="text-roka-400" /> Participantes ({sim.participantes.length})
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                {['Personal', 'Rol', 'Asistió'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {sim.participantes.map(p => (
                <tr key={p.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 text-slate-200">{p.personal?.nombres} {p.personal?.apellidos}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs capitalize px-2 py-1 rounded-full bg-slate-700 text-slate-300">{p.rol}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${p.asistio ? 'text-emerald-400' : 'text-red-400'}`}>
                      {p.asistio ? 'Sí' : 'No'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Ejecución */}
      {showEjecucion && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-lg space-y-4 animate-slide-up">
            <h3 className="text-lg font-bold text-white">Registrar Ejecución</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Tiempo de respuesta (min)</label>
                <input type="number" min="0" value={ejecucionForm.tiempo_respuesta_min}
                  onChange={e => setEjecucionForm(p => ({ ...p, tiempo_respuesta_min: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Personas evacuadas</label>
                <input type="number" min="0" value={ejecucionForm.personas_evacuadas}
                  onChange={e => setEjecucionForm(p => ({ ...p, personas_evacuadas: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Observaciones</label>
              <textarea rows={2} value={ejecucionForm.observaciones}
                onChange={e => setEjecucionForm(p => ({ ...p, observaciones: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Lecciones aprendidas</label>
              <textarea rows={2} value={ejecucionForm.lecciones_aprendidas}
                onChange={e => setEjecucionForm(p => ({ ...p, lecciones_aprendidas: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowEjecucion(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancelar</button>
              <button onClick={ejecutar} disabled={saving}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                <Play size={16} /> {saving ? 'Guardando...' : 'Confirmar Ejecución'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Evaluación */}
      {showEvaluacion && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-2xl space-y-4 animate-slide-up max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Star size={20} className="text-amber-400" /> Evaluación del Simulacro
            </h3>
            <div className="space-y-3">
              {evaluacionData.map((ev, i) => (
                <div key={i} className="bg-slate-900 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-slate-200 font-medium">{ev.criterio}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(s => (
                        <button key={s} onClick={() => setCalificacion(i, s)}
                          className="p-1 hover:scale-110 transition-transform">
                          <Star size={22}
                            className={s <= ev.calificacion ? 'text-amber-400 fill-amber-400' : 'text-slate-600 hover:text-slate-400'} />
                        </button>
                      ))}
                    </div>
                    <input type="text" placeholder="Observación..."
                      value={ev.observacion} onChange={e => {
                        const updated = [...evaluacionData]
                        updated[i].observacion = e.target.value
                        setEvaluacionData(updated)
                      }}
                      className="flex-1 bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowEvaluacion(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancelar</button>
              <button onClick={guardarEvaluacion} disabled={saving}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                <Star size={16} /> {saving ? 'Guardando...' : 'Guardar Evaluación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
