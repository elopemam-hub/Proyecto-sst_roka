import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronRight, ChevronLeft, Check, Camera, X, AlertTriangle,
  ClipboardCheck, PenLine, Info, Loader2, CheckCircle2, ArrowLeft
} from 'lucide-react'
import api from '../../services/api'
import { format } from 'date-fns'

// ── Colores por sub-módulo ────────────────────────────────────
const SUBMOD_STYLE = {
  A: { bg: 'bg-blue-50',   border: 'border-blue-300',   text: 'text-blue-700',   dot: 'bg-blue-500'  },
  B: { bg: 'bg-teal-50',   border: 'border-teal-300',   text: 'text-teal-700',   dot: 'bg-teal-500'  },
  C: { bg: 'bg-red-50',    border: 'border-red-300',    text: 'text-red-700',    dot: 'bg-red-500'   },
}

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
    const c   = canvasRef.current
    const ctx = c.getContext('2d')
    const pos = getPos(e, c)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    e.preventDefault()
  }

  const draw = (e) => {
    if (!drawing.current) return
    const c   = canvasRef.current
    const ctx = c.getContext('2d')
    const pos = getPos(e, c)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth   = 2
    ctx.lineCap     = 'round'
    ctx.stroke()
    e.preventDefault()
  }

  const stop = () => { drawing.current = false }

  const limpiar = () => {
    const c = canvasRef.current
    c.getContext('2d').clearRect(0, 0, c.width, c.height)
  }

  const guardar = () => {
    const b64 = canvasRef.current.toDataURL('image/png')
    onFirmar(b64)
  }

  if (firmado) {
    return (
      <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <CheckCircle2 size={18} className="text-emerald-600" />
        <span className="text-sm text-emerald-700 font-medium">{label} — firmado</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <canvas
        ref={canvasRef}
        width={380} height={120}
        className="border-2 border-dashed border-gray-300 rounded-lg bg-white cursor-crosshair w-full"
        onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
        onTouchStart={start} onTouchMove={draw} onTouchEnd={stop}
      />
      <div className="flex gap-2">
        <button onClick={limpiar} className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
          Limpiar
        </button>
        <button onClick={guardar} className="text-xs px-3 py-1.5 bg-roka-500 hover:bg-roka-600 text-white rounded-lg font-medium">
          Guardar firma
        </button>
      </div>
    </div>
  )
}

