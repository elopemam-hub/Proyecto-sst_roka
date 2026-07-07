import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardCheck, CheckCircle2, Clock, AlertCircle,
  ChevronRight, ArrowLeft, Calendar, Wrench,
  Play, Eye, XCircle, RefreshCw,
} from 'lucide-react'
import api from '../../services/api'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const TURNO_CFG = {
  mañana:      { label: 'Mañana',      color: 'bg-amber-50 text-amber-700 border-amber-200' },
  tarde:       { label: 'Tarde',       color: 'bg-blue-50 text-blue-700 border-blue-200' },
  noche:       { label: 'Noche',       color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  dia_completo:{ label: 'Día completo',color: 'bg-gray-100 text-gray-700 border-gray-200' },
}

const ESTADO_CFG = {
  pendiente:  { label: 'Pendiente',   icon: Clock,         color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200' },
  en_proceso: { label: 'En proceso',  icon: RefreshCw,     color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200' },
  completado: { label: 'Completado',  icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  omitido:    { label: 'Omitido',     icon: XCircle,       color: 'text-red-500',     bg: 'bg-red-50 border-red-200' },
}

function BarraProgreso({ resumen }) {
  const total = resumen.total || 1
  const pct   = Math.round((resumen.completado / total) * 100)
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">Progreso del día</span>
        <span className="text-sm font-bold text-gray-900">{resumen.completado}/{resumen.total}</span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: pct === 100 ? '#10b981' : pct > 50 ? '#3b82f6' : '#f59e0b',
          }}
        />
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{resumen.pendiente} pendiente</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />{resumen.en_proceso} en proceso</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{resumen.completado} completado</span>
      </div>
    </div>
  )
}

function TarjetaEquipo({ asignacion, onIniciar, onVerResultado, cargando }) {
  const est   = ESTADO_CFG[asignacion.estado] || ESTADO_CFG.pendiente
  const EstIcon = est.icon
  const equipo  = asignacion.equipo

  return (
    <div className={`bg-white rounded-xl border ${est.bg} p-4 mb-3 shadow-sm`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
          <Wrench size={18} className="text-blue-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900 leading-tight">{equipo?.nombre}</p>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{equipo?.codigo}</p>
            </div>
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border shrink-0 ${est.bg} ${est.color}`}>
              <EstIcon size={11} />
              {est.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {equipo?.area && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{equipo.area.nombre}</span>
            )}
            {equipo?.ubicacion && (
              <span className="text-xs text-gray-500">{equipo.ubicacion}</span>
            )}
            {TURNO_CFG[asignacion.turno] && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${TURNO_CFG[asignacion.turno].color}`}>
                {TURNO_CFG[asignacion.turno].label}
              </span>
            )}
          </div>

          {asignacion.estado === 'completado' && asignacion.inspeccion && (
            <p className="text-xs text-emerald-600 mt-2 font-medium">
              ✓ {asignacion.inspeccion.codigo} · {asignacion.inspeccion.porcentaje_cumplimiento}% cumplimiento
            </p>
          )}

          {asignacion.observaciones && (
            <p className="text-xs text-gray-400 mt-1 italic">{asignacion.observaciones}</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
        {asignacion.estado === 'pendiente' && (
          <button
            onClick={() => onIniciar(asignacion)}
            disabled={cargando}
            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            {cargando ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
            {cargando ? 'Preparando...' : 'Iniciar inspección'}
          </button>
        )}
        {asignacion.estado === 'en_proceso' && (
          <button
            onClick={() => onIniciar(asignacion)}
            disabled={cargando}
            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            {cargando ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {cargando ? 'Preparando...' : 'Continuar inspección'}
          </button>
        )}
        {asignacion.estado === 'completado' && asignacion.inspeccion_id && (
          <button
            onClick={() => onVerResultado(asignacion)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-sm font-medium py-2 rounded-lg transition-colors"
          >
            <Eye size={14} />
            Ver resultado
          </button>
        )}
      </div>
    </div>
  )
}

export default function MisEquiposHoyPage() {
  const navigate = useNavigate()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [fecha, setFecha]     = useState(format(new Date(), 'yyyy-MM-dd'))
  const [iniciando, setIniciando] = useState(null)

  const cargar = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/equipo-asignaciones/mis-equipos', { params: { fecha } })
      setData(res.data)
    } catch (e) {
      setError('No se pudieron cargar las asignaciones.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [fecha])

  const handleIniciar = async (asignacion) => {
    setIniciando(asignacion.id)
    try {
      // El backend marca en_proceso y devuelve (o crea) la inspección del día
      const { data } = await api.post(`/equipo-asignaciones/${asignacion.id}/iniciar`)
      const inspeccionId = data.inspeccion_id
      navigate(
        inspeccionId
          ? `/inspecciones/checklist/${inspeccionId}`
          : '/inspecciones/checklist/nueva',
        { state: { asignacion_id: asignacion.id, from: 'mis-equipos' } },
      )
    } catch {
      setIniciando(null)
    }
  }

  const handleVerResultado = (asignacion) => {
    navigate(`/inspecciones/${asignacion.inspeccion_id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ClipboardCheck size={20} className="text-blue-600" />
              Mis equipos hoy
            </h1>
          </div>
          <button onClick={cargar} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Actualizar">
            <RefreshCw size={18} className="text-gray-500" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Selector de fecha */}
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} className="text-gray-400" />
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {fecha !== format(new Date(), 'yyyy-MM-dd') && (
            <button
              onClick={() => setFecha(format(new Date(), 'yyyy-MM-dd'))}
              className="text-xs text-blue-600 hover:underline"
            >
              Volver a hoy
            </button>
          )}
        </div>

        {loading && (
          <div className="text-center py-16 text-gray-400">
            <RefreshCw size={28} className="animate-spin mx-auto mb-2" />
            Cargando asignaciones…
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm mb-4">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            <BarraProgreso resumen={data.resumen} />

            {data.asignaciones.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <ClipboardCheck size={36} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium text-gray-500">Sin equipos asignados para esta fecha</p>
                <p className="text-sm mt-1">El supervisor no ha generado asignaciones aún</p>
              </div>
            ) : (
              <div>
                {data.asignaciones.map(a => (
                  <TarjetaEquipo
                    key={a.id}
                    asignacion={a}
                    onIniciar={handleIniciar}
                    onVerResultado={handleVerResultado}
                    cargando={iniciando === a.id}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
