import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, AlertCircle, BookOpen, ClipboardList, FileText } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const TIPOS = [
  { value: 'equipos',          label: 'Equipos y Maquinaria' },
  { value: 'infraestructura',  label: 'Infraestructura' },
  { value: 'emergencias',      label: 'Equipos de Emergencia' },
  { value: 'epps',             label: 'EPPs' },
  { value: 'orden_limpieza',   label: 'Orden y Limpieza' },
  { value: 'higiene',          label: 'Higiene Industrial' },
  { value: 'general',          label: 'General' },
]

const PLANTILLAS = {
  equipos: [
    { categoria: 'Estado general',  descripcion: '¿El equipo está operativo y sin daños visibles?',                    es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Estado general',  descripcion: '¿El equipo tiene sus guardas de seguridad instaladas?',              es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Mantenimiento',   descripcion: '¿El equipo cuenta con registro de mantenimiento al día?',            es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Mantenimiento',   descripcion: '¿El equipo tiene su tarjeta de inspección visible?',                 es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Operación',       descripcion: '¿El operador cuenta con EPPs adecuados para el equipo?',             es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Operación',       descripcion: '¿El operador conoce el procedimiento de operación segura?',          es_critico: false, puntaje_maximo: 1 },
  ],
  epps: [
    { categoria: 'Dotación',        descripcion: '¿El personal cuenta con todos los EPPs requeridos para su puesto?',  es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Estado',          descripcion: '¿Los EPPs están en buen estado (sin rotura ni desgaste excesivo)?',  es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Uso correcto',    descripcion: '¿El personal usa correctamente los EPPs durante la jornada?',        es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Almacenamiento',  descripcion: '¿Los EPPs se almacenan correctamente cuando no se usan?',            es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Vigencia',        descripcion: '¿Los EPPs están dentro de su vida útil o fecha de vencimiento?',    es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Capacitación',    descripcion: '¿El personal ha sido capacitado en el uso correcto de EPPs?',        es_critico: false, puntaje_maximo: 1 },
  ],
  emergencias: [
    { categoria: 'Extintores',      descripcion: '¿Los extintores están en sus ubicaciones señalizadas?',              es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Extintores',      descripcion: '¿Los extintores tienen vigente su fecha de recarga?',                es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Señalización',    descripcion: '¿Las vías de evacuación están correctamente señalizadas?',           es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Señalización',    descripcion: '¿Las salidas de emergencia están libres de obstáculos?',             es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Botiquín',        descripcion: '¿El botiquín de primeros auxilios está completo y accesible?',       es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Brigada',         descripcion: '¿El personal conoce el plan de emergencia y punto de reunión?',      es_critico: false, puntaje_maximo: 1 },
  ],
  orden_limpieza: [
    { categoria: 'Orden',           descripcion: '¿Las áreas de trabajo están ordenadas y libres de materiales innecesarios?', es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Orden',           descripcion: '¿Los pasillos y vías de tránsito están despejados?',                es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Limpieza',        descripcion: '¿Las superficies de trabajo están limpias y sin derrames?',         es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Residuos',        descripcion: '¿Los residuos se clasifican y depositan en contenedores adecuados?', es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Almacenamiento',  descripcion: '¿Los materiales están almacenados de forma segura y etiquetada?',   es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Iluminación',     descripcion: '¿La iluminación del área es adecuada para las tareas realizadas?',  es_critico: false, puntaje_maximo: 1 },
  ],
  infraestructura: [
    { categoria: 'Pisos',           descripcion: '¿Los pisos están en buen estado, sin grietas ni superficies resbaladizas?', es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Techos/Paredes',  descripcion: '¿Techos y paredes no presentan daños estructurales ni filtraciones?',      es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Escaleras',       descripcion: '¿Las escaleras tienen pasamanos y antideslizantes en buen estado?',        es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Eléctrico',       descripcion: '¿Los tableros eléctricos están cerrados, señalizados y sin cables sueltos?', es_critico: true, puntaje_maximo: 2 },
    { categoria: 'Ventilación',     descripcion: '¿La ventilación del área es adecuada para la actividad que se realiza?',   es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Señalización',    descripcion: '¿La señalización de seguridad está visible, actualizada y en buen estado?', es_critico: false, puntaje_maximo: 1 },
  ],
  higiene: [
    { categoria: 'Servicios',       descripcion: '¿Los servicios higiénicos están limpios y operativos?',               es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Agua potable',    descripcion: '¿El personal tiene acceso a agua potable en el área de trabajo?',     es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Ruido',           descripcion: '¿Los niveles de ruido están dentro de los límites permisibles?',      es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Temperatura',     descripcion: '¿La temperatura del ambiente es adecuada para el trabajo?',           es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Res. peligrosos', descripcion: '¿Los residuos peligrosos se almacenan y eliminan correctamente?',     es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Comedor',         descripcion: '¿Las áreas de comedor/descanso están limpias y habilitadas?',         es_critico: false, puntaje_maximo: 1 },
  ],
  general: [
    { categoria: 'Seguridad',       descripcion: '¿El área cuenta con señalización de seguridad adecuada?',             es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Seguridad',       descripcion: '¿Los trabajadores usan sus EPPs básicos (casco, zapatos de seguridad)?', es_critico: true, puntaje_maximo: 2 },
    { categoria: 'Documentación',   descripcion: '¿El área tiene visible el reglamento interno de SST?',                es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Emergencias',     descripcion: '¿Existen extintores vigentes y accesibles en el área?',               es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Orden',           descripcion: '¿El área de trabajo se mantiene ordenada y limpia?',                  es_critico: false, puntaje_maximo: 1 },
  ],
}

const itemVacio = () => ({
  categoria: '', descripcion: '', es_critico: false, puntaje_maximo: 1, _id: Date.now() + Math.random(),
})

const inputCls = 'w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500'
const labelCls = 'block text-xs text-gray-500 mb-1'

export default function InspeccionFormPage() {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const esEdicion = Boolean(id)

  // Selector de modo sólo en creación
  if (!esEdicion) {
    return <SelectorModo navigate={navigate} />
  }

  return <FormularioGeneral navigate={navigate} id={id} esEdicion={esEdicion} />
}

function SelectorModo({ navigate }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <button onClick={() => navigate('/inspecciones')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={14} /> Volver
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Nueva inspección</h1>
        <p className="text-gray-500 text-sm mt-1">Selecciona el tipo de inspección a realizar</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/inspecciones/checklist/nueva')}
          className="group p-6 rounded-2xl border-2 border-roka-200 bg-roka-50 hover:border-roka-400 hover:shadow-md text-left transition-all"
        >
          <div className="w-12 h-12 bg-roka-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <ClipboardList size={22} className="text-white" />
          </div>
          <h3 className="font-semibold text-gray-900 text-lg">Por catálogo</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Checklist dinámico con 38 equipos y 150+ preguntas predefinidas. Sub-módulos A·B·C.
          </p>
          <div className="flex flex-wrap gap-1 mt-3">
            {['Equipos','Infraestructura','Emergencia'].map(t => (
              <span key={t} className="text-xs bg-roka-100 text-roka-700 px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        </button>

        <button
          onClick={() => navigate('/inspecciones/nueva/general')}
          className="group p-6 rounded-2xl border-2 border-gray-200 bg-white hover:border-gray-300 hover:shadow-md text-left transition-all"
        >
          <div className="w-12 h-12 bg-gray-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <FileText size={22} className="text-white" />
          </div>
          <h3 className="font-semibold text-gray-900 text-lg">Inspección general</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Formulario libre con ítems personalizables. Útil para inspecciones no incluidas en el catálogo.
          </p>
          <div className="flex flex-wrap gap-1 mt-3">
            {['EPPs','Higiene','Orden/Limpieza','General'].map(t => (
              <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        </button>
      </div>
    </div>
  )
}

function FormularioGeneral({ navigate, id, esEdicion }) {

  const [form, setForm]       = useState({
    tipo: 'general', titulo: '', descripcion: '', planificada_para: '',
    sede_id: '', area_id: '', inspector_id: '', supervisor_id: '',
    requiere_firma: false,
  })
  const [items, setItems]     = useState([itemVacio()])
  const [sedes, setSedes]     = useState([])
  const [areas, setAreas]     = useState([])
  const [personal, setPersonal] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    const cargarMaestros = async () => {
      setLoading(true)
      try {
        const [rSedes, rPersonal] = await Promise.all([
          api.get('/sedes'),
          api.get('/personal', { params: { per_page: 200 } }),
        ])
        setSedes(rSedes.data.data || rSedes.data)
        setPersonal(rPersonal.data.data || rPersonal.data)
      } catch { toast.error('Error al cargar datos maestros') } finally { setLoading(false) }
    }
    cargarMaestros()
  }, [])

  useEffect(() => {
    if (form.sede_id) {
      api.get('/areas', { params: { sede_id: form.sede_id } })
        .then(r => setAreas(r.data.data || r.data))
        .catch(() => {})
    }
  }, [form.sede_id])

  useEffect(() => {
    if (esEdicion) {
      api.get(`/inspecciones/${id}`).then(({ data }) => {
        setForm({
          tipo: data.tipo, titulo: data.titulo, descripcion: data.descripcion || '',
          planificada_para: data.planificada_para || '', sede_id: data.sede_id,
          area_id: data.area_id, inspector_id: data.inspector_id,
          supervisor_id: data.supervisor_id || '', requiere_firma: data.requiere_firma,
        })
        if (data.items?.length) setItems(data.items.map(i => ({ ...i, _id: i.id })))
      }).catch(() => toast.error('Error al cargar inspección'))
    }
  }, [id])

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const addItem = () => setItems(prev => [...prev, itemVacio()])
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))
  const updateItem = (idx, field, value) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))

  const cargarPlantilla = () => {
    const plantilla = PLANTILLAS[form.tipo]
    if (!plantilla) return
    const tieneContenido = items.some(i => i.descripcion.trim())
    if (tieneContenido) {
      if (!confirm('¿Reemplazar los ítems actuales con la plantilla para ' + (TIPOS.find(t => t.value === form.tipo)?.label || form.tipo) + '?')) return
    }
    setItems(plantilla.map(p => ({ ...p, _id: Date.now() + Math.random() })))
    toast.success(`Plantilla "${TIPOS.find(t => t.value === form.tipo)?.label}" cargada`)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.sede_id || !form.area_id || !form.inspector_id) {
      toast.error('Sede, área e inspector son obligatorios')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, items: items.filter(i => i.descripcion.trim()) }
      if (esEdicion) {
        await api.put(`/inspecciones/${id}`, payload)
        toast.success('Inspección actualizada')
        navigate(`/inspecciones/${id}`)
      } else {
        const { data } = await api.post('/inspecciones', payload)
        toast.success(`Inspección ${data.codigo} creada`)
        navigate(`/inspecciones/${data.id}`)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{esEdicion ? 'Editar Inspección' : 'Nueva Inspección'}</h1>
          <p className="text-sm text-gray-500">Ley 29783 Art. 32 · RM-050-2013-TR</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos generales */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Datos Generales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tipo de inspección *</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className={inputCls}>
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Fecha planificada *</label>
              <input type="date" value={form.planificada_para} onChange={e => set('planificada_para', e.target.value)}
                className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Título *</label>
              <input type="text" value={form.titulo} onChange={e => set('titulo', e.target.value)}
                placeholder="Ej: Inspección de EPPs área de almacén"
                className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Descripción / Alcance</label>
              <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                rows={2} placeholder="Descripción del alcance de la inspección..."
                className={inputCls + ' resize-none'} />
            </div>
          </div>
        </div>

        {/* Ubicación y responsables */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Ubicación y Responsables</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Sede *</label>
              <select value={form.sede_id} onChange={e => set('sede_id', e.target.value)} className={inputCls}>
                <option value="">Seleccionar sede...</option>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Área *</label>
              <select value={form.area_id} onChange={e => set('area_id', e.target.value)}
                disabled={!form.sede_id} className={inputCls + (!form.sede_id ? ' opacity-50' : '')}>
                <option value="">Seleccionar área...</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Inspector *</label>
              <select value={form.inspector_id} onChange={e => set('inspector_id', e.target.value)} className={inputCls}>
                <option value="">Seleccionar inspector...</option>
                {personal.map(p => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Supervisor</label>
              <select value={form.supervisor_id} onChange={e => set('supervisor_id', e.target.value)} className={inputCls}>
                <option value="">Sin supervisor asignado</option>
                {personal.map(p => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="requiere_firma" checked={form.requiere_firma}
                onChange={e => set('requiere_firma', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300" />
              <label htmlFor="requiere_firma" className="text-sm text-gray-600">Requiere firma digital</label>
            </div>
          </div>
        </div>

        {/* Ítems / Checklist */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Ítems de Inspección ({items.length})
            </h2>
            <div className="flex items-center gap-2">
              {PLANTILLAS[form.tipo] && (
                <button type="button" onClick={cargarPlantilla}
                  className="flex items-center gap-1.5 text-xs text-roka-600 hover:text-roka-700 border border-roka-200 bg-roka-50 hover:bg-roka-100 px-3 py-1.5 rounded-lg transition-colors">
                  <BookOpen size={13} /> Cargar plantilla
                </button>
              )}
              <button type="button" onClick={addItem}
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                <Plus size={13} /> Agregar ítem
              </button>
            </div>
          </div>

          {items.map((item, idx) => (
            <div key={item._id} className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-mono">ÍTEM {idx + 1}</span>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)}
                    className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Categoría</label>
                  <input type="text" value={item.categoria}
                    onChange={e => updateItem(idx, 'categoria', e.target.value)}
                    placeholder="Ej: Condiciones generales"
                    className="w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Descripción / Pregunta *</label>
                  <input type="text" value={item.descripcion}
                    onChange={e => updateItem(idx, 'descripcion', e.target.value)}
                    placeholder="Ej: ¿Los extintores están vigentes y accesibles?"
                    className="w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={item.es_critico}
                    onChange={e => updateItem(idx, 'es_critico', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300" />
                  <label className="text-xs text-gray-500">Ítem crítico</label>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Puntaje máximo:</label>
                  <input type="number" min={1} max={10} value={item.puntaje_maximo}
                    onChange={e => updateItem(idx, 'puntaje_maximo', Number(e.target.value))}
                    className="w-16 border border-gray-300 text-gray-700 rounded px-2 py-1 text-sm text-center" />
                </div>
                {item.es_critico && (
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <AlertCircle size={12} /> Ítem crítico
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium">
            <Save size={16} />
            {saving ? 'Guardando...' : (esEdicion ? 'Actualizar' : 'Crear Inspección')}
          </button>
        </div>
      </form>
    </div>
  )
}
