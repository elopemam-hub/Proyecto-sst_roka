import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Shield, FileText, Calendar, User,
  AlertTriangle, CheckCircle2, Edit, Send, Pen,
  AlertCircle, Clock, Eye, Download
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import FirmaModal from '../../components/firmas/FirmaModal'

const CLASIF_COLORS = {
  trivial:     '#10b981',
  tolerable:   '#84cc16',
  moderado:    '#f59e0b',
  importante:  '#f97316',
  intolerable: '#ef4444',
}

export default function IpercDetailPage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const [iperc,  setIperc]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [showFirma, setShowFirma] = useState(false)

  useEffect(() => {
    cargar()
  }, [id])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/iperc/${id}`)
      setIperc(data)
    } catch (err) {
      toast.error('Error al cargar IPERC')
      navigate('/iperc')
    } finally {
      setLoading(false)
    }
  }

  const handleEnviarAFirma = async () => {
    if (!confirm('¿Enviar este IPERC al flujo de firmas?')) return
    try {
      await api.post(`/iperc/${id}/enviar-a-firma`)
      toast.success('IPERC enviado al flujo de firmas')
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al enviar')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!iperc) return null

  const resumen = iperc.resumen_riesgos || {}

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/iperc')}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors mt-1"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <code className="text-xs font-mono text-roka-400 bg-roka-500/10 px-2 py-0.5 rounded">
                {iperc.codigo}
              </code>
              <span className={`badge ${
                iperc.estado === 'aprobado' ? 'badge-green' :
                iperc.estado === 'en_revision' ? 'badge-yellow' :
                iperc.estado === 'vencido' ? 'badge-red' : 'badge-gray'
              }`}>
                {iperc.estado.replace('_', ' ')}
              </span>
              <span className="badge badge-blue text-xs">v{iperc.version}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-100">{iperc.titulo}</h1>
            <p className="text-sm text-slate-400 mt-0.5">{iperc.area?.nombre} · {iperc.sede?.nombre}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {iperc.estado === 'borrador' && (
            <>
              <button
                onClick={() => navigate(`/iperc/${id}/editar`)}
                className="btn-secondary flex items-center gap-2"
              >
                <Edit size={14} />
                Editar
              </button>
              <button
                onClick={handleEnviarAFirma}
                className="btn-primary flex items-center gap-2"
              >
                <Send size={14} />
                Enviar a firma
              </button>
            </>
          )}
          {['en_revision', 'aprobado'].includes(iperc.estado) && (
            <button
              onClick={() => setShowFirma(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Pen size={14} />
              Firmar
            </button>
          )}
        </div>
      </div>

      {/* ── Resumen de riesgos ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Total peligros</p>
          <p className="text-2xl font-bold text-slate-100 tabular-nums">{resumen.total ?? 0}</p>
        </div>
        {['trivial', 'tolerable', 'moderado', 'importante', 'intolerable'].map((k) => (
          <div key={k} className="card p-4" style={{ borderColor: `${CLASIF_COLORS[k]}30` }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ background: CLASIF_COLORS[k] }} />
              <p className="text-xs text-slate-500 capitalize">{k}</p>
            </div>
            <p className="text-2xl font-bold text-slate-100 tabular-nums">{resumen[k] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Columna izquierda — procesos ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              Matriz de riesgos
            </h2>

            <div className="space-y-4">
              {iperc.procesos?.map((proc) => (
                <div key={proc.id} className="border border-slate-800 rounded-lg overflow-hidden">
                  <div className="bg-slate-800/40 px-4 py-3 border-b border-slate-800">
                    <p className="text-sm font-medium text-slate-200">{proc.proceso}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {proc.actividad} · <span className="capitalize">{proc.tipo_actividad.replace('_', ' ')}</span>
                    </p>
                  </div>

                  <div className="divide-y divide-slate-800">
                    {proc.peligros?.map((pel) => {
                      const clasif = pel.clasificacion_residual || pel.clasificacion_inicial
                      const color = CLASIF_COLORS[clasif]
                      return (
                        <div key={pel.id} className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="badge badge-gray capitalize text-xs">{pel.tipo_peligro}</span>
                                {pel.es_riesgo_significativo && (
                                  <span className="badge badge-red text-xs">
                                    <AlertCircle size={10} /> Significativo
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-200 font-medium">{pel.descripcion_peligro}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{pel.riesgo}</p>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-xs text-slate-500 mb-1">NR = {pel.nivel_riesgo_inicial}</p>
                              <span
                                className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset capitalize"
                                style={{
                                  background: `${color}20`,
                                  color: color,
                                  boxShadow: `inset 0 0 0 1px ${color}40`,
                                }}
                              >
                                {clasif}
                              </span>
                            </div>
                          </div>

                          {pel.controles?.length > 0 && (
                            <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-3">
                              <p className="text-xs font-medium text-slate-500 uppercase mb-2">Controles</p>
                              <ul className="space-y-1.5">
                                {pel.controles.map((c) => (
                                  <li key={c.id} className="flex items-start gap-2 text-xs">
                                    <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                      <span className="badge badge-blue capitalize mr-2 text-xs">{c.tipo_control}</span>
                                      <span className="text-slate-300">{c.descripcion}</span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Columna derecha — metadatos y firmas ─────────────────── */}
        <div className="space-y-4">
          {/* Metadatos */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <FileText size={16} className="text-slate-400" />
              Información
            </h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500 mb-0.5">Metodología</dt>
                <dd className="text-slate-300">{iperc.metodologia.replace(/_/g, ' ')}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 mb-0.5">Elaborado por</dt>
                <dd className="text-slate-300">{iperc.elaborador?.nombre}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 mb-0.5">Fecha de elaboración</dt>
                <dd className="text-slate-300">
                  {format(new Date(iperc.fecha_elaboracion), "dd 'de' MMMM yyyy", { locale: es })}
                </dd>
              </div>
              {iperc.fecha_vigencia && (
                <div>
                  <dt className="text-xs text-slate-500 mb-0.5">Próxima revisión</dt>
                  <dd className={iperc.esta_vencido ? 'text-red-400' : 'text-slate-300'}>
                    {format(new Date(iperc.fecha_vigencia), "dd 'de' MMMM yyyy", { locale: es })}
                    {iperc.esta_vencido && <span className="ml-2 text-xs">(vencido)</span>}
                  </dd>
                </div>
              )}
              {iperc.alcance && (
                <div>
                  <dt className="text-xs text-slate-500 mb-0.5">Alcance</dt>
                  <dd className="text-slate-300 text-xs">{iperc.alcance}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Firmas */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Shield size={16} className="text-roka-400" />
              Firmas digitales
              <span className="text-xs font-normal text-slate-500">
                ({iperc.firmas?.length || 0})
              </span>
            </h3>

            {!iperc.firmas || iperc.firmas.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">Sin firmas registradas</p>
            ) : (
              <div className="space-y-3">
                {iperc.firmas.map((f) => (
                  <div key={f.id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-medium text-slate-200">{f.firmante_nombre}</p>
                        <p className="text-xs text-slate-500 capitalize">{f.firmante_rol?.replace('_', ' ')}</p>
                      </div>
                      <span className="badge badge-green text-xs capitalize">{f.accion_firma}</span>
                    </div>
                    <div className="text-xs text-slate-500 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Clock size={10} />
                        {format(new Date(f.firmado_en), "dd MMM yyyy HH:mm", { locale: es })}
                      </div>
                      <div className="font-mono text-[10px] text-slate-600 truncate">
                        {f.hash_firma?.substring(0, 32)}...
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de firma */}
      {showFirma && (
        <FirmaModal
          documentoTipo="App\\Models\\Iperc"
          documentoId={iperc.id}
          titulo={`${iperc.codigo} — ${iperc.titulo}`}
          accion="aprueba"
          onClose={() => setShowFirma(false)}
          onSuccess={() => { setShowFirma(false); cargar() }}
        />
      )}
    </div>
  )
}
