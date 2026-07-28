import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectUser } from '../../store/slices/authSlice'
import {
  ArrowLeft, Plus, Calendar, CheckCircle2, AlertTriangle,
  Clock, ClipboardCheck, Package, ChevronRight, ChevronDown, RotateCcw,
  TrendingUp, X, Zap, PenLine, ShieldCheck, ShieldAlert, Eye,
  Camera, MapPin, Filter,
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format, parseISO, isToday, isPast } from 'date-fns'
import { es } from 'date-fns/locale'
import AprobacionLoteModal from '../../components/firmas/AprobacionLoteModal'

const PUEDE_APROBAR = (rol) => ['administrador', 'supervisor_sst'].includes(rol)

const ESTADO_CFG = {
  programada:    { label: 'Programada',    cls: 'bg-blue-50 text-blue-700 border-blue-200',     icon: Clock },
  en_ejecucion:  { label: 'En ejecución',  cls: 'bg-amber-50 text-amber-700 border-amber-200',  icon: Zap },
  ejecutada:     { label: 'Ejecutada',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  con_hallazgos: { label: 'Con hallazgos', cls: 'bg-orange-50 text-orange-700 border-orange-200', icon: AlertTriangle },
  cerrada:       { label: 'Cerrada',       cls: 'bg-gray-100 text-gray-600 border-gray-200',    icon: CheckCircle2 },
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500 text-gray-800'

// ── Modal inicio rápido ──────────────────────────────────────────────────
function ModalIniciarDiaria({ equipo, catalogo, onClose, onCreada }) {
  const [personal, setPersonal] = useState([])
  const [saving, setSaving]     = useState(false)
  const hoy = new Date().toISOString().substring(0, 10)
  const [areas, setAreas] = useState([])
  const [equiposFisicos, setEquiposFisicos] = useState([])
  const [foto, setFoto] = useState(null) // base64 preview
  const [form, setForm] = useState({
    equipo_catalogo_id: catalogo.id,
    equipo_id:          null,
    planificada_para:   hoy,
    inspector_id:       '',
    turno:              'mañana',
    area_id:            equipo?.area_id || equipo?.area?.id || null,
    observaciones:      '',
    foto_base64:        null,
  })

  const handleFoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setFoto(ev.target.result)
      f('foto_base64', ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    api.get('/areas', { params: { per_page: 1000 } }).then(({ data }) => setAreas(data.data || data)).catch(() => {})
  }, [])

  useEffect(() => {
    api.get('/personal', { params: { per_page: 200 } })
      .then(({ data }) => setPersonal(data.data || data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (catalogo.id) {
      api.get('/equipos', {
        params: {
          equipo_catalogo_id: catalogo.id,
          estado: 'operativo',
          per_page: 100
        }
      })
      .then(({ data }) => setEquiposFisicos(data.data || data))
      .catch(() => {})
    }
  }, [catalogo.id])

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const iniciar = async () => {
    setSaving(true)
    try {
      const { data } = await api.post('/inspecciones/programar-checklist', form)
      toast.success(`Inspección ${data.codigo} creada`)
      onCreada(data)
    } catch (e) { toast.error(e.response?.data?.message || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Inspección diaria pre-turno</p>
            <h2 className="font-bold text-gray-900">{catalogo.nombre?.replace(' — Inspección diaria pre-turno','')}</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        <div className="p-5 space-y-3">
          {equiposFisicos.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Equipo Específico {equiposFisicos.length > 1 && <span className="text-red-500">*</span>}
              </label>
              <select
                value={form.equipo_id || ''}
                onChange={e => f('equipo_id', e.target.value || null)}
                className={inp}
                required={equiposFisicos.length > 1}
              >
                <option value="">Seleccionar equipo...</option>
                {equiposFisicos.map(eq => (
                  <option key={eq.id} value={eq.id}>
                    {eq.codigo} — {eq.nombre} {eq.ubicacion && `(${eq.ubicacion})`}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1">
                Identifique cuál {catalogo.nombre} se inspeccionará
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Fecha</label>
              <input type="date" value={form.planificada_para}
                onChange={e => f('planificada_para', e.target.value)} className={inp}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Turno</label>
              <select value={form.turno} onChange={e => f('turno', e.target.value)} className={inp}>
                <option value="mañana">🌅 Mañana</option>
                <option value="tarde">🌤️ Tarde</option>
                <option value="noche">🌙 Noche</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Área</label>
            <select value={form.area_id || ''} onChange={e => f('area_id', e.target.value || null)} className={inp}>
              <option value="">Seleccionar área...</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Operador / Inspector</label>
            <select value={form.inspector_id} onChange={e => f('inspector_id', e.target.value)} className={inp}>
              <option value="">Seleccionar...</option>
              {personal.map(p => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>)}
            </select>
          </div>

          {/* Foto adjunta */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block flex items-center gap-1">
              <Camera size={12}/> Foto de evidencia (opcional)
            </label>
            {foto ? (
              <div className="relative">
                <img src={foto} alt="preview" className="w-full h-32 object-cover rounded-lg border border-gray-200"/>
                <button onClick={() => { setFoto(null); f('foto_base64', null) }}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70">
                  <X size={12}/>
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg py-4 cursor-pointer hover:border-roka-400 hover:bg-roka-50 transition-colors">
                <Camera size={20} className="text-gray-300"/>
                <span className="text-xs text-gray-400">Tomar foto o seleccionar archivo</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto}/>
              </label>
            )}
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={iniciar} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-roka-500 hover:bg-roka-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40">
            <Zap size={14}/> {saving ? 'Creando...' : 'Iniciar ahora'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta equipo diario ────────────────────────────────────────────────
function TarjetaEquipoDiario({ equipo, catalogo, inspeccionesHoy, historial, onIniciar, navigate, onEliminar, creando }) {
  const [mostrarHistorial, setMostrarHistorial] = useState(false)
  const hoy = new Date().toISOString().substring(0, 10)

  // Buscar inspecciones del equipo físico específico (si existe) o del catálogo
  const inspeccionesEquipo = inspeccionesHoy.filter(i => {
    if (equipo?.id) {
      return i.equipo_id === equipo.id && i.planificada_para?.substring(0, 10) === hoy
    }
    return i.equipo_catalogo_id === catalogo?.id && i.planificada_para?.substring(0, 10) === hoy
  })

  const inspeccionHoy = inspeccionesEquipo[0] // Primera inspección del día (si hay)

  const turnosHoy = ['mañana','tarde','noche']
  const turnosCompletados = inspeccionesEquipo
    .filter(i => ['ejecutada','con_hallazgos','cerrada'].includes(i.estado))
    .map(i => i.turno)

  const pct7dias = historial.length > 0
    ? Math.round(historial.filter(i => ['ejecutada','con_hallazgos','cerrada'].includes(i.estado)).length / historial.length * 100)
    : 0

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center flex-shrink-0">
              <Package size={22} className="text-blue-600"/>
            </div>
            <div>
              <p className="text-xs font-mono text-gray-400">{equipo?.codigo || 'APL'}</p>
              <h3 className="font-bold text-gray-900">{equipo?.nombre || catalogo.nombre}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {equipo?.area?.nombre || 'Sin área'} · <span className="text-red-600 font-medium">📅 Diaria</span>
              </p>
            </div>
          </div>

          {/* Estado del día */}
          <div className="flex-shrink-0 text-right">
            {inspeccionHoy ? (
              <div className={`text-xs px-3 py-1.5 rounded-xl border font-medium ${ESTADO_CFG[inspeccionHoy.estado]?.cls || ''}`}>
                {ESTADO_CFG[inspeccionHoy.estado]?.label}
                <p className="font-normal text-[10px] mt-0.5">{inspeccionHoy.turno}</p>
              </div>
            ) : (
              <div className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-xl font-medium">
                ⚠ Sin inspección hoy
              </div>
            )}
          </div>
        </div>

        {/* Turnos del día */}
        <div className="mt-4 flex gap-2">
          {turnosHoy.map(turno => {
            const completado = turnosCompletados.includes(turno)
            const insp = inspeccionesEquipo.find(i => i.turno === turno)
            return (
              <div key={turno}
                onClick={() => insp ? navigate(`/inspecciones/${insp.id}`) : null}
                className={`flex-1 rounded-xl border py-2 text-center text-xs font-medium transition-all ${
                  completado
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-pointer hover:bg-emerald-100'
                    : insp?.estado === 'programada' || insp?.estado === 'en_ejecucion'
                      ? 'bg-amber-50 border-amber-200 text-amber-700 cursor-pointer hover:bg-amber-100'
                      : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}>
                <p className="capitalize">{turno}</p>
                {insp?.equipo && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium inline-block mt-0.5">
                    {insp.equipo.codigo}
                  </span>
                )}
                <p className="text-[10px] mt-0.5">
                  {completado ? '✓ OK' : insp ? (insp.estado === 'programada' ? '⏳' : '▶') : '—'}
                </p>
              </div>
            )
          })}
        </div>

        {/* Acciones */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onIniciar(equipo, catalogo)}
            disabled={creando}
            className="flex-1 flex items-center justify-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
            {creando
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Creando...</>
              : <><Plus size={15}/> Nueva inspección diaria</>
            }
          </button>
          {inspeccionHoy && ['programada','en_ejecucion'].includes(inspeccionHoy.estado) && (
            <button
              onClick={() => navigate(`/inspecciones/checklist/${inspeccionHoy.id}`)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
              <ClipboardCheck size={15}/> Ejecutar
            </button>
          )}
        </div>

        {/* Estadísticas 7 días */}
        <div className="mt-4 flex items-center gap-4 pt-3 border-t border-gray-100">
          <div className="text-center">
            <p className="text-lg font-black text-gray-800">{historial.length}</p>
            <p className="text-[10px] text-gray-400">Últimos 7 días</p>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Cumplimiento</span>
              <span className={`text-xs font-bold ${pct7dias >= 80 ? 'text-emerald-600' : pct7dias >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                {pct7dias}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${pct7dias >= 80 ? 'bg-emerald-500' : pct7dias >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${pct7dias}%` }}/>
            </div>
          </div>
          <button onClick={() => setMostrarHistorial(!mostrarHistorial)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            Historial <ChevronRight size={12} className={`transition-transform ${mostrarHistorial ? 'rotate-90' : ''}`}/>
          </button>
        </div>
      </div>

      {/* Historial colapsable */}
      {mostrarHistorial && historial.length > 0 && (
        <div className="border-t border-gray-100">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {['Fecha','Turno','Estado','%','Inspector',''].map(h => (
                  <th key={h} className="text-left px-4 py-2 text-[10px] font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {historial.slice(0, 14).map(ins => {
                const cfg = ESTADO_CFG[ins.estado]
                return (
                  <tr key={ins.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-600">
                      {ins.planificada_para ? format(parseISO(ins.planificada_para), 'dd MMM', { locale: es }) : '—'}
                      {isToday(parseISO(ins.planificada_para || '2000-01-01')) && <span className="ml-1 text-roka-600 font-semibold">HOY</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-500 capitalize">{ins.turno || '—'}</td>
                    <td className="px-4 py-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${cfg?.cls || ''}`}>
                        {cfg?.label || ins.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {ins.porcentaje_cumplimiento != null
                        ? <span className={`font-bold ${ins.porcentaje_cumplimiento >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {Number(ins.porcentaje_cumplimiento).toFixed(0)}%
                          </span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-400">{ins.inspector_nombre || '—'}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => navigate(`/inspecciones/${ins.id}`)}
                          className="text-roka-600 hover:text-roka-700 font-medium">Ver</button>
                        {!['cerrada'].includes(ins.estado) && (
                          <button onClick={() => onEliminar(ins)}
                            className="text-red-400 hover:text-red-600 font-medium">Eliminar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Sub-módulo Revisión ───────────────────────────────────────────────────
const ESTADO_COLOR = {
  programada:    'bg-blue-50 text-blue-700 border-blue-200',
  en_ejecucion:  'bg-amber-50 text-amber-700 border-amber-200',
  ejecutada:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  con_hallazgos: 'bg-orange-50 text-orange-700 border-orange-200',
  cerrada:       'bg-gray-100 text-gray-600 border-gray-200',
}
const ESTADO_LABEL = {
  programada:'Programada', en_ejecucion:'En ejecución', ejecutada:'Ejecutada',
  con_hallazgos:'Con hallazgos', cerrada:'Cerrada',
}

const POR_PAGINA = 15

function SeccionRevision({ navigate }) {
  const user = useSelector(selectUser)
  const puedeAprobar = PUEDE_APROBAR(user?.rol)
  const [data, setData]             = useState(null)
  const [abierto, setAbierto]       = useState(true)
  const [dias, setDias]             = useState(7)
  const [filtroPend, setFiltroPend] = useState(false)
  const [pagina, setPagina]         = useState(1)
  const [seleccion, setSeleccion]   = useState(() => new Set())
  const [modalLote, setModalLote]   = useState(false)

  const cargar = () => {
    api.get('/inspecciones/pendientes-firma', { params: { dias } })
      .then(({ data }) => { setData(data); setPagina(1); setSeleccion(new Set()) })
      .catch(() => {})
  }
  useEffect(() => { cargar() }, [dias])
  useEffect(() => { setPagina(1) }, [filtroPend])

  // Mostrar inspecciones ejecutadas/cerradas que no tienen APROBACIÓN aún
  const listaBase = (data?.inspecciones ?? []).filter(i =>
    ['ejecutada', 'con_hallazgos', 'cerrada'].includes(i.estado) && i.pendiente_aprobacion
  )
  const listaFiltrada = listaBase.filter(i => !filtroPend || i.pendiente_aprobacion)
  const totalPags = Math.ceil(listaFiltrada.length / POR_PAGINA)
  const lista = listaFiltrada.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  // ── Selección para aprobación masiva ──
  const toggleSel = (id) => setSeleccion(prev => {
    const s = new Set(prev)
    s.has(id) ? s.delete(id) : s.add(id)
    return s
  })
  const idsPagina = lista.map(i => i.id)
  const todasPaginaSel = idsPagina.length > 0 && idsPagina.every(id => seleccion.has(id))
  const toggleTodasPagina = () => setSeleccion(prev => {
    const s = new Set(prev)
    if (todasPaginaSel) idsPagina.forEach(id => s.delete(id))
    else idsPagina.forEach(id => s.add(id))
    return s
  })
  const seleccionarTodas = () => setSeleccion(new Set(listaFiltrada.map(i => i.id)))
  const limpiarSeleccion = () => setSeleccion(new Set())
  const idsSeleccionados = [...seleccion]

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button onClick={() => setAbierto(!abierto)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
            <PenLine size={17} className="text-violet-600"/>
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-900 text-sm">Revisión — Pendientes de firma</p>
            <p className="text-xs text-gray-400">Inspecciones diarias de los últimos {dias} días</p>
          </div>
          {data && (
            <div className="flex gap-2 ml-2">
              {listaBase.length > 0 ? (
                <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                  ⚠ {listaBase.length} requieren firma
                </span>
              ) : (
                <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                  ✓ Todo al día
                </span>
              )}
            </div>
          )}
        </div>
        {abierto ? <ChevronDown size={16} className="text-gray-400"/> : <ChevronRight size={16} className="text-gray-400"/>}
      </button>

      {abierto && (
        <div className="border-t border-gray-100">
          {/* Barra de filtros */}
          <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>Período:</span>
              {[7, 14, 30].map(d => (
                <button key={d} onClick={() => setDias(d)}
                  className={`px-2.5 py-1 rounded-full border transition-colors font-medium ${
                    dias === d ? 'bg-roka-500 text-white border-roka-500' : 'border-gray-300 text-gray-600 hover:bg-white'
                  }`}>
                  {d}d
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-gray-300"/>
            <button onClick={() => setFiltroPend(!filtroPend)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-colors ${
                filtroPend ? 'bg-amber-50 text-amber-700 border-amber-300' : 'border-gray-300 text-gray-500 hover:bg-white'
              }`}>
              <ShieldAlert size={12}/> Falta aprobar
            </button>
            <button onClick={cargar} className="ml-auto text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <RotateCcw size={12}/> Actualizar
            </button>
          </div>

          {/* Barra de acción masiva */}
          {puedeAprobar && idsSeleccionados.length > 0 && (
            <div className="flex items-center gap-3 px-5 py-2.5 bg-emerald-50 border-b border-emerald-100 flex-wrap">
              <span className="text-xs font-semibold text-emerald-800">
                {idsSeleccionados.length} seleccionada(s)
              </span>
              {idsSeleccionados.length < listaFiltrada.length && (
                <button onClick={seleccionarTodas} className="text-xs text-emerald-700 hover:text-emerald-900 underline">
                  Seleccionar las {listaFiltrada.length} pendientes
                </button>
              )}
              <button onClick={limpiarSeleccion} className="text-xs text-gray-500 hover:text-gray-700 underline">
                Limpiar
              </button>
              <button onClick={() => setModalLote(true)}
                className="ml-auto flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-full transition-colors">
                <ShieldCheck size={13}/> Aprobar {idsSeleccionados.length} seleccionada(s)
              </button>
            </div>
          )}

          {/* Tabla */}
          <div className="overflow-x-auto">
            {lista.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                {filtroPend ? 'No hay inspecciones pendientes de firma' : 'Sin inspecciones en este período'}
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {puedeAprobar && (
                      <th className="px-4 py-2.5 w-8">
                        <input type="checkbox" checked={todasPaginaSel} onChange={toggleTodasPagina}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                      </th>
                    )}
                    {['Equipo','Área','Fecha','Turno','Estado','%','Firmas Checklist','Aprobación',''].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {lista.map(ins => (
                    <tr key={ins.id} className={`hover:bg-gray-50 ${seleccion.has(ins.id) ? 'bg-emerald-50/60' : ins.pendiente_firma ? 'bg-amber-50/30' : ''}`}>
                      {puedeAprobar && (
                        <td className="px-4 py-2.5">
                          <input type="checkbox" checked={seleccion.has(ins.id)} onChange={() => toggleSel(ins.id)}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                        </td>
                      )}
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-800 max-w-[160px] truncate" title={ins.titulo}>
                          {ins.titulo?.replace(' — Inspección diaria pre-turno','').replace(' diaria','').replace(' - ','·')}
                        </p>
                        <p className="text-gray-400 font-mono text-[10px]">{ins.equipo_codigo}</p>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{ins.area}</td>
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                        {ins.planificada_para
                          ? format(parseISO(ins.planificada_para), 'dd MMM', { locale: es })
                          : '—'}
                        {ins.planificada_para && isToday(parseISO(ins.planificada_para)) &&
                          <span className="ml-1 text-roka-600 font-semibold">HOY</span>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 capitalize">{ins.turno || '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${ESTADO_COLOR[ins.estado] || ''}`}>
                          {ESTADO_LABEL[ins.estado] || ins.estado}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {ins.porcentaje_cumplimiento != null
                          ? <span className={`font-bold ${ins.porcentaje_cumplimiento >= 90 ? 'text-emerald-600' : ins.porcentaje_cumplimiento >= 70 ? 'text-amber-600' : 'text-red-500'}`}>
                              {Number(ins.porcentaje_cumplimiento).toFixed(0)}%
                            </span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      {/* Firmas checklist (inspector + responsable) */}
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1.5">
                          <span title="Inspector SST" className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${ins.firma_inspector ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                            {ins.firma_inspector ? <ShieldCheck size={9}/> : <ShieldAlert size={9}/>} Inspector
                          </span>
                          <span title="Responsable de Área" className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${ins.firma_responsable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                            {ins.firma_responsable ? <ShieldCheck size={9}/> : <ShieldAlert size={9}/>} Responsable
                          </span>
                        </div>
                      </td>
                      {/* Aprobación supervisor */}
                      <td className="px-4 py-2.5">
                        {ins.firma_aprobacion
                          ? <span className="flex items-center gap-1 text-emerald-600 font-medium text-[11px]">
                              <ShieldCheck size={12}/> {format(parseISO(ins.firma_aprobacion.fecha), 'dd/MM HH:mm')}
                            </span>
                          : <span className="flex items-center gap-1 text-amber-600 font-semibold text-[11px] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <ShieldAlert size={11}/> Falta aprobar
                            </span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => navigate(`/inspecciones/${ins.id}`)}
                          className="flex items-center gap-1 text-roka-600 hover:text-roka-700 font-medium text-xs whitespace-nowrap">
                          <Eye size={12}/> Ver / Aprobar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Paginación */}
          {totalPags > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-xs text-gray-500">
                Mostrando <strong>{(pagina-1)*POR_PAGINA+1}–{Math.min(pagina*POR_PAGINA, listaFiltrada.length)}</strong> de <strong>{listaFiltrada.length}</strong>
              </span>
              <div className="flex items-center gap-1">
                <button disabled={pagina <= 1} onClick={() => setPagina(1)}
                  className="px-2 py-1 rounded border border-gray-300 text-gray-500 disabled:opacity-30 hover:bg-white text-xs">«</button>
                <button disabled={pagina <= 1} onClick={() => setPagina(p => p-1)}
                  className="px-2 py-1 rounded border border-gray-300 text-gray-500 disabled:opacity-30 hover:bg-white text-xs">‹</button>
                {Array.from({ length: Math.min(totalPags, 5) }, (_, i) => {
                  const p = Math.max(1, Math.min(totalPags-4, pagina-2)) + i
                  return p <= totalPags ? (
                    <button key={p} onClick={() => setPagina(p)}
                      className={`w-7 h-7 rounded border text-xs font-medium ${p === pagina ? 'bg-roka-500 text-white border-roka-500' : 'border-gray-300 text-gray-600 hover:bg-white'}`}>
                      {p}
                    </button>
                  ) : null
                })}
                <button disabled={pagina >= totalPags} onClick={() => setPagina(p => p+1)}
                  className="px-2 py-1 rounded border border-gray-300 text-gray-500 disabled:opacity-30 hover:bg-white text-xs">›</button>
                <button disabled={pagina >= totalPags} onClick={() => setPagina(totalPags)}
                  className="px-2 py-1 rounded border border-gray-300 text-gray-500 disabled:opacity-30 hover:bg-white text-xs">»</button>
              </div>
            </div>
          )}
        </div>
      )}

      {modalLote && (
        <AprobacionLoteModal
          ids={idsSeleccionados}
          onClose={() => setModalLote(false)}
          onSuccess={cargar}
        />
      )}
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────
export default function InspeccionDiariaPage() {
  const navigate = useNavigate()
  const user = useSelector(selectUser)
  const [catalogosDiarios, setCatalogosDiarios] = useState([])
  const [equipos, setEquipos]                   = useState([])
  const [inspeccionesHoy, setInspeccionesHoy]   = useState([])
  const [historial, setHistorial]               = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null)
  const [creando, setCreando]     = useState(null) // equipo_id en creación
  const [filtroArea, setFiltroArea] = useState('')

  // Detectar turno según hora actual
  const turnoActual = () => {
    const h = new Date().getHours()
    if (h >= 6 && h < 14) return 'mañana'
    if (h >= 14 && h < 22) return 'tarde'
    return 'noche'
  }

  // Crear inspección directamente sin modal
  const iniciarDirecto = async (eq, catalogo) => {
    if (!catalogo) { toast.error('Sin checklist asignado'); return }
    setCreando(eq.id)
    try {
      const { data } = await api.post('/inspecciones/programar-checklist', {
        equipo_catalogo_id: catalogo.id,
        equipo_id:          eq.id,
        planificada_para:   new Date().toISOString().substring(0, 10),
        turno:              turnoActual(),
        area_id:            eq.area?.id || null,
        inspector_id:       user?.personal_id || null,
      })
      toast.success(`Inspección ${data.codigo} creada`)
      navigate(`/inspecciones/checklist/${data.id}`)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al crear inspección')
    } finally {
      setCreando(null)
    }
  }

  const eliminarInspeccion = async (ins) => {
    if (!window.confirm(`¿Eliminar la inspección ${ins.codigo}? Esta acción no se puede deshacer.`)) return
    try {
      await api.delete(`/inspecciones/${ins.id}`)
      toast.success(`Inspección ${ins.codigo} eliminada`)
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se puede eliminar')
    }
  }

  const cargar = async () => {
    setLoading(true)
    try {
      const hoy = new Date().toISOString().substring(0, 10)
      const hace7 = new Date(Date.now() - 7 * 86400000).toISOString().substring(0, 10)

      const [catRes, eqRes, inspRes] = await Promise.all([
        api.get('/checklist/equipos', { params: { activos: false } }),
        // frecuencia_plantilla=diaria filtra en BD: solo equipos con plantilla diaria en pivot
        api.get('/equipos', { params: { per_page: 500, with_area: true, frecuencia_plantilla: 'diaria' } }),
        api.get('/inspecciones', { params: {
          per_page: 200,
          fecha_desde: hace7,
          fecha_hasta: hoy,
          tipo: 'equipos',
        }}).catch(() => ({ data: { data: [] } })),
      ])

      // Guardar TODOS los catálogos para lookup — el backend ya filtró los equipos por frecuencia diaria
      // No filtramos por cat.frecuencia_inspeccion porque el pivot puede sobreescribir la frecuencia del catálogo
      const cats = catRes.data || []
      setCatalogosDiarios(cats)

      // El backend ya filtró: solo equipos con plantilla diaria asignada en pivot
      const eqsFiltrados = eqRes.data?.data || eqRes.data || []
      setEquipos(eqsFiltrados)

      // Inspecciones recientes (hoy + últimos 7 días)
      const inspAll = inspRes.data?.data || inspRes.data || []
      setInspeccionesHoy(inspAll.filter(i => i.planificada_para?.substring(0,10) === hoy))
      setHistorial(inspAll)

    } catch { } finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  // KPIs del día
  const hoy       = new Date().toISOString().substring(0, 10)
  const inspHoy   = inspeccionesHoy
  const completadasHoy = inspHoy.filter(i => ['ejecutada','con_hallazgos','cerrada'].includes(i.estado)).length
  const pendientesHoy  = equipos.length - completadasHoy

  // Áreas únicas de los equipos cargados
  const areas = [...new Map(
    equipos.filter(e => e.area).map(e => [e.area.id, e.area])
  ).values()].sort((a, b) => a.nombre.localeCompare(b.nombre))

  // Equipos filtrados por área
  const equiposFiltrados = filtroArea
    ? equipos.filter(e => String(e.area?.id) === String(filtroArea))
    : equipos

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/inspecciones')} className="btn-back">
            <ArrowLeft size={14}/> Inspecciones
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Zap size={22} className="text-amber-500"/> Inspecciones Diarias
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Checklist pre-turno diario · {format(new Date(), "EEEE dd 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/inspecciones/tabla-diaria')}
            className="flex items-center gap-2 border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-2 rounded-lg text-sm font-medium">
            <ClipboardCheck size={13}/> Tabla Diaria
          </button>
          <button onClick={cargar}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <RotateCcw size={13}/> Actualizar
          </button>
        </div>
      </div>

      {/* KPIs del día */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Equipos con diaria', val: equipos.length, color: 'text-blue-600',    bg: 'bg-blue-50',    icon: Package },
          { label: 'Completadas hoy',    val: completadasHoy,           color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
          { label: 'Pendientes hoy',     val: pendientesHoy > 0 ? pendientesHoy : 0, color: pendientesHoy > 0 ? 'text-amber-600' : 'text-gray-400', bg: pendientesHoy > 0 ? 'bg-amber-50' : 'bg-gray-50', icon: Clock },
          { label: 'Inspecciones 7 días',val: historial.length,         color: 'text-purple-600',  bg: 'bg-purple-50',  icon: TrendingUp },
        ].map(({ label, val, color, bg, icon: Icon }) => (
          <div key={label} className={`${bg} rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3`}>
            <Icon size={20} className={`${color} flex-shrink-0`}/>
            <div>
              <p className={`text-2xl font-black ${color}`}>{val}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alerta si hay pendientes */}
      {pendientesHoy > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0"/>
          <p className="text-sm text-amber-800 font-medium">
            Hay <strong>{pendientesHoy}</strong> equipo{pendientesHoy !== 1 ? 's' : ''} sin inspección diaria completada hoy.
            Las inspecciones diarias son obligatorias antes de operar el equipo (OSHA 1910.178(q) / Ley 29783).
          </p>
        </div>
      )}

      {/* Filtro por área */}
      {!loading && equipos.length > 0 && areas.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-gray-400 flex-shrink-0"/>
          <button
            onClick={() => setFiltroArea('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              !filtroArea ? 'bg-roka-500 text-white border-roka-500' : 'bg-white text-gray-600 border-gray-200 hover:border-roka-300'
            }`}>
            Todas las áreas ({equipos.length})
          </button>
          {areas.map(a => (
            <button key={a.id}
              onClick={() => setFiltroArea(String(a.id))}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                String(filtroArea) === String(a.id)
                  ? 'bg-roka-500 text-white border-roka-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-roka-300'
              }`}>
              <MapPin size={10} className="inline mr-1"/>{a.nombre} ({equipos.filter(e => String(e.area?.id) === String(a.id)).length})
            </button>
          ))}
        </div>
      )}

      {/* Tarjetas de equipos */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-roka-500 border-t-transparent rounded-full animate-spin"/></div>
      ) : equipos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Zap size={40} className="text-gray-200 mx-auto mb-3"/>
          <p className="text-gray-500 font-medium">No hay equipos con inspección diaria registrados</p>
          <p className="text-xs text-gray-400 mt-2">Registra equipos y asigna frecuencia "diaria" en el catálogo de equipos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {equiposFiltrados.map(eq => {
            const plantillaDiaria = (eq.plantillas || []).find(p =>
              (p.pivot?.frecuencia_inspeccion ?? p.frecuencia_inspeccion) === 'diaria'
            )
            const catalogo = (plantillaDiaria && catalogosDiarios.find(c => c.id === plantillaDiaria.id))
              || catalogosDiarios.find(c => c.id === eq.equipo_catalogo_id)
            const historialEq = historial.filter(i => i.equipo_id === eq.id || (i.equipo_catalogo_id === eq.equipo_catalogo_id && !i.equipo_id))
            return (
              <TarjetaEquipoDiario
                key={eq.id}
                equipo={eq}
                catalogo={catalogo}
                inspeccionesHoy={inspeccionesHoy}
                historial={historialEq}
                navigate={navigate}
                onIniciar={iniciarDirecto}
                creando={creando === eq.id}
                onEliminar={eliminarInspeccion}
              />
            )
          })}
        </div>
      )}

      {/* Sub-módulo Revisión */}
      <SeccionRevision navigate={navigate} />

      {/* Modal */}
      {modal && (
        <ModalIniciarDiaria
          equipo={modal.equipo}
          catalogo={modal.catalogo}
          onClose={() => setModal(null)}
          onCreada={async (insp) => {
            setModal(null)
            await cargar() // Recargar datos para mostrar la nueva inspección
            navigate(`/inspecciones/checklist/${insp.id}`)
          }}
        />
      )}
    </div>
  )
}
