import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Save, Tag, ClipboardList, Settings } from 'lucide-react'
import api from '../../services/api'

const TIPOS   = {
  maquinaria:     'Maquinaria',
  herramienta:    'Herramienta',
  instrumento:    'Instrumento',
  equipo_medicion:'Equipo de medición',
  electrico:      'Eléctrico',
  vehiculo:       'Vehículo',
  extintor:       'Extintor',
  emergencias:    'Emergencias',
  otro:           'Otro',
}
const ESTADOS = { operativo: 'Operativo', mantenimiento: 'Mantenimiento', baja: 'Baja', inactivo: 'Inactivo' }

// Frecuencias disponibles para asignación por equipo
const FRECUENCIAS = [
  { value: 'diaria',     label: 'Diaria',      color: 'bg-red-50 border-red-200 text-red-700' },
  { value: 'semanal',    label: 'Semanal',     color: 'bg-orange-50 border-orange-200 text-orange-700' },
  { value: 'mensual',    label: 'Mensual',     color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { value: 'trimestral', label: 'Trimestral',  color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  { value: 'semestral',  label: 'Semestral',   color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { value: 'anual',      label: 'Anual',       color: 'bg-gray-50 border-gray-200 text-gray-600' },
]

const inicial = {
  codigo: '', nombre: '', tipo: 'maquinaria', tipo_id: '',
  marca: '', modelo: '', serie: '',
  anio_fabricacion: '', fecha_adquisicion: '',
  fecha_ultimo_mantenimiento: '', fecha_proxima_calibracion: '', fecha_proxima_revision: '',
  area_id: '', responsable_id: '', ubicacion: '', estado: 'operativo', observaciones: '',
  // plantillas como array de { id, frecuencia_inspeccion }
  plantillas: [],
}

export default function EquipoFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm]       = useState(inicial)
  const [areas, setAreas]     = useState([])
  const [personal, setPersonal]   = useState([])
  const [tipos, setTipos]         = useState([])
  const [plantillas, setPlantillas] = useState([])   // todos los equipos_catalogo
  const [saving, setSaving]   = useState(false)
  const [errors, setErrors]   = useState({})

  useEffect(() => {
    cargarDatos()
    if (id) cargarEquipo()
  }, [id])

  const cargarDatos = async () => {
    try {
      const [{ data: a }, { data: p }, { data: t }, { data: cat }] = await Promise.all([
        api.get('/areas', { params: { per_page: 1000 } }).catch(() => ({ data: [] })),
        api.get('/personal', { params: { per_page: 200 } }).catch(() => ({ data: [] })),
        api.get('/equipos-tipos').catch(() => ({ data: [] })),
        api.get('/checklist/equipos', { params: { activos: false } }).catch(() => ({ data: [] })),
      ])
      setAreas(Array.isArray(a) ? a : (a.data || []))
      setPersonal(Array.isArray(p) ? p : (p.data || []))
      setTipos(Array.isArray(t) ? t : (t.data || []))
      setPlantillas(Array.isArray(cat) ? cat : (cat.data || []))
    } catch { /* silent */ }
  }

  const cargarEquipo = async () => {
    try {
      const { data } = await api.get(`/equipos/${id}`)
      const e = data.data || data
      setForm({
        codigo:   e.codigo  || '',
        nombre:   e.nombre  || '',
        tipo:     e.tipo    || 'maquinaria',
        tipo_id:  e.tipo_id || '',
        marca:    e.marca   || '',
        modelo:   e.modelo  || '',
        serie:    e.serie   || '',
        anio_fabricacion:  e.anio_fabricacion  || '',
        fecha_adquisicion: e.fecha_adquisicion?.substring(0, 10) || '',
        fecha_ultimo_mantenimiento: e.fecha_ultimo_mantenimiento?.substring(0, 10) || '',
        fecha_proxima_calibracion:  e.fecha_proxima_calibracion?.substring(0, 10)  || '',
        fecha_proxima_revision:     e.fecha_proxima_revision?.substring(0, 10)     || '',
        area_id:        e.area_id        || '',
        responsable_id: e.responsable_id || '',
        ubicacion:      e.ubicacion      || '',
        estado:         e.estado         || 'operativo',
        observaciones:  e.observaciones  || '',
        plantillas: (e.plantillas || []).map(p => ({
          id: p.id,
          frecuencia_inspeccion: p.pivot?.frecuencia_inspeccion || null,
        })),
      })
    } catch { /* silent */ }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const togglePlantilla = (plantillaId) => {
    const existe = form.plantillas.some(p => p.id === plantillaId)
    if (existe) {
      f('plantillas', form.plantillas.filter(p => p.id !== plantillaId))
    } else {
      f('plantillas', [...form.plantillas, { id: plantillaId, frecuencia_inspeccion: null }])
    }
  }

  const setFrecuenciaPlantilla = (plantillaId, frecuencia) => {
    f('plantillas', form.plantillas.map(p =>
      p.id === plantillaId ? { ...p, frecuencia_inspeccion: frecuencia } : p
    ))
  }

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
      const payload = { ...form, tipo_id: form.tipo_id || null }
      if (id) await api.put(`/equipos/${id}`, payload)
      else    await api.post('/equipos', payload)
      // payload.plantillas → [{ id, frecuencia_inspeccion }] — el backend lo procesa
      navigate('/equipos')
    } catch (err) {
      if (err.response?.data?.errors) setErrors(err.response.data.errors)
    } finally { setSaving(false) }
  }

  const inputClass = (k) =>
    `w-full border ${errors[k] ? 'border-red-400' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-roka-500`

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/equipos')}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{id ? 'Editar Equipo' : 'Nuevo Equipo'}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Maquinaria, herramientas e instrumentos</p>
        </div>
      </div>

      {/* ── Identificación ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Identificación</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Código</label>
            <input value={form.codigo} onChange={e => f('codigo', e.target.value)}
              className={inputClass('codigo')} placeholder="EQ-001" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de activo *</label>
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
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Tag size={11} className="text-gray-400" /> Tipo específico
              <span className="text-gray-400 font-normal ml-1">— modelo o variante exacta</span>
            </label>
            <div className="flex gap-2">
              <select value={form.tipo_id} onChange={e => f('tipo_id', e.target.value)}
                className={`${inputClass('tipo_id')} flex-1`}>
                <option value="">Sin tipo específico asignado</option>
                {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
              <button type="button"
                onClick={() => window.open('/equipos/tipos', '_blank')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                title="Gestionar tipos">
                <Settings size={15} />
              </button>
            </div>
            {tipos.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Sin tipos definidos.{' '}
                <a href="/equipos/tipos" target="_blank" className="underline">Crear tipos</a>
                {' '}para agrupar activos idénticos.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Marca</label>
            <input value={form.marca} onChange={e => f('marca', e.target.value)} className={inputClass('marca')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Modelo</label>
            <input value={form.modelo} onChange={e => f('modelo', e.target.value)} className={inputClass('modelo')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">N° Serie</label>
            <input value={form.serie} onChange={e => f('serie', e.target.value)} className={inputClass('serie')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Año de fabricación</label>
            <input type="number" value={form.anio_fabricacion} onChange={e => f('anio_fabricacion', e.target.value)}
              min="1900" max="2099" placeholder="Ej: 2020" className={inputClass('anio_fabricacion')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de adquisición</label>
            <input type="date" value={form.fecha_adquisicion} onChange={e => f('fecha_adquisicion', e.target.value)}
              className={inputClass('fecha_adquisicion')} />
          </div>
        </div>
      </div>

      {/* ── Mantenimiento y Calibración ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Mantenimiento y Calibración</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha último mantenimiento</label>
            <input type="date" value={form.fecha_ultimo_mantenimiento}
              onChange={e => f('fecha_ultimo_mantenimiento', e.target.value)} className={inputClass('fecha_ultimo_mantenimiento')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Próxima calibración</label>
            <input type="date" value={form.fecha_proxima_calibracion}
              onChange={e => f('fecha_proxima_calibracion', e.target.value)} className={inputClass('fecha_proxima_calibracion')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Próxima revisión</label>
            <input type="date" value={form.fecha_proxima_revision}
              onChange={e => f('fecha_proxima_revision', e.target.value)} className={inputClass('fecha_proxima_revision')} />
          </div>
        </div>
      </div>

      {/* ── Operación ── */}
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
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ubicación</label>
            <input value={form.ubicacion} onChange={e => f('ubicacion', e.target.value)}
              className={inputClass('ubicacion')} placeholder="Ej: Almacén principal, piso 2" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Observaciones</label>
            <textarea value={form.observaciones} onChange={e => f('observaciones', e.target.value)} rows={3}
              className={`${inputClass('observaciones')} resize-none`} />
          </div>
        </div>
      </div>

      {/* ── Plantillas de inspección (multi-select por frecuencia) ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList size={15} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Plantillas de Inspección</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Selecciona las plantillas que aplican a este equipo y define la frecuencia de
          inspección para <strong>esta unidad específica</strong>.
        </p>

        {plantillas.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            Sin plantillas de inspección configuradas.{' '}
            <a href="/equipos/catalogo" target="_blank" className="text-roka-500 underline">Crear plantillas</a>
          </p>
        ) : (
          <div className="space-y-1.5">
            {plantillas.map(p => {
              const asignacion  = form.plantillas.find(x => x.id === p.id)
              const seleccionada = !!asignacion
              const frecActual  = asignacion?.frecuencia_inspeccion || ''

              return (
                <div key={p.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                    seleccionada ? 'border-roka-300 bg-roka-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}>
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={seleccionada}
                    onChange={() => togglePlantilla(p.id)}
                    className="w-4 h-4 rounded accent-roka-500 flex-shrink-0 cursor-pointer"
                  />

                  {/* Nombre + código */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => togglePlantilla(p.id)}>
                    <div className="flex items-center gap-2">
                      {p.codigo && (
                        <span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          {p.codigo}
                        </span>
                      )}
                      <span className={`text-sm font-medium ${seleccionada ? 'text-roka-700' : 'text-gray-700'}`}>
                        {p.nombre}
                      </span>
                    </div>
                    {p.preguntas_count > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">{p.preguntas_count} preguntas</p>
                    )}
                  </div>

                  {/* Selector de frecuencia — solo cuando está seleccionada */}
                  {seleccionada ? (
                    <select
                      value={frecActual}
                      onChange={e => setFrecuenciaPlantilla(p.id, e.target.value || null)}
                      onClick={e => e.stopPropagation()}
                      className="text-xs border border-roka-200 rounded-lg px-2 py-1 bg-white text-roka-700 focus:outline-none focus:ring-2 focus:ring-roka-400 flex-shrink-0">
                      <option value="">Sin frecuencia</option>
                      {FRECUENCIAS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-gray-300 flex-shrink-0 w-28 text-right">—</span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {form.plantillas.length > 0 && (
          <p className="text-xs text-emerald-600 mt-3 font-medium">
            ✓ {form.plantillas.length} plantilla{form.plantillas.length > 1 ? 's' : ''} asignada{form.plantillas.length > 1 ? 's' : ''}
            {form.plantillas.filter(p => !p.frecuencia_inspeccion).length > 0 && (
              <span className="text-amber-500 ml-2">
                · {form.plantillas.filter(p => !p.frecuencia_inspeccion).length} sin frecuencia (no se programarán automáticamente)
              </span>
            )}
          </p>
        )}
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
