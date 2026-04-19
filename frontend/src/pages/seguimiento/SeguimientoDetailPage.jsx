import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit, CheckCircle, Award } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADOS = {
  pendiente:  { label: 'Pendiente',  color: 'text-slate-400',   bg: 'bg-slate-500/10' },
  en_proceso: { label: 'En proceso', color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  completada: { label: 'Completada', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  vencida:    { label: 'Vencida',    color: 'text-red-400',     bg: 'bg-red-500/10' },
  validada:   { label: 'Validada',   color: 'text-purple-400',  bg: 'bg-purple-500/10' },
  cancelada:  { label: 'Cancelada',  color: 'text-slate-600',   bg: 'bg-slate-700/10' },
}

const PRIORIDAD_COLOR = {
  baja: 'text-slate-400', media: 'text-blue-400', alta: 'text-amber-400', critica: 'text-red-400',
}

export default function SeguimientoDetailPage() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const [accion, setAccion]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [avance, setAvance]       = useState(0)
  const [updatingAvance, setUpdating] = useState(false)
  const [showValidar, setShowValidar] = useState(false)
  const [obsValidacion, setObsValidacion] = useState('')
  const [validando, setValidando] = useState(false)

  useEffect(() => { cargar() }, [id])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/seguimiento/${id}`)
      setAccion(data)
      setAvance(data.porcentaje_avance)
    } catch { toast.error('Error al cargar acción') } finally { setLoading(false) }
  }

  const actualizarAvance = async (nuevoEstado) => {
    setUpdating(true)
    try {
      const payload = { porcentaje_avance: avance }
      if (nuevoEstado) payload.estado = nuevoEstado
      if (avance >= 100 && !nuevoEstado) payload.estado = 'completada'
      await api.put(`/seguimiento/${id}`, payload)
      toast.success('Avance actualizado')
      cargar()
    } catch (err) { toast.error(err.response?.data?.message || 'Error') } finally { setUpdating(false) }
  }

  const handleValidar = async (e) => {
    e.preventDefault()
    setValidando(true)
    try {
      await api.post(`/seguimiento/${id}/validar`, { observaciones_validacion: obsValidacion })
      toast.success('Acción validada correctamente')
      setShowValidar(false)
      cargar()
    } catch (err) { toast.error(err.response?.data?.message || 'Error') } finally { setValidando(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>
  if (!accion) return <div className="text-center text-slate-500 py-16">Acción no encontrada</div>

  const estado = ESTADOS[accion.estado] || {}

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/seguimiento')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">{accion.titulo}</h1>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${estado.bg} ${estado.color}`}>
                {estado.label}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              <span className="font-mono text-roka-300">{accion.codigo}</span>
              {' · '}
              <span className={`font-semibold ${PRIORIDAD_COLOR[accion.prioridad]}`}>{accion.prioridad}</span>
              {' · '}{accion.tipo}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!['validada', 'cancelada'].includes(accion.estado) && (
            <button onClick={() => navigate(`/seguimiento/${id}/editar`)}
              className="flex items-center gap-2 text-sm px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700">
              <Edit size={15} /> Editar
            </button>
          )}
          {accion.estado === 'completada' && (
            <button onClick={() => setShowValidar(true)}
              className="flex items-center gap-2 text-sm px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
              <Award size={15} /> Validar
            </button>
          )}
        </div>
      </div>

      {/* Avance */}
      {!['validada', 'cancelada', 'completada'].includes(accion.estado) && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
          <h2 className="font-semibold text-slate-200 text-sm">Actualizar Avance</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Porcentaje de avance</span>
              <span className="font-semibold text-white">{avance}%</span>
            </div>
            <input type="range" min={0} max={100} step={5} value={avance}
              onChange={e => setAvance(Number(e.target.value))}
              className="w-full accent-roka-500" />
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div className={`h-full rounded-full transition-all ${
                avance >= 100 ? 'bg-emerald-500' : avance >= 50 ? 'bg-blue-500' : avance >= 25 ? 'bg-amber-500' : 'bg-red-500'
              }`} style={{ width: `${avance}%` }} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => actualizarAvance('en_proceso')} disabled={updatingAvance}
              className="flex-1 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg">
              Guardar avance
            </button>
            {avance >= 100 && (
              <button onClick={() => actualizarAvance('completada')} disabled={updatingAvance}
                className="flex items-center justify-center gap-2 flex-1 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg">
                <CheckCircle size={15} /> Marcar completada
              </button>
            )}
          </div>
        </div>
      )}

      {/* Datos */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-3">
        <h2 className="font-semibold text-slate-200 text-sm">Detalle</h2>
        <div>
          <p className="text-xs text-slate-500">Descripción</p>
          <p className="text-sm text-slate-200 mt-1 leading-relaxed">{accion.descripcion}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-2">
          <Info label="Responsable" value={accion.responsable ? `${accion.responsable.nombres} ${accion.responsable.apellidos}` : '—'} />
          <Info label="Área" value={accion.area?.nombre} />
          <Info label="Fecha programada" value={format(new Date(accion.fecha_programada), 'dd MMM yyyy', { locale: es })} />
          <Info label="Fecha límite" value={
            <span className={accion.esta_vencida ? 'text-red-400' : ''}>
              {format(new Date(accion.fecha_limite), 'dd MMM yyyy', { locale: es })}
              {accion.esta_vencida ? ' ⚠ VENCIDA' : accion.dias_restantes > 0 ? ` (${accion.dias_restantes}d)` : ''}
            </span>
          } />
          {accion.fecha_ejecucion && (
            <Info label="Ejecutada" value={format(new Date(accion.fecha_ejecucion), 'dd MMM yyyy', { locale: es })} />
          )}
          <Info label="Origen" value={accion.origen_tipo?.charAt(0).toUpperCase() + accion.origen_tipo?.slice(1)} />
        </div>
        {accion.observaciones && (
          <div>
            <p className="text-xs text-slate-500">Observaciones</p>
            <p className="text-sm text-slate-200 mt-1">{accion.observaciones}</p>
          </div>
        )}
      </div>

      {/* Validación */}
      {accion.validado_por && (
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Award size={16} className="text-purple-400" />
            <h2 className="font-semibold text-purple-300 text-sm">Acción Validada</h2>
          </div>
          <Info label="Validado por" value={accion.validador?.nombre} />
          <Info label="Fecha" value={format(new Date(accion.validado_en), "dd MMM yyyy HH:mm", { locale: es })} />
          {accion.observaciones_validacion && (
            <div>
              <p className="text-xs text-slate-500">Observaciones de validación</p>
              <p className="text-sm text-slate-200 mt-1">{accion.observaciones_validacion}</p>
            </div>
          )}
        </div>
      )}

      {/* Modal validar */}
      {showValidar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleValidar} className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold text-white">Validar Acción</h2>
            <p className="text-sm text-slate-400">Confirma que la acción fue implementada y es eficaz.</p>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Observaciones de validación *</label>
              <textarea value={obsValidacion} onChange={e => setObsValidacion(e.target.value)}
                rows={4} placeholder="Describe cómo se verificó la eficacia de la acción..."
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowValidar(false)}
                className="px-4 py-2 text-sm text-slate-400 border border-slate-700 rounded-lg">Cancelar</button>
              <button type="submit" disabled={validando}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
                <Award size={15} />
                {validando ? 'Validando...' : 'Validar acción'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <div className="text-sm text-slate-200 font-medium mt-0.5">{value || '—'}</div>
    </div>
  )
}
