import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ChevronLeft, ChevronRight, Plus, GraduationCap,
  CheckCircle, Clock, XCircle, RefreshCw, Calendar, BarChart2, LayoutGrid,
} from 'lucide-react'
import api from '../../services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const MESES_LABEL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const TIPO_COLOR = {
  induccion:       'border-l-blue-500 bg-blue-50/50',
  especifica:      'border-l-purple-500 bg-purple-50/50',
  general:         'border-l-emerald-500 bg-emerald-50/50',
  sensibilizacion: 'border-l-amber-500 bg-amber-50/50',
}
const TIPO_DOT = {
  induccion: 'bg-blue-500', especifica: 'bg-purple-500',
  general: 'bg-emerald-500', sensibilizacion: 'bg-amber-500',
}
const TIPO_GANTT = {
  induccion: '#3b82f6', especifica: '#8b5cf6',
  general: '#10b981', sensibilizacion: '#f59e0b',
}
const ESTADO_ICON = {
  ejecutada:    { icon: CheckCircle, color: 'text-emerald-500' },
  programada:   { icon: Clock,       color: 'text-blue-500' },
  cancelada:    { icon: XCircle,     color: 'text-red-400' },
  reprogramada: { icon: RefreshCw,   color: 'text-amber-500' },
}

// ── MesCard (vista calendario) ────────────────────────────────────
function MesCard({ mesData, mesLabel, onVerDetalle, onNueva }) {
  const { total, ejecutadas, programadas, canceladas, horas, items } = mesData
  const pct = total > 0 ? Math.round(ejecutadas / total * 100) : 0
  const barColor = pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-blue-500' : pct > 0 ? 'bg-amber-400' : 'bg-gray-200'

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-800 text-sm">{mesLabel}</h3>
          <div className="flex items-center gap-1">
            {total > 0 && (
              <span className={`text-xs font-bold ${pct === 100 ? 'text-emerald-600' : pct > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                {pct}%
              </span>
            )}
            <button onClick={onNueva}
              className="w-5 h-5 rounded-full bg-gray-100 hover:bg-roka-100 hover:text-roka-600 flex items-center justify-center text-gray-400 transition-colors ml-1">
              <Plus size={11} />
            </button>
          </div>
        </div>
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
        {total > 0 && (
          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400">
            {ejecutadas > 0 && <span className="text-emerald-600 font-medium">{ejecutadas} ejec.</span>}
            {programadas > 0 && <span className="text-blue-600 font-medium">{programadas} prog.</span>}
            {canceladas > 0  && <span className="text-red-400">{canceladas} cancel.</span>}
            {horas > 0       && <span>{horas}h</span>}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto max-h-48 divide-y divide-gray-50">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-gray-300">
            <Calendar size={20} className="mb-1" />
            <span className="text-xs">Sin capacitaciones</span>
          </div>
        ) : (
          items.map(cap => {
            const EIcon = ESTADO_ICON[cap.estado] || ESTADO_ICON.programada
            return (
              <div key={cap.id}
                onClick={() => onVerDetalle(cap.id)}
                className={`px-3 py-2.5 flex items-start gap-2 cursor-pointer hover:bg-gray-50 border-l-2 ${TIPO_COLOR[cap.tipo] || ''} transition-colors`}>
                <EIcon.icon size={12} className={`mt-0.5 flex-shrink-0 ${EIcon.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 leading-snug line-clamp-2">{cap.titulo}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${TIPO_DOT[cap.tipo] || 'bg-gray-300'}`} />
                    <span className="text-[10px] text-gray-400">
                      {format(new Date(cap.fecha_programada), 'd MMM', { locale: es })}
                      {cap.duracion_horas && ` · ${cap.duracion_horas}h`}
                    </span>
                  </div>
                  {cap.area?.nombre && <span className="text-[10px] text-gray-400">{cap.area.nombre}</span>}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── GANTT ─────────────────────────────────────────────────────────
function GanttCapacitaciones({ meses, anio, onVerDetalle, onNueva }) {
  const [filtroTema, setFiltroTema] = useState('')

  const hoy        = new Date()
  const inicioAnio = new Date(anio, 0, 1)
  const finAnio    = new Date(anio, 11, 31, 23, 59, 59)
  const totalMs    = finAnio - inicioAnio

  const pct = (fecha) =>
    Math.max(0, Math.min(100, ((new Date(fecha) - inicioAnio) / totalMs) * 100))

  const hoyPct = pct(hoy)

  // Calcular ancho % de cada mes
  const mesWidths = Array.from({ length: 12 }, (_, m) => {
    const ini = new Date(anio, m, 1)
    const fin = new Date(anio, m + 1, 0, 23, 59, 59)
    return ((Math.min(fin, finAnio) - Math.max(ini, inicioAnio)) / totalMs) * 100
  })

  // Aplanar todas las capacitaciones ordenadas por fecha
  const todasLasCaps = meses.flatMap(m => m.items || [])
    .sort((a, b) => new Date(a.fecha_programada) - new Date(b.fecha_programada))

  // Temas únicos para los botones de filtro
  const temasUnicos = [...new Set(
    todasLasCaps.map(c => c.tema).filter(Boolean)
  )].sort()

  // Aplicar filtro por tema
  const capsFiltradas = filtroTema
    ? todasLasCaps.filter(c => c.tema === filtroTema)
    : todasLasCaps

  // Agrupar por mes para separadores
  const porMes = {}
  capsFiltradas.forEach(cap => {
    const m = new Date(cap.fecha_programada).getMonth()
    if (!porMes[m]) porMes[m] = []
    porMes[m].push(cap)
  })

  const ROW_H   = 'auto'
  const LABEL_W = 300
  const TEMA_W  = 180

  if (todasLasCaps.length === 0) return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-16 text-gray-400">
      <GraduationCap size={32} className="mb-3 opacity-30" />
      <p className="text-sm">Sin capacitaciones en {anio}</p>
    </div>
  )

  return (
    <div className="space-y-3">

      {/* Filtros por tema */}
      {temasUnicos.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">
            Tema:
          </span>
          <button
            onClick={() => setFiltroTema('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              !filtroTema
                ? 'bg-roka-500 text-white border-roka-500 shadow-sm'
                : 'bg-white text-gray-500 border-gray-300 hover:border-roka-400 hover:text-roka-600'
            }`}>
            Todos ({todasLasCaps.length})
          </button>
          {temasUnicos.map(tema => {
            const count = todasLasCaps.filter(c => c.tema === tema).length
            const activo = filtroTema === tema
            return (
              <button key={tema}
                onClick={() => setFiltroTema(activo ? '' : tema)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  activo
                    ? 'bg-roka-500 text-white border-roka-500 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-roka-400 hover:text-roka-600 hover:bg-roka-50'
                }`}>
                {tema}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activo ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ minWidth: 900 }}>

          {/* Cabecera meses */}
          <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
            <div style={{ width: LABEL_W, minWidth: LABEL_W }}
              className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 flex-shrink-0">
              Capacitación
            </div>
            <div style={{ width: TEMA_W, minWidth: TEMA_W }}
              className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 flex-shrink-0">
              Tema
            </div>
            <div className="flex flex-1">
              {MESES_CORTO.map((mes, i) => (
                <div key={mes} style={{ width: `${mesWidths[i]}%` }}
                  className="text-center text-[11px] font-semibold text-gray-500 uppercase py-2.5 border-r border-gray-100 last:border-0">
                  {mes}
                </div>
              ))}
            </div>
          </div>

          {/* Filas por mes */}
          <div className="relative">
            {/* Líneas verticales de meses */}
            <div className="absolute inset-0 flex pointer-events-none" style={{ paddingLeft: LABEL_W + TEMA_W }}>
              {MESES_CORTO.map((mes, i) => (
                <div key={mes} style={{ width: `${mesWidths[i]}%` }}
                  className="border-r border-gray-100 last:border-0 h-full" />
              ))}
            </div>

            {/* Línea HOY */}
            {anio === hoy.getFullYear() && (
              <div className="absolute top-0 bottom-0 z-20 pointer-events-none"
                style={{ left: `calc(${LABEL_W + TEMA_W}px + ${hoyPct}% * (100% - ${LABEL_W + TEMA_W}px) / 100)` }}>
                <div className="w-px h-full bg-roka-500 opacity-60" />
                <div className="absolute -top-0.5 -translate-x-1/2 bg-roka-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  Hoy
                </div>
              </div>
            )}

            {/* Secciones por mes */}
            {Object.entries(porMes).map(([mesIdx, caps]) => (
              <div key={mesIdx}>
                {/* Filas de capacitaciones (sin separador de mes) */}
                {caps.map((cap, idx) => {
                  const s    = ESTADO_ICON[cap.estado] || ESTADO_ICON.programada
                  const Icon = s.icon
                  const fill = TIPO_GANTT[cap.tipo] || '#9ca3af'

                  // Posición de la barra: desde fecha_programada
                  const barLeft  = pct(cap.fecha_programada)
                  // Ancho proporcional a horas (8h = ~0.22% del año; mínimo 1.5%)
                  const barWidth = Math.max(1.5, (cap.duracion_horas / 24 / 365) * 100 * 4)
                  // Opacidad según estado
                  const opacity  = cap.estado === 'ejecutada' ? 1
                    : cap.estado === 'cancelada' ? 0.3
                    : 0.75

                  return (
                    <div key={cap.id}
                      className={`flex items-stretch border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/20'}`}
                      style={{ minHeight: 44 }}>

                      {/* Título */}
                      <div style={{ width: LABEL_W, minWidth: LABEL_W }}
                        className="flex items-start gap-2 px-3 py-2 border-r border-gray-100 flex-shrink-0 cursor-pointer"
                        onClick={() => onVerDetalle(cap.id)}>
                        <Icon size={12} className={`flex-shrink-0 mt-0.5 ${s.color}`} />
                        <p className="text-xs text-gray-700 leading-snug break-words">{cap.titulo}</p>
                      </div>

                      {/* Tema */}
                      <div style={{ width: TEMA_W, minWidth: TEMA_W }}
                        className="px-3 py-2 border-r border-gray-100 flex-shrink-0 flex items-start">
                        <p className="text-[11px] text-gray-400 italic leading-snug break-words">
                          {cap.tema || <span className="text-gray-200">—</span>}
                        </p>
                      </div>

                      {/* Zona Gantt */}
                      <div className="flex-1 relative flex items-center" style={{ minHeight: 44 }}>
                        {/* Barra */}
                        <div
                          className="absolute rounded-md flex items-center justify-start pl-1.5 cursor-pointer group transition-all hover:brightness-90"
                          style={{
                            left:            `${barLeft}%`,
                            width:           `${barWidth}%`,
                            height:          26,
                            backgroundColor: fill,
                            opacity,
                            top:             '50%',
                            transform:       'translateY(-50%)',
                            minWidth:        32,
                          }}
                          onClick={() => onVerDetalle(cap.id)}
                          title={`${cap.titulo} — ${format(new Date(cap.fecha_programada), 'd MMM yyyy', { locale: es })} · ${cap.duracion_horas}h`}>

                          {/* Texto dentro de la barra */}
                          {barWidth > 5 && (
                            <span className="text-[9px] font-bold text-white/90 truncate">
                              {cap.duracion_horas}h
                            </span>
                          )}

                          {/* Tooltip */}
                          <div className="absolute -top-8 left-0 bg-gray-900 text-white text-[10px] font-medium px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-lg">
                            {format(new Date(cap.fecha_programada), 'd MMM', { locale: es })} · {cap.duracion_horas}h
                            {cap.estado === 'ejecutada' && ' ✓'}
                          </div>
                        </div>

                        {/* Botón nueva cap en este mes */}
                        <button
                          onClick={() => onNueva(new Date(cap.fecha_programada).getMonth() + 1)}
                          className="absolute right-1 p-1 text-gray-300 hover:text-roka-500 hover:bg-roka-50 rounded opacity-0 group-hover:opacity-100 z-10 transition-all"
                          style={{ top: '50%', transform: 'translateY(-50%)' }}>
                          <Plus size={11} />
                        </button>
                      </div>

                      {/* Fecha */}
                      <div className="w-16 flex-shrink-0 text-right pr-3 flex items-center justify-end">
                        <span className="text-[10px] text-gray-400">
                          {format(new Date(cap.fecha_programada), 'd MMM', { locale: es })}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-5 px-4 py-3 border-t border-gray-100 bg-gray-50 flex-wrap text-xs text-gray-500">
        <span className="font-medium text-gray-600">Tipo:</span>
        {[['induccion','Inducción','#3b82f6'],['especifica','Específica','#8b5cf6'],['general','General','#10b981'],['sensibilizacion','Sensibilización','#f59e0b']].map(([,label,c]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="w-3 h-2.5 rounded-sm" style={{ backgroundColor: c }} />{label}
          </span>
        ))}
        <span className="ml-3 font-medium text-gray-600">Estado:</span>
        <span className="flex items-center gap-1"><CheckCircle size={11} className="text-emerald-500" />Ejecutada (100%)</span>
        <span className="flex items-center gap-1"><Clock size={11} className="text-blue-400" />Programada (75%)</span>
        <span className="flex items-center gap-1"><XCircle size={11} className="text-gray-300" />Cancelada (30%)</span>
        {anio === new Date().getFullYear() && (
          <span className="flex items-center gap-1.5 ml-2">
            <span className="w-px h-3 bg-roka-500 opacity-60" />Hoy
          </span>
        )}
        <span className="ml-auto text-gray-400">
          {filtroTema
            ? `${capsFiltradas.length} de ${todasLasCaps.length} capacitaciones`
            : `${todasLasCaps.length} capacitaciones`}
        </span>
      </div>
    </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────
export default function CronogramaAnualPage() {
  const navigate = useNavigate()
  const [anio, setAnio]         = useState(new Date().getFullYear())
  const [cronograma, setCronograma] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [vista, setVista]       = useState('calendario')  // 'calendario' | 'gantt'

  useEffect(() => { cargar() }, [anio])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/capacitaciones/cronograma', { params: { anio } })
      setCronograma(data)
    } catch { } finally { setLoading(false) }
  }

  const irANueva = (mes) => {
    const fecha = `${anio}-${String(mes).padStart(2, '0')}-01`
    navigate(`/capacitaciones/nueva?fecha=${fecha}`)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const total        = cronograma?.total || 0
  const ejecutadas   = cronograma?.ejecutadas || 0
  const cumplimiento = total > 0 ? Math.round(ejecutadas / total * 100) : 0
  const meses        = cronograma?.meses || []

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/capacitaciones')} className="btn-back">
            <ArrowLeft size={14} /> Dashboard
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cronograma Anual</h1>
            <p className="text-gray-500 text-sm mt-0.5">Plan de capacitaciones {anio}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Selector año */}
          <button onClick={() => setAnio(a => a - 1)}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-bold text-gray-800 w-12 text-center">{anio}</span>
          <button onClick={() => setAnio(a => a + 1)}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
            <ChevronRight size={15} />
          </button>

          {/* Toggle vista */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden ml-2">
            <button onClick={() => setVista('calendario')}
              title="Vista calendario"
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${vista === 'calendario' ? 'bg-roka-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              <LayoutGrid size={13} /> Calendario
            </button>
            <button onClick={() => setVista('gantt')}
              title="Vista Gantt"
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${vista === 'gantt' ? 'bg-roka-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              <BarChart2 size={13} /> Gantt
            </button>
          </div>

          <button onClick={() => navigate('/capacitaciones/nueva')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium ml-1">
            <Plus size={15} /> Nueva
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total planificadas', value: total,              color: 'text-gray-800' },
          { label: 'Ejecutadas',         value: ejecutadas,          color: 'text-emerald-600' },
          { label: 'Pendientes',         value: total - ejecutadas,  color: 'text-blue-600' },
          { label: 'Cumplimiento',       value: `${cumplimiento}%`,  color: cumplimiento >= 80 ? 'text-emerald-600' : 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Leyenda tipos + estados (solo en calendario) */}
      {vista === 'calendario' && (
        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
          <span className="font-medium text-gray-600">Tipos:</span>
          {[['induccion','Inducción','bg-blue-500'],['especifica','Específica','bg-purple-500'],['general','General','bg-emerald-500'],['sensibilizacion','Sensibilización','bg-amber-500']].map(([,label,bg]) => (
            <span key={label} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${bg}`} />{label}
            </span>
          ))}
          <span className="ml-4 font-medium text-gray-600">Estado:</span>
          {[['text-emerald-500','Ejecutada'],['text-blue-500','Programada'],['text-amber-500','Reprogramada'],['text-red-400','Cancelada']].map(([color,label]) => (
            <span key={label} className="flex items-center gap-1">
              <CheckCircle size={11} className={color} />{label}
            </span>
          ))}
        </div>
      )}

      {/* Contenido según vista */}
      {vista === 'calendario' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {meses.map((mesData, i) => (
            <MesCard
              key={i}
              mesData={mesData}
              mesLabel={MESES_LABEL[i]}
              onVerDetalle={(id) => navigate(`/capacitaciones/${id}`)}
              onNueva={() => irANueva(i + 1)}
            />
          ))}
        </div>
      ) : (
        <GanttCapacitaciones
          meses={meses}
          anio={anio}
          onVerDetalle={(id) => navigate(`/capacitaciones/${id}`)}
          onNueva={irANueva}
        />
      )}
    </div>
  )
}
