import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, LabelList,
} from 'recharts'
import {
  BarChart3, ArrowLeft, RefreshCw, TrendingUp, TrendingDown,
  XCircle, Minus, ChevronDown, Check,
} from 'lucide-react'
import api from '../../services/api'

const PERIODS = [
  { key: 'hoy',    label: 'Hoy'    },
  { key: 'semana', label: 'Semana' },
  { key: 'mes',    label: 'Mes'    },
]

const SERIES_COLORS = [
  '#2a78d6','#1baf7a','#eda100','#4a3aa7','#e34948',
  '#0891b2','#7c3aed','#db2777','#65a30d','#ea580c',
]

const MAX_VISIBLE = 8

function pctStatus(v) {
  if (v == null) return 'gray'
  if (v >= 85)  return 'good'
  if (v >= 65)  return 'warn'
  return 'crit'
}

const STATUS_CFG = {
  good: { label: 'Óptimo',   cls: 'bg-green-50 text-green-700 border-green-200',  dot: 'bg-green-500'  },
  warn: { label: 'Atención', cls: 'bg-amber-50 text-amber-700 border-amber-200',  dot: 'bg-amber-500'  },
  crit: { label: 'Crítico',  cls: 'bg-red-50   text-red-700   border-red-200',    dot: 'bg-red-500'    },
  gray: { label: 'Sin datos',cls: 'bg-gray-100 text-gray-500  border-gray-200',   dot: 'bg-gray-300'   },
}

