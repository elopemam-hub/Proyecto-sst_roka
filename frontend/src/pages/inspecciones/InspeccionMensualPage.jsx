import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ChevronLeft, ChevronRight, ClipboardList,
  CheckCircle2, Clock, AlertTriangle, Zap, Play,
  RefreshCw, Plus, Eye, BarChart3, Package, Shield,
  PenLine, ShieldCheck, ShieldAlert, ChevronDown, XCircle, X, Info, TrendingUp, User, Trash2,
} from 'lucide-react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { isToday } from 'date-fns'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const SUBMOD_CFG = {
  A: { label: 'Equipos',          color: 'bg-blue-50 text-blue-700 border-blue-200',    dot: 'bg-blue-500',   icon: Package },
  B: { label: 'Infraestructura',  color: 'bg-teal-50 text-teal-700 border-teal-200',    dot: 'bg-teal-500',   icon: BarChart3 },
  C: { label: 'Emergencia',       color: 'bg-red-50 text-red-700 border-red-200',       dot: 'bg-red-500',    icon: Shield },
}

const ESTADO_CFG = {
  completada:    { label: 'Completada',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  en_progreso:   { label: 'En progreso',    cls: 'bg-amber-50 text-amber-700 border-amber-200',       icon: Zap },
  programada:    { label: 'Programada',     cls: 'bg-blue-50 text-blue-700 border-blue-200',          icon: Clock },
  cerrada:       { label: 'Cerrada',        cls: 'bg-gray-100 text-gray-500 border-gray-200',         icon: CheckCircle2 },
  con_hallazgos: { label: 'Con hallazgos',  cls: 'bg-orange-50 text-orange-700 border-orange-200',    icon: AlertTriangle },
  sin_programar: { label: 'Sin programar',  cls: 'bg-gray-100 text-gray-500 border-gray-200',         icon: AlertTriangle },
}

const SEMAFORO_CFG = {
  rojo:     { dot: 'bg-red-500',     ring: 'ring-red-200',     label: 'Riesgo alto', pillCls: 'bg-red-50 border-red-200 text-red-700'             },
  amarillo: { dot: 'bg-amber-400',   ring: 'ring-amber-200',   label: 'Atención',    pillCls: 'bg-amber-50 border-amber-200 text-amber-700'       },
  verde:    { dot: 'bg-emerald-500', ring: 'ring-emerald-200', label: 'OK',          pillCls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  gris:     { dot: 'bg-gray-300',    ring: 'ring-gray-200',    label: 'Sin datos',   pillCls: 'bg-gray-50 border-gray-200 text-gray-500'          },
}

const pctColor = v => v == null ? 'text-gray-300' : v >= 90 ? 'text-emerald-600 font-bold' : v >= 70 ? 'text-amber-600 font-bold' : 'text-red-500 font-bold'
const pctBar   = v => v == null ? 'bg-gray-200' : v >= 90 ? 'bg-emerald-500' : v >= 70 ? 'bg-amber-400' : 'bg-red-400'

// ── Tarjeta KPI sub-módulo ────────────────────────────────────────────────
function KpiSubmod({ codigo, data }) {
  const cfg = SUBMOD_CFG[codigo] || { label: codigo, color: 'bg-gray-50 text-gray-600 border-gray-200', dot: 'bg-gray-400', icon: ClipboardList }
  const Icon = cfg.icon
  const pct = data?.completadas && data?.total ? Math.round(data.completadas / data.total * 100) : 0
  return (
    <div className={`rounded-xl border p-4 ${cfg.color}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg ${cfg.dot} flex items-center justify-center`}>
          <span className="text-white font-bold text-xs">{codigo}</span>
        </div>
        <span className="font-semibold text-sm">{cfg.label}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center mb-2">
        {[
          { v: data?.total     || 0, l: 'Total' },
          { v: data?.completadas|| 0, l: 'Listas' },
          { v: data?.programadas|| 0, l: 'Pend.' },
          { v: data?.sin_prog  || 0, l: 'S/prog' },
        ].map(({ v, l }) => (
          <div key={l}>
            <p className="text-lg font-black">{v}</p>
            <p className="text-[10px] opacity-70">{l}</p>
          </div>
        ))}
      </div>
      <div className="w-full bg-white/50 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${pctBar(pct)} transition-all`} style={{ width: `${pct}%` }}/>
      </div>
      <p className="text-[10px] opacity-70 mt-1 text-right">{pct}% completado</p>
    </div>
  )
}

// ── Selector compacto de inspector ───────────────────────────────────────
function InspectorSelect({ inspId, inspectorUsuarioId, usuarios, onAsignarInspector }) {
  const handleChange = (e) => {
    const v = e.target.value ? parseInt(e.target.value) : null
    onAsignarInspector(inspId, v)
  }
  return (
    <div className="flex items-center gap-1 mt-1">
      <User size={10} className="text-gray-400 shrink-0"/>
      <select
        value={inspectorUsuarioId ?? ''}
        onChange={handleChange}
        onClick={e => e.stopPropagation()}
        className="text-[10px] border border-gray-200 rounded px-1 py-0.5 text-gray-600 bg-white max-w-[120px] focus:outline-none focus:ring-1 focus:ring-roka-300">
        <option value="">Sin inspector</option>
        {usuarios.map(u => (
          <option key={u.id} value={u.id}>{u.nombre || `${u.nombres ?? ''} ${u.apellidos ?? ''}`.trim()}</option>
        ))}
      </select>
    </div>
  )
}

// ── Fila del catálogo ─────────────────────────────────────────────────────
function FilaCatalogo({ cat, navigate, onProgramar, usuarios, onAsignarInspector, onEliminar }) {
  const [expandida, setExpandida] = useState(false)
  const estadoCfg = ESTADO_CFG[cat.estado] || ESTADO_CFG.sin_programar
  const EIcon = estadoCfg.icon
  const subCfg = SUBMOD_CFG[cat.submodulo] || {}

  // Determinar si la fila es expandible
  const esExpandible = cat.equipos_count > 1 || (cat.equipos_count === 1 && cat.inspecciones?.length > 0)

  return (
    <>
      <tr className={`hover:bg-gray-50 transition-colors ${expandida ? 'bg-gray-50' : ''} ${esExpandible ? 'cursor-pointer' : ''}`}
        onClick={() => esExpandible && setExpandida(!expandida)}>
        {/* Sub-módulo */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            {esExpandible && (
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                <ChevronDown size={14} className={`text-gray-600 transition-transform duration-200 ${expandida ? 'rotate-180' : ''}`}/>
              </div>
            )}
            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${subCfg.color || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
              <span className={`w-2 h-2 rounded-full ${subCfg.dot || 'bg-gray-400'}`}/>
              {cat.submodulo}
            </span>
          </div>
        </td>
        {/* Equipo */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-offset-1 ${SEMAFORO_CFG[cat.semaforo]?.dot || 'bg-gray-300'} ${SEMAFORO_CFG[cat.semaforo]?.ring || 'ring-gray-200'}`}
              title={SEMAFORO_CFG[cat.semaforo]?.label}
            />
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-medium text-gray-800 text-sm">{cat.catalogo_nombre}</p>
                {cat.criticos_abiertos > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full border border-red-200 font-medium">
                    <AlertTriangle size={9}/> {cat.criticos_abiertos} crítico{cat.criticos_abiertos > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-[10px] font-mono">{cat.catalogo_codigo}</p>
            </div>
          </div>
        </td>
        {/* Equipos físicos */}
        <td className="px-4 py-3 text-center">
          <span className="text-gray-500 text-sm">{cat.equipos_count}</span>
        </td>
        {/* Inspecciones */}
        <td className="px-4 py-3 text-center">
          <span className={`text-sm font-medium ${cat.total_programadas > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
            {cat.ejecutadas}/{cat.total_programadas || '—'}
          </span>
        </td>
        {/* % Cumplimiento */}
        <td className="px-4 py-3">
          {cat.pct_cumplimiento != null ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-[60px]">
                <div className={`h-1.5 rounded-full ${pctBar(cat.pct_cumplimiento)}`}
                  style={{ width: `${cat.pct_cumplimiento}%` }}/>
              </div>
              <span className={`text-xs ${pctColor(cat.pct_cumplimiento)}`}>{cat.pct_cumplimiento}%</span>
            </div>
          ) : <span className="text-gray-300 text-xs">—</span>}
        </td>
        {/* Estado */}
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${estadoCfg.cls}`}>
            <EIcon size={10}/> {estadoCfg.label}
          </span>
        </td>
        {/* Acciones */}
        <td className="px-4 py-3">
          <div className="flex flex-col gap-0.5" onClick={e => e.stopPropagation()}>
            <div className="flex gap-2 flex-wrap">
              {cat.estado === 'sin_programar' ? (
                <button onClick={() => onProgramar(cat)}
                  className="flex items-center gap-1 text-xs bg-roka-500 hover:bg-roka-600 text-white px-2.5 py-1 rounded-lg font-medium">
                  <Plus size={11}/> Programar
                </button>
              ) : cat.inspecciones?.length > 0 ? (
                <button onClick={() => navigate(`/inspecciones/${cat.inspecciones[0].id}`)}
                  className="flex items-center gap-1 text-xs text-roka-600 hover:text-roka-700 font-medium">
                  <Eye size={12}/> Ver
                </button>
              ) : null}
              {['programada','en_progreso'].includes(cat.estado) && cat.inspecciones?.length > 0 && (
                <button onClick={() => navigate(`/inspecciones/checklist/${cat.inspecciones[0].id}`)}
                  className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg font-medium">
                  <Play size={10}/> Ejecutar
                </button>
              )}
              {cat.estado === 'programada' && cat.inspecciones?.length > 0 && (
                <button onClick={() => onEliminar(cat.inspecciones[0].id)}
                  title="Eliminar inspección programada 0%"
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-1.5 py-1 rounded border border-transparent hover:border-red-200 transition-colors">
                  <Trash2 size={11}/>
                </button>
              )}
            </div>
            {cat.inspecciones?.length > 0 && usuarios.length > 0 && cat.equipos_count <= 1
              && !['cerrada','ejecutada','con_hallazgos'].includes(cat.inspecciones[0].estado) && (
              <InspectorSelect
                inspId={cat.inspecciones[0].id}
                inspectorUsuarioId={cat.inspecciones[0].inspector_usuario_id}
                usuarios={usuarios}
                onAsignarInspector={onAsignarInspector}
              />
            )}
          </div>
        </td>
      </tr>
      {/* Detalle expandido - Equipos múltiples */}
      {expandida && cat.equipos_count > 1 && cat.equipos?.length > 0 && (
        <tr>
          <td colSpan={7} className="bg-gray-50 border-t border-gray-100 px-4 py-2">
            <div className="space-y-1">
              {cat.equipos.map(eq => {
                const tieneInsp = eq.inspeccion != null
                const estadoEq = tieneInsp ? ESTADO_CFG[eq.inspeccion.estado] || ESTADO_CFG.sin_programar : ESTADO_CFG.sin_programar
                const EqIcon = estadoEq.icon

                return (
                  <div key={eq.id}
                    className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs hover:border-roka-300 transition-colors">
                    {/* Código equipo */}
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <span className="w-1 h-1 rounded-full bg-gray-400"/>
                      <span className="font-mono text-roka-600 font-semibold">{eq.codigo}</span>
                      {eq.nombre && <span className="text-gray-400 text-[10px]">{eq.nombre}</span>}
                    </div>

                    {/* Área */}
                    <div className="min-w-[100px]">
                      <span className="text-gray-600">{eq.area}</span>
                    </div>

                    {/* Estado inspección */}
                    <div className="flex-1">
                      {tieneInsp ? (
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${estadoEq.cls}`}>
                            <EqIcon size={9}/> {estadoEq.label}
                          </span>
                          {eq.inspeccion.pct != null && (
                            <span className={`font-bold text-[10px] ${pctColor(eq.inspeccion.pct)}`}>
                              {Number(eq.inspeccion.pct).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[10px] italic">Sin inspección programada</span>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col gap-0.5" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5 flex-wrap">
                        {tieneInsp ? (
                          <>
                            <button onClick={() => navigate(`/inspecciones/${eq.inspeccion.id}`)}
                              className="flex items-center gap-1 text-[10px] text-roka-600 hover:text-roka-700 font-medium px-2 py-1 rounded hover:bg-roka-50">
                              <Eye size={10}/> Ver
                            </button>
                            {['programada','en_progreso'].includes(eq.inspeccion.estado) && (
                              <button onClick={() => navigate(`/inspecciones/checklist/${eq.inspeccion.id}`)}
                                className="flex items-center gap-1 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded font-medium">
                                <Play size={9}/> Ejecutar
                              </button>
                            )}
                            {eq.inspeccion.estado === 'programada' && (
                              <button onClick={() => onEliminar(eq.inspeccion.id)}
                                title="Eliminar programada 0%"
                                className="flex items-center text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50 px-1.5 py-1 rounded border border-transparent hover:border-red-200 transition-colors">
                                <Trash2 size={9}/>
                              </button>
                            )}
                          </>
                        ) : (
                          <button onClick={() => onProgramar(cat, eq)}
                            className="flex items-center gap-1 text-[10px] bg-roka-500 hover:bg-roka-600 text-white px-2 py-1 rounded font-medium">
                            <Plus size={9}/> Programar
                          </button>
                        )}
                      </div>
                      {tieneInsp && usuarios.length > 0 && !['cerrada','ejecutada','con_hallazgos'].includes(eq.inspeccion.estado) && (
                        <InspectorSelect
                          inspId={eq.inspeccion.id}
                          inspectorUsuarioId={eq.inspeccion.inspector_usuario_id}
                          usuarios={usuarios}
                          onAsignarInspector={onAsignarInspector}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </td>
        </tr>
      )}

      {/* Detalle expandido - Equipo único (comportamiento original) */}
      {expandida && cat.equipos_count === 1 && cat.inspecciones?.length > 0 && (
        <tr>
          <td colSpan={7} className="bg-gray-50 border-t border-gray-100 px-6 pb-3 pt-2">
            <div className="flex flex-wrap gap-2">
              {cat.inspecciones.map(ins => (
                <div key={ins.id} className="flex items-center gap-1">
                  <button onClick={() => navigate(`/inspecciones/${ins.id}`)}
                    className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs hover:border-roka-300 hover:bg-roka-50 transition-colors">
                    {ins.equipo_codigo && (
                      <span className="font-mono text-roka-600 font-semibold">{ins.equipo_codigo}</span>
                    )}
                    <span className="font-mono text-gray-400">{ins.codigo}</span>
                    <span className="text-gray-600">{ins.area}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${ESTADO_CFG[ins.estado]?.cls || ''}`}>
                      {ESTADO_CFG[ins.estado]?.label || ins.estado}
                    </span>
                    {ins.pct != null && <span className={`font-bold text-[10px] ${pctColor(ins.pct)}`}>{Number(ins.pct).toFixed(0)}%</span>}
                  </button>
                  {ins.estado === 'programada' && (
                    <button onClick={() => onEliminar(ins.id)}
                      title="Eliminar programada 0%"
                      className="flex items-center justify-center w-6 h-6 text-red-400 hover:text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-200 transition-colors">
                      <Trash2 size={11}/>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Modal confirmar generar programa ─────────────────────────────────────
function ModalGenerarPrograma({ anio, mes, resumen, onConfirmar, onClose, generando, usuarios }) {
  const [sobreescribir, setSobreescribir] = useState(false)
  const [inspectorId, setInspectorId]     = useState('')
  const sinProg = resumen?.sin_prog || 0
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Generar programa {MESES_ES[mes-1]} {anio}</h2>
          <p className="text-xs text-gray-400 mt-0.5">Crea inspecciones para todos los catálogos activos</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-roka-50 rounded-xl p-3 text-center border border-roka-100">
              <p className="text-2xl font-black text-roka-600">{sinProg}</p>
              <p className="text-xs text-roka-600">Sin programar</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
              <p className="text-2xl font-black text-gray-500">{(resumen?.programadas || 0) + (resumen?.completadas || 0)}</p>
              <p className="text-xs text-gray-500">Ya tienen insp.</p>
            </div>
          </div>

          {/* Inspector por defecto */}
          {usuarios.length > 0 && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
                <User size={12} className="text-gray-500"/>
                Inspector por defecto (opcional)
              </label>
              <select value={inspectorId} onChange={e => setInspectorId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-roka-300 bg-white">
                <option value="">Sin asignar</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre || `${u.nombres ?? ''} ${u.apellidos ?? ''}`.trim()}</option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1">Se asignará a todas las inspecciones generadas</p>
            </div>
          )}

          <label className="flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer">
            <input type="checkbox" checked={sobreescribir} onChange={e => setSobreescribir(e.target.checked)}
              className="w-4 h-4 rounded accent-amber-500"/>
            <div>
              <p className="text-xs font-medium text-amber-800">Sobreescribir existentes</p>
              <p className="text-[10px] text-amber-600">Crea inspecciones incluso para los que ya tienen una este mes</p>
            </div>
          </label>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={() => onConfirmar(sobreescribir, inspectorId ? parseInt(inspectorId) : null)} disabled={generando}
            className="flex-1 flex items-center justify-center gap-2 bg-roka-500 hover:bg-roka-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40">
            {generando ? <RefreshCw size={13} className="animate-spin"/> : <Plus size={13}/>}
            {generando ? 'Generando...' : 'Generar programa'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sección Revisión Mensual ──────────────────────────────────────────────
function SeccionRevisionMensual({ navigate }) {
  const [data, setData]             = useState(null)
  const [abierto, setAbierto]       = useState(true)
  const [dias, setDias]             = useState(60)
  const [filtroPend, setFiltroPend] = useState(false)
  const [pagina, setPagina]         = useState(1)
  const [modalRechazo, setModalRechazo] = useState(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [rechazando, setRechazando] = useState(false)
  const POR_PAG = 15

  const cargar = () => {
    api.get('/inspecciones/pendientes-firma', { params: { tipo: 'mensual', dias } })
      .then(({ data }) => { setData(data); setPagina(1) })
      .catch(() => {})
  }
  useEffect(() => { cargar() }, [dias])
  useEffect(() => { setPagina(1) }, [filtroPend])

  const rechazarInspeccion = async () => {
    if (!modalRechazo || !motivoRechazo.trim()) {
      toast.error('Debes ingresar el motivo del rechazo')
      return
    }
    if (motivoRechazo.trim().length < 10) {
      toast.error('El motivo debe tener al menos 10 caracteres')
      return
    }
    setRechazando(true)
    try {
      await api.post(`/inspecciones/${modalRechazo.id}/rechazar`, {
        motivo: motivoRechazo.trim()
      })
      toast.success('Inspección rechazada y devuelta al inspector')
      setModalRechazo(null)
      setMotivoRechazo('')
      cargar()
    } catch (error) {
      console.error('❌ Error al rechazar inspección:', error)
      const mensaje = error.response?.data?.message || error.message || 'Error desconocido'
      toast.error(`Error al rechazar: ${mensaje}`)
    } finally {
      setRechazando(false)
    }
  }

  const listaBase = (data?.inspecciones ?? []).filter(i =>
    ['ejecutada','con_hallazgos','cerrada'].includes(i.estado) && i.pendiente_aprobacion
  )
  const listaFiltrada = listaBase.filter(i => !filtroPend || i.pendiente_aprobacion)
  const totalPags  = Math.ceil(listaFiltrada.length / POR_PAG)
  const listaPag   = listaFiltrada.slice((pagina-1)*POR_PAG, pagina*POR_PAG)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header colapsable */}
      <button onClick={() => setAbierto(!abierto)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
            <PenLine size={17} className="text-violet-600"/>
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-900 text-sm">Revisión — Pendientes de aprobación</p>
            <p className="text-xs text-gray-400">Inspecciones mensuales ejecutadas sin firma de aprobación</p>
          </div>
          {data && (
            <div className="flex gap-2 ml-2">
              {listaBase.length > 0 ? (
                <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                  ⚠ {listaBase.length} requieren aprobación
                </span>
              ) : (
                <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                  ✓ Todo al día
                </span>
              )}
            </div>
          )}
        </div>
        {abierto ? <ChevronDown size={16} className="text-gray-400"/> : <ChevronLeft size={16} className="rotate-[-90deg] text-gray-400"/>}
      </button>

      {abierto && (
        <div className="border-t border-gray-100">
          {/* Barra filtros */}
          <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>Período:</span>
              {[30, 60, 90].map(d => (
                <button key={d} onClick={() => setDias(d)}
                  className={`px-2.5 py-1 rounded-full border transition-colors font-medium ${
                    dias===d ? 'bg-roka-500 text-white border-roka-500' : 'border-gray-300 text-gray-600 hover:bg-white'
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
              <RefreshCw size={12}/> Actualizar
            </button>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            {listaFiltrada.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                {listaBase.length === 0 ? '✓ No hay inspecciones mensuales pendientes de aprobación' : 'Sin resultados'}
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Código','Catálogo','Área','Fecha','Estado','%','Firmas Checklist','Aprobación',''].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {listaPag.map(ins => (
                    <tr key={ins.id} className="hover:bg-gray-50 bg-amber-50/20">
                      <td className="px-4 py-2.5 font-mono text-[10px] text-roka-600">{ins.codigo}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-800 max-w-[200px] truncate">{ins.titulo}</p>
                        <p className="text-gray-400 text-[10px]">{ins.equipo_codigo}</p>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{ins.area}</td>
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                        {ins.planificada_para ? format(parseISO(ins.planificada_para), 'dd MMM yyyy', { locale: es }) : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${ESTADO_CFG[ins.estado]?.cls || ''}`}>
                          {ESTADO_CFG[ins.estado]?.label || ins.estado}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {ins.porcentaje_cumplimiento != null
                          ? <span className={`font-bold text-[11px] ${pctColor(ins.porcentaje_cumplimiento)}`}>{Number(ins.porcentaje_cumplimiento).toFixed(0)}%</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <span className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${ins.firma_inspector ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                            {ins.firma_inspector ? <ShieldCheck size={9}/> : <ShieldAlert size={9}/>} Inspector
                          </span>
                          <span className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${ins.firma_responsable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                            {ins.firma_responsable ? <ShieldCheck size={9}/> : <ShieldAlert size={9}/>} Resp.
                          </span>
                        </div>
                      </td>
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
                        <div className="flex items-center gap-2">
                          <button onClick={() => navigate(`/inspecciones/${ins.id}`)}
                            className="flex items-center gap-1 text-roka-600 hover:text-roka-700 font-medium whitespace-nowrap">
                            <Eye size={12}/> Ver / Aprobar
                          </button>
                          {(ins.porcentaje_cumplimiento == null || ins.porcentaje_cumplimiento < 80) && (
                            <button onClick={() => setModalRechazo(ins)}
                              className="flex items-center gap-1 text-red-600 hover:text-red-700 font-medium whitespace-nowrap bg-red-50 px-2 py-1 rounded border border-red-200 hover:bg-red-100 transition-colors">
                              <XCircle size={12}/> Rechazar
                            </button>
                          )}
                        </div>
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
                Mostrando <strong>{(pagina-1)*POR_PAG+1}–{Math.min(pagina*POR_PAG, listaFiltrada.length)}</strong> de <strong>{listaFiltrada.length}</strong>
              </span>
              <div className="flex items-center gap-1">
                <button disabled={pagina<=1} onClick={() => setPagina(1)} className="px-2 py-1 rounded border border-gray-300 text-gray-500 disabled:opacity-30 hover:bg-white text-xs">«</button>
                <button disabled={pagina<=1} onClick={() => setPagina(p=>p-1)} className="px-2 py-1 rounded border border-gray-300 text-gray-500 disabled:opacity-30 hover:bg-white text-xs">‹</button>
                {Array.from({length: Math.min(totalPags,5)}, (_,i) => {
                  const p = Math.max(1, Math.min(totalPags-4, pagina-2)) + i
                  return p <= totalPags ? (
                    <button key={p} onClick={() => setPagina(p)}
                      className={`w-7 h-7 rounded border text-xs font-medium ${p===pagina ? 'bg-roka-500 text-white border-roka-500' : 'border-gray-300 text-gray-600 hover:bg-white'}`}>
                      {p}
                    </button>
                  ) : null
                })}
                <button disabled={pagina>=totalPags} onClick={() => setPagina(p=>p+1)} className="px-2 py-1 rounded border border-gray-300 text-gray-500 disabled:opacity-30 hover:bg-white text-xs">›</button>
                <button disabled={pagina>=totalPags} onClick={() => setPagina(totalPags)} className="px-2 py-1 rounded border border-gray-300 text-gray-500 disabled:opacity-30 hover:bg-white text-xs">»</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Rechazo */}
      {modalRechazo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <XCircle size={20} className="text-red-600"/>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Rechazar Inspección</h3>
                  <p className="text-xs text-gray-500">Devolver al inspector para correcciones</p>
                </div>
              </div>
              <button onClick={() => { setModalRechazo(null); setMotivoRechazo('') }}
                className="text-gray-400 hover:text-gray-600">
                <X size={20}/>
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5"/>
                  <div className="text-xs text-amber-800">
                    <p className="font-semibold mb-1">Inspección: {modalRechazo.codigo}</p>
                    <p>{modalRechazo.titulo}</p>
                    <p className="mt-1 text-amber-600">
                      {modalRechazo.porcentaje_cumplimiento != null
                        ? `Completitud: ${modalRechazo.porcentaje_cumplimiento}%`
                        : 'Sin datos de completitud'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Motivo del rechazo <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  placeholder="Ej: Inspección incompleta, faltan datos del turno tarde. Requiere completar sección de hallazgos."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  rows={4}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Este motivo se agregará a las observaciones y se notificará al inspector
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info size={14} className="text-blue-600 flex-shrink-0 mt-0.5"/>
                  <p className="text-xs text-blue-800">
                    Al rechazar, la inspección volverá al estado <strong>"En ejecución"</strong> para que el inspector pueda completarla o corregirla.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button onClick={() => { setModalRechazo(null); setMotivoRechazo('') }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
                Cancelar
              </button>
              <button onClick={rechazarInspeccion} disabled={rechazando || !motivoRechazo.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed">
                {rechazando ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                    Rechazando...
                  </>
                ) : (
                  <>
                    <XCircle size={16}/>
                    Rechazar y devolver
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tooltip personalizado del gráfico ────────────────────────────────────
function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload || {}
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-xs space-y-1.5">
      <p className="font-bold text-gray-800 text-sm">{label}</p>
      <p className="text-blue-600">Ejecución: <strong>{d.pct_ejecucion ?? 0}%</strong> ({d.completadas}/{d.total})</p>
      {d.pct_cumplimiento != null && (
        <p className="text-emerald-600">Cumplimiento promedio: <strong>{d.pct_cumplimiento}%</strong></p>
      )}
      {d.criticos > 0 && (
        <p className="text-red-600">Hallazgos críticos: <strong>{d.criticos}</strong></p>
      )}
    </div>
  )
}

// ── Sección de evolución mensual ──────────────────────────────────────────
function SeccionTendencia() {
  const [data, setData]       = useState(null)
  const [meses, setMeses]     = useState(6)
  const [abierto, setAbierto] = useState(false)
  const [loading, setLoading] = useState(false)

  const cargar = () => {
    setLoading(true)
    api.get('/inspecciones/tendencia-mensual', { params: { meses } })
      .then(({ data }) => setData(data.datos || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (abierto) cargar() }, [abierto, meses])

  const chartData = (data || []).map(d => ({
    ...d,
    label: format(parseISO(d.mes + '-01'), 'MMM yy', { locale: es }),
  }))

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <button onClick={() => setAbierto(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <TrendingUp size={17} className="text-blue-600"/>
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-900 text-sm">Evolución mensual</p>
            <p className="text-xs text-gray-400">Tendencia de ejecución y cumplimiento del programa</p>
          </div>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${abierto ? 'rotate-180' : ''}`}/>
      </button>

      {abierto && (
        <div className="border-t border-gray-100">
          {/* Controles */}
          <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100">
            <span className="text-xs text-gray-500">Período:</span>
            {[3, 6, 12].map(m => (
              <button key={m} onClick={() => setMeses(m)}
                className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${
                  meses === m ? 'bg-roka-500 text-white border-roka-500' : 'border-gray-300 text-gray-600 hover:bg-white'
                }`}>
                {m === 12 ? '1 año' : `${m} meses`}
              </button>
            ))}
            <button onClick={cargar} className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
              <RefreshCw size={11}/> Actualizar
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-roka-500 border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : chartData.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">Sin datos para el período seleccionado</p>
          ) : (
            <div className="px-4 py-5">
              {/* Leyenda manual */}
              <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-400 inline-block"/><span>% Ejecución (barras)</span></span>
                <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-emerald-500 inline-block"/><span>% Cumplimiento promedio (línea)</span></span>
                {chartData.some(d => d.criticos > 0) && (
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400 inline-block"/><span>Hallazgos críticos (barras)</span></span>
                )}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }}/>
                  <YAxis yAxisId="pct" domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} unit="%"/>
                  <YAxis yAxisId="cnt" orientation="right" tick={{ fontSize: 11, fill: '#ef4444' }} allowDecimals={false}/>
                  <Tooltip content={<TrendTooltip/>}/>
                  <Bar yAxisId="pct" dataKey="pct_ejecucion" name="% Ejecución" fill="#93c5fd" radius={[3,3,0,0]} maxBarSize={40}/>
                  {chartData.some(d => d.criticos > 0) && (
                    <Bar yAxisId="cnt" dataKey="criticos" name="Críticos" fill="#fca5a5" radius={[3,3,0,0]} maxBarSize={20}/>
                  )}
                  <Line yAxisId="pct" type="monotone" dataKey="pct_cumplimiento" name="% Cumplimiento"
                    stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} connectNulls/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────
export default function InspeccionMensualPage() {
  const navigate   = useNavigate()
  const anioActual = new Date().getFullYear()
  const mesActual  = new Date().getMonth() + 1

  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [anio, setAnio]       = useState(anioActual)
  const [mes, setMes]         = useState(mesActual)
  const [filtroSub, setFiltroSub]         = useState('')
  const [filtroEstado, setFiltroEstado]   = useState('')
  const [filtroSemaforo, setFiltroSemaforo] = useState('')
  const [ordenRiesgo, setOrdenRiesgo]     = useState(false)
  const [buscar, setBuscar]               = useState('')
  const [modalGen, setModalGen]           = useState(false)
  const [generando, setGenerando]         = useState(false)
  const [usuarios, setUsuarios]           = useState([])
  const [limpiando, setLimpiando]         = useState(false)
  const [confirmarLimpiar, setConfirmarLimpiar] = useState(false)

  useEffect(() => {
    api.get('/usuarios', { params: { per_page: 1000, activo: true } })
      .then(({ data }) => setUsuarios(data.data || data))
      .catch(() => {})
  }, [])

  useEffect(() => { cargar() }, [anio, mes])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/inspecciones/programa-mensual', { params: { anio, mes } })
      setData(data)
    } catch (error) {
      console.error('❌ Error cargando programa mensual:', error)
      toast.error('Error al cargar el programa')
    } finally { setLoading(false) }
  }

  const generarPrograma = async (sobreescribir, inspectorId = null) => {
    setGenerando(true)
    try {
      const payload = { anio, mes, sobreescribir }
      if (inspectorId) payload.inspector_usuario_id = inspectorId
      const { data: res } = await api.post('/inspecciones/generar-programa', payload)
      toast.success(`✓ ${res.creadas} inspecciones creadas · ${res.omitidas} omitidas`)
      setModalGen(false)
      cargar()
    } catch (e) { toast.error(e.response?.data?.message || 'Error al generar') }
    finally { setGenerando(false) }
  }

  const handleAsignarInspector = async (inspeccionId, usuarioId) => {
    try {
      await api.put(`/inspecciones/${inspeccionId}`, { inspector_usuario_id: usuarioId })
      toast.success('Inspector asignado')
      cargar()
    } catch (e) { toast.error(e.response?.data?.message || 'Error al asignar inspector') }
  }

  const eliminarInspeccion = async (id) => {
    if (!window.confirm('¿Eliminar esta inspección programada?')) return
    try {
      await api.delete(`/inspecciones/${id}`)
      toast.success('Inspección eliminada')
      cargar()
    } catch (e) { toast.error(e.response?.data?.message || 'Error al eliminar') }
  }

  const limpiarProgramadas = async () => {
    setLimpiando(true)
    try {
      const { data: res } = await api.delete('/inspecciones/limpiar-programadas', { params: { anio, mes } })
      toast.success(res.message)
      setConfirmarLimpiar(false)
      cargar()
    } catch (e) { toast.error(e.response?.data?.message || 'Error al limpiar') }
    finally { setLimpiando(false) }
  }

  const programarInspeccion = async (catalogo, equipoEspecifico = null) => {
    try {
      // Usar fecha de hoy para evitar error de validación
      const hoy = format(new Date(), 'yyyy-MM-dd')

      const payload = {
        equipo_catalogo_id: catalogo.catalogo_id,
        planificada_para: hoy,
        turno: 'mañana'
      }

      // Si se pasa un equipo específico, incluir su ID
      if (equipoEspecifico) {
        payload.equipo_id = equipoEspecifico.id
      }

      const { data: insp } = await api.post('/inspecciones/programar-checklist', payload)

      toast.success('Inspección creada')
      navigate(`/inspecciones/checklist/${insp.id}`)
    } catch (e) {
      console.error('Error programando inspección:', e)
      toast.error(e.response?.data?.message || 'Error al programar')
    }
  }

  const cambiarMes = (d) => {
    let m = mes + d, a = anio
    if (m < 1)  { m = 12; a-- }
    if (m > 12) { m = 1;  a++ }
    setMes(m); setAnio(a)
  }

  const [pagina, setPagina] = useState(1)
  const POR_PAGINA = 15

  const catalogosFiltradosBase = (data?.catalogos || []).filter(c => {
    if (filtroSub      && c.submodulo !== filtroSub)     return false
    if (filtroEstado   && c.estado !== filtroEstado)     return false
    if (filtroSemaforo && c.semaforo !== filtroSemaforo) return false
    if (buscar && !c.catalogo_nombre.toLowerCase().includes(buscar.toLowerCase())) return false
    return true
  })

  const catalogosFiltrados = ordenRiesgo
    ? [...catalogosFiltradosBase].sort((a, b) => (b.score_riesgo || 0) - (a.score_riesgo || 0))
    : catalogosFiltradosBase

  // Reset paginación al cambiar filtros
  useEffect(() => { setPagina(1) }, [filtroSub, filtroEstado, filtroSemaforo, buscar, ordenRiesgo, anio, mes])

  const totalPags    = Math.ceil(catalogosFiltrados.length / POR_PAGINA)
  const catalogosPag = catalogosFiltrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const r = data?.resumen || {}
  const pctGeneral = r.total > 0 ? Math.round((r.completadas || 0) / r.total * 100) : 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-back">
            <ArrowLeft size={14}/> Atrás
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList size={20} className="text-roka-500"/> Programa Mensual de Inspecciones
            </h1>
            <p className="text-gray-500 text-sm">{MESES_ES[mes-1]} {anio} · Checklist periódico SST</p>
          </div>
        </div>

        {/* Navegador mes */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1.5 shadow-sm">
            <button onClick={() => cambiarMes(-1)} className="p-1 text-gray-400 hover:text-gray-700 rounded"><ChevronLeft size={15}/></button>
            <div className="flex gap-0.5">
              {MESES_CORTO.map((m, i) => (
                <button key={i} onClick={() => setMes(i+1)}
                  className={`w-8 h-6 rounded text-[11px] font-medium transition-colors ${mes===i+1 ? 'bg-roka-500 text-white' : 'text-gray-400 hover:bg-gray-100'}`}>
                  {m}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-0.5 ml-1 border-l border-gray-200 pl-1.5">
              <button onClick={() => setAnio(a=>a-1)} className="p-0.5 text-gray-400 hover:text-gray-700"><ChevronLeft size={12}/></button>
              <span className="font-bold text-gray-700 text-xs w-10 text-center">{anio}</span>
              <button onClick={() => setAnio(a=>a+1)} className="p-0.5 text-gray-400 hover:text-gray-700"><ChevronRight size={12}/></button>
            </div>
          </div>
          <button onClick={() => setModalGen(true)}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm">
            <Zap size={15}/> Generar programa
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-roka-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : (
        <>
          {/* KPIs generales */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { l: 'Total catálogos', v: r.total || 0,       color: 'text-gray-700',    bg: 'bg-gray-50' },
              { l: 'Completadas',     v: r.completadas || 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { l: 'En progreso',     v: r.en_progreso || 0, color: 'text-amber-600',   bg: 'bg-amber-50' },
              { l: 'Programadas',     v: r.programadas || 0, color: 'text-blue-600',    bg: 'bg-blue-50' },
              { l: 'Sin programar',   v: r.sin_prog || 0,    color: r.sin_prog > 0 ? 'text-red-600' : 'text-gray-400', bg: r.sin_prog > 0 ? 'bg-red-50' : 'bg-gray-50' },
            ].map(({ l, v, color, bg }) => (
              <div key={l} className={`${bg} rounded-xl border border-gray-200 p-4 text-center shadow-sm`}>
                <p className={`text-2xl font-black ${color}`}>{v}</p>
                <p className="text-xs text-gray-500 mt-0.5">{l}</p>
              </div>
            ))}
          </div>

          {/* Barra de progreso general */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Avance general del mes</span>
              <span className={`text-lg font-black ${pctColor(pctGeneral)}`}>{pctGeneral}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className={`h-3 rounded-full transition-all ${pctBar(pctGeneral)}`} style={{ width: `${pctGeneral}%` }}/>
            </div>
            <p className="text-xs text-gray-400 mt-1">{r.completadas || 0} de {r.total || 0} catálogos completados</p>
          </div>

          {/* KPIs por sub-módulo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {['A','B','C'].map(cod => (
              <KpiSubmod key={cod} codigo={cod} data={data?.por_submodulo?.[cod]}/>
            ))}
          </div>

          {/* Banner de riesgo */}
          {r.rojo > 0 && (
            <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={16} className="text-red-600 flex-shrink-0"/>
                <p className="text-sm text-red-800">
                  <strong>{r.rojo} catálogo{r.rojo > 1 ? 's' : ''}</strong> {r.rojo > 1 ? 'requieren' : 'requiere'} atención inmediata
                  {r.amarillo > 0 && <span className="text-red-600"> · {r.amarillo} en observación</span>}
                </p>
              </div>
              <button
                onClick={() => { setFiltroSemaforo('rojo'); setOrdenRiesgo(true) }}
                className="flex-shrink-0 text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
                Ver críticos
              </button>
            </div>
          )}

          {/* Tabla de catálogos */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Barra filtros */}
            <div className="flex flex-wrap gap-2 p-3 border-b border-gray-100 bg-gray-50">
              <input value={buscar} onChange={e => setBuscar(e.target.value)}
                placeholder="🔍 Buscar catálogo..."
                className="flex-1 min-w-36 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-roka-300"/>
              <select value={filtroSub} onChange={e => setFiltroSub(e.target.value)}
                className="border border-gray-200 text-sm rounded-lg px-3 py-1.5 text-gray-600 focus:outline-none bg-white">
                <option value="">Todos sub-módulos</option>
                <option value="A">A — Equipos</option>
                <option value="B">B — Infraestructura</option>
                <option value="C">C — Emergencia</option>
              </select>
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
                className="border border-gray-200 text-sm rounded-lg px-3 py-1.5 text-gray-600 focus:outline-none bg-white">
                <option value="">Todos los estados</option>
                <option value="completada">Completada</option>
                <option value="en_progreso">En progreso</option>
                <option value="programada">Programada</option>
                <option value="sin_programar">Sin programar</option>
              </select>
              {/* Filtro semáforo */}
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-1.5 py-1">
                {[
                  { v: '', l: 'Todos' },
                  { v: 'rojo',     l: '🔴' },
                  { v: 'amarillo', l: '🟡' },
                  { v: 'verde',    l: '🟢' },
                ].map(({ v, l }) => (
                  <button key={v || 'all'} onClick={() => setFiltroSemaforo(v)}
                    title={v ? SEMAFORO_CFG[v]?.label : 'Todos los semáforos'}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                      filtroSemaforo === v
                        ? 'bg-roka-500 text-white'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}>
                    {l}
                  </button>
                ))}
              </div>
              {/* Ordenar por riesgo */}
              <button onClick={() => setOrdenRiesgo(o => !o)}
                title="Ordenar de mayor a menor riesgo"
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                  ordenRiesgo
                    ? 'bg-orange-50 text-orange-700 border-orange-300 font-semibold'
                    : 'border-gray-200 text-gray-500 hover:bg-white'
                }`}>
                <TrendingUp size={11}/> Por riesgo
              </button>
              <div className="ml-auto flex items-center gap-2">
                {r.programadas > 0 && (
                  <button onClick={() => setConfirmarLimpiar(true)}
                    title={`Eliminar todas las ${r.programadas} inspecciones programadas (0%) de este mes`}
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 px-2.5 py-1.5 rounded-lg transition-colors font-medium">
                    <Trash2 size={12}/> Limpiar programadas ({r.programadas})
                  </button>
                )}
                <button onClick={cargar} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2">
                  <RefreshCw size={12}/> Actualizar
                </button>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead className="bg-white border-b border-gray-100">
                <tr>
                  {['Sub','Catálogo','Equipos','Insp.','Cumplimiento','Estado','Acción'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {catalogosFiltrados.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                    <ClipboardList size={32} className="mx-auto mb-2 text-gray-200"/>
                    Sin resultados para los filtros aplicados
                  </td></tr>
                ) : catalogosPag.map(cat => (
                  <FilaCatalogo key={cat.catalogo_id} cat={cat} navigate={navigate}
                    onProgramar={programarInspeccion}
                    usuarios={usuarios}
                    onAsignarInspector={handleAsignarInspector}
                    onEliminar={eliminarInspeccion}/>
                ))}
              </tbody>
            </table>

            <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between bg-gray-50 text-xs">
              <span className="text-gray-500">
                {catalogosFiltrados.length > 0
                  ? `Mostrando ${(pagina-1)*POR_PAGINA+1}–${Math.min(pagina*POR_PAGINA, catalogosFiltrados.length)} de ${catalogosFiltrados.length} catálogos`
                  : '0 catálogos'}
                {catalogosFiltrados.length > 0 && <span className="ml-2 text-gray-400">· Haz clic en una fila para ver sus inspecciones</span>}
              </span>
              {totalPags > 1 && (
                <div className="flex items-center gap-1">
                  <button disabled={pagina<=1} onClick={() => setPagina(1)} className="px-2 py-1 rounded border border-gray-300 text-gray-500 disabled:opacity-30 hover:bg-white">«</button>
                  <button disabled={pagina<=1} onClick={() => setPagina(p=>p-1)} className="px-2 py-1 rounded border border-gray-300 text-gray-500 disabled:opacity-30 hover:bg-white">‹</button>
                  {Array.from({length: Math.min(totalPags, 5)}, (_, i) => {
                    const p = Math.max(1, Math.min(totalPags-4, pagina-2)) + i
                    return p <= totalPags ? (
                      <button key={p} onClick={() => setPagina(p)}
                        className={`w-7 h-7 rounded border text-xs font-medium ${p===pagina ? 'bg-roka-500 text-white border-roka-500' : 'border-gray-300 text-gray-600 hover:bg-white'}`}>
                        {p}
                      </button>
                    ) : null
                  })}
                  <button disabled={pagina>=totalPags} onClick={() => setPagina(p=>p+1)} className="px-2 py-1 rounded border border-gray-300 text-gray-500 disabled:opacity-30 hover:bg-white">›</button>
                  <button disabled={pagina>=totalPags} onClick={() => setPagina(totalPags)} className="px-2 py-1 rounded border border-gray-300 text-gray-500 disabled:opacity-30 hover:bg-white">»</button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Sección Evolución mensual */}
      <SeccionTendencia />

      {/* Sección Revisión */}
      <SeccionRevisionMensual navigate={navigate} />

      {/* Modal confirmar limpiar programadas */}
      {confirmarLimpiar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
                <Trash2 size={17} className="text-red-600"/>
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Limpiar programadas 0%</h2>
                <p className="text-xs text-gray-400">{MESES_ES[mes-1]} {anio}</p>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600">
                Se eliminarán <strong className="text-red-600">{r.programadas} inspecciones</strong> en estado <em>Programada</em> (0% de avance) del mes actual.
              </p>
              <p className="text-xs text-gray-400 mt-2">Las inspecciones en progreso o completadas no se ven afectadas.</p>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setConfirmarLimpiar(false)}
                className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={limpiarProgramadas} disabled={limpiando}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40">
                {limpiando ? <RefreshCw size={13} className="animate-spin"/> : <Trash2 size={13}/>}
                {limpiando ? 'Eliminando...' : 'Eliminar todas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal generar programa */}
      {modalGen && (
        <ModalGenerarPrograma
          anio={anio} mes={mes}
          resumen={data?.resumen}
          generando={generando}
          onConfirmar={generarPrograma}
          onClose={() => setModalGen(false)}
          usuarios={usuarios}
        />
      )}
    </div>
  )
}
