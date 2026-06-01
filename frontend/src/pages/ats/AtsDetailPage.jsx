import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  ArrowLeft, Edit, Send, CheckCircle2, XCircle, Clock,
  MapPin, Calendar, Users, AlertTriangle, FileSignature,
  Shield, HardHat, Printer, Trash2, Settings2, ChevronDown,
  PlayCircle, SkipForward, Play, Ban
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import FirmaModal from '../../components/firmas/FirmaModal'
import { format, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

function safeDate(val, fmt = 'dd/MM/yyyy') {
  if (!val) return '—'
  try {
    const d = parseISO(String(val).substring(0, 10))
    return isValid(d) ? format(d, fmt, { locale: es }) : '—'
  } catch { return '—' }
}

const ESTADO_COLORS = {
  borrador:         'bg-slate-500/15 text-slate-300 ring-slate-500/30',
  pendiente_firma:  'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  autorizado:       'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  en_ejecucion:     'bg-blue-500/15 text-blue-300 ring-blue-500/30',
  cerrado:          'bg-slate-500/15 text-slate-300 ring-slate-500/30',
  cancelado:        'bg-red-500/15 text-red-300 ring-red-500/30',
}

const ESTADO_LABELS = {
  borrador: 'Borrador', pendiente_firma: 'Pendiente firma',
  autorizado: 'Autorizado', en_ejecucion: 'En ejecución',
  cerrado: 'Cerrado', cancelado: 'Cancelado',
}

const NIVEL_COLORS = {
  bajo:    'bg-emerald-500/15 text-emerald-400',
  medio:   'bg-amber-500/15 text-amber-400',
  alto:    'bg-orange-500/15 text-orange-400',
  critico: 'bg-red-500/15 text-red-400',
}

const SEV_COLORS = {
  leve:      'bg-emerald-500/15 text-emerald-400',
  moderada:  'bg-amber-500/15 text-amber-400',
  grave:     'bg-orange-500/15 text-orange-400',
  muy_grave: 'bg-red-500/15 text-red-400',
}

const EJECUCION_COLORS = {
  pendiente: 'text-slate-400',
  ejecutada: 'text-emerald-400',
  omitida:   'text-amber-400',
}

const TIPO_CONTROL_LABEL = {
  eliminacion: 'Eliminación', sustitucion: 'Sustitución',
  ingenieria: 'Ingeniería', administrativo: 'Administrativo', epp: 'EPP',
}

const ROL_LABEL = {
  supervisor: 'Supervisor', ejecutor: 'Ejecutor',
  observador: 'Observador', ayudante: 'Ayudante',
}

export default function AtsDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const user     = useSelector(s => s.auth.user)

  const [ats, setAts]                   = useState(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [eppCats, setEppCats]           = useState({})
  const [firmaModalOpen, setFirmaModal] = useState(false)
  const [obsModal, setObsModal]         = useState(null) // { tareaId, estadoNuevo }
  const [obsTexto, setObsTexto]         = useState('')

  // Modal cerrar ATS
  const [cerrarModal, setCerrarModal]   = useState(false)
  const [datosCierre, setDatosCierre]   = useState({ hora_fin: '', observaciones_cierre: '' })
  const [guardandoCierre, setGuardandoCierre] = useState(false)

  useEffect(() => { cargar(); cargarEpps() }, [id])

  const cargar = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(`/ats/${id}`)
      setAts(data)
    } catch (e) {
      const msg = e.response?.status === 404
        ? 'ATS no encontrado'
        : (e.response?.data?.message || 'Error al cargar el ATS')
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const cargarEpps = async () => {
    try {
      const { data } = await api.get('/epps/categorias')
      const map = {}
      ;(Array.isArray(data) ? data : data.data || []).forEach(c => { map[c.id] = c.nombre })
      setEppCats(map)
    } catch { /* silent */ }
  }

  const solicitarFirmas = async () => {
    if (!confirm('¿Enviar este ATS a firma de todos los participantes?')) return
    try {
      await api.post(`/ats/${id}/solicitar-firmas`)
      toast.success('Solicitudes de firma enviadas')
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al solicitar firmas')
    }
  }

  const cerrarAts = async () => {
    if (!datosCierre.hora_fin) { toast.error('Ingrese la hora de fin'); return }
    if (!datosCierre.observaciones_cierre || datosCierre.observaciones_cierre.length < 10) {
      toast.error('Las observaciones de cierre deben tener al menos 10 caracteres'); return
    }
    setGuardandoCierre(true)
    try {
      await api.post(`/ats/${id}/cerrar`, datosCierre)
      toast.success('ATS cerrado correctamente')
      setCerrarModal(false)
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al cerrar ATS')
    } finally {
      setGuardandoCierre(false)
    }
  }

  const eliminarAts = async () => {
    if (!confirm('¿Eliminar este ATS? Esta acción no se puede deshacer.')) return
    try {
      await api.delete(`/ats/${id}`)
      toast.success('ATS eliminado')
      navigate('/ats')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al eliminar')
    }
  }

  const abrirFirmaPersonal = () => setFirmaModal(true)

  const autorizarAts = async () => {
    if (!confirm('¿Marcar este ATS como autorizado? Confirma que todas las firmas requeridas están completas.')) return
    try {
      await api.post(`/ats/${id}/autorizar`)
      toast.success('ATS autorizado')
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al autorizar')
    }
  }

  const iniciarEjecucion = async () => {
    if (!confirm('¿Iniciar la ejecución del trabajo? Los participantes podrán registrar el avance de tareas.')) return
    try {
      await api.post(`/ats/${id}/iniciar`)
      toast.success('Trabajo iniciado')
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al iniciar ejecución')
    }
  }

  const cancelarAts = async () => {
    const motivo = prompt('Motivo de cancelación (opcional):')
    if (motivo === null) return
    try {
      await api.post(`/ats/${id}/cancelar`, { motivo_cancelacion: motivo || undefined })
      toast.success('ATS cancelado')
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al cancelar')
    }
  }

  const actualizarTarea = async (tareaId, estado, observaciones = '') => {
    try {
      await api.patch(`/ats/${id}/tareas/${tareaId}`, {
        estado_ejecucion: estado,
        observaciones:    observaciones || undefined,
      })
      toast.success(estado === 'ejecutada' ? 'Tarea ejecutada' : estado === 'omitida' ? 'Tarea omitida' : 'Tarea restablecida')
      setObsModal(null)
      setObsTexto('')
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al actualizar tarea')
    }
  }

  const pedirObservaciones = (tareaId, estadoNuevo) => {
    setObsTexto('')
    setObsModal({ tareaId, estadoNuevo })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-roka-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle size={40} className="text-red-400" />
        <p className="text-slate-700 font-medium">{error}</p>
        <div className="flex gap-3">
          <button onClick={cargar} className="btn-primary">Reintentar</button>
          <button onClick={() => navigate('/ats/gestion')} className="btn-back">
            <ArrowLeft size={16} /> Volver a la lista
          </button>
        </div>
      </div>
    )
  }

  if (!ats) return null

  const firmasRequeridas = ats.participantes?.length || 0
  const firmasRealizadas = ats.firmas?.length || 0
  const yoYaFirme       = ats.firmas?.some(f => f.usuario_id === user?.id)
  const soyParticipante  = ats.participantes?.some(p => p.personal?.usuario_id === user?.id)

  const tareasTotal     = ats.tareas?.length || 0
  const tareasEjecutadas = ats.tareas?.filter(t => t.estado_ejecucion === 'ejecutada').length || 0
  const tareasOmitidas  = ats.tareas?.filter(t => t.estado_ejecucion === 'omitida').length  || 0

  return (
    <div className="max-w-6xl mx-auto pb-12">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/ats')} className="p-2 hover:bg-slate-800 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{ats.codigo}</h1>
              <span className={`px-2 py-0.5 rounded text-xs ring-1 ${ESTADO_COLORS[ats.estado]}`}>
                {ESTADO_LABELS[ats.estado] || ats.estado}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${NIVEL_COLORS[ats.nivel_riesgo]}`}>
                Riesgo {ats.nivel_riesgo}
              </span>
            </div>
            <p className="text-slate-400 mt-0.5 text-sm">{ats.titulo_trabajo}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap no-print">
          <button onClick={() => window.print()} className="btn-back" title="Imprimir">
            <Printer size={18} />
          </button>

          {/* Borrador: editar + enviar a firmas + eliminar */}
          {ats.estado === 'borrador' && (
            <>
              <Link to={`/ats/${id}/editar`}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">
                <Edit size={14} /> Editar
              </Link>
              <button onClick={solicitarFirmas}
                className="flex items-center gap-1 px-3 py-1.5 bg-roka-600 hover:bg-roka-700 text-white rounded-lg text-sm">
                <Send size={14} /> Enviar a firmas
              </button>
              <button onClick={eliminarAts}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg text-sm">
                <Trash2 size={14} /> Eliminar
              </button>
            </>
          )}

          {/* Pendiente firma: firmar + autorizar + cancelar */}
          {ats.estado === 'pendiente_firma' && (
            <>
              {soyParticipante && !yoYaFirme && (
                <button onClick={abrirFirmaPersonal}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm">
                  <FileSignature size={14} /> Firmar ahora
                </button>
              )}
              {firmasRealizadas >= firmasRequeridas && firmasRequeridas > 0 && (
                <button onClick={autorizarAts}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium">
                  <CheckCircle2 size={14} /> Marcar autorizado
                </button>
              )}
              <button onClick={cancelarAts}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg text-sm">
                <Ban size={14} /> Cancelar ATS
              </button>
            </>
          )}

          {/* Autorizado: iniciar + cancelar */}
          {ats.estado === 'autorizado' && (
            <>
              <button onClick={iniciarEjecucion}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
                <Play size={14} /> Iniciar trabajo
              </button>
              <button onClick={cancelarAts}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg text-sm">
                <Ban size={14} /> Cancelar ATS
              </button>
            </>
          )}

          {/* En ejecución: cerrar */}
          {ats.estado === 'en_ejecucion' && (
            <button onClick={() => setCerrarModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">
              <CheckCircle2 size={14} /> Cerrar ATS
            </button>
          )}

          {/* Cancelado: eliminar */}
          {ats.estado === 'cancelado' && (
            <button onClick={eliminarAts}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg text-sm">
              <Trash2 size={14} /> Eliminar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Columna principal ────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Datos generales */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield size={18} /> Información general
            </h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-400">Área</dt>
                <dd className="text-white mt-1">{ats.area?.nombre || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 flex items-center gap-1"><MapPin size={12} /> Ubicación</dt>
                <dd className="text-white mt-1">{ats.ubicacion || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 flex items-center gap-1"><Calendar size={12} /> Fecha del trabajo</dt>
                <dd className="text-white mt-1">{safeDate(ats.fecha_ejecucion, 'dd/MM/yyyy')}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Horario</dt>
                <dd className="text-white mt-1">
                  {ats.hora_inicio ? ats.hora_inicio.substring(0, 5) : '—'}
                  {ats.hora_fin ? ` — ${ats.hora_fin.substring(0, 5)}` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Supervisor responsable</dt>
                <dd className="text-white mt-1">
                  {ats.supervisor ? `${ats.supervisor.nombres} ${ats.supervisor.apellidos}` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Elaborado por</dt>
                <dd className="text-white mt-1">{ats.elaborador?.nombre || '—'}</dd>
              </div>
              {ats.iperc && (
                <div>
                  <dt className="text-slate-400">IPERC de referencia</dt>
                  <dd className="mt-1">
                    <Link to={`/iperc/${ats.iperc.id}`}
                      className="text-roka-400 hover:underline font-mono text-xs">
                      {ats.iperc.codigo} — {ats.iperc.titulo}
                    </Link>
                  </dd>
                </div>
              )}
              {ats.descripcion && (
                <div className="md:col-span-2">
                  <dt className="text-slate-400">Descripción del trabajo</dt>
                  <dd className="text-white mt-1 whitespace-pre-wrap">{ats.descripcion}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Permiso de trabajo */}
          {ats.requiere_permiso_especial && (
            <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-amber-300 mb-3 flex items-center gap-2">
                <AlertTriangle size={18} /> Permiso de trabajo requerido (PETAR)
              </h2>
              <div className="flex flex-wrap gap-2">
                {(ats.tipos_permiso || []).map(tp => (
                  <span key={tp} className="px-3 py-1 bg-amber-500/15 text-amber-300 rounded-lg text-xs border border-amber-500/30">
                    {tp.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Progreso de tareas (solo en ejecución) */}
          {ats.estado === 'en_ejecucion' && tareasTotal > 0 && (
            <div className="bg-blue-500/5 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-blue-300 font-medium">Avance de ejecución</span>
                <span className="text-blue-300 tabular-nums">
                  {tareasEjecutadas + tareasOmitidas} / {tareasTotal} completadas
                </span>
              </div>
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${((tareasEjecutadas + tareasOmitidas) / tareasTotal) * 100}%` }}
                />
              </div>
              <div className="flex gap-4 mt-2 text-xs text-slate-400">
                <span className="text-emerald-400">{tareasEjecutadas} ejecutadas</span>
                <span className="text-amber-400">{tareasOmitidas} omitidas</span>
                <span>{tareasTotal - tareasEjecutadas - tareasOmitidas} pendientes</span>
              </div>
            </div>
          )}

          {/* Tareas */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-400" /> Tareas y análisis de riesgos
            </h2>
            <div className="space-y-4">
              {(ats.tareas || []).map((tarea, ti) => (
                <div key={tarea.id}
                  className={`border rounded-xl p-4 ${
                    tarea.estado_ejecucion === 'ejecutada' ? 'bg-emerald-500/5 border-emerald-500/20' :
                    tarea.estado_ejecucion === 'omitida'  ? 'bg-amber-500/5 border-amber-500/20' :
                    'bg-slate-900/50 border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-roka-500/20 text-roka-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {ti + 1}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${EJECUCION_COLORS[tarea.estado_ejecucion] || 'text-white'}`}>
                        {tarea.descripcion_tarea}
                      </div>
                      {tarea.estado_ejecucion !== 'pendiente' && (
                        <span className={`text-xs font-medium ${EJECUCION_COLORS[tarea.estado_ejecucion]}`}>
                          {tarea.estado_ejecucion === 'ejecutada' ? '✓ Ejecutada' : '— Omitida'}
                        </span>
                      )}
                      {tarea.observaciones && (
                        <p className="text-xs text-slate-400 mt-1">{tarea.observaciones}</p>
                      )}
                    </div>
                    {/* Botones de ejecución */}
                    {ats.estado === 'en_ejecucion' && (
                      <div className="flex items-center gap-1 flex-shrink-0 no-print">
                        <button
                          onClick={() => actualizarTarea(tarea.id, tarea.estado_ejecucion === 'ejecutada' ? 'pendiente' : 'ejecutada')}
                          title={tarea.estado_ejecucion === 'ejecutada' ? 'Marcar pendiente' : 'Marcar ejecutada'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            tarea.estado_ejecucion === 'ejecutada'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                        >
                          <PlayCircle size={16} />
                        </button>
                        <button
                          onClick={() => tarea.estado_ejecucion === 'omitida'
                            ? actualizarTarea(tarea.id, 'pendiente')
                            : pedirObservaciones(tarea.id, 'omitida')
                          }
                          title={tarea.estado_ejecucion === 'omitida' ? 'Marcar pendiente' : 'Omitir tarea'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            tarea.estado_ejecucion === 'omitida'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'text-slate-500 hover:text-amber-400 hover:bg-amber-500/10'
                          }`}
                        >
                          <SkipForward size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Peligros */}
                  {(tarea.peligros || []).length > 0 && (
                    <div className="ml-10 mb-3">
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">Peligros</p>
                      <div className="space-y-1.5">
                        {tarea.peligros.map(peligro => (
                          <div key={peligro.id} className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-2.5 text-sm">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="text-white">{peligro.descripcion}</div>
                                {peligro.riesgo && (
                                  <div className="text-slate-400 text-xs mt-0.5">Riesgo: {peligro.riesgo}</div>
                                )}
                              </div>
                              <div className="flex gap-1.5 flex-shrink-0">
                                <span className="text-xs text-slate-500 capitalize">{peligro.tipo_peligro}</span>
                                {peligro.severidad && (
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium capitalize ${SEV_COLORS[peligro.severidad]}`}>
                                    {peligro.severidad.replace('_', ' ')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Controles */}
                  {(tarea.controles || []).length > 0 && (
                    <div className="ml-10">
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2 flex items-center gap-1">
                        <Settings2 size={10} /> Medidas de control
                      </p>
                      <div className="space-y-1">
                        {tarea.controles.map(ctrl => (
                          <div key={ctrl.id} className="flex items-center gap-2 text-xs text-slate-300">
                            <span className={`px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${ctrl.implementado ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                              {TIPO_CONTROL_LABEL[ctrl.tipo_control] || ctrl.tipo_control}
                            </span>
                            <span className="flex-1">{ctrl.descripcion}</span>
                            {ctrl.implementado && <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* EPPs requeridos */}
          {(ats.epps_requeridos || []).length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <HardHat size={18} className="text-roka-400" /> EPPs requeridos
              </h2>
              <div className="flex flex-wrap gap-2">
                {ats.epps_requeridos.map(eppId => (
                  <span key={eppId} className="px-3 py-1 bg-roka-500/15 text-roka-300 rounded-lg text-xs border border-roka-500/30 flex items-center gap-1">
                    <HardHat size={11} />
                    {eppCats[eppId] || `EPP #${eppId}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Observaciones de cierre */}
          {ats.estado === 'cerrado' && ats.observaciones_cierre && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-slate-300 mb-2">Observaciones de cierre</h2>
              <p className="text-slate-400 text-sm whitespace-pre-wrap">{ats.observaciones_cierre}</p>
              <p className="text-xs text-slate-500 mt-2">
                Cerrado el {safeDate(ats.cerrado_en, "dd/MM/yyyy 'a las' HH:mm")}
              </p>
            </div>
          )}
        </div>

        {/* ── Columna lateral ────────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Estado de firmas */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <FileSignature size={16} /> Estado de firmas
            </h3>
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Progreso</span>
                <span>{firmasRealizadas} / {firmasRequeridas}</span>
              </div>
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${firmasRequeridas ? (firmasRealizadas / firmasRequeridas) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              {(ats.participantes || []).map(p => {
                const firma = ats.firmas?.find(f => f.firmante_usuario_id === p.personal?.usuario_id)
                return (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    {firma ? (
                      <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Clock size={14} className="text-slate-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-300 truncate">
                        {p.personal?.nombres} {p.personal?.apellidos}
                      </div>
                      {firma?.created_at && (
                        <div className="text-xs text-slate-500">
                          {safeDate(firma.created_at, 'dd/MM HH:mm')}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Participantes con roles */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Users size={16} /> Participantes ({ats.participantes?.length || 0})
            </h3>
            <div className="space-y-2">
              {(ats.participantes || []).map(p => (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="text-white truncate">
                      {p.personal?.nombres} {p.personal?.apellidos}
                    </div>
                    <div className="text-xs text-slate-400">{p.personal?.dni || ''}</div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300 flex-shrink-0 capitalize">
                    {ROL_LABEL[p.rol] || p.rol}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Modal Cerrar ATS ──────────────────────────────────────────────────── */}
      {cerrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-400" /> Cerrar ATS
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Confirme la hora de finalización y registre observaciones del trabajo ejecutado.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Hora de fin *</label>
                <input
                  type="time"
                  value={datosCierre.hora_fin}
                  onChange={e => setDatosCierre(d => ({ ...d, hora_fin: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Observaciones de cierre *</label>
                <textarea
                  rows={4}
                  value={datosCierre.observaciones_cierre}
                  onChange={e => setDatosCierre(d => ({ ...d, observaciones_cierre: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Describa cómo se ejecutó el trabajo, incidentes, desviaciones…"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Mínimo 10 caracteres ({datosCierre.observaciones_cierre.length})
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setCerrarModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={cerrarAts}
                disabled={guardandoCierre}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
              >
                {guardandoCierre ? 'Cerrando…' : 'Confirmar cierre'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal firma */}
      {firmaModalOpen && (
        <FirmaModal
          documentoTipo={'App\\Models\\Ats'}
          documentoId={Number(id)}
          titulo={`${ats.codigo} — ${ats.titulo_trabajo}`}
          accion="acepta"
          onClose={() => setFirmaModal(false)}
          onSuccess={() => { setFirmaModal(false); cargar() }}
        />
      )}

      {/* Modal observaciones al omitir tarea */}
      {obsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <SkipForward size={16} className="text-amber-400" /> Omitir tarea
            </h3>
            <p className="text-sm text-slate-400 mb-4">Indica el motivo por el que se omite esta tarea.</p>
            <textarea
              rows={3}
              value={obsTexto}
              onChange={e => setObsTexto(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500"
              placeholder="Motivo de la omisión (opcional)…"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setObsModal(null); setObsTexto('') }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
              >
                Volver
              </button>
              <button
                onClick={() => actualizarTarea(obsModal.tareaId, obsModal.estadoNuevo, obsTexto)}
                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
              >
                Confirmar omisión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