function BarFill({ pct }) {
  const st = pctStatus(pct)
  const color = st === 'good' ? 'bg-green-500' : st === 'warn' ? 'bg-amber-400' : st === 'crit' ? 'bg-red-500' : 'bg-gray-200'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct ?? 0}%` }} />
      </div>
      <span className="text-xs font-bold tabular-nums w-10 text-right text-gray-700">
        {pct != null ? `${pct}%` : '—'}
      </span>
    </div>
  )
}

function Sparkline({ hist, color }) {
  const W = 64, H = 20
  if (!hist || hist.every(v => v == null)) return <span className="text-gray-300 text-xs">—</span>
  const vals = hist.map(v => v ?? 0)
  const mn = Math.max(0,  Math.min(...vals) - 8)
  const mx = Math.min(100, Math.max(...vals) + 4)
  const range = mx - mn || 1
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - ((v - mn) / range) * H}`)
  const line = `M${pts.join(' L')}`
  const area = `${line} L${W},${H} L0,${H} Z`
  return (
    <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
      <path d={area} fill={color} opacity={0.12} />
      <path d={line}  fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function DeltaChip({ delta }) {
  if (delta == null) return <span className="text-gray-300 text-xs tabular-nums">—</span>
  const up = delta > 0
  const Icon = up ? TrendingUp : delta < 0 ? TrendingDown : Minus
  const cls  = up ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-gray-400'
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${cls}`}>
      <Icon size={11} />
      {delta > 0 ? '+' : ''}{delta}pp
    </span>
  )
}

function KpiTile({ label, value, sub, delta, accentColor }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: accentColor }} />
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className="text-2xl font-black text-gray-900 leading-none tabular-nums">{value}</p>
      {delta != null && <DeltaChip delta={delta} />}
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

/* ── Dropdown multi-selección de series ── */
function SeriesDropdown({ allEquipos, visible, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const total       = allEquipos.length
  const count       = visible.size
  const allSelected = count === total
  const atLimit     = count >= MAX_VISIBLE

  const toggleAll = () => {
    if (allSelected) {
      onChange(new Set([0]))
    } else {
      // select all up to MAX_VISIBLE
      onChange(new Set(allEquipos.slice(0, MAX_VISIBLE).map((_, si) => si)))
    }
  }

  const toggle = (si) => {
    const next = new Set(visible)
    if (next.has(si)) {
      if (next.size === 1) return
      next.delete(si)
    } else {
      if (atLimit) return
      next.add(si)
    }
    onChange(next)
  }

  const label = allSelected
    ? 'Todos los equipos'
    : count === 1
      ? allEquipos[[...visible][0]]?.nombre
      : `${count} de ${total} seleccionados`

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors min-w-[180px] justify-between">
        <span className="truncate text-gray-700">{label}</span>
        <ChevronDown size={13} className={`text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 min-w-[240px] py-1 overflow-hidden max-h-72 overflow-y-auto">
          {/* Todos */}
          <button
            onClick={toggleAll}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-gray-50 transition-colors border-b border-gray-100 sticky top-0 bg-white">
            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
              allSelected ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
              {allSelected && <Check size={10} color="white" strokeWidth={3} />}
            </div>
            <span className="font-semibold text-gray-700">Todos</span>
            <span className="ml-auto text-gray-400">{total} equipos</span>
          </button>

          {/* Cada equipo */}
          {allEquipos.map((eq, si) => {
            const checked  = visible.has(si)
            const disabled = !checked && atLimit
            return (
              <button
                key={eq.id}
                onClick={() => toggle(si)}
                disabled={disabled}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                  disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                  checked ? 'border-transparent' : 'border-gray-300 bg-white'}`}
                  style={checked ? { background: SERIES_COLORS[si] } : {}}>
                  {checked && <Check size={10} color="white" strokeWidth={3} />}
                </div>
                <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: SERIES_COLORS[si] }} />
                <span className="text-gray-700 leading-tight text-left flex-1">{eq.nombre}</span>
                {eq.pct_actual != null && (
                  <span className="text-gray-400 tabular-nums flex-shrink-0">{eq.pct_actual}%</span>
                )}
              </button>
            )
          })}

          {/* Aviso límite */}
          {atLimit && (
            <div className="px-3 py-2 bg-amber-50 border-t border-amber-100 text-[10px] text-amber-700 font-medium">
              Máximo {MAX_VISIBLE} series en el gráfico. Desmarca una para agregar otra.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function KpiEquiposPage() {
  const navigate  = useNavigate()
  const [period,       setPeriod]       = useState('semana')
  const [data,         setData]         = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [visibleSeries,setVisibleSeries]= useState(new Set([0,1,2,3,4]))

  const cargar = async (p) => {
    setLoading(true); setError(null)
    try {
      const { data: res } = await api.get('/inspecciones/kpi-equipos', { params: { periodo: p } })
      setData(res)
    } catch (e) {
      setError('No se pudo cargar el KPI. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar(period) }, [period])

  // Reset visible series when data changes — pre-seleccionar top 5
  useEffect(() => {
    const equiposConDatos = (data?.equipos ?? []).filter(e => e.pct_actual != null)
    const defaultVisible  = new Set(equiposConDatos.slice(0, 5).map((_, i) => i))
    setVisibleSeries(defaultVisible)
  }, [data])

  const r       = data?.resumen ?? {}
  const equipos = data?.equipos  ?? []
  const labels  = data?.hist_labels ?? []

  // Todos los equipos con datos, ordenados por cumplimiento
  const allEquipos = [...equipos]
    .filter(e => e.pct_actual != null)
    .sort((a, b) => (b.pct_actual ?? 0) - (a.pct_actual ?? 0))

  // Preparar datos del gráfico de evolución
  const chartData = labels.map((label, idx) => {
    const point = { label }
    allEquipos.forEach((eq, si) => {
      point[`eq_${si}`] = eq.hist?.[idx] ?? null
    })
    return point
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 size={18} className="text-green-600" />
              KPI Inspecciones — Tipo de Equipo
            </h1>
            <p className="text-xs text-gray-400">Cumplimiento, evolución y tendencia por período</p>
          </div>

          {/* Period toggle */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {PERIODS.map(p => (
              <button key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  period === p.key
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={() => cargar(period)}
            className="p-1.5 rounded-lg hover:bg-gray-100" title="Actualizar">
            <RefreshCw size={16} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-5">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <XCircle size={16} /> {error}
          </div>
        )}

        {/* KPI Tiles */}
        {!loading && data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiTile
              label="Cumplimiento general"
              value={r.cumplimiento_general != null ? `${r.cumplimiento_general}%` : '—'}
              delta={r.tendencia}
              sub={r.cumplimiento_anterior != null ? `Anterior: ${r.cumplimiento_anterior}%` : null}
              accentColor="#16a34a"
            />
            <KpiTile
              label="Realizadas"
              value={r.realizadas ?? '—'}
              sub={`de ${r.programadas ?? '—'} programadas`}
              accentColor="#2a78d6"
            />
            <KpiTile
              label="Equipos críticos"
              value={r.criticos ?? '—'}
              sub="cumplimiento < 65%"
              accentColor="#dc2626"
            />
            <KpiTile
              label="Tendencia"
              value={r.tendencia != null ? (r.tendencia > 0 ? `+${r.tendencia}pp` : `${r.tendencia}pp`) : '—'}
              delta={null}
              sub={`vs período anterior`}
              accentColor={r.tendencia >= 0 ? '#0ca30c' : '#dc2626'}
            />
          </div>
        )}

        {/* Evolución chart */}
        {!loading && data && allEquipos.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <p className="text-sm font-bold text-gray-900">Evolución de equipos</p>
                <p className="text-xs text-gray-400">% cumplimiento en las {labels.length} {period === 'hoy' ? 'horas' : period === 'semana' ? 'jornadas' : 'semanas'} del período</p>
              </div>
              <SeriesDropdown
                allEquipos={allEquipos}
                visible={visibleSeries}
                onChange={setVisibleSeries}
              />
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 20, right: 40, left: -10, bottom: 0 }} barCategoryGap="20%" barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff' }}
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  formatter={(val, name) => {
                    const idx = parseInt(name.split('_')[1])
                    return [val != null ? `${val}%` : '—', allEquipos[idx]?.nombre]
                  }}
                />
                <ReferenceLine y={85} stroke="#0ca30c" strokeDasharray="4 3" strokeWidth={1} label={{ value: '85%', position: 'right', fontSize: 9, fill: '#0ca30c' }} />
                <ReferenceLine y={65} stroke="#d97706" strokeDasharray="4 3" strokeWidth={1} label={{ value: '65%', position: 'right', fontSize: 9, fill: '#d97706' }} />
                {allEquipos.map((_, si) =>
                  visibleSeries.has(si) ? (
                    <Bar
                      key={si}
                      dataKey={`eq_${si}`}
                      fill={SERIES_COLORS[si]}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={28}
                    >
                      {visibleSeries.size <= 4 && (
                        <LabelList
                          dataKey={`eq_${si}`}
                          position="top"
                          formatter={(v) => (v != null ? `${v}%` : '')}
                          style={{ fontSize: 9, fill: SERIES_COLORS[si], fontWeight: 700 }}
                        />
                      )}
                    </Bar>
                  ) : null
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Equipment table */}
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
            <RefreshCw size={28} className="animate-spin mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Cargando indicadores…</p>
          </div>
        ) : equipos.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
            <BarChart3 size={36} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">Sin inspecciones para este período</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[1fr_180px_72px_72px_66px_80px] gap-0 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              {['Tipo de equipo','Cumplimiento','%','Δ vs ant.','Evolución','Estado'].map((h, i) => (
                <div key={i} className={`text-[10px] font-bold uppercase tracking-wide text-gray-400 ${i > 1 ? 'text-right' : ''}`}>{h}</div>
              ))}
            </div>

            {equipos.map((eq, idx) => {
              const st = pctStatus(eq.pct_actual)
              const cfg = STATUS_CFG[st]
              const siColor = allEquipos.findIndex(t => t.id === eq.id)
              const lineColor = siColor >= 0 ? SERIES_COLORS[siColor] : '#94a3b8'
              return (
                <div key={eq.id}
                  className="grid sm:grid-cols-[1fr_180px_72px_72px_66px_80px] grid-cols-[1fr_auto] gap-2 sm:gap-0 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors items-center">
                  {/* Name */}
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    <span className="text-sm font-semibold text-gray-800">{eq.nombre}</span>
                    <span className="text-xs text-gray-400 tabular-nums">({eq.realizadas}/{eq.total})</span>
                  </div>
                  {/* Bar */}
                  <div className="sm:pr-4 col-span-2 sm:col-span-1">
                    <BarFill pct={eq.pct_actual} />
                  </div>
                  {/* Pct */}
                  <div className="hidden sm:block text-right text-sm font-bold tabular-nums text-gray-700">
                    {eq.pct_actual != null ? `${eq.pct_actual}%` : '—'}
                  </div>
                  {/* Delta */}
                  <div className="hidden sm:flex justify-end">
                    <DeltaChip delta={eq.delta} />
                  </div>
                  {/* Sparkline */}
                  <div className="hidden sm:flex justify-end">
                    <Sparkline hist={eq.hist} color={lineColor} />
                  </div>
                  {/* Status badge */}
                  <div className="hidden sm:flex justify-end">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer note */}
        {data && (
          <p className="text-xs text-gray-400 text-center">
            Período actual: <span className="font-medium">{data.desde}</span> → <span className="font-medium">{data.hasta}</span>
            {' · '}Solo inspecciones ejecutadas/cerradas/con hallazgos
          </p>
        )}
      </div>
    </div>
  )
}
