import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Save, Plus, Trash2 } from 'lucide-react'
import api from '../../services/api'

const ESTADOS = { borrador: 'Borrador', activo: 'Activo', completado: 'Completado', cancelado: 'Cancelado' }

const actividadVacia = () => ({
  _key: Math.random(), objetivo: '', descripcion: '', responsable_id: '',
  fecha_inicio: '', fecha_fin: '', presupuesto: '',
})

export default function ProgramaFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm]         = useState({ anio: new Date().getFullYear(), nombre: '', objetivo_general: '', estado: 'borrador', monto_total: '' })
  const [actividades, setActividades] = useState([actividadVacia()])
  const [personal, setPersonal] = useState([])
  const [saving, setSaving]     = useState(false)
  const [errors, setErrors]     = useState({})

  const anioActual = new Date().getFullYear()
  const anios = Array.from({ length: 5 }, (_, i) => anioActual - 1 + i)

  useEffect(() => {
    cargarPersonal()
    if (id) cargarPrograma()
  }, [id])

  const cargarPersonal = async () => {
    try {
      const { data } = await api.get('/personal', { params: { per_page: 200 } }).catch(() => ({ data: [] }))
      setPersonal(Array.isArray(data) ? data : (data.data || []))
    } catch { /* silent */ }
  }

  const cargarPrograma = async () => {
    try {
      const { data: p } = await api.get(`/programa/${id}`)
      const prog = p.data || p
      setForm({
        anio: prog.anio || anioActual,
        nombre: prog.nombre || '',
        objetivo_general: prog.objetivo_general || '',
        estado: prog.estado || 'borrador',
        monto_total: prog.monto_total || '',
      })
      // Si ya tiene actividades cargadas en el objeto
      if (prog.actividades?.length) {
        setActividades(prog.actividades.map(a => ({ ...a, _key: a.id })))
      }
    } catch { /* silent */ }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const fAct = (key, k, v) => setActividades(prev => prev.map(a => a._key === key ? { ...a, [k]: v } : a))
  const addActividad = () => setActividades(prev => [...prev, actividadVacia()])
  const removeActividad = (key) => setActividades(prev => prev.filter(a => a._key !== key))

  const validar = () => {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    if (!form.anio)          e.anio   = 'Requerido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const guardar = async () => {
    if (!validar()) return
    setSaving(true)
    try {
      const payload = { ...form, actividades: actividades.map(({ _key, ...rest }) => rest) }
      if (id) await api.put(`/programa/${id}`, payload)
      else    await api.post('/programa', payload)
      navigate('/programa')
    } catch (err) {
      if (err.response?.data?.errors) setErrors(err.response.data.errors)
    } finally {
      setSaving(false)
    }
  }

  const inputClass = (k) =>
    `w-full border ${errors[k] ? 'border-red-400' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-roka-500`

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/programa')} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{id ? 'Editar Programa SST' : 'Nuevo Programa SST'}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Planificación anual de actividades SST</p>
        </div>
      </div>

      {/* Datos generales */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Datos Generales</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Año *</label>
            <select value={form.anio} onChange={e => f('anio', parseInt(e.target.value))} className={inputClass('anio')}>
              {anios.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
            <select value={form.estado} onChange={e => f('estado', e.target.value)} className={inputClass('estado')}>
              {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre del programa *</label>
            <input value={form.nombre} onChange={e => f('nombre', e.target.value)}
              className={inputClass('nombre')} placeholder="Ej: Programa Anual SST 2025" />
            {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Objetivo general</label>
            <textarea value={form.objetivo_general} onChange={e => f('objetivo_general', e.target.value)} rows={2}
              className={`${inputClass('objetivo_general')} resize-none`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Presupuesto total (S/)</label>
            <input type="number" value={form.monto_total} onChange={e => f('monto_total', e.target.value)}
              className={inputClass('monto_total')} placeholder="0.00" />
          </div>
        </div>
      </div>

      {/* Actividades */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Actividades</h2>
          <button onClick={addActividad}
            className="flex items-center gap-1.5 text-xs text-roka-600 hover:text-roka-700 border border-roka-200 px-3 py-1.5 rounded-lg hover:bg-roka-50">
            <Plus size={13} /> Agregar actividad
          </button>
        </div>
        <div className="space-y-4">
          {actividades.map((act, idx) => (
            <div key={act._key} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500">Actividad {idx + 1}</span>
                {actividades.length > 1 && (
                  <button onClick={() => removeActividad(act._key)} className="p-1 text-gray-300 hover:text-red-500">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Objetivo</label>
                  <input value={act.objetivo} onChange={e => fAct(act._key, 'objetivo', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Responsable</label>
                  <select value={act.responsable_id} onChange={e => fAct(act._key, 'responsable_id', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-roka-500">
                    <option value="">Sin asignar</option>
                    {personal.map(p => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
                  <input value={act.descripcion} onChange={e => fAct(act._key, 'descripcion', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fecha inicio</label>
                  <input type="date" value={act.fecha_inicio} onChange={e => fAct(act._key, 'fecha_inicio', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fecha fin</label>
                  <input type="date" value={act.fecha_fin} onChange={e => fAct(act._key, 'fecha_fin', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Presupuesto (S/)</label>
                  <input type="number" value={act.presupuesto} onChange={e => fAct(act._key, 'presupuesto', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={() => navigate('/programa')}
          className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
          Cancelar
        </button>
        <button onClick={guardar} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-roka-500 hover:bg-roka-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
          <Save size={15} /> {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
