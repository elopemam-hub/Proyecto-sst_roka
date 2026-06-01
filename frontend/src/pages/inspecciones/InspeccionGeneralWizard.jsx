import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ChevronRight, Check, AlertTriangle, Plus, Trash2,
  BookOpen, ClipboardCheck, PenLine, Loader2, CheckCircle2, X, Camera,
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

// ── Tipos de inspección ───────────────────────────────────────
const TIPOS = [
  { value: 'epps',           label: 'EPPs' },
  { value: 'higiene',        label: 'Higiene Industrial' },
  { value: 'orden_limpieza', label: 'Orden y Limpieza' },
  { value: 'general',        label: 'General' },
  { value: 'infraestructura',label: 'Infraestructura' },
  { value: 'emergencias',    label: 'Equipos de Emergencia' },
  { value: 'equipos',        label: 'Equipos y Maquinaria' },
  { value: 'taller',         label: 'Taller' },
  { value: 'almacen',        label: 'Almacén' },
  { value: 'oficinas',       label: 'Oficinas' },
]

// ── Plantillas de ítems por tipo ──────────────────────────────
const PLANTILLAS = {
  epps: [
    { categoria: 'Dotación',       descripcion: '¿El personal cuenta con todos los EPPs requeridos para su puesto?',  es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Estado',         descripcion: '¿Los EPPs están en buen estado (sin rotura ni desgaste excesivo)?',  es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Uso correcto',   descripcion: '¿El personal usa correctamente los EPPs durante la jornada?',        es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Almacenamiento', descripcion: '¿Los EPPs se almacenan correctamente cuando no se usan?',            es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Vigencia',       descripcion: '¿Los EPPs están dentro de su vida útil o fecha de vencimiento?',    es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Capacitación',   descripcion: '¿El personal ha sido capacitado en el uso correcto de EPPs?',       es_critico: false, puntaje_maximo: 1 },
  ],
  higiene: [
    { categoria: 'Servicios',      descripcion: '¿Los servicios higiénicos están limpios y operativos?',             es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Agua potable',   descripcion: '¿El personal tiene acceso a agua potable en el área de trabajo?',  es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Ruido',          descripcion: '¿Los niveles de ruido están dentro de los límites permisibles?',   es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Temperatura',    descripcion: '¿La temperatura del ambiente es adecuada para el trabajo?',        es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Res. peligrosos',descripcion: '¿Los residuos peligrosos se almacenan y eliminan correctamente?', es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Comedor',        descripcion: '¿Las áreas de comedor/descanso están limpias y habilitadas?',      es_critico: false, puntaje_maximo: 1 },
  ],
  orden_limpieza: [
    { categoria: 'Orden',          descripcion: '¿Las áreas de trabajo están ordenadas y libres de materiales innecesarios?', es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Orden',          descripcion: '¿Los pasillos y vías de tránsito están despejados?',               es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Limpieza',       descripcion: '¿Las superficies de trabajo están limpias y sin derrames?',        es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Residuos',       descripcion: '¿Los residuos se clasifican y depositan en contenedores adecuados?', es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Almacenamiento', descripcion: '¿Los materiales están almacenados de forma segura y etiquetada?', es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Iluminación',    descripcion: '¿La iluminación del área es adecuada para las tareas realizadas?',es_critico: false, puntaje_maximo: 1 },
  ],
  general: [
    { categoria: 'Seguridad',      descripcion: '¿El área cuenta con señalización de seguridad adecuada?',          es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Seguridad',      descripcion: '¿Los trabajadores usan sus EPPs básicos (casco, zapatos de seguridad)?', es_critico: true, puntaje_maximo: 2 },
    { categoria: 'Documentación',  descripcion: '¿El área tiene visible el reglamento interno de SST?',             es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Emergencias',    descripcion: '¿Existen extintores vigentes y accesibles en el área?',            es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Orden',          descripcion: '¿El área de trabajo se mantiene ordenada y limpia?',               es_critico: false, puntaje_maximo: 1 },
  ],
  infraestructura: [
    { categoria: 'Pisos',          descripcion: '¿Los pisos están en buen estado, sin grietas ni superficies resbaladizas?', es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Techos/Paredes', descripcion: '¿Techos y paredes no presentan daños estructurales ni filtraciones?',      es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Escaleras',      descripcion: '¿Las escaleras tienen pasamanos y antideslizantes en buen estado?',        es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Eléctrico',      descripcion: '¿Los tableros eléctricos están cerrados, señalizados y sin cables sueltos?', es_critico: true, puntaje_maximo: 2 },
    { categoria: 'Ventilación',    descripcion: '¿La ventilación del área es adecuada para la actividad que se realiza?',   es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Señalización',   descripcion: '¿La señalización de seguridad está visible, actualizada y en buen estado?', es_critico: false, puntaje_maximo: 1 },
  ],
  emergencias: [
    { categoria: 'Extintores',     descripcion: '¿Los extintores están en sus ubicaciones señalizadas?',            es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Extintores',     descripcion: '¿Los extintores tienen vigente su fecha de recarga?',              es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Señalización',   descripcion: '¿Las vías de evacuación están correctamente señalizadas?',         es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Señalización',   descripcion: '¿Las salidas de emergencia están libres de obstáculos?',           es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Botiquín',       descripcion: '¿El botiquín de primeros auxilios está completo y accesible?',     es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Brigada',        descripcion: '¿El personal conoce el plan de emergencia y punto de reunión?',   es_critico: false, puntaje_maximo: 1 },
  ],
  equipos: [
    { categoria: 'Estado general', descripcion: '¿El equipo está operativo y sin daños visibles?',                  es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Estado general', descripcion: '¿El equipo tiene sus guardas de seguridad instaladas?',            es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Mantenimiento',  descripcion: '¿El equipo cuenta con registro de mantenimiento al día?',          es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Mantenimiento',  descripcion: '¿El equipo tiene su tarjeta de inspección visible?',               es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Operación',      descripcion: '¿El operador cuenta con EPPs adecuados para el equipo?',           es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Operación',      descripcion: '¿El operador conoce el procedimiento de operación segura?',        es_critico: false, puntaje_maximo: 1 },
  ],
  taller: [
    { categoria: 'Orden y limpieza',  descripcion: '¿El taller está limpio y libre de residuos o materiales innecesarios?',     es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Orden y limpieza',  descripcion: '¿Las herramientas están organizadas y en su lugar asignado?',               es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Maquinaria',        descripcion: '¿Las máquinas tienen sus guardas de seguridad instaladas y en buen estado?', es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Maquinaria',        descripcion: '¿Las máquinas cuentan con parada de emergencia operativa?',                 es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'EPPs',              descripcion: '¿El personal del taller usa los EPPs requeridos (gafas, guantes, casco)?',  es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Eléctrico',         descripcion: '¿Los tableros eléctricos están cerrados y sin cables sueltos?',             es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Emergencias',       descripcion: '¿Hay extintores vigentes y accesibles en el taller?',                      es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Señalización',      descripcion: '¿Las zonas de peligro y vías de evacuación están señalizadas?',            es_critico: false, puntaje_maximo: 1 },
  ],
  almacen: [
    { categoria: 'Apilamiento',       descripcion: '¿Los materiales están apilados de forma segura y estable?',                es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Apilamiento',       descripcion: '¿Se respetan las alturas máximas de apilamiento establecidas?',            es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Orden',             descripcion: '¿Los pasillos del almacén están libres de obstáculos?',                    es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Orden',             descripcion: '¿Los productos están correctamente etiquetados e identificados?',          es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Sustancias pelig.', descripcion: '¿Las sustancias peligrosas están almacenadas con su hoja de seguridad?',   es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'EPPs',              descripcion: '¿El personal usa EPPs adecuados para la manipulación de cargas?',          es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Emergencias',       descripcion: '¿Hay extintores vigentes y accesibles en el almacén?',                    es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Señalización',      descripcion: '¿Las salidas de emergencia y zonas de riesgo están señalizadas?',         es_critico: false, puntaje_maximo: 1 },
  ],
  oficinas: [
    { categoria: 'Ergonomía',         descripcion: '¿Los puestos de trabajo tienen sillas y monitores a altura adecuada?',     es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Ergonomía',         descripcion: '¿La iluminación es suficiente y no genera reflejos en pantallas?',        es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Orden y limpieza',  descripcion: '¿Los escritorios y áreas comunes están ordenados y limpios?',             es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Eléctrico',         descripcion: '¿Los cables eléctricos están ordenados y sin riesgo de tropiezo?',        es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Eléctrico',         descripcion: '¿Los tomacorrientes no están sobrecargados con múltiples regletas?',      es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Emergencias',       descripcion: '¿Hay extintores vigentes y accesibles en el área de oficinas?',          es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Emergencias',       descripcion: '¿Las vías de evacuación están despejadas y señalizadas?',                es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Bienestar',         descripcion: '¿Los servicios higiénicos están limpios y operativos?',                  es_critico: false, puntaje_maximo: 1 },
  ],
}

const itemVacio = () => ({
  categoria: '', descripcion: '', es_critico: false, puntaje_maximo: 1, _id: Date.now() + Math.random(),
})

const inputCls = 'w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500'

// ── Componente canvas firma ───────────────────────────────────
function FirmaCanvas({ label, onFirmar, firmado }) {
  const canvasRef = useRef(null)
  const drawing   = useRef(false)

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const src  = e.touches ? e.touches[0] : e
    return { x: src.clientX - rect.left, y: src.clientY - rect.top }
  }
  const start = (e) => {
    drawing.current = true
    const c = canvasRef.current
    const ctx = c.getContext('2d')
    const pos = getPos(e, c)
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y)
    e.preventDefault()
  }
  const draw = (e) => {
    if (!drawing.current) return
    const c = canvasRef.current
    const ctx = c.getContext('2d')
    const pos = getPos(e, c)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2; ctx.lineCap = 'round'
    ctx.stroke(); e.preventDefault()
  }
  const stop = () => { drawing.current = false }
  const limpiar = () => canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  const guardar = () => onFirmar(canvasRef.current.toDataURL('image/png'))

  if (firmado) return (
    <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
      <CheckCircle2 size={18} className="text-emerald-600" />
      <span className="text-sm text-emerald-700 font-medium">{label} — firmado</span>
    </div>
  )

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <canvas ref={canvasRef} width={380} height={120}
        className="border-2 border-dashed border-gray-300 rounded-lg bg-white cursor-crosshair w-full"
        onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
        onTouchStart={start} onTouchMove={draw} onTouchEnd={stop}
      />
      <div className="flex gap-2">
        <button onClick={limpiar} className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Limpiar</button>
        <button onClick={guardar} className="text-xs px-3 py-1.5 bg-roka-500 hover:bg-roka-600 text-white rounded-lg font-medium">Guardar firma</button>
      </div>
    </div>
  )
}

// ── Ítem de respuesta en el paso 2 ────────────────────────────
function ItemRespuesta({ item, respuesta, onChange }) {
  const fileRef = useRef(null)
  const [nota, setNota]       = useState(respuesta?.observaciones || '')
  const [showNota, setShowNota] = useState(false)
  const [foto, setFoto]       = useState(null)

  const resultado = respuesta?.resultado || null

  const handleFoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFoto(URL.createObjectURL(file))
    const reader = new FileReader()
    reader.onload = (ev) => onChange(item.id, resultado, nota, ev.target.result)
    reader.readAsDataURL(file)
  }

  const setRes = (r) => onChange(item.id, r, nota, respuesta?.foto)

  const btnCls = (r) => {
    const activo = resultado === r
    const colors = {
      conforme:    activo ? 'bg-emerald-500 text-white border-emerald-500' : 'border-gray-300 text-gray-600 hover:bg-emerald-50',
      no_conforme: activo ? 'bg-red-500 text-white border-red-500'         : 'border-gray-300 text-gray-600 hover:bg-red-50',
      observacion: activo ? 'bg-amber-400 text-white border-amber-400'     : 'border-gray-300 text-gray-600 hover:bg-amber-50',
      no_aplica:   activo ? 'bg-gray-400 text-white border-gray-400'       : 'border-gray-300 text-gray-500 hover:bg-gray-50',
    }
    return `px-3 py-1.5 text-xs font-semibold border rounded-lg transition-colors ${colors[r]}`
  }

  return (
    <div className={`p-4 rounded-xl border ${resultado === 'no_conforme' ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start gap-3">
        <span className="text-xs text-gray-400 font-mono mt-0.5 min-w-[24px]">{item.numero_item}.</span>
        <div className="flex-1 space-y-3">
          {item.categoria && (
            <span className="inline-block text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{item.categoria}</span>
          )}
          <p className="text-sm text-gray-800 leading-snug">
            {item.descripcion}
            {item.es_critico && <span className="ml-1.5 text-xs text-amber-600 font-medium">crítico</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setRes('conforme')}    className={btnCls('conforme')}>Conforme</button>
            <button onClick={() => setRes('no_conforme')} className={btnCls('no_conforme')}>No conforme</button>
            <button onClick={() => setRes('observacion')} className={btnCls('observacion')}>Observación</button>
            <button onClick={() => setRes('no_aplica')}   className={btnCls('no_aplica')}>N/A</button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowNota(!showNota)}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <PenLine size={12} /> {showNota ? 'Ocultar nota' : 'Agregar nota'}
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <Camera size={12} /> Foto
            </button>
            {foto && (
              <div className="relative">
                <img src={foto} alt="evidencia" className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                <button onClick={() => { setFoto(null); onChange(item.id, resultado, nota, null) }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center">
                  <X size={10} />
                </button>
              </div>
            )}
          </div>
          {showNota && (
            <textarea rows={2} value={nota}
              onChange={(e) => { setNota(e.target.value); onChange(item.id, resultado, e.target.value, respuesta?.foto) }}
              placeholder="Observación o nota adicional..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-400"
            />
          )}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
    </div>
  )
}

// ── Wizard principal ──────────────────────────────────────────
export default function InspeccionGeneralWizard() {
  const navigate = useNavigate()

  const [paso, setPaso]         = useState(1)
  const [saving, setSaving]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [inspeccion, setInspeccion] = useState(null)
  const [firmasDone, setFirmasDone] = useState({ inspector: false, responsable_area: false })

  // Datos paso 1
  const [sedes, setSedes]       = useState([])
  const [areas, setAreas]       = useState([])
  const [personal, setPersonal] = useState([])
  const [form, setForm]         = useState({
    tipo: 'general', titulo: '', descripcion: '',
    sede_id: '', area_id: '', inspector_id: '', supervisor_id: '',
    planificada_para: format(new Date(), 'yyyy-MM-dd'),
  })
  const [items, setItems]       = useState([itemVacio()])

  // Respuestas paso 2: { item_id: { resultado, observaciones, foto } }
  const [respuestas, setRespuestas] = useState({})

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/sedes'),
      api.get('/personal', { params: { per_page: 200 } }),
    ]).then(([rSedes, rPersonal]) => {
      setSedes(rSedes.data.data || rSedes.data)
      setPersonal(rPersonal.data.data || rPersonal.data)
    }).catch(() => toast.error('Error al cargar datos')).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!form.sede_id) return
    api.get('/areas', { params: { sede_id: form.sede_id } })
      .then(r => setAreas(r.data.data || r.data))
      .catch(() => {})
  }, [form.sede_id])

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const cargarPlantilla = () => {
    const plantilla = PLANTILLAS[form.tipo]
    if (!plantilla) return
    const tieneContenido = items.some(i => i.descripcion.trim())
    if (tieneContenido && !confirm(`¿Reemplazar ítems actuales con la plantilla de ${TIPOS.find(t => t.value === form.tipo)?.label}?`)) return
    setItems(plantilla.map(p => ({ ...p, _id: Date.now() + Math.random() })))
    toast.success('Plantilla cargada')
  }

  const addItem    = () => setItems(p => [...p, itemVacio()])
  const removeItem = (idx) => setItems(p => p.filter((_, i) => i !== idx))
  const updateItem = (idx, field, value) =>
    setItems(p => p.map((item, i) => i === idx ? { ...item, [field]: value } : item))

  // Paso 1 → Crear inspección
  const crearInspeccion = async () => {
    if (!form.sede_id || !form.area_id || !form.inspector_id || !form.titulo.trim()) {
      toast.error('Completa sede, área, inspector y título')
      return
    }
    const itemsValidos = items.filter(i => i.descripcion.trim())
    if (itemsValidos.length === 0) {
      toast.error('Agrega al menos un ítem al checklist')
      return
    }
    setSaving(true)
    try {
      const { data } = await api.post('/inspecciones', {
        ...form,
        items: itemsValidos.map(({ categoria, descripcion, es_critico, puntaje_maximo }) => ({
          categoria, descripcion, es_critico, puntaje_maximo,
        })),
      })
      setInspeccion(data)
      setPaso(2)
      toast.success(`Inspección ${data.codigo} creada`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al crear la inspección')
    } finally { setSaving(false) }
  }

  const handleRespuesta = useCallback((itemId, resultado, observaciones, foto) => {
    setRespuestas(prev => ({ ...prev, [itemId]: { resultado, observaciones, foto } }))
  }, [])

  // Paso 2 → Guardar respuestas (ejecutar)
  const guardarRespuestas = async () => {
    const itemsInsp = inspeccion.items || []
    const payload = itemsInsp.map(item => {
      const r = respuestas[item.id] || {}
      return {
        id:               item.id,
        aplica:           r.resultado !== 'no_aplica',
        resultado:        r.resultado || 'no_aplica',
        puntaje_obtenido: r.resultado === 'conforme' ? item.puntaje_maximo : 0,
        observaciones:    r.observaciones || null,
      }
    })
    setSaving(true)
    try {
      const { data } = await api.post(`/inspecciones/${inspeccion.id}/ejecutar`, { items: payload })
      setInspeccion(data)
      setPaso(3)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar respuestas')
    } finally { setSaving(false) }
  }

  const firmar = async (rol, base64, nombre) => {
    try {
      await api.post(`/inspecciones/${inspeccion.id}/checklist/firmas`, {
        rol_firma: rol, firma_base64: base64, nombre_firmante: nombre || null,
      })
      setFirmasDone(prev => ({ ...prev, [rol]: true }))
      toast.success('Firma registrada')
    } catch { toast.error('Error al registrar firma') }
  }

  const finalizar = async () => {
    setSaving(true)
    try {
      await api.post(`/inspecciones/${inspeccion.id}/cerrar`)
      toast.success('Inspección finalizada')
      navigate(`/inspecciones/${inspeccion.id}`)
    } catch {
      navigate(`/inspecciones/${inspeccion.id}`)
    } finally { setSaving(false) }
  }

  // Métricas en vivo (paso 2)
  const itemsInsp       = inspeccion?.items || []
  const totalItems      = itemsInsp.length
  const respondidos     = Object.keys(respuestas).filter(id => respuestas[id]?.resultado).length
  const conformes       = Object.values(respuestas).filter(r => r.resultado === 'conforme').length
  const noConformes     = Object.values(respuestas).filter(r => r.resultado === 'no_conforme').length
  const pct             = totalItems > 0 ? Math.round(conformes / totalItems * 100) : 0
  const pctColor        = pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-400' : 'bg-red-400'
  const pctText         = pct >= 90 ? 'text-emerald-700' : pct >= 70 ? 'text-amber-700' : 'text-red-600'

  const PASOS_LABELS = ['', 'Configurar', 'Responder', 'Firmar']

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <Loader2 size={28} className="animate-spin mr-3" /> Cargando...
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header + stepper */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => paso === 1 ? navigate('/inspecciones/nueva') : setPaso(p => p - 1)}
            className="btn-back">
            <ArrowLeft size={14} /> {paso === 1 ? 'Volver' : 'Paso anterior'}
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Nueva inspección general</h1>
        </div>
        <div className="flex items-center gap-2 mt-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                paso > n  ? 'bg-emerald-500 text-white' :
                paso === n ? 'bg-roka-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {paso > n ? <Check size={13} /> : n}
              </div>
              {n < 3 && <div className={`h-0.5 w-8 ${paso > n ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
          <span className="ml-2 text-xs text-gray-500">{PASOS_LABELS[paso]}</span>
        </div>
      </div>

      {/* ══ PASO 1: Configurar ══════════════════════════════════ */}
      {paso === 1 && (
        <div className="space-y-5">
          {/* Datos generales */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Datos de la inspección</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipo *</label>
                <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className={inputCls}>
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fecha *</label>
                <input type="date" value={form.planificada_para} onChange={e => set('planificada_para', e.target.value)} className={inputCls} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Título *</label>
                <input type="text" value={form.titulo} onChange={e => set('titulo', e.target.value)}
                  placeholder="Ej: Inspección de EPPs área de almacén" className={inputCls} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Descripción / Alcance</label>
                <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                  rows={2} placeholder="Descripción del alcance de la inspección..."
                  className={inputCls + ' resize-none'} />
              </div>
            </div>
          </div>

          {/* Ubicación y responsables */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Ubicación y responsables</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Sede *</label>
                <select value={form.sede_id} onChange={e => { set('sede_id', e.target.value); set('area_id', '') }} className={inputCls}>
                  <option value="">Seleccionar sede...</option>
                  {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Área *</label>
                <select value={form.area_id} onChange={e => set('area_id', e.target.value)}
                  disabled={!form.sede_id} className={inputCls + (!form.sede_id ? ' opacity-50' : '')}>
                  <option value="">Seleccionar área...</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Inspector *</label>
                <select value={form.inspector_id} onChange={e => set('inspector_id', e.target.value)} className={inputCls}>
                  <option value="">Seleccionar inspector...</option>
                  {personal.map(p => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Supervisor</label>
                <select value={form.supervisor_id} onChange={e => set('supervisor_id', e.target.value)} className={inputCls}>
                  <option value="">Sin supervisor asignado</option>
                  {personal.map(p => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Ítems del checklist */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Ítems del checklist ({items.filter(i => i.descripcion.trim()).length})
              </h2>
              <div className="flex gap-2">
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
                    <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-1">
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
                    <label className="block text-xs text-gray-500 mb-1">Pregunta / Descripción *</label>
                    <input type="text" value={item.descripcion}
                      onChange={e => updateItem(idx, 'descripcion', e.target.value)}
                      placeholder="Ej: ¿Los extintores están vigentes y accesibles?"
                      className="w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-xs text-gray-500">
                    <input type="checkbox" checked={item.es_critico}
                      onChange={e => updateItem(idx, 'es_critico', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300" />
                    Ítem crítico
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Puntaje máx:</label>
                    <input type="number" min={1} max={10} value={item.puntaje_maximo}
                      onChange={e => updateItem(idx, 'puntaje_maximo', Number(e.target.value))}
                      className="w-16 border border-gray-300 text-gray-700 rounded px-2 py-1 text-sm text-center" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button onClick={crearInspeccion} disabled={saving}
              className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-5 py-2.5 rounded-xl font-medium disabled:opacity-40 transition-colors">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
              Crear e iniciar inspección
            </button>
          </div>
        </div>
      )}

      {/* ══ PASO 2: Responder ítems ════════════════════════════ */}
      {paso === 2 && inspeccion && (
        <div className="space-y-4">
          {/* Barra de progreso */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-semibold text-gray-800">{inspeccion.titulo}</p>
                <p className="text-xs text-gray-500">{respondidos} / {totalItems} respondidos</p>
              </div>
              <span className={`text-2xl font-black ${pctText}`}>{pct}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full transition-all ${pctColor}`} style={{ width: `${pct}%` }} />
            </div>
            {noConformes > 0 && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
                <AlertTriangle size={13} />
                {noConformes} ítem{noConformes > 1 ? 's' : ''} no conforme{noConformes > 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Lista de ítems */}
          <div className="space-y-3">
            {itemsInsp.map(item => (
              <ItemRespuesta
                key={item.id}
                item={item}
                respuesta={respuestas[item.id]}
                onChange={handleRespuesta}
              />
            ))}
          </div>

          <div className="flex justify-between pt-2">
            <button onClick={() => setPaso(1)} className="btn-back">
              <ArrowLeft size={14} /> Editar configuración
            </button>
            <button onClick={guardarRespuestas} disabled={saving}
              className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-5 py-2.5 rounded-xl font-medium disabled:opacity-40">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
              Guardar y firmar
            </button>
          </div>
        </div>
      )}

      {/* ══ PASO 3: Resumen + Firmas ════════════════════════════ */}
      {paso === 3 && inspeccion && (
        <div className="space-y-5">
          {/* Resumen */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <ClipboardCheck size={18} className="text-roka-500" /> Resumen de inspección
            </h3>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Conformes',    val: inspeccion.items_conformes ?? conformes,  color: 'text-emerald-600' },
                { label: 'No conformes', val: inspeccion.items_nc ?? noConformes,        color: 'text-red-500' },
                { label: 'Observ.',      val: inspeccion.items_obs ?? Object.values(respuestas).filter(r => r.resultado === 'observacion').length, color: 'text-amber-600' },
                { label: '% Cumplim.',   val: `${inspeccion.porcentaje_cumplimiento ?? pct}%`, color: pctText },
              ].map(({ label, val, color }) => (
                <div key={label} className="text-center">
                  <p className={`text-2xl font-black ${color}`}>{val}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>
            {noConformes > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ítems no conformes</p>
                {itemsInsp.filter(i => respuestas[i.id]?.resultado === 'no_conforme').map(i => (
                  <div key={i.id} className="flex items-start gap-2 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    {i.descripcion}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Firmas */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <PenLine size={18} className="text-roka-500" /> Firmas digitales
            </h3>
            <FirmaCanvas label="Inspector SST" firmado={firmasDone.inspector}
              onFirmar={(b64) => firmar('inspector', b64, 'Inspector SST')} />
            <FirmaCanvas label="Responsable de Área" firmado={firmasDone.responsable_area}
              onFirmar={(b64) => firmar('responsable_area', b64, 'Responsable de Área')} />
          </div>

          <div className="flex justify-between">
            <button onClick={() => setPaso(2)} className="btn-back">
              <ArrowLeft size={14} /> Volver al checklist
            </button>
            <div className="flex gap-3">
              <button onClick={() => navigate('/inspecciones/nueva/general')}
                className="flex items-center gap-2 border border-roka-300 text-roka-600 hover:bg-roka-50 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
                + Nueva inspección
              </button>
              <button onClick={finalizar} disabled={saving || (!firmasDone.inspector && !firmasDone.responsable_area)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium disabled:opacity-40">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Finalizar inspección
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
