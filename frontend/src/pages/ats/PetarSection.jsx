import { useEffect, useState } from 'react'
import { AlertTriangle, Plus, Trash2, ShieldCheck, CheckCircle2, Clock } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

/**
 * Gestión de permisos de trabajo de alto riesgo (PETAR) de un ATS.
 * Props:
 *  - ats: objeto ATS (con permisos, tipos_permiso, estado)
 *  - onChange: () => void  — recargar el ATS tras cambios
 */
export default function PetarSection({ ats, onChange }) {
  const [catalogo, setCatalogo] = useState({})
  const [nuevo, setNuevo] = useState(null) // datos del permiso en creación
  const [guardando, setGuardando] = useState(false)

  const editable = ['borrador', 'pendiente_firma'].includes(ats.estado)
  const permisos = ats.permisos || []

  useEffect(() => {
    api.get('/ats/permisos/requisitos')
      .then(({ data }) => setCatalogo(data))
      .catch(() => {})
  }, [])

  const tiposDisponibles = Object.keys(catalogo)

  const iniciarNuevo = () => {
    const tipo = (ats.tipos_permiso || []).find(t => catalogo[t]) || tiposDisponibles[0] || ''
    setNuevo({
      tipo_permiso: tipo,
      fecha_validez: ats.fecha_ejecucion ? String(ats.fecha_ejecucion).substring(0, 10) : new Date().toISOString().split('T')[0],
      hora_inicio_validez: (ats.hora_inicio || '08:00').substring(0, 5),
      hora_fin_validez: (ats.hora_fin || '17:00').substring(0, 5),
      equipos_requeridos: '',
      condiciones_especiales: '',
    })
  }

  const crearPermiso = async () => {
    if (!nuevo?.tipo_permiso) { toast.error('Selecciona un tipo de permiso'); return }
    setGuardando(true)
    try {
      await api.post(`/ats/${ats.id}/permisos`, nuevo)
      toast.success('Permiso creado')
      setNuevo(null)
      onChange?.()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al crear permiso')
    } finally {
      setGuardando(false)
    }
  }

  const toggleRequisito = async (permiso, requisito, valor) => {
    const cumplidos = { ...(permiso.requisitos_cumplidos || {}), [requisito]: valor }
    try {
      await api.put(`/ats/permisos/${permiso.id}`, { requisitos_cumplidos: cumplidos })
      onChange?.()
    } catch (e) {
      toast.error('No se pudo actualizar el requisito')
    }
  }

  const aprobarPermiso = async (permiso) => {
    try {
      await api.post(`/ats/permisos/${permiso.id}/aprobar`)
      toast.success('Permiso aprobado')
      onChange?.()
    } catch (e) {
      const faltantes = e.response?.data?.faltantes
      toast.error(faltantes ? `Faltan ${faltantes.length} requisito(s) por verificar` : (e.response?.data?.message || 'Error al aprobar'))
    }
  }

  const eliminarPermiso = async (permiso) => {
    if (!confirm('¿Eliminar este permiso?')) return
    try {
      await api.delete(`/ats/permisos/${permiso.id}`)
      toast.success('Permiso eliminado')
      onChange?.()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al eliminar')
    }
  }

  if (!ats.requiere_permiso_especial) return null

  return (
    <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-amber-300 flex items-center gap-2">
          <AlertTriangle size={18} /> Permisos de trabajo (PETAR)
        </h2>
        {editable && !nuevo && (
          <button onClick={iniciarNuevo}
            className="flex items-center gap-1.5 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 px-3 py-1.5 rounded-lg border border-amber-500/40 transition-colors">
            <Plus size={13} /> Agregar permiso
          </button>
        )}
      </div>

      {permisos.length === 0 && !nuevo && (
        <p className="text-sm text-amber-200/70">
          Este trabajo requiere permiso especial. Registra y aprueba los permisos antes de autorizar el ATS.
        </p>
      )}

      {/* Formulario nuevo permiso */}
      {nuevo && (
        <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tipo de permiso</label>
              <select value={nuevo.tipo_permiso}
                onChange={e => setNuevo({ ...nuevo, tipo_permiso: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm">
                {tiposDisponibles.map(t => <option key={t} value={t}>{catalogo[t]?.label || t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fecha de validez</label>
              <input type="date" value={nuevo.fecha_validez}
                onChange={e => setNuevo({ ...nuevo, fecha_validez: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Hora inicio</label>
              <input type="time" value={nuevo.hora_inicio_validez}
                onChange={e => setNuevo({ ...nuevo, hora_inicio_validez: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Hora fin</label>
              <input type="time" value={nuevo.hora_fin_validez}
                onChange={e => setNuevo({ ...nuevo, hora_fin_validez: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setNuevo(null)} className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5">Cancelar</button>
            <button onClick={crearPermiso} disabled={guardando}
              className="text-xs bg-roka-500 hover:bg-roka-600 text-white px-4 py-1.5 rounded-lg disabled:opacity-50">
              {guardando ? 'Guardando…' : 'Crear permiso'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de permisos */}
      <div className="space-y-4">
        {permisos.map(permiso => {
          const reqs = catalogo[permiso.tipo_permiso]?.requisitos || []
          const cumplidos = permiso.requisitos_cumplidos || {}
          const totalOk = reqs.filter(r => cumplidos[r]).length
          const aprobado = permiso.estado === 'aprobado'
          return (
            <div key={permiso.id} className="bg-slate-900/60 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-amber-300">{permiso.codigo_permiso}</span>
                  <span className="text-sm text-white font-medium">{catalogo[permiso.tipo_permiso]?.label || permiso.tipo_permiso}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${aprobado ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                    {aprobado ? <><CheckCircle2 size={9} className="inline" /> Aprobado</> : <><Clock size={9} className="inline" /> {permiso.estado}</>}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{totalOk}/{reqs.length} requisitos</span>
                  {!aprobado && editable && (
                    <>
                      <button onClick={() => aprobarPermiso(permiso)}
                        disabled={totalOk < reqs.length}
                        className="text-xs flex items-center gap-1 bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-40 text-emerald-300 px-2.5 py-1 rounded border border-emerald-500/30">
                        <ShieldCheck size={12} /> Aprobar
                      </button>
                      <button onClick={() => eliminarPermiso(permiso)}
                        className="text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
                    </>
                  )}
                </div>
              </div>

              {/* Checklist de requisitos */}
              <div className="space-y-1.5">
                {reqs.map(req => (
                  <label key={req} className={`flex items-start gap-2 text-sm ${aprobado ? 'opacity-80' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      checked={!!cumplidos[req]}
                      disabled={aprobado || !editable}
                      onChange={e => toggleRequisito(permiso, req, e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded accent-emerald-500 flex-shrink-0"
                    />
                    <span className={cumplidos[req] ? 'text-slate-300' : 'text-slate-400'}>{req}</span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
