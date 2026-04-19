import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Save } from 'lucide-react'
import api from '../../services/api'

const TIPOS   = { camion: 'Camión', van: 'Van', auto: 'Auto', moto: 'Moto', bus: 'Bus', otro: 'Otro' }
const ESTADOS = { activo: 'Activo', mantenimiento: 'Mantenimiento', baja: 'Baja' }

const inicial = {
  placa: '', marca: '', modelo: '', anio: '', color: '', tipo: 'camion',
  soat_vencimiento: '', revision_tecnica_vencimiento: '', fecha_ultima_revision: '',
  area_id: '', conductor_habitual_id: '', estado: 'activo', observaciones: '',
}

export default function VehiculoFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm]     = useState(inicial)
  const [areas, setAreas]   = useState([])
  const [personal, setPersonal] = useState([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    cargarCatalogos()
    if (id) cargarVehiculo()
  }, [id])

  const cargarCatalogos = async () => {
    try {
      const [{ data: a }, { data: p }] = await Promise.all([
        api.get('/areas').catch(() => ({ data: [] })),
        api.get('/personal', { params: { per_page: 200 } }).catch(() => ({ data: [] })),
      ])
      setAreas(Array.isArray(a) ? a : (a.data || []))
      const pArr = Array.isArray(p) ? p : (p.data || [])
      setPersonal(pArr)
    } catch { /* silent */ }
  }

  const cargarVehiculo = async () => {
    try {
      const { data } = await api.get(`/vehiculos/${id}`)
      const v = data.data || data
      setForm({
        placa: v.placa || '',
        marca: v.marca || '',
        modelo: v.modelo || '',
        anio: v.anio || '',
        color: v.color || '',
        tipo: v.tipo || 'camion',
        soat_vencimiento: v.soat_vencimiento?.substring(0, 10) || '',
        revision_tecnica_vencimiento: v.revision_tecnica_vencimiento?.substring(0, 10) || '',
        fecha_ultima_revision: v.fecha_ultima_revision?.substring(0, 10) || '',
        area_id: v.area_id || '',
        conductor_habitual_id: v.conductor_habitual_id || '',
        estado: v.estado || 'activo',
        observaciones: v.observaciones || '',
      })
    } catch { /* silent */ }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const validar = () => {
    const e = {}
    if (!form.placa.trim())  e.placa  = 'Requerido'
    if (!form.marca.trim())  e.marca  = 'Requerido'
    if (!form.modelo.trim()) e.modelo = 'Requerido'
    if (!form.tipo)          e.tipo   = 'Requerido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const guardar = async () => {
    if (!validar()) return
    setSaving(true)
    try {
      if (id) {
        await api.put(`/vehiculos/${id}`, form)
      } else {
        await api.post('/vehiculos', form)
      }
      navigate('/vehiculos')
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors)
      }
    } finally {
      setSaving(false)
    }
  }

  const inputClass = (k) =>
    `w-full border ${errors[k] ? 'border-red-400' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-roka-500`

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/vehiculos')} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{id ? 'Editar Vehículo' : 'Nuevo Vehículo'}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Control de flota vehicular</p>
        </div>
      </div>

      {/* Identificación */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Identificación</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Placa *</label>
            <input value={form.placa} onChange={e => f('placa', e.target.value.toUpperCase())}
              className={inputClass('placa')} placeholder="ABC-123" />
            {errors.placa && <p className="text-xs text-red-500 mt-1">{errors.placa}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo *</label>
            <select value={form.tipo} onChange={e => f('tipo', e.target.value)} className={inputClass('tipo')}>
              {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Marca *</label>
            <input value={form.marca} onChange={e => f('marca', e.target.value)}
              className={inputClass('marca')} placeholder="Toyota" />
            {errors.marca && <p className="text-xs text-red-500 mt-1">{errors.marca}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Modelo *</label>
            <input value={form.modelo} onChange={e => f('modelo', e.target.value)}
              className={inputClass('modelo')} placeholder="Hilux" />
            {errors.modelo && <p className="text-xs text-red-500 mt-1">{errors.modelo}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Año</label>
            <input type="number" value={form.anio} onChange={e => f('anio', e.target.value)}
              className={inputClass('anio')} placeholder="2022" min="1990" max="2030" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
            <input value={form.color} onChange={e => f('color', e.target.value)}
              className={inputClass('color')} placeholder="Blanco" />
          </div>
        </div>
      </div>

      {/* Documentos */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Documentos</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Vencimiento SOAT</label>
            <input type="date" value={form.soat_vencimiento} onChange={e => f('soat_vencimiento', e.target.value)}
              className={inputClass('soat_vencimiento')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Vencimiento Rev. Técnica</label>
            <input type="date" value={form.revision_tecnica_vencimiento} onChange={e => f('revision_tecnica_vencimiento', e.target.value)}
              className={inputClass('revision_tecnica_vencimiento')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha Última Revisión</label>
            <input type="date" value={form.fecha_ultima_revision} onChange={e => f('fecha_ultima_revision', e.target.value)}
              className={inputClass('fecha_ultima_revision')} />
          </div>
        </div>
      </div>

      {/* Operación */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Operación</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Área asignada</label>
            <select value={form.area_id} onChange={e => f('area_id', e.target.value)} className={inputClass('area_id')}>
              <option value="">Sin área</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Conductor habitual</label>
            <select value={form.conductor_habitual_id} onChange={e => f('conductor_habitual_id', e.target.value)} className={inputClass('conductor_habitual_id')}>
              <option value="">Sin asignar</option>
              {personal.map(p => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
            <select value={form.estado} onChange={e => f('estado', e.target.value)} className={inputClass('estado')}>
              {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Observaciones</label>
            <textarea value={form.observaciones} onChange={e => f('observaciones', e.target.value)} rows={3}
              className={`${inputClass('observaciones')} resize-none`} />
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-3">
        <button onClick={() => navigate('/vehiculos')}
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
