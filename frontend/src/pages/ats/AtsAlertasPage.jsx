import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, ArrowLeft, Clock, Play, CheckCircle2, AlertTriangle,
  ChevronRight, RefreshCw, ClipboardList,
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

function safeDate(val, fmt = 'dd/MM/yyyy') {
  if (!val) return '—'
  try {
    const d = parseISO(String(val).substring(0, 10))
    return isValid(d) ? format(d, fmt, { locale: es }) : '—'
  } catch { return '—' }
}

function AlertCard({ color, icon: Icon, title, description, items, emptyText, renderItem }) {
  return (
    <div className={`card overflow-hidden border-l-4 ${color}`}>
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <Icon size={16} />
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <span className="ml-auto text-lg font-bold text-slate-700">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="px-5 py-6 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-400" /> {emptyText}
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {items.map(renderItem)}
        </div>
      )}
    </div>
  )
}

export default function AtsAlertasPage() {
  const navigate    = useNavigate()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/ats/alertas')
      setData(res)
    } catch {
      toast.error('Error al cargar alertas')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-roka-500" />
      </div>
    )
  }

  const sinFirmas         = data?.sin_firmas_hoy       || []
  const autorizados       = data?.autorizados_parados   || []
  const enEjecucionLarga  = data?.en_ejecucion_larga    || []
  const criticos          = data?.criticos_activos       || []
  const totalAlertas      = data?.total_alertas         || 0

  function rowBase(ats, accionBtn) {
    return (
      <div
        key={ats.id}
        className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-roka-500">{ats.codigo}</code>
            {ats.area?.nombre && (
              <span className="text-xs text-slate-400">· {ats.area.nombre}</span>
            )}
          </div>
          <p className="text-sm text-slate-700 font-medium truncate">{ats.titulo_trabajo}</p>
          {ats.fecha_ejecucion && (
            <p className="text-xs text-slate-400">{safeDate(ats.fecha_ejecucion)} {ats.hora_inicio ? `· ${ats.hora_inicio.substring(0, 5)}` : ''}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {accionBtn}
          <button
            onClick={() => navigate(`/ats/${ats.id}`)}
            className="p-1.5 text-slate-400 hover:text-roka-500 rounded-lg hover:bg-roka-50 transition-colors"
            title="Ver detalle"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/ats')}
            className="btn-back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
              <span>ATS</span> <span>/</span> <span>Alertas</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Bell size={20} className="text-amber-500" />
              Alertas ATS
              {totalAlertas > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-600 text-sm font-semibold rounded-full">
                  {totalAlertas}
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Situaciones que requieren atención inmediata</p>
          </div>
        </div>
        <button
          onClick={cargar}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {totalAlertas === 0 && (
        <div className="card p-12 text-center">
          <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-700">Sin alertas activas</h2>
          <p className="text-slate-500 text-sm mt-1">Todos los ATS están en orden por el momento.</p>
        </div>
      )}

      <div className="space-y-5">

        {/* Próximos sin firmar */}
        <AlertCard
          color="border-amber-400"
          icon={Clock}
          title="ATS próximos sin firmar (7 días)"
          description="Programados en los próximos 7 días aún en borrador o pendiente de firma"
          items={sinFirmas}
          emptyText="No hay ATS próximos sin firmar"
          renderItem={ats => rowBase(ats,
            <button
              onClick={() => navigate(`/ats/${ats.id}`)}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-xs font-medium transition-colors"
            >
              <Clock size={11} /> {ats.estado === 'borrador' ? 'Revisar' : 'Firmar'}
            </button>
          )}
        />

        {/* Autorizados parados */}
        <AlertCard
          color="border-blue-400"
          icon={Play}
          title="Autorizados sin iniciar"
          description="ATS ya autorizados que aún no han iniciado su ejecución"
          items={autorizados}
          emptyText="No hay ATS autorizados esperando inicio"
          renderItem={ats => rowBase(ats,
            <button
              onClick={() => navigate(`/ats/${ats.id}`)}
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-medium transition-colors"
            >
              <Play size={11} /> Iniciar
            </button>
          )}
        />

        {/* En ejecución larga */}
        <AlertCard
          color="border-orange-400"
          icon={ClipboardList}
          title="En ejecución sin cerrar"
          description="ATS en ejecución que deberían haber concluido hoy"
          items={enEjecucionLarga}
          emptyText="No hay ejecuciones prolongadas"
          renderItem={ats => rowBase(ats,
            <button
              onClick={() => navigate(`/ats/${ats.id}`)}
              className="flex items-center gap-1 px-2.5 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-xs font-medium transition-colors"
            >
              <CheckCircle2 size={11} /> Cerrar
            </button>
          )}
        />

        {/* Alto riesgo activos */}
        <AlertCard
          color="border-red-500"
          icon={AlertTriangle}
          title="ATS de alto riesgo activos"
          description="Nivel de riesgo alto o crítico con estado diferente a cerrado o cancelado"
          items={criticos}
          emptyText="No hay ATS de alto riesgo activos"
          renderItem={ats => rowBase(ats, null)}
        />
      </div>
    </div>
  )
}
