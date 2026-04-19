import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  ArrowLeft, Edit, Send, CheckCircle2, XCircle, Clock,
  MapPin, Calendar, Users, AlertTriangle, FileSignature,
  Shield, HardHat, Printer
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import FirmaModal from '../../components/firmas/FirmaModal'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_COLORS = {
  borrador:         'bg-slate-500/15 text-slate-300 ring-slate-500/30',
  pendiente_firma:  'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  autorizado:       'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  en_ejecucion:     'bg-blue-500/15 text-blue-300 ring-blue-500/30',
  cerrado:          'bg-slate-500/15 text-slate-300 ring-slate-500/30',
  cancelado:        'bg-red-500/15 text-red-300 ring-red-500/30',
}

const NIVEL_COLORS = {
  bajo:    'bg-emerald-500/15 text-emerald-400',
  medio:   'bg-amber-500/15 text-amber-400',
  alto:    'bg-orange-500/15 text-orange-400',
  critico: 'bg-red-500/15 text-red-400',
}

export default function AtsDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useSelector(s => s.auth.user)

  const [ats, setAts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [firmaModalOpen, setFirmaModalOpen] = useState(false)
  const [solicitudFirma, setSolicitudFirma] = useState(null)

  useEffect(() => {
    cargar()
  }, [id])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/ats/${id}`)
      setAts(data)
    } catch (e) {
      toast.error('Error al cargar ATS')
      navigate('/ats')
    } finally {
      setLoading(false)
    }
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
    if (!confirm('¿Cerrar este ATS? No podrá volver a modificarse.')) return
    try {
      await api.post(`/ats/${id}/cerrar`)
      toast.success('ATS cerrado')
      cargar()
    } catch (e) {
      toast.error('Error al cerrar ATS')
    }
  }

  const abrirFirmaPersonal = async () => {
    try {
      const { data } = await api.get(`/firmas/pendientes?documento_tipo=ats&documento_id=${id}`)
      if (data.length === 0) {
        toast.error('No tiene firmas pendientes para este ATS')
        return
      }
      setSolicitudFirma(data[0])
      setFirmaModalOpen(true)
    } catch (e) {
      toast.error('Error al obtener solicitud de firma')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-roka-500"></div>
      </div>
    )
  }

  if (!ats) return null

  const firmasRequeridas = ats.participantes?.length || 0
  const firmasRealizadas = ats.firmas?.filter(f => f.estado === 'firmado').length || 0
  const yoYaFirme = ats.firmas?.some(
    f => f.firmante_usuario_id === user?.id && f.estado === 'firmado'
  )
  const soyParticipante = ats.participantes?.some(
    p => p.personal?.usuario_id === user?.id
  )

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/ats')}
            className="p-2 hover:bg-slate-800 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{ats.codigo}</h1>
              <span className={`px-2 py-0.5 rounded text-xs ring-1 ${ESTADO_COLORS[ats.estado]}`}>
                {ats.estado.replace('_', ' ')}
              </span>
            </div>
            <p className="text-slate-400 mt-1">{ats.titulo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-300"
            title="Imprimir"
          >
            <Printer size={18} />
          </button>
          {ats.estado === 'borrador' && (
            <>
              <Link
                to={`/ats/${id}/editar`}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
              >
                <Edit size={14} /> Editar
              </Link>
              <button
                onClick={solicitarFirmas}
                className="flex items-center gap-1 px-3 py-1.5 bg-roka-600 hover:bg-roka-700 text-white rounded-lg text-sm"
              >
                <Send size={14} /> Enviar a firmas
              </button>
            </>
          )}
          {ats.estado === 'pendiente_firma' && soyParticipante && !yoYaFirme && (
            <button
              onClick={abrirFirmaPersonal}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm"
            >
              <FileSignature size={14} /> Firmar ahora
            </button>
          )}
          {ats.estado === 'en_ejecucion' && (
            <button
              onClick={cerrarAts}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
            >
              <CheckCircle2 size={14} /> Cerrar ATS
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
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
                <dt className="text-slate-400 flex items-center gap-1">
                  <MapPin size={12} /> Ubicación
                </dt>
                <dd className="text-white mt-1">{ats.ubicacion || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 flex items-center gap-1">
                  <Calendar size={12} /> Fecha del trabajo
                </dt>
                <dd className="text-white mt-1">
                  {ats.fecha_trabajo ? format(new Date(ats.fecha_trabajo), 'dd/MM/yyyy', { locale: es }) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Horario</dt>
                <dd className="text-white mt-1">
                  {ats.hora_inicio || '—'} a {ats.hora_fin || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Supervisor responsable</dt>
                <dd className="text-white mt-1">
                  {ats.supervisor?.nombres} {ats.supervisor?.apellidos}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Creado por</dt>
                <dd className="text-white mt-1">
                  {ats.creado_por?.nombres} {ats.creado_por?.apellidos}
                </dd>
              </div>
              {ats.descripcion_trabajo && (
                <div className="md:col-span-2">
                  <dt className="text-slate-400">Descripción del trabajo</dt>
                  <dd className="text-white mt-1 whitespace-pre-wrap">{ats.descripcion_trabajo}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Permiso de trabajo */}
          {ats.requiere_permiso_trabajo && (
            <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-amber-300 mb-3 flex items-center gap-2">
                <AlertTriangle size={18} /> Permiso de trabajo requerido (PETAR)
              </h2>
              <div className="flex flex-wrap gap-2">
                {(ats.tipos_permiso || []).map(tp => (
                  <span key={tp} className="px-3 py-1 bg-amber-500/15 text-amber-300 rounded-lg text-xs border border-amber-500/30">
                    {tp.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tareas y peligros */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle size={18} /> Tareas y análisis de peligros
            </h2>
            <div className="space-y-4">
              {(ats.tareas || []).map((tarea, ti) => (
                <div key={tarea.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-roka-500/20 text-roka-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {ti + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">{tarea.descripcion}</div>
                    </div>
                  </div>
                  <div className="ml-10 space-y-2">
                    {(tarea.peligros || []).map(peligro => (
                      <div key={peligro.id} className="bg-slate-800/50 border border-slate-700 rounded p-3 text-sm">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex-1">
                            <div className="text-white">{peligro.descripcion}</div>
                            <div className="text-slate-400 text-xs mt-0.5">
                              Riesgo: {peligro.riesgo_asociado}
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs ${NIVEL_COLORS[peligro.nivel_riesgo]}`}>
                            {peligro.nivel_riesgo}
                          </span>
                        </div>
                        {peligro.epps_requeridos?.length > 0 && (
                          <div className="mt-2 flex items-center gap-1 flex-wrap">
                            <HardHat size={12} className="text-slate-500" />
                            {peligro.epps_requeridos.map(e => (
                              <span key={e.id} className="px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded text-xs">
                                {e.nombre}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
          {/* Estado firmas */}
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
                const firma = ats.firmas?.find(f => f.firmante_personal_id === p.personal_id)
                return (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    {firma?.estado === 'firmado' ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : firma?.estado === 'rechazado' ? (
                      <XCircle size={14} className="text-red-400" />
                    ) : (
                      <Clock size={14} className="text-slate-500" />
                    )}
                    <span className="flex-1 text-slate-300 truncate">
                      {p.personal?.nombres} {p.personal?.apellidos}
                    </span>
                    {firma?.firmado_en && (
                      <span className="text-xs text-slate-500">
                        {format(new Date(firma.firmado_en), 'dd/MM HH:mm')}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Participantes */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Users size={16} /> Participantes ({ats.participantes?.length || 0})
            </h3>
            <div className="space-y-2">
              {(ats.participantes || []).map(p => (
                <div key={p.id} className="text-sm">
                  <div className="text-white">
                    {p.personal?.nombres} {p.personal?.apellidos}
                  </div>
                  <div className="text-xs text-slate-400">
                    {p.personal?.cargo?.nombre || 'Sin cargo'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal firma */}
      {firmaModalOpen && solicitudFirma && (
        <FirmaModal
          solicitud={solicitudFirma}
          onClose={() => setFirmaModalOpen(false)}
          onFirmado={() => {
            setFirmaModalOpen(false)
            cargar()
          }}
        />
      )}
    </div>
  )
}
