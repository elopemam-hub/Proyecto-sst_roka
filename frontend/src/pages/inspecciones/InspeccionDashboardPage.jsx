import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  ClipboardList, AlertTriangle, CheckCircle2, Clock,
  TrendingUp, Wrench, BookOpen, Plus, ArrowRight,
  ShieldAlert, Activity, BarChart3, Filter, X, RotateCcw, Zap,
} from 'lucide-react'
import api from '../../services/api'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_COLOR = {
  programada:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',   dot: 'bg-blue-500'    },
  en_ejecucion:  { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  dot: 'bg-amber-500'   },
  ejecutada:     { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',dot: 'bg-emerald-500' },
  con_hallazgos: { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200', dot: 'bg-orange-500'  },
  cerrada:       { bg: 'bg-gray-100',   text: 'text-gray-600',    border: 'border-gray-200',   dot: 'bg-gray-400'    },
  anulada:       { bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-200',    dot: 'bg-red-400'     },
}

const ESTADO_LABEL = {
  programada: 'Programada', en_ejecucion: 'En ejecución',
  ejecutada: 'Ejecutada', con_hallazgos: 'Con hallazgos',
  cerrada: 'Cerrada', anulada: 'Anulada',
}

const TIPO_LABEL = {
  equipos: 'Equipos', infraestructura: 'Infraestructura', emergencias: 'Emergencias',
  epps: 'EPPs', orden_limpieza: 'Orden/Limpieza', higiene: 'Higiene', general: 'General',
}

const PIE_COLORS = ['#3b82f6','#f59e0b','#10b981','#f97316','#6b7280','#ef4444']

const SUBMOD_STYLE = {
  A: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  B: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', dot: 'bg-teal-500' },
  C: { bg: 'bg-red-50',  border: 'border-red-200',  text: 'text-red-700',  dot: 'bg-red-500'  },
}

function pctColor(v) {
  if (v >= 90) return 'text-emerald-600'
  if (v >= 70) return 'text-amber-600'
  return 'text-red-500'
}

function pctBg(v) {
  if (v >= 90) return 'bg-emerald-500'
  if (v >= 70) return 'bg-amber-500'
  return 'bg-red-500'
}

const RESULTADO_OPTS = [
  { value: '',             label: 'Todos los resultados' },
  { value: 'conforme',     label: '✅ Conforme (≥80%)'  },
  { value: 'regular',      label: '⚠️ Regular (50-79%)'  },
  { value: 'no_conforme',  label: '❌ No conforme (<50%)' },
  { value: 'sin_resultado',label: '⭕ Sin resultado'       },
]

const MESES_OPTS = [
  { value: 3,  label: 'Últimos 3 meses' },
  { value: 6,  label: 'Últimos 6 meses' },
  { value: 12, label: 'Último año'      },
]

export default function InspeccionDashboardPage() {
  const navigate  = useNavigate()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [filtroEquipo,    setFiltroEquipo]    = useState('')
  const [filtroResultado, setFiltroResultado] = useState('')
  const [filtroMeses,     setFiltroMeses]     = useState(6)

  const hayFiltros = filtroEquipo || filtroResultado || filtroMeses !== 6

  const cargar = () => {
    setLoading(true)
    const params = { meses: filtroMeses }
    if (filtroEquipo)    params.equipo_id  = filtroEquipo
    if (filtroResultado) params.resultado  = filtroResultado
    api.get('/inspecciones/dashboard', { params })
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [filtroEquipo, filtroResultado, filtroMeses])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const porMesData = (data?.por_mes || []).map(m => ({
    mes: format(parseISO(m.mes + '-01'), 'MMM', { locale: es }),
    total: m.total,
    pct: m.pct_prom ?? 0,
  }))

  const porTipoData = (data?.por_tipo || [])
    .map(t => ({
      name:    TIPO_LABEL[t.tipo] || t.tipo,
      total:   t.total,
      pct_prom: t.pct_prom ?? 0,
    }))
    .sort((a, b) => b.pct_prom - a.pct_prom)

  const estadoEntries = Object.entries(data?.por_estado || {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard — Inspecciones</h1>
          <p className="text-gray-500 text-sm mt-1">Resumen general del módulo de inspecciones SST</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Checklist Diario: acceso a cards + tabla */}
          <button onClick={() => navigate('/inspecciones/diarias')}
            className="flex items-center gap-1.5 text-sm border border-roka-300 text-roka-600 bg-roka-50 hover:bg-roka-100 px-3 py-2 rounded-lg transition-colors font-medium">
            <Zap size={14} /> Checklist Diario
          </button>
          <button onClick={() => navigate('/inspecciones/tabla-diaria')}
            className="flex items-center gap-1.5 text-sm border border-roka-300 text-roka-600 hover:bg-roka-50 px-3 py-2 rounded-lg transition-colors">
            <ClipboardList size={14} /> Tabla Diaria
          </button>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Checklist Mensual: nueva + tabla */}
          <button onClick={() => navigate('/inspecciones/mensual')}
            style={{ borderColor: '#FFD700', color: '#B8860B', backgroundColor: '#FFFDE7' }}
            className="flex items-center gap-1.5 text-sm border px-3 py-2 rounded-lg transition-colors font-medium hover:opacity-90">
            <ClipboardList size={14} /> Checklist Mensual
          </button>
          <button onClick={() => navigate('/inspecciones/tabla-mensual')}
            style={{ borderColor: '#FFD700', color: '#B8860B' }}
            className="flex items-center gap-1.5 text-sm border px-3 py-2 rounded-lg transition-colors hover:opacity-90"
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#FFFDE7'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor=''}>
            <ClipboardList size={14} /> Tabla Mensual
          </button>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          <button onClick={() => navigate('/inspecciones/lista')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <ClipboardList size={14} /> Ver todas
          </button>
          <button onClick={() => navigate('/inspecciones/kpi-equipos')}
            className="flex items-center gap-1.5 text-sm border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 px-3 py-2 rounded-lg transition-colors font-medium">
            <BarChart3 size={14} /> KPI Equipos
          </button>
          <button onClick={() => navigate('/inspecciones/catalogo')}
            className="flex items-center gap-1.5 text-sm border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors font-medium">
            <BarChart3 size={14} /> Dashboard Equipos
          </button>
          <button onClick={() => navigate('/inspecciones/nueva')}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Nueva Inspección
          </button>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <Filter size={14} className="text-roka-500" />
            Filtrar gráficos:
          </div>

          {/* Filtro por equipo */}
          <select
            value={filtroEquipo}
            onChange={e => setFiltroEquipo(e.target.value)}
            className="border border-gray-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-roka-500 text-gray-700">
            <option value="">Todos los equipos</option>
            {(data?.equipos_disponibles || []).map(e => (
              <option key={e.id} value={e.id}>
                {e.codigo ? `[${e.codigo}] ` : ''}{e.nombre}
              </option>
            ))}
          </select>

          {/* Filtro por resultado */}
          <select
            value={filtroResultado}
            onChange={e => setFiltroResultado(e.target.value)}
            className="border border-gray-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-roka-500 text-gray-700">
            {RESULTADO_OPTS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Filtro por período */}
          <div className="flex gap-1">
            {MESES_OPTS.map(o => (
              <button key={o.value}
                onClick={() => setFiltroMeses(o.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filtroMeses === o.value
                    ? 'bg-roka-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {o.label}
              </button>
            ))}
          </div>

          {/* Limpiar filtros */}
          {hayFiltros && (
            <button
              onClick={() => { setFiltroEquipo(''); setFiltroResultado(''); setFiltroMeses(6) }}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors">
              <X size={12} /> Limpiar
            </button>
          )}

          {/* Indicador de filtros activos */}
          {hayFiltros && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-roka-600 bg-roka-50 border border-roka-200 px-2.5 py-1 rounded-full font-medium">
              <Filter size={10} />
              Filtros activos
            </span>
          )}
        </div>

        {/* Chips de filtros activos */}
        {hayFiltros && (
          <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-gray-100">
            {filtroEquipo && (
              <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">
                Equipo: {(data?.equipos_disponibles || []).find(e => String(e.id) === String(filtroEquipo))?.nombre || filtroEquipo}
                <button onClick={() => setFiltroEquipo('')} className="hover:text-blue-900"><X size={10}/></button>
              </span>
            )}
            {filtroResultado && (
              <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
                Resultado: {RESULTADO_OPTS.find(o => o.value === filtroResultado)?.label}
                <button onClick={() => setFiltroResultado('')} className="hover:text-amber-900"><X size={10}/></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total inspecciones', value: data?.total ?? 0,           icon: ClipboardList, color: 'text-roka-600',    bg: 'bg-roka-50'    },
          { label: 'Programadas',        value: data?.por_estado?.programada ?? 0,   icon: Clock,         color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Con hallazgos',      value: data?.por_estado?.con_hallazgos ?? 0, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: '% Cumplimiento',     value: `${data?.pct_promedio ?? 0}%`,       icon: TrendingUp,    color: 'text-emerald-600',bg: 'bg-emerald-50'},
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={20} className={color} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 leading-tight">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Checklist KPIs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} className="text-roka-500" />
          <h2 className="font-semibold text-gray-800">Inspecciones por Catálogo (Checklist)</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total checklist',    value: data?.checklist?.total ?? 0,       color: 'text-gray-800' },
            { label: 'Completadas',        value: data?.checklist?.completadas ?? 0, color: 'text-emerald-600' },
            { label: '% Puntaje promedio', value: `${data?.checklist?.pct_prom ?? 0}%`, color: pctColor(data?.checklist?.pct_prom ?? 0) },
            { label: 'Acciones abiertas',  value: data?.checklist?.acciones_abiertas ?? 0, color: 'text-orange-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center py-3 px-4 bg-gray-50 rounded-xl">
              <p className={`text-3xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Inspecciones por mes */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-roka-500" />
            <h2 className="font-semibold text-gray-800">Inspecciones — últimos 6 meses</h2>
          </div>
          {porMesData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={porMesData} barSize={32} margin={{ top: 22, right: 10, bottom: 0, left: 0 }}>
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  formatter={(v, name) => [v, name === 'total' ? 'Inspecciones' : '% Promedio']}
                />
                <Bar dataKey="total" fill="#0ea5e9" radius={[4,4,0,0]} name="total">
                  <LabelList
                    dataKey="total"
                    position="top"
                    style={{ fontSize: 12, fontWeight: 700, fill: '#0369a1' }}
                  />
                  <LabelList
                    dataKey="pct"
                    position="insideTop"
                    style={{ fontSize: 10, fontWeight: 600, fill: '#fff' }}
                    formatter={v => v > 0 ? `${v}%` : ''}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Por tipo — barra horizontal con % promedio */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-roka-500" />
              <h2 className="font-semibold text-gray-800">% Promedio por tipo</h2>
            </div>
            <span className="text-xs text-gray-400">Cumplimiento promedio</span>
          </div>
          {porTipoData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={porTipoData}
                layout="vertical"
                margin={{ top: 0, right: 55, bottom: 0, left: 80 }}>
                <XAxis
                  type="number" domain={[0, 100]}
                  tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${v}%`}
                />
                <YAxis
                  type="category" dataKey="name"
                  tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={75}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  formatter={(v, name) => [`${v}%`, 'Cumplimiento prom.']}
                  labelFormatter={label => {
                    const item = porTipoData.find(d => d.name === label)
                    return `${label} (${item?.total ?? 0} inspecciones)`
                  }}
                />
                <Bar dataKey="pct_prom" name="% Promedio" radius={[0,4,4,0]} barSize={20}>
                  {porTipoData.map((d, i) => (
                    <Cell key={i}
                      fill={d.pct_prom >= 90 ? '#10b981' : d.pct_prom >= 70 ? '#f59e0b' : d.pct_prom > 0 ? '#ef4444' : '#d1d5db'}
                    />
                  ))}
                  <LabelList
                    dataKey="pct_prom"
                    position="right"
                    style={{ fontSize: 11, fontWeight: 700, fill: '#374151' }}
                    formatter={v => `${v}%`}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Sub-módulos + Top NC */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Por sub-módulo */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wrench size={16} className="text-roka-500" />
            <h2 className="font-semibold text-gray-800">Checklist por sub-módulo</h2>
          </div>
          {(data?.por_submodulo || []).length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Sin inspecciones por catálogo aún</div>
          ) : (
            <div className="space-y-3">
              {(data?.por_submodulo || []).map(s => {
                const st = SUBMOD_STYLE[s.codigo] || SUBMOD_STYLE.A
                return (
                  <div key={s.codigo} className={`flex items-center gap-4 p-3 rounded-xl border ${st.bg} ${st.border}`}>
                    <div className={`w-9 h-9 rounded-lg ${st.dot} flex items-center justify-center text-white font-black text-sm flex-shrink-0`}>
                      {s.codigo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${st.text}`}>{s.nombre}</p>
                      <p className="text-xs text-gray-500">{s.total} inspección{s.total !== 1 ? 'es' : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-black ${pctColor(s.puntaje_prom ?? 0)}`}>{s.puntaje_prom ?? 0}%</p>
                      <p className="text-[10px] text-gray-400">puntaje prom.</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top NC */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-orange-500" />
            <h2 className="font-semibold text-gray-800">Top equipos con No Conformidades</h2>
          </div>
          {(data?.top_nc || []).length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Sin no conformidades registradas</div>
          ) : (
            <div className="space-y-2">
              {(data?.top_nc || []).map((item, i) => {
                const max = data.top_nc[0].nc_total
                const pct = Math.round((item.nc_total / max) * 100)
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-4 text-right font-mono">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-medium text-gray-700 truncate">{item.equipo}</p>
                        <span className="text-xs font-bold text-orange-600 ml-2 flex-shrink-0">{item.nc_total}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Estado resumen + Últimas inspecciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Por estado */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Por estado</h2>
          <div className="space-y-2">
            {estadoEntries.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>
            ) : estadoEntries.map(([estado, total]) => {
              const st = ESTADO_COLOR[estado] || ESTADO_COLOR.cerrada
              return (
                <div key={estado} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${st.bg} ${st.border}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                    <span className={`text-xs font-medium ${st.text}`}>{ESTADO_LABEL[estado] || estado}</span>
                  </div>
                  <span className={`text-sm font-bold ${st.text}`}>{total}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Últimas inspecciones */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Últimas inspecciones</h2>
            <button onClick={() => navigate('/inspecciones')}
              className="flex items-center gap-1 text-xs text-roka-600 hover:text-roka-700 font-medium">
              Ver todas <ArrowRight size={12} />
            </button>
          </div>
          {(data?.ultimas || []).length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Sin inspecciones registradas</div>
          ) : (
            <div className="space-y-2">
              {(data?.ultimas || []).map(ins => {
                const st = ESTADO_COLOR[ins.estado] || ESTADO_COLOR.cerrada
                return (
                  <div key={ins.id}
                    onClick={() => navigate(`/inspecciones/${ins.id}`)}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${st.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{ins.titulo}</p>
                      <p className="text-xs text-gray-400">{ins.area?.nombre} · {ins.codigo}</p>
                    </div>
                    {ins.porcentaje_cumplimiento > 0 && (
                      <span className={`text-sm font-bold flex-shrink-0 ${pctColor(ins.porcentaje_cumplimiento)}`}>
                        {ins.porcentaje_cumplimiento}%
                      </span>
                    )}
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${st.bg} ${st.text} ${st.border}`}>
                      {ESTADO_LABEL[ins.estado] || ins.estado}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
