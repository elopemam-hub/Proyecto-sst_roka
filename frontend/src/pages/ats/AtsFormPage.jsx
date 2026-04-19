import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Save, ArrowLeft, Plus, Trash2, AlertTriangle,
  Users, MapPin, Calendar, Shield, HardHat
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

const NIVELES_RIESGO = ['bajo', 'medio', 'alto', 'critico']

export default function AtsFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editando = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [areas, setAreas] = useState([])
  const [personal, setPersonal] = useState([])
  const [epps, setEpps] = useState([])

  const [form, setForm] = useState({
    titulo: '',
    area_id: '',
    ubicacion: '',
    fecha_trabajo: '',
    hora_inicio: '',
    hora_fin: '',
    descripcion_trabajo: '',
    supervisor_responsable_id: '',
    requiere_permiso_trabajo: false,
    tipos_permiso: [],
    tareas: [],
    participantes: [],
  })

  useEffect(() => {
    cargarMaestros()
    if (editando) cargarAts()
  }, [id])

  const cargarMaestros = async () => {
    try {
      const [ar, pe, ep] = await Promise.all([
        api.get('/areas'),
        api.get('/personal'),
        api.get('/epps'),
      ])
      setAreas(ar.data.data || ar.data)
      setPersonal(pe.data.data || pe.data)
      setEpps(ep.data.data || ep.data)
    } catch (e) {
      toast.error('Error al cargar datos maestros')
    }
  }

  const cargarAts = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/ats/${id}`)
      setForm({
        titulo: data.titulo || '',
        area_id: data.area_id || '',
        ubicacion: data.ubicacion || '',
        fecha_trabajo: data.fecha_trabajo?.split('T')[0] || '',
        hora_inicio: data.hora_inicio || '',
        hora_fin: data.hora_fin || '',
        descripcion_trabajo: data.descripcion_trabajo || '',
        supervisor_responsable_id: data.supervisor_responsable_id || '',
        requiere_permiso_trabajo: Boolean(data.requiere_permiso_trabajo),
        tipos_permiso: data.tipos_permiso || [],
        tareas: data.tareas || [],
        participantes: data.participantes || [],
      })
    } catch (e) {
      toast.error('Error al cargar ATS')
      navigate('/ats')
    } finally {
      setLoading(false)
    }
  }

  // ============== Tareas ==============
  const agregarTarea = () => {
    setForm(f => ({
      ...f,
      tareas: [...f.tareas, {
        id: `tmp-${Date.now()}`,
        orden: f.tareas.length + 1,
        descripcion: '',
        peligros: [],
      }],
    }))
  }

  const actualizarTarea = (idx, campo, valor) => {
    setForm(f => ({
      ...f,
      tareas: f.tareas.map((t, i) => i === idx ? { ...t, [campo]: valor } : t),
    }))
  }

  const eliminarTarea = (idx) => {
    setForm(f => ({
      ...f,
      tareas: f.tareas.filter((_, i) => i !== idx),
    }))
  }

  // ============== Peligros por tarea ==============
  const agregarPeligro = (tareaIdx) => {
    setForm(f => ({
      ...f,
      tareas: f.tareas.map((t, i) => i === tareaIdx ? {
        ...t,
        peligros: [...t.peligros, {
          id: `tmp-${Date.now()}`,
          descripcion: '',
          riesgo_asociado: '',
          nivel_riesgo: 'medio',
          controles: [],
          epps_requeridos: [],
        }],
      } : t),
    }))
  }

  const actualizarPeligro = (tareaIdx, peligroIdx, campo, valor) => {
    setForm(f => ({
      ...f,
      tareas: f.tareas.map((t, i) => i === tareaIdx ? {
        ...t,
        peligros: t.peligros.map((p, j) => j === peligroIdx ? { ...p, [campo]: valor } : p),
      } : t),
    }))
  }

  const eliminarPeligro = (tareaIdx, peligroIdx) => {
    setForm(f => ({
      ...f,
      tareas: f.tareas.map((t, i) => i === tareaIdx ? {
        ...t,
        peligros: t.peligros.filter((_, j) => j !== peligroIdx),
      } : t),
    }))
  }

  // ============== Controles y EPPs por peligro ==============
  const toggleEppPeligro = (tareaIdx, peligroIdx, eppId) => {
    setForm(f => ({
      ...f,
      tareas: f.tareas.map((t, i) => i === tareaIdx ? {
        ...t,
        peligros: t.peligros.map((p, j) => {
          if (j !== peligroIdx) return p
          const exists = p.epps_requeridos.includes(eppId)
          return {
            ...p,
            epps_requeridos: exists
              ? p.epps_requeridos.filter(id => id !== eppId)
              : [...p.epps_requeridos, eppId],
          }
        }),
      } : t),
    }))
  }

  const agregarControl = (tareaIdx, peligroIdx) => {
    setForm(f => ({
      ...f,
      tareas: f.tareas.map((t, i) => i === tareaIdx ? {
        ...t,
        peligros: t.peligros.map((p, j) => j === peligroIdx ? {
          ...p,
          controles: [...p.controles, {
            id: `tmp-${Date.now()}`,
            descripcion: '',
            tipo: 'administrativo',
          }],
        } : p),
      } : t),
    }))
  }

  // ============== Participantes ==============
  const toggleParticipante = (personaId) => {
    setForm(f => {
      const exists = f.participantes.find(p => p.personal_id === personaId)
      return {
        ...f,
        participantes: exists
          ? f.participantes.filter(p => p.personal_id !== personaId)
          : [...f.participantes, { personal_id: personaId, rol: 'operativo' }],
      }
    })
  }

  // ============== Permiso de trabajo ==============
  const toggleTipoPermiso = (tipo) => {
    setForm(f => {
      const exists = f.tipos_permiso.includes(tipo)
      return {
        ...f,
        tipos_permiso: exists
          ? f.tipos_permiso.filter(t => t !== tipo)
          : [...f.tipos_permiso, tipo],
      }
    })
  }

  // ============== Guardar ==============
  const guardar = async (e) => {
    e.preventDefault()
    if (!form.titulo || !form.area_id || !form.fecha_trabajo) {
      toast.error('Complete los campos obligatorios')
      return
    }
    if (form.tareas.length === 0) {
      toast.error('Debe agregar al menos una tarea')
      return
    }
    if (form.participantes.length === 0) {
      toast.error('Debe agregar al menos un participante')
      return
    }

    setSaving(true)
    try {
      if (editando) {
        await api.put(`/ats/${id}`, form)
        toast.success('ATS actualizado')
      } else {
        const { data } = await api.post('/ats', form)
        toast.success('ATS creado')
        navigate(`/ats/${data.id}`)
        return
      }
      navigate('/ats')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-roka-500"></div>
      </div>
    )
  }

  return (
    <form onSubmit={guardar} className="max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/ats')}
            className="p-2 hover:bg-slate-800 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {editando ? 'Editar ATS' : 'Nuevo ATS'}
            </h1>
            <p className="text-sm text-slate-400">
              Análisis de Trabajo Seguro — Ley 29783
            </p>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-roka-600 hover:bg-roka-700 disabled:opacity-50 text-white rounded-lg font-medium"
        >
          <Save size={18} />
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      {/* Datos generales */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <ClipIcon /> Datos generales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-slate-300 mb-1">Título *</label>
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
            <label className="block text-sm text-slate-300 mb-1">Área *</label>
            <select
              required
              value={form.area_id}
              onChange={e => setForm({ ...form, area_id: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="">Seleccionar…</option>
              {areas.map(a => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              <MapPin size={14} className="inline mr-1" />
              Ubicación específica
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
              <Calendar size={14} className="inline mr-1" />
              Fecha del trabajo *
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
              <input
                type="time"
                value={form.hora_inicio}
                onChange={e => setForm({ ...form, hora_inicio: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Hora fin</label>
              <input
                type="time"
                value={form.hora_fin}
                onChange={e => setForm({ ...form, hora_fin: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
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
                <option key={p.id} value={p.id}>
                  {p.nombres} {p.apellidos} — {p.cargo?.nombre}
                </option>
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

      {/* Permiso de trabajo */}
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

      {/* Tareas con peligros */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <AlertTriangle size={18} /> Tareas y análisis de peligros
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
          <div className="text-center py-8 text-slate-500 text-sm">
            No hay tareas agregadas. Haga clic en "Agregar tarea" para comenzar.
          </div>
        )}

        <div className="space-y-4">
          {form.tareas.map((tarea, ti) => (
            <div key={tarea.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-roka-500/20 text-roka-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {ti + 1}
                </div>
                <input
                  type="text"
                  placeholder="Descripción de la tarea…"
                  value={tarea.descripcion}
                  onChange={e => actualizarTarea(ti, 'descripcion', e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
                <button
                  type="button"
                  onClick={() => eliminarTarea(ti)}
                  className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Peligros */}
              <div className="ml-11 space-y-3">
                {tarea.peligros.map((peligro, pi) => (
                  <div key={peligro.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Peligro…"
                        value={peligro.descripcion}
                        onChange={e => actualizarPeligro(ti, pi, 'descripcion', e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
                      />
                      <input
                        type="text"
                        placeholder="Riesgo asociado…"
                        value={peligro.riesgo_asociado}
                        onChange={e => actualizarPeligro(ti, pi, 'riesgo_asociado', e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
                      />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-slate-400">Nivel:</span>
                      <select
                        value={peligro.nivel_riesgo}
                        onChange={e => actualizarPeligro(ti, pi, 'nivel_riesgo', e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                      >
                        {NIVELES_RIESGO.map(n => (
                          <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => eliminarPeligro(ti, pi)}
                        className="ml-auto text-xs text-red-400 hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>

                    {/* EPPs requeridos */}
                    {epps.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                          <HardHat size={12} /> EPPs requeridos:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {epps.map(epp => (
                            <label
                              key={epp.id}
                              className={`px-2 py-0.5 rounded text-xs cursor-pointer border ${
                                peligro.epps_requeridos.includes(epp.id)
                                  ? 'bg-roka-500/20 border-roka-500/40 text-roka-300'
                                  : 'bg-slate-900 border-slate-700 text-slate-400'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={peligro.epps_requeridos.includes(epp.id)}
                                onChange={() => toggleEppPeligro(ti, pi, epp.id)}
                                className="hidden"
                              />
                              {epp.nombre}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => agregarPeligro(ti)}
                  className="text-xs text-roka-400 hover:underline flex items-center gap-1"
                >
                  <Plus size={12} /> Agregar peligro
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Participantes */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users size={18} /> Participantes del trabajo
        </h2>
        <p className="text-xs text-slate-400 mb-3">
          Selecciona el personal que participará. Todos deben firmar el ATS antes de iniciar el trabajo.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
          {personal.map(p => {
            const seleccionado = form.participantes.find(pa => pa.personal_id === p.id)
            return (
              <label
                key={p.id}
                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                  seleccionado
                    ? 'bg-roka-500/10 border-roka-500/30'
                    : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(seleccionado)}
                  onChange={() => toggleParticipante(p.id)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-600"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">
                    {p.nombres} {p.apellidos}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {p.cargo?.nombre || 'Sin cargo'}
                  </div>
                </div>
              </label>
            )
          })}
        </div>
        {form.participantes.length > 0 && (
          <div className="mt-3 text-xs text-slate-400">
            {form.participantes.length} participante(s) seleccionado(s)
          </div>
        )}
      </div>
    </form>
  )
}

function ClipIcon() {
  return <Shield size={18} />
}
