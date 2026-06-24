import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Siren, Plus, ChevronRight, CheckCircle, Clock, XCircle,
  BarChart2, LayoutGrid, AlertTriangle, Star, Timer,
  CalendarRange, ClipboardList, ArrowLeft, ChevronLeft, FileSpreadsheet,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList, Cell, PieChart, Pie,
} from 'recharts'
import api from '../../services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Constantes ────────────────────────────────────────────────────
const TIPO_EMOJI  = { sismo:'🌍', incendio:'🔥', derrame:'☠️', evacuacion:'🚨', primeros_auxilios:'🩺', violencia:'🚔' }
const TIPO_LABEL  = { sismo:'Sismo', incendio:'Incendio', derrame:'Derrame', evacuacion:'Evacuación', primeros_auxilios:'Primeros auxilios', violencia:'Violencia' }
const TIPO_COLOR  = { sismo:'#ef4444', incendio:'#f97316', derrame:'#8b5cf6', evacuacion:'#3b82f6', primeros_auxilios:'#10b981', violencia:'#be185d' }
const ESTADO_CFG  = {
  programado: { icon: Clock,         color: 'text-blue-500',    bg: 'bg-blue-50',    bar: '#3b82f6', label: 'Programado'  },
  ejecutado:  { icon: CheckCircle,   color: 'text-emerald-500', bg: 'bg-emerald-50', bar: '#10b981', label: 'Ejecutado'   },
  cancelado:  { icon: XCircle,       color: 'text-red-400',     bg: 'bg-red-50',     bar: '#ef4444', label: 'Cancelado'   },
}
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MESES_L = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// ── Gantt inline ──────────────────────────────────────────────────
function GanttSimulacros({ items, anio }) {
  const navigate = useNavigate()
  const hoy      = new Date()
  const ini      = new Date(anio, 0, 1)
  const fin      = new Date(anio, 11, 31, 23, 59, 59)
  const totalMs  = fin - ini

  const pct = (d) => Math.max(0, Math.min(100, ((new Date(d) - ini) / totalMs) * 100))
  const hoyPct = pct(hoy)

  const mesWidths = Array.from({ length: 12 }, (_, m) => {
    const s = new Date(anio, m, 1), e = new Date(anio, m+1, 0, 23, 59, 59)
    return ((Math.min(e, fin) - Math.max(s, ini)) / totalMs) * 100
  })

  const LABEL_W = 220
  const TIPO_W  = 130

  if (!items?.length) return (
    <div className="text-center py-8 text-gray-400 text-sm">Sin simulacros en {anio}</div>
  )

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 800 }}>
        {/* Cabecera meses */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <div style={{ width: LABEL_W, minWidth: LABEL_W }}
            className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-r border-gray-200 flex-shrink-0">
            Simulacro
          </div>
          <div style={{ width: TIPO_W, minWidth: TIPO_W }}
            className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-r border-gray-200 flex-shrink-0">
            Tipo
          </div>
          <div className="flex flex-1">
            {MESES.map((m, i) => (
              <div key={m} style={{ width: `${mesWidths[i]}%` }}
                className="text-center text-[10px] font-semibold text-gray-400 uppercase py-2 border-r border-gray-100 last:border-0">
                {m}
              </div>
            ))}
          </div>
        </div>

        {/* Filas */}
        <div className="relative">
          {/* Líneas meses */}
          <div className="absolute inset-0 flex pointer-events-none" style={{ paddingLeft: LABEL_W + TIPO_W }}>
            {MESES.map((m, i) => (
              <div key={m} style={{ width: `${mesWidths[i]}%` }} className="border-r border-gray-100 last:border-0 h-full" />
            ))}
          </div>
          {/* Línea hoy */}
          {anio === hoy.getFullYear() && (
            <div className="absolute top-0 bottom-0 z-10 pointer-events-none"
              style={{ left: `calc(${LABEL_W + TIPO_W}px + ${hoyPct}% * (100% - ${LABEL_W + TIPO_W}px) / 100)` }}>
              <div className="w-px h-full bg-roka-500 opacity-60" />
            </div>
          )}
          {items.map((s, idx) => {
            const ecfg  = ESTADO_CFG[s.estado] || ESTADO_CFG.programado
            const Icon  = ecfg.icon
            const left  = pct(s.fecha_programada)
            const opacity = s.estado === 'ejecutado' ? 1 : s.estado === 'cancelado' ? 0.3 : 0.75
            return (
              <div key={s.id}
                className={`flex items-center border-b border-gray-50 last:border-0 hover:bg-gray-50/40 cursor-pointer ${idx % 2 === 0 ? '' : 'bg-gray-50/20'}`}
                style={{ minHeight: 40 }}
                onClick={() => navigate(`/simulacros/${s.id}`)}>
                <div style={{ width: LABEL_W, minWidth: LABEL_W }}
                  className="flex items-center gap-2 px-3 py-2 border-r border-gray-100 flex-shrink-0">
                  <Icon size={11} className={`flex-shrink-0 ${ecfg.color}`} />
                  <p className="text-xs text-gray-700 leading-snug break-words">{s.nombre}</p>
                </div>
                {/* Columna Tipo */}
                <div style={{ width: TIPO_W, minWidth: TIPO_W }}
                  className="px-3 py-2 border-r border-gray-100 flex-shrink-0 flex items-center gap-1.5">
                  <span className="text-sm leading-none">{TIPO_EMOJI[s.tipo]}</span>
                  <span className="text-[11px] text-gray-500 leading-snug">{TIPO_LABEL[s.tipo] || s.tipo}</span>
                </div>
                <div className="flex-1 relative" style={{ minHeight: 40 }}>
                  <div className="absolute rounded-md cursor-pointer group transition-all hover:brightness-90 flex items-center pl-1.5"
                    style={{
                      left: `${left}%`, width: '2.5%', minWidth: 28, height: 24,
                      backgroundColor: TIPO_COLOR[s.tipo] || '#6b7280',
                      opacity, top: '50%', transform: 'translateY(-50%)',
                    }}>
                    <div className="absolute -top-16 left-0 bg-gray-900 text-white text-[11px] px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-xl min-w-max">
                      <div className="font-semibold mb-0.5">{s.nombre}</div>
                      <div className="text-[10px] text-gray-300">
                        {TIPO_EMOJI[s.tipo]} {TIPO_LABEL[s.tipo]} · {format(new Date(s.fecha_programada), "d 'de' MMM yyyy", { locale: es })}
                      </div>
                      {s.area?.nombre && (
                        <div className="text-[10px] text-gray-400 mt-0.5">📍 {s.area.nombre}</div>
                      )}
                      <div className="text-[10px] mt-1">
                        <span className={`px-1.5 py-0.5 rounded ${ecfg.bg} ${ecfg.color} font-medium`}>
                          {ecfg.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-14 flex-shrink-0 text-right pr-2">
                  <span className="text-[10px] text-gray-400">
                    {format(new Date(s.fecha_programada), 'd MMM', { locale: es })}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        {/* Leyenda */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-100 bg-gray-50 text-[10px] text-gray-500 flex-wrap">
          {Object.entries(TIPO_LABEL).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1">
              <span className="w-2.5 h-2 rounded-sm" style={{ backgroundColor: TIPO_COLOR[k] }} />{v}
            </span>
          ))}
          {anio === hoy.getFullYear() && (
            <span className="flex items-center gap-1.5 ml-2">
              <span className="w-px h-3 bg-roka-500 opacity-60" />Hoy
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────────
export default function SimulacroDashboardPage() {
  const navigate  = useNavigate()
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [anio, setAnio]     = useState(new Date().getFullYear())
  const [vistaGantt, setVG] = useState('gantt')

  useEffect(() => { cargar() }, [anio])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/simulacros/estadisticas', { params: { anio } })
      setStats(data)
    } catch { } finally { setLoading(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const porMes = stats?.por_mes || {}
  const maxBar = Math.max(...Object.values(porMes).map(m => m.total || 0), 1)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Siren size={24} className="text-roka-500" /> Simulacros
          </h1>
          <p className="text-gray-500 text-sm mt-1">Plan de simulacros de emergencia · Art. 74 DS 005-2012-TR</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/simulacros/lista')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <ClipboardList size={14} /> Lista
          </button>
          <button onClick={() => navigate('/simulacros/importar')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <FileSpreadsheet size={14} /> Importar / Exportar
          </button>
          <button onClick={() => navigate('/simulacros/nuevo')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={15} /> Nuevo simulacro
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label:'Total planificados',     value: stats?.total ?? 0,              color:'text-gray-800' },
          { label:'Ejecutados',             value: stats?.ejecutados ?? 0,          color:'text-emerald-600' },
          { label:'Programados',            value: stats?.programados ?? 0,         color:'text-blue-600' },
          { label:'Cumplimiento',           value: `${stats?.cumplimiento ?? 0}%`,  color: (stats?.cumplimiento ?? 0) >= 80 ? 'text-emerald-600' : 'text-amber-600' },
          { label:'Eval. promedio',         value: stats?.promedio_evaluacion ? `${stats.promedio_evaluacion}/5` : '—', color:'text-amber-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Próximo simulacro */}
      {stats?.proximo && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => navigate(`/simulacros/${stats.proximo.id}`)}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">
              {TIPO_EMOJI[stats.proximo.tipo] || '📋'}
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Próximo simulacro</p>
              <p className="font-semibold text-gray-800">{stats.proximo.nombre}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-blue-700 bg-blue-100 border border-blue-300 px-3 py-1 rounded-full">
              {format(new Date(stats.proximo.fecha_programada), "d 'de' MMMM yyyy", { locale: es })}
            </span>
            <ChevronRight size={16} className="text-blue-400" />
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Distribución mensual */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <BarChart2 size={16} className="text-roka-500" /> Distribución mensual {anio}
            </h2>
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
              <button onClick={() => setAnio(a => a - 1)} className="px-2 py-1 text-gray-400 hover:bg-gray-50 text-sm">‹</button>
              <span className="px-2 text-xs font-bold text-gray-700">{anio}</span>
              <button onClick={() => setAnio(a => a + 1)} className="px-2 py-1 text-gray-400 hover:bg-gray-50 text-sm">›</button>
            </div>
          </div>
          <div className="flex items-end gap-1" style={{ height: 120 }}>
            {MESES.map((mes, i) => {
              const m = porMes[i + 1] || { total: 0, ejecutados: 0 }
              const h = maxBar > 0 ? Math.round((m.total / maxBar) * 100) : 0
              const pct = m.total > 0 ? Math.round(m.ejecutados / m.total * 100) : 0
              return (
                <div key={mes} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col justify-end relative" style={{ height: 96 }}>
                    {m.total > 0 && (
                      <span className="absolute w-full text-center text-[10px] font-bold text-gray-600"
                        style={{ bottom: `${Math.max(h, 8)}%`, marginBottom: 2 }}>{m.total}</span>
                    )}
                    <div className="w-full rounded-t-sm transition-all"
                      style={{
                        height: `${Math.max(h, m.total > 0 ? 8 : 0)}%`,
                        background: pct === 100 ? '#10b981' : pct > 0 ? '#3b82f6' : m.total > 0 ? '#e5e7eb' : 'transparent',
                      }} title={`${mes}: ${m.ejecutados}/${m.total}`} />
                  </div>
                  <span className="text-[9px] text-gray-400">{mes}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-emerald-500 rounded-sm inline-block"/>100% ejecutado</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-500 rounded-sm inline-block"/>Parcial</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-gray-200 rounded-sm inline-block"/>Pendiente</span>
          </div>
        </div>

        {/* Por tipo */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Siren size={16} className="text-roka-500" /> Por tipo
          </h2>
          {!(stats?.por_tipo?.length) ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin datos</p>
          ) : (
            <div className="space-y-2.5">
              {(stats.por_tipo || []).map(t => {
                const pct = stats.total > 0 ? Math.round(t.total / stats.total * 100) : 0
                return (
                  <div key={t.tipo}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-700 flex items-center gap-1.5">
                        {TIPO_EMOJI[t.tipo]} {TIPO_LABEL[t.tipo] || t.tipo}
                      </span>
                      <span className="text-xs font-bold text-gray-800">{t.total}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width:`${pct}%`, backgroundColor: TIPO_COLOR[t.tipo] || '#9ca3af' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Gantt / Lista accesos rápidos */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <CalendarRange size={16} className="text-roka-500" /> Cronograma {anio}
          </h2>
          <div className="flex gap-2">
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button onClick={() => setVG('gantt')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${vistaGantt === 'gantt' ? 'bg-roka-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                <BarChart2 size={12} /> Gantt
              </button>
              <button onClick={() => setVG('lista')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${vistaGantt === 'lista' ? 'bg-roka-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                <LayoutGrid size={12} /> Lista
              </button>
            </div>
          </div>
        </div>

        {vistaGantt === 'gantt' ? (
          <GanttSimulacros items={stats?.cronograma} anio={anio} />
        ) : (
          <div className="divide-y divide-gray-100">
            {!(stats?.cronograma?.length) ? (
              <div className="text-center py-10 text-gray-400 text-sm">Sin simulacros en {anio}</div>
            ) : stats.cronograma.map(s => {
              const ecfg = ESTADO_CFG[s.estado] || ESTADO_CFG.programado
              const Icon = ecfg.icon
              return (
                <div key={s.id}
                  onClick={() => navigate(`/simulacros/${s.id}`)}
                  className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className={`w-9 h-9 ${ecfg.bg} rounded-xl flex items-center justify-center text-base flex-shrink-0`}>
                    {TIPO_EMOJI[s.tipo]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.nombre}</p>
                    <p className="text-xs text-gray-400">{TIPO_LABEL[s.tipo]}{s.area?.nombre ? ` · ${s.area.nombre}` : ''}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${ecfg.bg} ${ecfg.color} border-current/20`}>
                      <Icon size={10} /> {ecfg.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {format(new Date(s.fecha_programada), 'd MMM yyyy', { locale: es })}
                    </span>
                  </div>
                  <ChevronRight size={13} className="text-gray-300" />
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
