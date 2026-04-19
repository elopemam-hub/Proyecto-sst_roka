import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Edit, AlertTriangle, CheckCircle, FileText, Plus
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const TIPOS = {
  accidente_leve:          { label: 'Accidente Leve',          color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  accidente_incapacitante: { label: 'Accidente Incapacitante', color: 'text-amber-400',  bg: 'bg-amber-500/10' },
  accidente_mortal:        { label: 'Accidente Mortal',        color: 'text-red-500',    bg: 'bg-red-500/10' },
  incidente_peligroso:     { label: 'Incidente Peligroso',     color: 'text-orange-400', bg: 'bg-orange-500/10' },
  incidente:               { label: 'Incidente',               color: 'text-slate-400',  bg: 'bg-slate-500/10' },
}

const ESTADOS = {
  registrado: 'Registrado', en_investigacion: 'En Investigación',
  investigado: 'Investigado', notificado_mintra: 'Notificado MINTRA', cerrado: 'Cerrado',
}

export default function AccidenteDetailPage() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const [acc, setAcc]           = useState(null)
  const [loading, setLoading]   = useState(true)
  const [showAccion, setShowAccion] = useState(false)
  const [accionForm, setAccionForm] = useState({ tipo: 'correctiva', descripcion: '', responsable_id: '', fecha_limite: '' })
  const [personal, setPersonal] = useState([])
  const [savingAccion, setSavingAccion] = useState(false)

  useEffect(() => { cargar() }, [id])
  useEffect(() => {
    api.get('/personal', { params: { per_page: 200 } })
      .then(r => setPersonal(r.data.data || r.data)).catch(() => {})
  }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/accidentes/${id}`)
      setAcc(data)
    } catch { toast.error('Error al cargar accidente') } finally { setLoading(false) }
  }

  const marcarNotificado = async () => {
    const numero = prompt('Número de notificación MINTRA:')
    if (!numero) return
    try {
      await api.put(`/accidentes/${id}`, {
        notificado_mintra: true,
        fecha_notificacion_mintra: new Date().toISOString().split('T')[0],
        numero_notificacion_mintra: numero,
        estado: 'notificado_mintra',
      })
      toast.success('Notificación registrada')
      cargar()
    } catch { toast.error('Error') }
  }

  const handleRegistrarAccion = async (e) => {
    e.preventDefault()
    setSavingAccion(true)
    try {
      await api.post(`/accidentes/${id}/acciones`, accionForm)
      toast.success('Acción registrada')
      setShowAccion(false)
      setAccionForm({ tipo: 'correctiva', descripcion: '', responsable_id: '', fecha_limite: '' })
      cargar()
    } catch (err) { toast.error(err.response?.data?.message || 'Error') } finally { setSavingAccion(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>
  if (!acc)    return <div className="text-center text-slate-500 py-16">Accidente no encontrado</div>

  const tipo  = TIPOS[acc.tipo] || {}
  const horas = { accidente_mortal: 24, incidente_peligroso: 24, accidente_incapacitante: 48 }[acc.tipo]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/accidentes')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">
                {acc.accidentado ? `${acc.accidentado.nombres} ${acc.accidentado.apellidos}` : 'Accidente'}
              </h1>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${tipo.bg} ${tipo.color}`}>
                {tipo.label}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              <span className="font-mono text-roka-300">{acc.codigo}</span>
              {acc.area && <> · {acc.area.nombre}</>}
              · {format(new Date(acc.fecha_accidente), "dd MMM yyyy HH:mm", { locale: es })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {acc.estado !== 'cerrado' && (
            <button onClick={() => navigate(`/accidentes/${id}/editar`)}
              className="flex items-center gap-2 text-sm px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700">
              <Edit size={15} /> Editar
            </button>
          )}
          {horas && !acc.notificado_mintra && (
            <button onClick={marcarNotificado}
              className="flex items-center gap-2 text-sm px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">
              <AlertTriangle size={15} /> Notificar MINTRA
            </button>
          )}
        </div>
      </div>

      {/* Alerta MINTRA */}
      {horas && !acc.notificado_mintra && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">
            Requiere notificación a MINTRA en <strong>{horas} horas</strong> desde ocurrido el evento.
          </p>
        </div>
      )}

      {/* Datos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-3">
          <h2 className="font-semibold text-slate-200 text-sm">Datos del Evento</h2>
          <Info label="Fecha" value={format(new Date(acc.fecha_accidente), "dd MMM yyyy HH:mm", { locale: es })} />
          <Info label="Lugar" value={acc.lugar_exacto} />
          <Info label="Área" value={acc.area?.nombre} />
          <Info label="Estado" value={ESTADOS[acc.estado]} />
          <div>
            <p className="text-xs text-slate-500">Descripción</p>
            <p className="text-sm text-slate-200 mt-1 leading-relaxed">{acc.descripcion_evento}</p>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-3">
          <h2 className="font-semibold text-slate-200 text-sm">Consecuencias</h2>
          <Info label="Días perdidos" value={`${acc.dias_perdidos} días`} />
          <Info label="Parte afectada" value={acc.parte_cuerpo_afectada || '—'} />
          <Info label="Tipo lesión" value={acc.tipo_lesion || '—'} />
          <Info label="Agente causante" value={acc.agente_causante || '—'} />
          <Info label="Hospitalización" value={acc.requiere_hospitalizacion ? 'Sí' : 'No'} />
          {acc.costo_total > 0 && (
            <Info label="Costo total" value={`S/. ${Number(acc.costo_total).toFixed(2)}`} />
          )}
        </div>
      </div>

      {/* Investigación */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-200 text-sm">Investigación</h2>
          {!acc.investigacion && acc.estado !== 'cerrado' && (
            <button onClick={() => navigate(`/accidentes/${id}/investigacion`)}
              className="text-xs text-roka-400 hover:text-roka-300">
              + Iniciar investigación
            </button>
          )}
        </div>
        {acc.investigacion ? (
          <div className="space-y-2">
            <Info label="Metodología" value={acc.investigacion.metodologia?.replace(/_/g, ' ')} />
            <Info label="Investigador" value={acc.investigacion.investigador?.nombre} />
            <Info label="Inicio" value={format(new Date(acc.investigacion.fecha_inicio_investigacion), 'dd/MM/yyyy')} />
            {acc.investigacion.lecciones_aprendidas && (
              <div>
                <p className="text-xs text-slate-500">Lecciones aprendidas</p>
                <p className="text-sm text-slate-200 mt-1">{acc.investigacion.lecciones_aprendidas}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">No se ha registrado investigación</p>
        )}
      </div>

      {/* Acciones correctivas */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="font-semibold text-slate-200 text-sm">Acciones Correctivas ({acc.acciones?.length || 0})</h2>
          {acc.estado !== 'cerrado' && (
            <button onClick={() => setShowAccion(true)}
              className="flex items-center gap-1 text-xs text-roka-400 hover:text-roka-300">
              <Plus size={14} /> Agregar acción
            </button>
          )}
        </div>
        {acc.acciones?.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                {['Tipo', 'Descripción', 'Responsable', 'Fecha límite', 'Estado'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {acc.acciones.map(a => (
                <tr key={a.id} className="hover:bg-slate-700/30">
                  <td className="px-4 py-3 text-xs text-slate-400 capitalize">{a.tipo}</td>
                  <td className="px-4 py-3 text-slate-200 max-w-xs text-xs">{a.descripcion}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {a.responsable ? `${a.responsable.nombres} ${a.responsable.apellidos}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{format(new Date(a.fecha_limite), 'dd/MM/yyyy')}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className={a.estado === 'completada' ? 'text-emerald-400' : a.estado === 'vencida' ? 'text-red-400' : 'text-amber-400'}>
                      {a.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-6 text-sm text-slate-500 italic">No hay acciones registradas</p>
        )}
      </div>

      {/* Modal acción */}
      {showAccion && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleRegistrarAccion} className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold text-white">Nueva Acción Correctiva</h2>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tipo</label>
              <select value={accionForm.tipo} onChange={e => setAccionForm(f => ({ ...f, tipo: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm">
                {['correctiva', 'preventiva', 'mejora'].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Descripción *</label>
              <textarea value={accionForm.descripcion} onChange={e => setAccionForm(f => ({ ...f, descripcion: e.target.value }))}
                rows={3} className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Responsable *</label>
              <select value={accionForm.responsable_id} onChange={e => setAccionForm(f => ({ ...f, responsable_id: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Seleccionar...</option>
                {personal.map(p => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fecha límite *</label>
              <input type="date" value={accionForm.fecha_limite} onChange={e => setAccionForm(f => ({ ...f, fecha_limite: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowAccion(false)}
                className="px-4 py-2 text-sm text-slate-400 border border-slate-700 rounded-lg">Cancelar</button>
              <button type="submit" disabled={savingAccion}
                className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
                <CheckCircle size={15} />
                {savingAccion ? 'Guardando...' : 'Registrar'}
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
    <div className="flex justify-between items-start">
      <span className="text-xs text-slate-500 flex-shrink-0">{label}</span>
      <span className="text-sm text-slate-200 text-right ml-4">{value || '—'}</span>
    </div>
  )
}
