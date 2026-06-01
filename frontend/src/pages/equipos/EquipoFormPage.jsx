import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Save } from 'lucide-react'
import api from '../../services/api'

const TIPOS   = { maquinaria: 'Maquinaria', herramienta: 'Herramienta', instrumento: 'Instrumento', equipo_medicion: 'Equipo de medición', electrico: 'Eléctrico', vehiculo: 'Vehículo', extintor: '🔥 Extintor', emergencias: '🚨 Emergencias', otro: 'Otro' }
const ESTADOS = { operativo: 'Operativo', mantenimiento: 'Mantenimiento', baja: 'Baja' }

const inicial = {
  codigo: '', nombre: '', tipo: 'maquinaria', marca: '', modelo: '', serie: '',
  fecha_ultimo_mantenimiento: '', fecha_proxima_calibracion: '', fecha_proxima_revision: '',
  area_id: '', responsable_id: '', estado: 'operativo', observaciones: '',
  equipo_catalogo_id: '',
}

export default function EquipoFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm]     = useState(inicial)
  const [areas, setAreas]           = useState([])
  const [personal, setPersonal]     = useState([])
  const [catalogos, setCatalogos]   = useState([])
  const [saving, setSaving]         = useState(false)
  const [errors, setErrors]         = useState({})

  useEffect(() => {
    cargarCatalogos()
    if (id) cargarEquipo()
  }, [id])

  const cargarCatalogos = async () => {
    try {
      const [{ data: a }, { data: p }, { data: cat }] = await Promise.all([
        api.get('/areas').catch(() => ({ data: [] })),
        api.get('/personal', { params: { per_page: 200 } }).catch(() => ({ data: [] })),
        api.get('/checklist/equipos', { params: { activos: false } }).catch(() => ({ data: [] })),
      ])
      setAreas(Array.isArray(a) ? a : (a.data || []))
      setPersonal(Array.isArray(p) ? p : (p.data || []))
      setCatalogos(Array.isArray(cat) ? cat : (cat.data || []))
    } catch { /* silent */ }
  }

  const cargarEquipo = async () => {
    try {
      const { data } = await api.get(`/equipos/${id}`)
      const e = data.data || data
      setForm({
        codigo:  e.codigo || '',
        nombre:  e.nombre || '',
        tipo:    e.tipo || 'maquinaria',
        marca:   e.marca || '',
        modelo:  e.modelo || '',
        serie:   e.serie || '',
        fecha_ultimo_mantenimiento: e.fecha_ultimo_mantenimiento?.substring(0, 10) || '',
        fecha_proxima_calibracion:  e.fecha_proxima_calibracion?.substring(0, 10)  || '',
        fecha_proxima_revision:     e.fecha_proxima_revision?.substring(0, 10)     || '',
        area_id:            e.area_id            || '',
        responsable_id:     e.responsable_id     || '',
        equipo_catalogo_id: e.equipo_catalogo_id || '',
        estado:             e.estado             || 'operativo',
        observaciones:      e.observaciones      || '',
      })
    } catch { /* silent */ }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const validar = () => {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    if (!form.tipo)          e.tipo   = 'Requerido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const guardar = async () => {
    if (!validar()) return
    setSaving(true)
    try {
      if (id) await api.put(`/equipos/${id}`, form)
      else    await api.post('/equipos', form)
      navigate('/equipos')
    } catch (err) {
      if (err.response?.data?.errors) setErrors(err.response.data.errors)
    } finally {
      setSaving(false)
    }
  }

  const inputClass = (k) =>
    `w-full border ${errors[k] ? 'border-red-400' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-roka-500`

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/equipos')} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{id ? 'Editar Equipo' : 'Nuevo Equipo'}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Maquinaria, herramientas e instrumentos</p>
        </div>
      </div>

      {/* Identificación */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Identificación</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Código</label>
            <input value={form.codigo} onChange={e => f('codigo', e.target.value)}
              className={inputClass('codigo')} placeholder="EQ-001" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo *</label>
            <select value={form.tipo} onChange={e => f('tipo', e.target.value)} className={inputClass('tipo')}>
              {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
            <input value={form.nombre} onChange={e => f('nombre', e.target.value)}
              className={inputClass('nombre')} placeholder="Ej: Taladro de banco industrial" />
            {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Marca</label>
            <input value={form.marca} onChange={e => f('marca', e.target.value)}
              className={inputClass('marca')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Modelo</label>
            <input value={form.modelo} onChange={e => f('modelo', e.target.value)}
              className={inputClass('modelo')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">N° Serie</label>
            <input value={form.serie} onChange={e => f('serie', e.target.value)}
              className={inputClass('serie')} />
          </div>
        </div>
      </div>

      {/* Mantenimiento y calibración */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Mantenimiento y Calibración</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha último mantenimiento</label>
            <input type="date" value={form.fecha_ultimo_mantenimiento} onChange={e => f('fecha_ultimo_mantenimiento', e.target.value)}
              className={inputClass('fecha_ultimo_mantenimiento')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Próxima calibración</label>
            <input type="date" value={form.fecha_proxima_calibracion} onChange={e => f('fecha_proxima_calibracion', e.target.value)}
              className={inputClass('fecha_proxima_calibracion')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Próxima revisión</label>
            <input type="date" value={form.fecha_proxima_revision} onChange={e => f('fecha_proxima_revision', e.target.value)}
              className={inputClass('fecha_proxima_revision')} />
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
            <label className="block text-xs font-medium text-gray-500 mb-1">Responsable</label>
            <select value={form.responsable_id} onChange={e => f('responsable_id', e.target.value)} className={inputClass('responsable_id')}>
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

          {/* Vinculación con catálogo de inspecciones */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
              Tipo de checklist (catálogo de inspecciones)
              <span className="text-gray-400 font-normal">— vincula este activo a un tipo de checklist</span>
            </label>
            <select value={form.equipo_catalogo_id} onChange={e => f('equipo_catalogo_id', e.target.value)}
              className={inputClass('equipo_catalogo_id')}>
              <option value="">Sin checklist asignado</option>
              {(() => {
                const grupos = {}
                catalogos.forEach(c => {
                  const g = c.submodulo?.nombre || 'General'
                  if (!grupos[g]) grupos[g] = []
                  grupos[g].push(c)
                })
                return Object.entries(grupos).map(([g, items]) => (
                  <optgroup key={g} label={`Sub-módulo ${g}`}>
                    {items.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.codigo ? `${c.codigo} — ` : ''}{c.nombre}
                        {c.preguntas_count > 0 ? ` (${c.preguntas_count} preguntas)` : ''}
                      </option>
                    ))}
                  </optgroup>
                ))
              })()}
            </select>
            {form.equipo_catalogo_id && (
              <p className="text-xs text-emerald-600 mt-1">
                ✓ Al crear una inspección "Por catálogo" de este tipo, este activo estará disponible para seleccionar.
              </p>
            )}
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Observaciones</label>
            <textarea value={form.observaciones} onChange={e => f('observaciones', e.target.value)} rows={3}
              className={`${inputClass('observaciones')} resize-none`} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={() => navigate('/equipos')}
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
