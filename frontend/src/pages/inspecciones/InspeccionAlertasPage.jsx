import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, ArrowLeft, Clock, AlertTriangle, CheckCircle2,
  ChevronRight, RefreshCw, ClipboardList, Wrench,
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
      <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
        <Icon size={16} className="shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <span className="ml-auto text-lg font-bold text-slate-200">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="px-5 py-6 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-400" /> {emptyText}
        </div>
      ) : (
        <div className="divide-y divide-slate-800">
          {items.map(renderItem)}
        </div>
      )}
    </div>
  )
}

export default function InspeccionAlertasPage() {
  const navigate          = useNavigate()
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/inspecciones/alertas')
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

  const proximas          = data?.proximas_a_vencer      || []
  const vencidas          = data?.vencidas               || []
  const enEjecucionAnt    = data?.en_ejecucion_antiguas  || []
  const hallazgosVencidos = data?.hallazgos_vencidos     || []
  const totalAlertas      = data?.total_alertas          || 0

  function rowInspeccion(ins, accionBtn) {
    return (
      <div
        key={ins.id}
        className="px-5 py-3 flex items-center gap-3 hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-roka-400">{ins.codigo}</code>
            {ins.area?.nombre && (
              <span className="text-xs text-slate-500">· {ins.area.nombre}</span>
            )}
          </div>
          <p className="text-sm text-slate-300 font-medium truncate">{ins.titulo}</p>
          {ins.planificada_para && (
            <p className="text-xs text-slate-500">
              Programada: {safeDate(ins.planificada_para)}
              {ins.inspector && ` · ${ins.inspector.nombres} ${ins.inspector.apellidos}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {accionBtn}
          <button
            onClick={() => navigate(`/inspecciones/${ins.id}`)}
            className="p-1.5 text-slate-500 hover:text-roka-400 rounded-lg hover:bg-slate-700 transition-colors"
            title="Ver detalle"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    )
  }

  function rowHallazgo(h) {
    return (
      <div
        key={h.id}
        className="px-5 py-3 flex items-center gap-3 hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-red-400">{h.numero_hallazgo || `H-${h.id}`}</code>
            <span className={`badge text-xs capitalize ${
              h.criticidad === 'critico' ? 'badge-red' :
              h.criticidad === 'moderado' ? 'badge-yellow' : 'badge-gray'
            }`}>{h.criticidad}</span>
          </div>
          <p className="text-sm text-slate-300 font-medium truncate">{h.descripcion}</p>
          <p className="text-xs text-slate-500">
            {h.inspeccion?.codigo} · Vencía: {safeDate(h.fecha_limite_correccion)}
            {h.responsable && ` · ${h.responsable.nombres} ${h.responsable.apellidos}`}
          </p>
        </div>
        <button
          onClick={() => navigate(`/inspecciones/${h.inspeccion_id}`)}
          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-700 transition-colors shrink-0"
          title="Ver inspección"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/inspecciones')} className="btn-back">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
              <span>Inspecciones</span> <span>/</span> <span>Alertas</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Bell size={20} className="text-amber-400" />
              Alertas de Inspecciones
              {totalAlertas > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-red-500/20 text-red-400 text-sm font-semibold rounded-full">
                  {totalAlertas}
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">Situaciones que requieren atención inmediata</p>
          </div>
        </div>
        <button
          onClick={cargar}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-400 hover:bg-slate-700 transition-colors"
        >
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {totalAlertas === 0 && (
        <div className="card p-12 text-center">
          <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-200">Sin alertas activas</h2>
          <p className="text-slate-500 text-sm mt-1">Todas las inspecciones están en orden.</p>
        </div>
      )}

      <div className="space-y-5">

        {/* Próximas a vencer */}
        <AlertCard
          color="border-amber-400"
          icon={Clock}
          title="Inspecciones próximas sin ejecutar (7 días)"
          description="Programadas en los próximos 7 días aún no ejecutadas"
          items={proximas}
          emptyText="No hay inspecciones próximas pendientes"
          renderItem={ins => rowInspeccion(ins,
            <button
              onClick={() => navigate(`/inspecciones/${ins.id}`)}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 rounded-lg text-xs font-medium transition-colors"
            >
              <Clock size={11} /> Ejecutar
            </button>
          )}
        />

        {/* Vencidas sin ejecutar */}
        <AlertCard
          color="border-red-500"
          icon={AlertTriangle}
          title="Inspecciones vencidas"
          description="Programadas en fechas pasadas, aún en estado 'programada'"
          items={vencidas}
          emptyText="No hay inspecciones vencidas"
          renderItem={ins => rowInspeccion(ins,
            <button
              onClick={() => navigate(`/inspecciones/${ins.id}`)}
              className="flex items-center gap-1 px-2.5 py-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-lg text-xs font-medium transition-colors"
            >
              <AlertTriangle size={11} /> Revisar
            </button>
          )}
        />

        {/* En ejecución sin cerrar */}
        <AlertCard
          color="border-orange-400"
          icon={ClipboardList}
          title="En ejecución sin cerrar (+3 días)"
          description="Inspecciones iniciadas hace más de 3 días sin cerrarse"
          items={enEjecucionAnt}
          emptyText="No hay ejecuciones prolongadas"
          renderItem={ins => rowInspeccion(ins,
            <button
              onClick={() => navigate(`/inspecciones/${ins.id}`)}
              className="flex items-center gap-1 px-2.5 py-1 bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 rounded-lg text-xs font-medium transition-colors"
            >
              <CheckCircle2 size={11} /> Cerrar
            </button>
          )}
        />

        {/* Hallazgos vencidos */}
        <AlertCard
          color="border-rose-500"
          icon={Wrench}
          title="Hallazgos vencidos sin subsanar"
          description="Hallazgos cuya fecha límite de corrección ya pasó"
          items={hallazgosVencidos}
          emptyText="No hay hallazgos vencidos"
          renderItem={rowHallazgo}
        />

      </div>
    </div>
  )
}
