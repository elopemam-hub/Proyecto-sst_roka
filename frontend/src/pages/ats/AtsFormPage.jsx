import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Save, ArrowLeft, Plus, Trash2, AlertTriangle,
  Users, MapPin, Calendar, Shield, HardHat, Settings2
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const TIPOS_PERMISO = [
  { value: 'altura',            label: 'Trabajo en altura' },
  { value: 'espacio_confinado', label: 'Espacio confinado' },
  { value: 'caliente',          label: 'Trabajo en caliente' },
  { value: 'electrico',         label: 'Trabajo eléctrico' },
  { value: 'izaje',             label: 'Izaje de cargas' },
  { value: 'excavacion',        label: 'Excavación' },
  { value: 'quimicos',          label: 'Manejo de químicos' },
  { value: 'radiaciones',       label: 'Exposición a radiaciones' },
]

const TIPOS_PELIGRO = [
  { value: 'fisico',      label: 'Físico' },
  { value: 'quimico',     label: 'Químico' },
  { value: 'biologico',   label: 'Biológico' },
  { value: 'ergonomico',  label: 'Ergonómico' },
  { value: 'psicosocial', label: 'Psicosocial' },
  { value: 'mecanico',    label: 'Mecánico' },
  { value: 'electrico',   label: 'Eléctrico' },
  { value: 'locativo',    label: 'Locativo' },
  { value: 'otro',        label: 'Otro' },
]

const SEVERIDADES = [
  { value: 'leve',      label: 'Leve' },
  { value: 'moderada',  label: 'Moderada' },
  { value: 'grave',     label: 'Grave' },
  { value: 'muy_grave', label: 'Muy grave' },
]

const TIPOS_CONTROL = [
  { value: 'eliminacion',    label: 'Eliminación' },
  { value: 'sustitucion',    label: 'Sustitución' },
  { value: 'ingenieria',     label: 'Ingeniería' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'epp',            label: 'EPP' },
]

const ROLES_PARTICIPANTE = [
  { value: 'ejecutor',   label: 'Ejecutor' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'observador', label: 'Observador' },
  { value: 'ayudante',   label: 'Ayudante' },
]

const SEV_COLOR = {
  leve:      'text-emerald-400',
  moderada:  'text-amber-400',
  grave:     'text-orange-400',
  muy_grave: 'text-red-400',
}

