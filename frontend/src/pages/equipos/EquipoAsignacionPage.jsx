import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList, Plus, Trash2, RefreshCw, AlertCircle,
  ArrowLeft, Calendar, ChevronDown, Users, Wrench,
  CheckCircle2, Clock, XCircle, UserCheck, Search,
} from 'lucide-react'
import api from '../../services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const TURNO_OPTS = [
  { value: 'mañana',      label: 'Mañana' },
  { value: 'tarde',       label: 'Tarde' },
  { value: 'noche',       label: 'Noche' },
  { value: 'dia_completo',label: 'Día completo' },
]

const ESTADO_CFG = {
  pendiente:  { label: 'Pendiente',  color: 'bg-amber-50 text-amber-700 border-amber-200',     icon: Clock },
  en_proceso: { label: 'En proceso', color: 'bg-blue-50 text-blue-700 border-blue-200',        icon: RefreshCw },
  completado: { label: 'Completado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200',icon: CheckCircle2 },
  omitido:    { label: 'Omitido',    color: 'bg-red-50 text-red-700 border-red-200',            icon: XCircle },
}

function ModalAsignar({ onClose, onSaved, fechaDefault }) {
  const [form, setForm] = useState({
    usuario_id: '',
    equipo_ids: [],
    fecha: fechaDefault,
    turno: 'dia_completo',
    observaciones: '',
  })
  const [usuarios, setUsuarios]   = useState([])
  const [equipos, setEquipos]     = useState([])
  const [loading, setLoading]     = useState(false)
  const [busqEquipo, setBusqEquipo] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/usuarios', { params: { activo: 1, per_page: 100 } }),
      api.get('/equipos',  { params: { estado: 'operativo', per_page: 200 } }),
    ]).then(([u, e]) => {
      setUsuarios(u.data.data || u.data)
      setEquipos(e.data.data || e.data)
    }).catch(() => {})
  }, [])

  const equiposFiltrados = equipos.filter(e =>
    !busqEquipo || e.nombre.toLowerCase().includes(busqEquipo.toLowerCase()) || e.codigo.toLowerCase().includes(busqEquipo.toLowerCase())
  )

  const toggleEquipo = (id) => {
    setForm(f => ({
      ...f,
      equipo_ids: f.equipo_ids.includes(id)
        ? f.equipo_ids.filter(x => x !== id)
        : [...f.equipo_ids, id],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.usuario_id || form.equipo_ids.length === 0) return
    setLoading(true)
    try {
      await api.post('/equipo-asignaciones/batch', {
        usuario_id:  parseInt(form.usuario_id),
        equipo_ids:  form.equipo_ids,
        fecha:       form.fecha,
        turno:       form.turno,
        observaciones: form.observaciones || undefined,
      })
      onSaved()
      onClose()
    } catch (err) {
      alert(err?.response?.data?.message || 'Error al crear asignaciones.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <UserCheck size={20} className="text-blue-600" />
            Nueva asignación
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Usuario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Usuario asignado *</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.usuario_id}
              onChange={e => setForm(f => ({ ...f, usuario_id: e.target.value }))}
              required
            >
              <option value="">Seleccionar usuario…</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{u.nombre} — {u.rol}</option>
              ))}
            </select>
          </div>

          {/* Fecha y turno */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha *</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Turno *</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.turno}
                onChange={e => setForm(f => ({ ...f, turno: e.target.value }))}
              >
                {TURNO_OPTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Equipos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Equipos a asignar * <span className="text-gray-400 font-normal">({form.equipo_ids.length} seleccionados)</span>
            </label>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar equipo…"
                value={busqEquipo}
                onChange={e => setBusqEquipo(e.target.value)}
                className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="border border-gray-200 rounded-xl overflow-y-auto max-h-48">
              {equiposFiltrados.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No hay equipos operativos</p>
              ) : equiposFiltrados.map(eq => (
                <label
                  key={eq.id}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                >
                  <input
                    type="checkbox"
                    checked={form.equipo_ids.includes(eq.id)}
                    onChange={() => toggleEquipo(eq.id)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{eq.nombre}</p>
                    <p className="text-xs text-gray-400 font-mono">{eq.codigo} {eq.area?.nombre ? `· ${eq.area.nombre}` : ''}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Observaciones</label>
            <textarea
              rows={2}
              maxLength={500}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Instrucciones adicionales…"
              value={form.observaciones}
              onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
            />
          </div>
        </form>

        <div className="p-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !form.usuario_id || form.equipo_ids.length === 0}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            {loading ? 'Guardando…' : `Asignar ${form.equipo_ids.length > 0 ? form.equipo_ids.length : ''} equipo(s)`}
          </button>
        </div>
      </div>
    </div>
  )
}

function FilaAsignacion({ asig, onEliminar }) {
  const est     = ESTADO_CFG[asig.estado] || ESTADO_CFG.pendiente
  const EstIcon = est.icon

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-800">{asig.equipo?.nombre}</p>
        <p className="text-xs text-gray-400 font-mono">{asig.equipo?.codigo} · {asig.equipo?.area?.nombre}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-gray-700">{asig.usuario?.nombre}</p>
        <p className="text-xs text-gray-400">{asig.usuario?.email}</p>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 capitalize">
        {asig.turno?.replace('_', ' ')}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${est.color}`}>
          <EstIcon size={10} />
          {est.label}
        </span>
      </td>
      <td className="px-4 py-3">
        {asig.inspeccion && (
          <span className="text-xs text-emerald-600 font-mono">{asig.inspeccion.codigo}</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {asig.estado === 'pendiente' && (
          <button
            onClick={() => onEliminar(asig.id)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar asignación"
          >
            <Trash2 size={15} />
          </button>
        )}
      </td>
    </tr>
  )
}

export default function EquipoAsignacionPage() {
  const navigate = useNavigate()
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [showModal, setShowModal]   = useState(false)
  const [filtros, setFiltros] = useState({
    fecha: format(new Date(), 'yyyy-MM-dd'),
    turno: '',
    estado: '',
  })

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { per_page: 100, ...Object.fromEntries(Object.entries(filtros).filter(([, v]) => v)) }
      const res = await api.get('/equipo-asignaciones', { params })
      setData(res.data)
    } catch {
      setError('Error al cargar asignaciones.')
    } finally {
      setLoading(false)
    }
  }, [filtros])

  useEffect(() => { cargar() }, [cargar])

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar esta asignación?')) return
    try {
      await api.delete(`/equipo-asignaciones/${id}`)
      cargar()
    } catch {
      alert('No se pudo eliminar.')
    }
  }

  const asignaciones = data?.data || []
  const total        = data?.total || 0
  const completados  = asignaciones.filter(a => a.estado === 'completado').length
  const pendientes   = asignaciones.filter(a => a.estado === 'pendiente').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList size={20} className="text-blue-600" />
              Asignación de equipos
            </h1>
            <p className="text-xs text-gray-400">Gestión diaria por turno</p>
          </div>
          <button
            onClick={cargar}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title="Actualizar"
          >
            <RefreshCw size={18} className="text-gray-500" />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors"
          >
            <Plus size={16} />
            Nueva asignación
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Total asignados', value: total,       color: 'text-gray-800' },
            { label: 'Completados',     value: completados,  color: 'text-emerald-600' },
            { label: 'Pendientes',      value: pendientes,   color: 'text-amber-600' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-gray-400" />
            <input
              type="date"
              value={filtros.fecha}
              onChange={e => setFiltros(f => ({ ...f, fecha: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filtros.turno}
            onChange={e => setFiltros(f => ({ ...f, turno: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los turnos</option>
            {TURNO_OPTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select
            value={filtros.estado}
            onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
        </div>

        {/* Tabla */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm mb-4">
            <AlertCircle size={16} />{error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <RefreshCw size={28} className="animate-spin mx-auto mb-2" />Cargando…
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Equipo', 'Usuario', 'Turno', 'Estado', 'Inspección', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {asignaciones.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-gray-400">
                        <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
                        Sin asignaciones para los filtros seleccionados
                      </td>
                    </tr>
                  ) : asignaciones.map(a => (
                    <FilaAsignacion key={a.id} asig={a} onEliminar={handleEliminar} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <ModalAsignar
          fechaDefault={filtros.fecha}
          onClose={() => setShowModal(false)}
          onSaved={cargar}
        />
      )}
    </div>
  )
}
