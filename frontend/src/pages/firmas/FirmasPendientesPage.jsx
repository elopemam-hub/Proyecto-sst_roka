import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Pen, Clock, AlertCircle, CheckCircle2, FileText,
  User, Calendar, ChevronRight, Inbox
} from 'lucide-react'
import api from '../../services/api'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export default function FirmasPendientesPage() {
  const navigate = useNavigate()
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargar()
  }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/firmas/pendientes')
      setSolicitudes(data.data || [])
    } finally {
      setLoading(false)
    }
  }

  // Mapeo de tipos polimórficos a rutas frontend
  const rutaDocumento = (tipo, id) => {
    const mapa = {
      'App\\Models\\Iperc':        `/iperc/${id}`,
      'App\\Models\\Ats':          `/ats/${id}`,
      'App\\Models\\Inspeccion':   `/inspecciones/${id}`,
      'App\\Models\\Accidente':    `/accidentes/${id}`,
      'App\\Models\\Capacitacion': `/capacitaciones/${id}`,
    }
    return mapa[tipo] || '#'
  }

  const etiquetaTipo = (tipo) => {
    const mapa = {
      'App\\Models\\Iperc':        { label: 'IPERC',         color: 'bg-amber-500/15 text-amber-400' },
      'App\\Models\\Ats':          { label: 'ATS',           color: 'bg-roka-500/15 text-roka-400' },
      'App\\Models\\Inspeccion':   { label: 'Inspección',    color: 'bg-emerald-500/15 text-emerald-400' },
      'App\\Models\\Accidente':    { label: 'Accidente',     color: 'bg-red-500/15 text-red-400' },
      'App\\Models\\Capacitacion': { label: 'Capacitación',  color: 'bg-purple-500/15 text-purple-400' },
    }
    return mapa[tipo] || { label: 'Documento', color: 'bg-slate-700 text-slate-300' }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <span>Firmas</span>
          <span>/</span>
          <span>Pendientes</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Firmas pendientes</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Documentos que requieren tu firma digital
        </p>
      </div>

      {/* ── Resumen ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-roka-500/15 flex items-center justify-center">
            <Inbox size={18} className="text-roka-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-100 tabular-nums">{solicitudes.length}</p>
            <p className="text-xs text-slate-500">Pendientes</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <Clock size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-100 tabular-nums">
              {solicitudes.filter(s => {
                const d = new Date(s.fecha_limite)
                const now = new Date()
                return (d - now) / (1000 * 60 * 60 * 24) < 2
              }).length}
            </p>
            <p className="text-xs text-slate-500">Vencen pronto</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
            <AlertCircle size={18} className="text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-100 tabular-nums">
              {solicitudes.filter(s => new Date(s.fecha_limite) < new Date()).length}
            </p>
            <p className="text-xs text-slate-500">Vencidas</p>
          </div>
        </div>
      </div>

      {/* ── Lista ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {loading ? (
          <div className="card p-10 text-center">
            <div className="inline-block w-6 h-6 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 text-sm mt-3">Cargando solicitudes...</p>
          </div>
        ) : solicitudes.length === 0 ? (
          <div className="card p-12 text-center">
            <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
            <p className="text-slate-300 font-medium">¡Sin firmas pendientes!</p>
            <p className="text-slate-500 text-sm mt-1">Estás al día con todas las solicitudes</p>
          </div>
        ) : (
          solicitudes.map((sol) => {
            const tipo = etiquetaTipo(sol.documento_tipo)
            const vencido = new Date(sol.fecha_limite) < new Date()
            const venceEn = formatDistanceToNow(new Date(sol.fecha_limite), { locale: es, addSuffix: true })

            return (
              <button
                key={sol.id}
                onClick={() => navigate(rutaDocumento(sol.documento_tipo, sol.documento_id))}
                className="card p-4 w-full text-left hover:border-slate-700 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  {/* Tipo */}
                  <div className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium ${tipo.color}`}>
                    {tipo.label}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-200 group-hover:text-roka-400 transition-colors truncate">
                      {sol.documento_titulo}
                    </p>
                    {sol.documento_codigo && (
                      <code className="text-xs font-mono text-slate-500">{sol.documento_codigo}</code>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User size={10} />
                        Solicitado por {sol.solicitante?.nombre || 'sistema'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {format(new Date(sol.solicitada_en), 'dd MMM HH:mm', { locale: es })}
                      </span>
                      <span className={`flex items-center gap-1 ${vencido ? 'text-red-400' : 'text-amber-400'}`}>
                        <Clock size={10} />
                        {vencido ? 'Vencida' : `Vence ${venceEn}`}
                      </span>
                    </div>
                  </div>

                  {/* Acción */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Pen size={14} className="text-roka-400" />
                    <ChevronRight size={16} className="text-slate-600 group-hover:text-roka-400 transition-colors" />
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