export default function AtsFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editando = Boolean(id)

  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [areas, setAreas]       = useState([])
  const [personal, setPersonal] = useState([])
  const [epps, setEpps]         = useState([])
  const [ipercs, setIpercs]     = useState([])

  const [form, setForm] = useState({
    titulo: '',
    area_id: '',
    iperc_id: '',
    ubicacion: '',
    fecha_trabajo: '',
    hora_inicio: '',
    hora_fin: '',
    descripcion_trabajo: '',
    supervisor_responsable_id: '',
    requiere_permiso_trabajo: false,
    tipos_permiso: [],
    epps_seleccionados: [],
    tareas: [],
    participantes: [],
  })

  useEffect(() => {
    cargarMaestros()
    if (editando) cargarAts()
  }, [id])

  const cargarMaestros = async () => {
    try {
      const [ar, pe, ep, ip] = await Promise.all([
        api.get('/areas', { params: { per_page: 1000 } }),
        api.get('/personal'),
        api.get('/epps/categorias'),
        api.get('/iperc', { params: { estado: 'aprobado', per_page: 100 } }),
      ])
      setAreas(ar.data.data || ar.data || [])
      setPersonal(pe.data.data || pe.data || [])
      setEpps(Array.isArray(ep.data) ? ep.data : ep.data.data || [])
      setIpercs(ip.data.data || ip.data || [])
    } catch (e) {
      toast.error('Error al cargar datos maestros')
    }
  }

  const cargarAts = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/ats/${id}`)
      setForm({
        titulo:                    data.titulo_trabajo || '',
        area_id:                   data.area_id   ? String(data.area_id)  : '',
        iperc_id:                  data.iperc_id  ? String(data.iperc_id) : '',
        ubicacion:                 data.ubicacion || '',
        fecha_trabajo:             data.fecha_ejecucion ? String(data.fecha_ejecucion).substring(0, 10) : '',
        hora_inicio:               (data.hora_inicio || '').substring(0, 5),
        hora_fin:                  (data.hora_fin    || '').substring(0, 5),
        descripcion_trabajo:       data.descripcion || '',
        supervisor_responsable_id: data.supervisor_id ? String(data.supervisor_id) : '',
        requiere_permiso_trabajo:  Boolean(data.requiere_permiso_especial),
        tipos_permiso:             data.tipos_permiso || [],
        epps_seleccionados:        data.epps_requeridos || [],
        tareas: (data.tareas || []).map(t => ({
          id: t.id,
          descripcion: t.descripcion_tarea || '',
          peligros: (t.peligros || []).map(p => ({
            id:          p.id,
            tipo_peligro: p.tipo_peligro || 'fisico',
            descripcion:  p.descripcion  || '',
            riesgo_asociado: p.riesgo   || '',
            severidad:    p.severidad    || 'leve',
          })),
          controles: (t.controles || []).map(c => ({
            id:           c.id,
            tipo_control: c.tipo_control || 'administrativo',
            descripcion:  c.descripcion  || '',
            implementado: Boolean(c.implementado),
          })),
        })),
        participantes: (data.participantes || []).map(pa => ({
          personal_id: pa.personal_id,
          rol: pa.rol || 'ejecutor',
        })),
      })
    } catch (e) {
      toast.error('Error al cargar ATS')
      navigate('/ats')
    } finally {
      setLoading(false)
    }
  }

  // ── Tareas ──────────────────────────────────────────────────────────────────
  const agregarTarea = () => {
    setForm(f => ({
      ...f,
      tareas: [...f.tareas, {
        id: `tmp-${Date.now()}`,
        descripcion: '',
        peligros:  [],
        controles: [],
      }],
    }))
  }

  const actualizarTarea = (idx, campo, valor) =>
    setForm(f => ({ ...f, tareas: f.tareas.map((t, i) => i === idx ? { ...t, [campo]: valor } : t) }))

  const eliminarTarea = (idx) =>
    setForm(f => ({ ...f, tareas: f.tareas.filter((_, i) => i !== idx) }))

  // ── Peligros ─────────────────────────────────────────────────────────────────
  const agregarPeligro = (tareaIdx) => {
    setForm(f => ({
      ...f,
      tareas: f.tareas.map((t, i) => i === tareaIdx ? {
        ...t,
        peligros: [...t.peligros, {
          id: `tmp-${Date.now()}`,
          tipo_peligro:    'fisico',
          descripcion:     '',
          riesgo_asociado: '',
          severidad:       'leve',
        }],
      } : t),
    }))
  }

  const actualizarPeligro = (tareaIdx, peligroIdx, campo, valor) =>
    setForm(f => ({
      ...f,
      tareas: f.tareas.map((t, i) => i === tareaIdx ? {
        ...t,
        peligros: t.peligros.map((p, j) => j === peligroIdx ? { ...p, [campo]: valor } : p),
      } : t),
    }))

  const eliminarPeligro = (tareaIdx, peligroIdx) =>
    setForm(f => ({
      ...f,
      tareas: f.tareas.map((t, i) => i === tareaIdx ? {
        ...t,
        peligros: t.peligros.filter((_, j) => j !== peligroIdx),
      } : t),
    }))

  // ── Controles (a nivel de tarea) ─────────────────────────────────────────────
  const agregarControl = (tareaIdx) => {
    setForm(f => ({
      ...f,
      tareas: f.tareas.map((t, i) => i === tareaIdx ? {
        ...t,
        controles: [...(t.controles || []), {
          id:           `tmp-${Date.now()}`,
          tipo_control: 'administrativo',
          descripcion:  '',
          implementado: false,
        }],
      } : t),
    }))
  }

  const actualizarControl = (tareaIdx, controlIdx, campo, valor) =>
    setForm(f => ({
      ...f,
      tareas: f.tareas.map((t, i) => i === tareaIdx ? {
        ...t,
        controles: (t.controles || []).map((c, j) => j === controlIdx ? { ...c, [campo]: valor } : c),
      } : t),
    }))

  const eliminarControl = (tareaIdx, controlIdx) =>
    setForm(f => ({
      ...f,
      tareas: f.tareas.map((t, i) => i === tareaIdx ? {
        ...t,
        controles: (t.controles || []).filter((_, j) => j !== controlIdx),
      } : t),
    }))

  // ── Participantes ────────────────────────────────────────────────────────────
  const toggleParticipante = (personaId) => {
    setForm(f => {
      const existe = f.participantes.find(p => p.personal_id === personaId)
      return {
        ...f,
        participantes: existe
          ? f.participantes.filter(p => p.personal_id !== personaId)
          : [...f.participantes, { personal_id: personaId, rol: 'ejecutor' }],
      }
    })
  }

  const actualizarRolParticipante = (personaId, rol) =>
    setForm(f => ({
      ...f,
      participantes: f.participantes.map(p => p.personal_id === personaId ? { ...p, rol } : p),
    }))

  // ── EPPs generales ───────────────────────────────────────────────────────────
  const toggleEppGeneral = (eppId) => {
    setForm(f => {
      const existe = f.epps_seleccionados.includes(eppId)
      return {
        ...f,
        epps_seleccionados: existe
          ? f.epps_seleccionados.filter(id => id !== eppId)
          : [...f.epps_seleccionados, eppId],
      }
    })
  }

  const toggleTipoPermiso = (tipo) => {
    setForm(f => {
      const existe = f.tipos_permiso.includes(tipo)
      return {
        ...f,
        tipos_permiso: existe
          ? f.tipos_permiso.filter(t => t !== tipo)
          : [...f.tipos_permiso, tipo],
      }
    })
  }

  // ── Guardar ──────────────────────────────────────────────────────────────────
  const guardar = async (e) => {
    e.preventDefault()
    if (!form.titulo)          { toast.error('El título es obligatorio');             return }
    if (!form.fecha_trabajo)   { toast.error('La fecha del trabajo es obligatoria');  return }
    if (form.tareas.length === 0)        { toast.error('Debe agregar al menos una tarea');      return }
    if (form.participantes.length === 0) { toast.error('Debe agregar al menos un participante'); return }

    // Derivar nivel_riesgo del máximo severidad
    const SEV_TO_NIVEL = { leve: 'bajo', moderada: 'medio', grave: 'alto', muy_grave: 'critico' }
    const NIVEL_IDX    = { bajo: 1, medio: 2, alto: 3, critico: 4 }
    let maxNivel = 'bajo'
    for (const t of form.tareas) {
      for (const p of t.peligros || []) {
        const n = SEV_TO_NIVEL[p.severidad] || 'bajo'
        if ((NIVEL_IDX[n] || 0) > (NIVEL_IDX[maxNivel] || 0)) maxNivel = n
      }
    }

    const payload = {
      titulo_trabajo:            form.titulo,
      descripcion:               form.descripcion_trabajo || null,
      ubicacion:                 form.ubicacion           || null,
      area_id:                   form.area_id             || null,
      iperc_id:                  form.iperc_id            || null,
      fecha_ejecucion:           form.fecha_trabajo,
      hora_inicio:               form.hora_inicio         || null,
      hora_fin:                  form.hora_fin            || null,
      supervisor_id:             form.supervisor_responsable_id || null,
      requiere_permiso_especial: form.requiere_permiso_trabajo,
      tipos_permiso:             form.tipos_permiso,
      epps_requeridos:           form.epps_seleccionados,
      nivel_riesgo:              maxNivel || 'bajo',
      tareas: form.tareas.map((t, idx) => ({
        orden:             idx,
        descripcion_tarea: t.descripcion,
        peligros: (t.peligros || []).map(p => ({
          tipo_peligro: p.tipo_peligro    || 'otro',
          descripcion:  p.descripcion     || '',
          riesgo:       p.riesgo_asociado || '',
          severidad:    p.severidad       || 'leve',
        })),
        controles: (t.controles || []).map(c => ({
          tipo_control: c.tipo_control || 'administrativo',
          descripcion:  c.descripcion  || '',
          implementado: Boolean(c.implementado),
        })),
      })),
      participantes: form.participantes,
    }

    setSaving(true)
    try {
      if (editando) {
        await api.put(`/ats/${id}`, payload)
        toast.success('ATS actualizado correctamente')
        navigate(`/ats/${id}`)
      } else {
        const { data } = await api.post('/ats', payload)
        toast.success(`ATS ${data.codigo} creado correctamente`)
        navigate(`/ats/${data.id}`)
      }
    } catch (err) {
      const msg = err.response?.data?.message
        || Object.values(err.response?.data?.errors || {}).flat().join(', ')
        || 'Error al guardar'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-roka-500" />
      </div>
    )
  }

  return (
    <form onSubmit={guardar} className="max-w-6xl mx-auto pb-12">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/ats')} className="btn-back">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {editando ? 'Editar ATS' : 'Nuevo ATS'}
            </h1>
            <p className="text-sm text-slate-400">Análisis de Trabajo Seguro — Ley 29783</p>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-roka-600 hover:bg-roka-700 disabled:opacity-50 text-white rounded-lg font-medium"
        >
          <Save size={18} />
          {saving ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar ATS'}
        </button>
      </div>

      {/* ── Datos generales ──────────────────────────────────────────────────── */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield size={18} className="text-roka-400" /> Datos generales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-slate-300 mb-1">Título del trabajo *</label>
            <input
              type="text"
              required
              value={form.titulo}
              onChange={e => setForm({ ...form, titulo: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              placeholder="Ej: Mantenimiento preventivo de tablero eléctrico"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Área</label>
            <select
              value={form.area_id}
              onChange={e => setForm({ ...form, area_id: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="">Seleccionar…</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">IPERC de referencia (opcional)</label>
            <select
              value={form.iperc_id}
              onChange={e => setForm({ ...form, iperc_id: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="">Sin vinculación a IPERC</option>
              {ipercs.map(ip => (
                <option key={ip.id} value={ip.id}>{ip.codigo} — {ip.titulo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              <MapPin size={13} className="inline mr-1" />Ubicación específica
            </label>
            <input
              type="text"
              value={form.ubicacion}
              onChange={e => setForm({ ...form, ubicacion: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              placeholder="Ej: Subestación Nº 2, 2do piso"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              <Calendar size={13} className="inline mr-1" />Fecha del trabajo *
            </label>
            <input
              type="date"
              required
              value={form.fecha_trabajo}
              onChange={e => setForm({ ...form, fecha_trabajo: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Hora inicio</label>
              <input type="time" value={form.hora_inicio}
                onChange={e => setForm({ ...form, hora_inicio: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Hora fin</label>
              <input type="time" value={form.hora_fin}
                onChange={e => setForm({ ...form, hora_fin: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Supervisor responsable</label>
            <select
              value={form.supervisor_responsable_id}
              onChange={e => setForm({ ...form, supervisor_responsable_id: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="">Seleccionar…</option>
              {personal.map(p => (
                <option key={p.id} value={p.id}>{p.nombres} {p.apellidos} — {p.cargo?.nombre}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-slate-300 mb-1">Descripción del trabajo</label>
            <textarea
              rows={3}
              value={form.descripcion_trabajo}
              onChange={e => setForm({ ...form, descripcion_trabajo: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              placeholder="Describa brevemente el trabajo a realizar…"
            />
          </div>
        </div>
      </div>

      {/* ── Permiso de trabajo (PETAR) ───────────────────────────────────────── */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
        <label className="flex items-center gap-2 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={form.requiere_permiso_trabajo}
            onChange={e => setForm({ ...form, requiere_permiso_trabajo: e.target.checked })}
            className="w-4 h-4 rounded bg-slate-900 border-slate-600"
          />
          <span className="text-white font-medium">Requiere permiso de trabajo (PETAR)</span>
        </label>
        {form.requiere_permiso_trabajo && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
            {TIPOS_PERMISO.map(tp => (
              <label key={tp.value} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.tipos_permiso.includes(tp.value)}
                  onChange={() => toggleTipoPermiso(tp.value)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-600"
                />
                {tp.label}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* ── EPPs requeridos ──────────────────────────────────────────────────── */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <HardHat size={18} className="text-roka-400" /> EPPs requeridos para el trabajo
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Selecciona todos los equipos de protección personal necesarios.
          {form.epps_seleccionados.length > 0 && (
            <span className="ml-2 text-roka-400 font-medium">{form.epps_seleccionados.length} seleccionado(s)</span>
          )}
        </p>
        {epps.length === 0 ? (
          <p className="text-slate-500 text-sm italic">No hay categorías de EPP registradas.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {epps.map(epp => {
              const sel = form.epps_seleccionados.includes(epp.id)
              return (
                <label
                  key={epp.id}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    sel
                      ? 'bg-roka-500/15 border-roka-500/40 text-roka-300'
                      : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  <input type="checkbox" checked={sel} onChange={() => toggleEppGeneral(epp.id)}
                    className="w-4 h-4 rounded accent-roka-500 flex-shrink-0" />
                  <span className="text-sm leading-snug">{epp.nombre}</span>
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Tareas con peligros y controles ──────────────────────────────────── */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" /> Tareas, peligros y controles
          </h2>
          <button
            type="button"
            onClick={agregarTarea}
            className="flex items-center gap-1 px-3 py-1.5 bg-roka-600/20 hover:bg-roka-600/30 text-roka-400 border border-roka-500/30 rounded-lg text-sm"
          >
            <Plus size={16} /> Agregar tarea
          </button>
        </div>

        {form.tareas.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            No hay tareas. Haga clic en "Agregar tarea" para comenzar.
          </div>
        )}

        <div className="space-y-5">
          {form.tareas.map((tarea, ti) => (
            <div key={tarea.id} className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">

              {/* Descripción de la tarea */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-roka-500/20 text-roka-400 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                  {ti + 1}
                </div>
                <input
                  type="text"
                  placeholder="Descripción de la tarea…"
                  value={tarea.descripcion}
                  onChange={e => actualizarTarea(ti, 'descripcion', e.target.value)}
                  className="flex-1 input"
                />
                <button type="button" onClick={() => eliminarTarea(ti)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Peligros */}
              <div className="ml-11 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Peligros identificados
                  </span>
                  <button type="button" onClick={() => agregarPeligro(ti)}
                    className="text-xs text-amber-600 hover:underline flex items-center gap-1 font-medium">
                    <Plus size={12} /> Agregar peligro
                  </button>
                </div>

                {tarea.peligros.length === 0 && (
                  <p className="text-xs text-gray-400 italic">Sin peligros registrados.</p>
                )}

                <div className="space-y-2">
                  {tarea.peligros.map((peligro, pi) => (
                    <div key={peligro.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
                        <select
                          value={peligro.tipo_peligro}
                          onChange={e => actualizarPeligro(ti, pi, 'tipo_peligro', e.target.value)}
                          className="input text-xs py-1.5"
                        >
                          {TIPOS_PELIGRO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <input
                          type="text"
                          placeholder="Peligro identificado…"
                          value={peligro.descripcion}
                          onChange={e => actualizarPeligro(ti, pi, 'descripcion', e.target.value)}
                          className="input text-sm py-1.5 md:col-span-2"
                        />
                        <input
                          type="text"
                          placeholder="Riesgo asociado…"
                          value={peligro.riesgo_asociado}
                          onChange={e => actualizarPeligro(ti, pi, 'riesgo_asociado', e.target.value)}
                          className="input text-sm py-1.5"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">Severidad:</span>
                        <div className="flex gap-1">
                          {SEVERIDADES.map(s => (
                            <button
                              key={s.value}
                              type="button"
                              onClick={() => actualizarPeligro(ti, pi, 'severidad', s.value)}
                              className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                                peligro.severidad === s.value
                                  ? `${SEV_COLOR[s.value]} bg-slate-700 border-slate-500`
                                  : 'text-gray-400 border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                        <button type="button" onClick={() => eliminarPeligro(ti, pi)}
                          className="ml-auto text-xs text-red-500 hover:underline">
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Controles */}
              <div className="ml-11">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <Settings2 size={11} /> Medidas de control
                  </span>
                  <button type="button" onClick={() => agregarControl(ti)}
                    className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-medium">
                    <Plus size={12} /> Agregar control
                  </button>
                </div>

                {(tarea.controles || []).length === 0 && (
                  <p className="text-xs text-gray-400 italic">Sin controles definidos.</p>
                )}

                <div className="space-y-1.5">
                  {(tarea.controles || []).map((ctrl, ci) => (
                    <div key={ctrl.id} className="flex items-center gap-2">
                      <select
                        value={ctrl.tipo_control}
                        onChange={e => actualizarControl(ti, ci, 'tipo_control', e.target.value)}
                        className="input text-xs py-1.5 w-36 flex-shrink-0"
                      >
                        {TIPOS_CONTROL.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <input
                        type="text"
                        placeholder="Descripción de la medida de control…"
                        value={ctrl.descripcion}
                        onChange={e => actualizarControl(ti, ci, 'descripcion', e.target.value)}
                        className="flex-1 input text-sm py-1.5"
                      />
                      <label className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={ctrl.implementado}
                          onChange={e => actualizarControl(ti, ci, 'implementado', e.target.checked)}
                          className="w-3.5 h-3.5 rounded accent-emerald-500"
                        />
                        Impl.
                      </label>
                      <button type="button" onClick={() => eliminarControl(ti, ci)}
                        className="text-red-500 hover:text-red-600 flex-shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* ── Participantes ────────────────────────────────────────────────────── */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <Users size={18} className="text-roka-400" /> Participantes del trabajo
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Selecciona el personal y asigna su rol. Todos deben firmar el ATS antes de iniciar.
          {form.participantes.length > 0 && (
            <span className="ml-2 text-roka-400 font-medium">{form.participantes.length} seleccionado(s)</span>
          )}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
          {personal.map(p => {
            const seleccionado = form.participantes.find(pa => pa.personal_id === p.id)
            return (
              <div
                key={p.id}
                className={`rounded-lg border p-2 transition-colors ${
                  seleccionado
                    ? 'bg-roka-500/10 border-roka-500/30'
                    : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(seleccionado)}
                    onChange={() => toggleParticipante(p.id)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-600 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{p.nombres} {p.apellidos}</div>
                    <div className="text-xs text-slate-400 truncate">{p.cargo?.nombre || 'Sin cargo'}</div>
                  </div>
                </label>
                {seleccionado && (
                  <select
                    value={seleccionado.rol}
                    onChange={e => actualizarRolParticipante(p.id, e.target.value)}
                    className="mt-1.5 w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                  >
                    {ROLES_PARTICIPANTE.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                )}
              </div>
            )
          })}
        </div>
      </div>

    </form>
  )
}