// ── Pregunta individual ───────────────────────────────────────
function PreguntaItem({ pregunta, respuesta, onChange }) {
  const fileRef      = useRef(null)
  const [nota, setNota] = useState(respuesta?.nota || '')
  const [showNota, setShowNota] = useState(false)
  const [foto, setFoto]  = useState(null)

  const resultado = respuesta?.resultado || null

  const handleFoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setFoto(preview)
    const reader = new FileReader()
    reader.onload = (ev) => onChange(pregunta.id, resultado, nota, ev.target.result)
    reader.readAsDataURL(file)
  }

  const setRes = (r) => onChange(pregunta.id, r, nota, respuesta?.foto_base64)

  const btnCls = (r) => {
    const activo = resultado === r
    const colors = {
      C:  activo ? 'bg-emerald-500 text-white border-emerald-500' : 'border-gray-300 text-gray-600 hover:bg-emerald-50',
      N:  activo ? 'bg-red-500 text-white border-red-500'         : 'border-gray-300 text-gray-600 hover:bg-red-50',
      O:  activo ? 'bg-amber-400 text-white border-amber-400'     : 'border-gray-300 text-gray-600 hover:bg-amber-50',
      S:  activo ? 'bg-emerald-500 text-white border-emerald-500' : 'border-gray-300 text-gray-600 hover:bg-emerald-50',
      NA: activo ? 'bg-gray-400 text-white border-gray-400'       : 'border-gray-300 text-gray-500 hover:bg-gray-50',
    }
    return `px-3 py-1.5 text-xs font-semibold border rounded-lg transition-colors ${colors[r]}`
  }

  return (
    <div className={`p-4 rounded-xl border ${resultado === 'N' ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start gap-3">
        <span className="text-xs text-gray-400 font-mono mt-0.5 min-w-[24px]">{pregunta.orden}.</span>
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-gray-800 leading-snug">
              {pregunta.texto}
              {pregunta.es_obligatoria && <span className="text-red-500 ml-1">*</span>}
            </p>
            {pregunta.ayuda && (
              <button title={pregunta.ayuda} className="text-gray-400 hover:text-gray-600 shrink-0">
                <Info size={14} />
              </button>
            )}
          </div>

          {/* Botones de respuesta */}
          <div className="flex flex-wrap gap-2">
            {pregunta.tipo_respuesta === 'conf_nc_obs' && (
              <>
                <button onClick={() => setRes('C')} className={btnCls('C')}>Conforme</button>
                <button onClick={() => setRes('N')} className={btnCls('N')}>No conforme</button>
                <button onClick={() => setRes('O')} className={btnCls('O')}>Observación</button>
              </>
            )}
            {pregunta.tipo_respuesta === 'si_no_na' && (
              <>
                <button onClick={() => setRes('S')} className={btnCls('S')}>Sí</button>
                <button onClick={() => setRes('N')} className={btnCls('N')}>No</button>
                <button onClick={() => setRes('NA')} className={btnCls('NA')}>N/A</button>
              </>
            )}
            {pregunta.tipo_respuesta === 'numero' && (
              <input
                type="number"
                placeholder={pregunta.valor_limite || 'Valor numérico'}
                defaultValue={resultado || ''}
                onChange={(e) => onChange(pregunta.id, e.target.value, nota, respuesta?.foto_base64)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-roka-400"
              />
            )}
            {pregunta.tipo_respuesta === 'fecha' && (
              <input
                type="date"
                defaultValue={resultado || ''}
                onChange={(e) => onChange(pregunta.id, e.target.value, nota, respuesta?.foto_base64)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-roka-400"
              />
            )}
            {pregunta.tipo_respuesta === 'texto' && (
              <input
                type="text"
                placeholder="Respuesta libre..."
                defaultValue={resultado || ''}
                onChange={(e) => onChange(pregunta.id, e.target.value, nota, respuesta?.foto_base64)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-roka-400"
              />
            )}
          </div>

          {/* Acciones: nota + foto */}
          <div className="flex items-center gap-3">
            {pregunta.permite_nota && (
              <button
                onClick={() => setShowNota(!showNota)}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <PenLine size={12} /> {showNota ? 'Ocultar nota' : 'Agregar nota'}
              </button>
            )}
            {pregunta.permite_foto && (
              <button
                onClick={() => fileRef.current?.click()}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <Camera size={12} /> Foto
              </button>
            )}
            {foto && (
              <div className="relative">
                <img src={foto} alt="evidencia" className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                <button onClick={() => { setFoto(null); onChange(pregunta.id, resultado, nota, null) }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center">
                  <X size={10} />
                </button>
              </div>
            )}
          </div>

          {showNota && (
            <textarea
              rows={2}
              value={nota}
              onChange={(e) => { setNota(e.target.value); onChange(pregunta.id, resultado, e.target.value, respuesta?.foto_base64) }}
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
export default function InspeccionChecklistWizard() {
  const navigate    = useNavigate()
  const { id: inspId } = useParams()

  const [paso, setPaso]               = useState(inspId ? 3 : 1)
  const [submodulos, setSubmodulos]   = useState([])
  const [equipos, setEquipos]         = useState([])
  const [preguntas, setPreguntas]     = useState([])
  const [areas, setAreas]             = useState([])
  const [personal, setPersonal]       = useState([])
  const [loading, setLoading]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [inspeccion, setInspeccion]   = useState(null)
  const [firmasDone, setFirmasDone]   = useState({ inspector: false, responsable_area: false })

  // Selecciones
  const [submoduloSel, setSubmoduloSel] = useState(null)
  const [equipoSel, setEquipoSel]       = useState(null)
  const [busqEquipo, setBusqEquipo]     = useState('')
  const [areaId, setAreaId]             = useState('')
  const [inspectorId, setInspectorId]   = useState('')
  const [turno, setTurno]               = useState('mañana')
  const [fecha, setFecha]               = useState(format(new Date(), 'yyyy-MM-dd'))

  // Respuestas: { pregunta_id: { resultado, nota, foto_base64 } }
  const [respuestas, setRespuestas] = useState({})

  // Cargar sub-módulos al iniciar
  useEffect(() => {
    api.get('/checklist/submodulos').then(({ data }) => setSubmodulos(data)).catch(() => {})
    api.get('/areas').then(({ data }) => setAreas(data.data || data)).catch(() => {})
    api.get('/personal').then(({ data }) => setPersonal(data.data || data)).catch(() => {})
  }, [])

  // Si viene con ID, cargar inspección existente
  useEffect(() => {
    if (inspId) {
      setLoading(true)
      Promise.all([
        api.get(`/inspecciones/${inspId}`),
        api.get(`/inspecciones/${inspId}/checklist/respuestas`),
      ]).then(([{ data: insp }, { data: resps }]) => {
        setInspeccion(insp)
        if (insp.equipo_catalogo_id) {
          return api.get(`/checklist/preguntas/${insp.equipo_catalogo_id}?solo_activas=true`)
            .then(({ data }) => {
              setPreguntas(data)
              const mapa = {}
              resps.forEach(r => { mapa[r.pregunta_id] = { resultado: r.resultado, nota: r.nota } })
              setRespuestas(mapa)
            })
        }
      }).catch(() => {}).finally(() => setLoading(false))
    }
  }, [inspId])

  // Al seleccionar sub-módulo → cargar equipos
  useEffect(() => {
    if (!submoduloSel) return
    setLoading(true)
    api.get('/checklist/equipos', { params: { submodulo_id: submoduloSel.id } })
      .then(({ data }) => setEquipos(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [submoduloSel])

  // Al seleccionar equipo → cargar preguntas
  useEffect(() => {
    if (!equipoSel) return
    setLoading(true)
    api.get(`/checklist/preguntas/${equipoSel.id}?solo_activas=true`)
      .then(({ data }) => setPreguntas(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [equipoSel])

  const handleRespuesta = useCallback((preguntaId, resultado, nota, fotoBase64) => {
    setRespuestas(prev => ({
      ...prev,
      [preguntaId]: { resultado, nota, foto_base64: fotoBase64 },
    }))
  }, [])

  // Crear inspección (paso 2 → 3)
  const crearInspeccion = async () => {
    if (!equipoSel || !areaId) return
    setSaving(true)
    try {
      const body = {
        sede_id:            1,
        area_id:            areaId,
        tipo:               submoduloSel.codigo === 'A' ? 'equipos' : submoduloSel.codigo === 'B' ? 'infraestructura' : 'emergencias',
        titulo:             equipoSel.nombre,
        planificada_para:   fecha,
        equipo_catalogo_id: equipoSel.id,
        submodulo_id:       submoduloSel.id,
        turno,
      }
      if (inspectorId) body.inspector_id = inspectorId
      const { data } = await api.post('/inspecciones', body)
      setInspeccion(data)
      setPaso(3)
    } catch (err) {
      alert(err.response?.data?.message || 'Error al crear la inspección')
    } finally { setSaving(false) }
  }

  // Guardar respuestas (auto-save o al avanzar)
  const guardarRespuestas = async (inspId) => {
    const items = Object.entries(respuestas).map(([pregunta_id, r]) => ({
      pregunta_id: parseInt(pregunta_id),
      resultado:   r.resultado,
      nota:        r.nota || null,
      foto_base64: r.foto_base64 || null,
    })).filter(i => i.resultado !== null && i.resultado !== undefined)

    if (items.length === 0) return
    await api.post(`/inspecciones/${inspId}/checklist/respuestas`, { items })
  }

  // Avanzar de paso 3 → 4
  const avanzarAFirmas = async () => {
    if (!inspeccion) return
    setSaving(true)
    try {
      await guardarRespuestas(inspeccion.id)
      const fresh = await api.get(`/inspecciones/${inspeccion.id}`)
      setInspeccion(fresh.data)
      setPaso(4)
    } catch { alert('Error guardando respuestas') } finally { setSaving(false) }
  }

  // Firmar
  const firmar = async (rol, base64, nombre) => {
    await api.post(`/inspecciones/${inspeccion.id}/checklist/firmas`, {
      rol_firma: rol, firma_base64: base64, nombre_firmante: nombre || null,
    })
    setFirmasDone(prev => ({ ...prev, [rol]: true }))
  }

  // Generar acciones NC y finalizar
  const finalizar = async () => {
    setSaving(true)
    try {
      if (inspeccion.items_nc > 0) {
        await api.post(`/inspecciones/${inspeccion.id}/checklist/generar-acciones-nc`)
      }
      navigate(`/inspecciones/${inspeccion.id}`)
    } catch { } finally { setSaving(false) }
  }

  // ── Métricas live ─────────────────────────────────────────
  const totalPuntuables = preguntas.filter(p => ['conf_nc_obs','si_no_na'].includes(p.tipo_respuesta)).length
  const respondidas     = Object.values(respuestas).filter(r => r.resultado).length
  const conformes       = Object.values(respuestas).filter(r => ['C','S','A'].includes(r.resultado)).length
  const ncCount         = Object.values(respuestas).filter(r => r.resultado === 'N').length
  const pct             = totalPuntuables > 0 ? Math.round(conformes / totalPuntuables * 100) : 0
  const pctColor        = pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-400' : 'bg-red-400'
  const pctText         = pct >= 90 ? 'text-emerald-700' : pct >= 70 ? 'text-amber-700' : 'text-red-600'

  const equiposFiltrados = equipos.filter(e =>
    !busqEquipo || e.nombre.toLowerCase().includes(busqEquipo.toLowerCase()) || e.codigo?.toLowerCase().includes(busqEquipo.toLowerCase())
  )

  if (loading && inspId) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 size={28} className="animate-spin mr-3" /> Cargando inspección...
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header + stepper */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate('/inspecciones')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-lg transition-colors">
            <ArrowLeft size={14} /> Inspecciones
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {inspId ? 'Continuar inspección' : 'Nueva inspección por catálogo'}
          </h1>
        </div>
        <div className="flex items-center gap-2 mt-4">
          {[1,2,3,4].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                paso > n ? 'bg-emerald-500 text-white' :
                paso === n ? 'bg-roka-500 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {paso > n ? <Check size={13} /> : n}
              </div>
              {n < 4 && <div className={`h-0.5 w-8 ${paso > n ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
          <span className="ml-2 text-xs text-gray-500">
            {['','Sub-módulo','Equipo','Checklist','Firma'][paso]}
          </span>
        </div>
      </div>

      {/* ══ PASO 1: Sub-módulo ══════════════════════════════════ */}
      {paso === 1 && (
        <div className="space-y-4">
          <p className="text-gray-500 text-sm">Selecciona el área de inspección:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {submodulos.map(s => {
              const st = SUBMOD_STYLE[s.codigo] || SUBMOD_STYLE.A
              return (
                <button
                  key={s.id}
                  onClick={() => { setSubmoduloSel(s); setPaso(2) }}
                  className={`p-6 rounded-2xl border-2 text-left hover:shadow-md transition-all ${st.bg} ${st.border}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black mb-3 ${st.dot} text-white`}>
                    {s.codigo}
                  </div>
                  <p className={`font-semibold text-lg ${st.text}`}>{s.nombre}</p>
                  <p className="text-xs text-gray-500 mt-1">Sub-módulo {s.codigo}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ══ PASO 2: Equipo + datos ══════════════════════════════ */}
      {paso === 2 && submoduloSel && (
        <div className="space-y-5">
          <button onClick={() => setPaso(1)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-lg transition-colors">
            <ArrowLeft size={14} /> Volver a sub-módulos (A · B · C)
          </button>

          {/* Datos generales */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Área *</label>
              <select value={areaId} onChange={e => setAreaId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-400">
                <option value="">Seleccionar área...</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Inspector</label>
              <select value={inspectorId} onChange={e => setInspectorId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-400">
                <option value="">Seleccionar inspector...</option>
                {personal.map(p => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Turno</label>
              <select value={turno} onChange={e => setTurno(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-400">
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
              </select>
            </div>
          </div>

          {/* Selección equipo */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Seleccionar equipo a inspeccionar</p>
            <input
              value={busqEquipo}
              onChange={e => setBusqEquipo(e.target.value)}
              placeholder="Buscar equipo..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-400"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
              {loading ? (
                <div className="col-span-3 text-center py-8 text-gray-400"><Loader2 className="animate-spin mx-auto" /></div>
              ) : equiposFiltrados.map(e => (
                <button
                  key={e.id}
                  onClick={() => setEquipoSel(e)}
                  className={`p-3 rounded-xl border-2 text-left text-xs transition-all ${
                    equipoSel?.id === e.id
                      ? 'border-roka-500 bg-roka-50 text-roka-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <p className="font-mono text-gray-400 mb-0.5">{e.codigo}</p>
                  <p className="font-medium leading-tight">{e.nombre}</p>
                  <p className="text-gray-400 mt-1">{e.preguntas_count} preguntas</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              disabled={!equipoSel || !areaId || saving}
              onClick={crearInspeccion}
              className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-5 py-2.5 rounded-xl font-medium disabled:opacity-40 transition-colors"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
              Iniciar checklist
            </button>
          </div>
        </div>
      )}

      {/* ══ PASO 3: Checklist ═══════════════════════════════════ */}
      {paso === 3 && (
        <div className="space-y-4">
          {/* Barra de progreso */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-semibold text-gray-800">{inspeccion?.titulo || equipoSel?.nombre}</p>
                <p className="text-xs text-gray-500">{respondidas} / {preguntas.length} respondidas</p>
              </div>
              <span className={`text-2xl font-black ${pctText}`}>{pct}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full transition-all ${pctColor}`} style={{ width: `${pct}%` }} />
            </div>
            {ncCount > 0 && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
                <AlertTriangle size={13} />
                {ncCount} ítem{ncCount > 1 ? 's' : ''} no conforme{ncCount > 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Lista de preguntas */}
          <div className="space-y-3">
            {preguntas.map(p => (
              <PreguntaItem
                key={p.id}
                pregunta={p}
                respuesta={respuestas[p.id]}
                onChange={handleRespuesta}
              />
            ))}
          </div>

          <div className="flex justify-between pt-2">
            <button onClick={() => setPaso(2)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-lg transition-colors">
              <ArrowLeft size={14} /> Volver al equipo
            </button>
            <button
              onClick={avanzarAFirmas}
              disabled={saving}
              className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-5 py-2.5 rounded-xl font-medium disabled:opacity-40"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
              Guardar y firmar
            </button>
          </div>
        </div>
      )}

      {/* ══ PASO 4: Resumen + Firmas ════════════════════════════ */}
      {paso === 4 && inspeccion && (
        <div className="space-y-5">
          {/* Resumen puntaje */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <ClipboardCheck size={18} className="text-roka-500" /> Resumen de inspección
            </h3>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Conformes',    val: inspeccion.items_conformes ?? conformes,   color: 'text-emerald-600' },
                { label: 'No conformes', val: inspeccion.items_nc ?? ncCount,             color: 'text-red-500'     },
                { label: 'Observ.',      val: inspeccion.items_obs ?? 0,                  color: 'text-amber-600'   },
                { label: '% Cumplim.',   val: `${inspeccion.porcentaje_cumplimiento ?? pct}%`, color: pctText      },
              ].map(({ label, val, color }) => (
                <div key={label} className="text-center">
                  <p className={`text-2xl font-black ${color}`}>{val}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            {/* NC list */}
            {(inspeccion.items_nc > 0 || ncCount > 0) && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ítems no conformes</p>
                {preguntas
                  .filter(p => respuestas[p.id]?.resultado === 'N')
                  .map(p => (
                    <div key={p.id} className="flex items-start gap-2 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                      {p.texto}
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {/* Firmas */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <PenLine size={18} className="text-roka-500" /> Firmas digitales
            </h3>
            <FirmaCanvas
              label="Inspector SST"
              firmado={firmasDone.inspector}
              onFirmar={(b64) => firmar('inspector', b64, 'Inspector SST')}
            />
            <FirmaCanvas
              label="Responsable de Área"
              firmado={firmasDone.responsable_area}
              onFirmar={(b64) => firmar('responsable_area', b64, 'Responsable de Área')}
            />
          </div>

          <div className="flex justify-between">
            <button onClick={() => setPaso(3)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-lg transition-colors">
              <ArrowLeft size={14} /> Volver al checklist
            </button>
            <button
              onClick={finalizar}
              disabled={saving || (!firmasDone.inspector && !firmasDone.responsable_area)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium disabled:opacity-40"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Finalizar inspección
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
