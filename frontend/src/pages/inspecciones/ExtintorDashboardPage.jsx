import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  ArrowLeft, RefreshCw, Flame, TrendingUp, TrendingDown,
  Minus, AlertTriangle, ChevronDown, ChevronUp, XCircle,
  Shield, Calendar, MapPin,
} from 'lucide-react'
import api from '../../services/api'

// ── Paleta de colores para áreas ──────────────────────────────────────────────
const AREA_COLORS = ['#dc2626','#1d4ed8','#059669','#d97706','#7c3aed','#0891b2','#db2777','#65a30d']
const MESES_FULL  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MESES_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function pctColor(v) {
  if (v == null) return '#94a3b8'
  if (v >= 85)  return '#16a34a'
  if (v >= 65)  return '#d97706'
  return '#dc2626'
}

function pctBg(v) {
  if (v == null) return 'bg-gray-50 text-gray-400'
  if (v >= 85)  return 'bg-green-50 text-green-700'
  if (v >= 65)  return 'bg-amber-50 text-amber-700'
  return 'bg-red-50 text-red-700'
}

// ── KPI Tile ──────────────────────────────────────────────────────────────────
function KpiTile({ label, value, sub, icon: Icon, accentColor, badge, badgeCls }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: accentColor }} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
          <p className="text-2xl font-black text-gray-900 leading-none tabular-nums">{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          {badge && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-2 ${badgeCls}`}>
              {badge}
            </span>
          )}
        </div>
        {Icon && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: accentColor + '1a' }}>
            <Icon size={16} style={{ color: accentColor }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sección colapsable ────────────────────────────────────────────────────────
function Section({ title, sub, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left">
        <div>
          <p className="text-sm font-bold text-gray-900">{title}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
               : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
      </button>
      {open && <div className="border-t border-gray-100">{children}</div>}
    </div>
  )
}

// ── Custom Pie Label ──────────────────────────────────────────────────────────
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, pct }) {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  if (pct < 5) return null
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={10} fontWeight={700}>
      {pct}%
    </text>
  )
}

// ── Celda de porcentaje en tablas ─────────────────────────────────────────────
function PctCell({ v }) {
  if (v == null) return <span className="text-gray-300 tabular-nums">—</span>
  const cls = v >= 85 ? 'text-green-700 font-bold' : v >= 65 ? 'text-amber-600 font-bold' : 'text-red-600 font-bold'
  return <span className={`tabular-nums ${cls}`}>{v}%</span>
}

// ── Badge de vencimiento ──────────────────────────────────────────────────────
function VencBadge({ fecha, estado }) {
  if (!fecha) return <span className="text-gray-300 text-xs">Sin fecha</span>
  const cls = estado === 'ok' ? 'bg-green-50 text-green-700 border-green-200'
    : estado === 'proximo'    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : estado === 'vencido'    ? 'bg-red-50 text-red-700 border-red-200'
    : 'bg-gray-50 text-gray-500 border-gray-200'
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cls}`}>
      {estado === 'proximo' && '⚠ '}{estado === 'vencido' && '✕ '}{fecha}
    </span>
  )
}

export default function ExtintorDashboardPage() {
  const navigate = useNavigate()
  const [año,     setAño]     = useState(new Date().getFullYear())
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const cargar = async (y) => {
    setLoading(true); setError(null)
    try {
      const { data: res } = await api.get('/inspecciones/extintores/dashboard', { params: { año: y } })
      setData(res)
    } catch (e) {
      setError(e.response?.data?.error ?? 'No se pudo cargar el dashboard de extintores.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar(año) }, [año])

  const k         = data?.kpis       ?? {}
  const porArea   = data?.por_area   ?? []
  const porTipo   = data?.por_tipo   ?? []
  const mensual   = data?.mensual    ?? []
  const matrix    = data?.anomalias_matrix ?? { extintores: [], filas: [] }
  const ubics     = data?.ubicaciones ?? []
  const años      = [new Date().getFullYear() - 1, new Date().getFullYear()]

  // Datos para pie chart — usar porArea o fallback con porTipo info
  const pieData = porArea.map((a, i) => ({ name: a.area, value: parseFloat(a.pct), n: a.n }))

  // Tooltip personalizado para pie
  const PieTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-xs">
        <p className="font-bold text-gray-900">{d.name}</p>
        <p className="text-gray-600">Cumplimiento: <strong>{d.value}%</strong></p>
        <p className="text-gray-400">{d.n} inspecciones</p>
      </div>
    )
  }

  // Tooltip mensual
  const MensualTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const val = payload[0]?.value
    const n   = mensual.find(m => m.label === label)?.n ?? 0
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-xs">
        <p className="font-bold text-gray-900">{MESES_FULL[MESES_SHORT.indexOf(label)] ?? label}</p>
        <p style={{ color: pctColor(val) }} className="font-bold">{val != null ? `${val}%` : '—'}</p>
        <p className="text-gray-400">{n} inspecciones</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Flame size={18} className="text-red-600" />
              Dashboard — Inspección de Extintores
            </h1>
            <p className="text-xs text-gray-400">Cumplimiento, vencimientos, anomalías y ubicaciones</p>
          </div>

          {/* Selector de año */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {años.map(y => (
              <button key={y} onClick={() => setAño(y)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  año === y ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {y}
              </button>
            ))}
          </div>

          <button onClick={() => cargar(año)} className="p-1.5 rounded-lg hover:bg-gray-100" title="Actualizar">
            <RefreshCw size={16} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <XCircle size={16} /> {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center shadow-sm">
            <RefreshCw size={28} className="animate-spin mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Cargando dashboard de extintores…</p>
          </div>
        ) : data && (
          <>
            {/* ── KPI Tiles ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiTile
                label="Total extintores"
                value={k.total_extintores}
                sub="unidades registradas"
                icon={Shield}
                accentColor="#dc2626"
              />
              <KpiTile
                label="Cumplimiento {año}"
                value={k.cumplimiento_general != null ? `${k.cumplimiento_general}%` : null}
                sub="inspecciones realizadas"
                icon={TrendingUp}
                accentColor="#16a34a"
                badge={k.cumplimiento_general >= 85 ? '✓ Óptimo' : k.cumplimiento_general >= 65 ? '⚠ Atención' : '✕ Crítico'}
                badgeCls={k.cumplimiento_general >= 85 ? 'bg-green-50 text-green-700 border-green-200' : k.cumplimiento_general >= 65 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}
              />
              <KpiTile
                label="Vencimientos próximos"
                value={k.vencimientos_proximos}
                sub="en los próximos 90 días"
                icon={Calendar}
                accentColor="#d97706"
                badge={k.vencidos > 0 ? `${k.vencidos} ya vencidos` : null}
                badgeCls="bg-red-50 text-red-700 border-red-200"
              />
              <KpiTile
                label="Tipos distintos"
                value={k.tipos_distintos}
                sub={porTipo.map(t => t.tipo_extintor).join(' · ')}
                icon={Flame}
                accentColor="#7c3aed"
              />
            </div>

            {/* ── Fila de gráficos: Pie + Barras horizontales ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pie: Cumplimiento por área */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Resultado por Área</p>
                {pieData.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-gray-300 text-sm">Sin datos</div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name"
                          cx="50%" cy="50%" outerRadius={78}
                          labelLine={false}
                          label={<PieLabel />}>
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={AREA_COLORS[i % AREA_COLORS.length]} stroke="#fff" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-1.5">
                      {pieData.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                            style={{ background: AREA_COLORS[i % AREA_COLORS.length] }} />
                          <span className="text-gray-600 flex-1">{d.name}</span>
                          <span className="font-bold text-gray-800 tabular-nums">{d.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Barras horizontales: tipos de extintor */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Tipos de Extintores</p>
                {porTipo.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-gray-300 text-sm">Sin datos</div>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(80, porTipo.length * 52)}>
                    <BarChart data={porTipo} layout="vertical"
                      margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
                      <XAxis type="number" hide domain={[0, 'dataMax + 2']} />
                      <YAxis type="category" dataKey="tipo_extintor"
                        tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={110} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                        formatter={(v) => [v, 'Cantidad']} />
                      <Bar dataKey="cantidad" fill="#d97706" radius={[0, 4, 4, 0]} maxBarSize={32}
                        label={{ position: 'right', fontSize: 11, fontWeight: 700, fill: '#475569' }} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* ── Inspección Mensual ── */}
            <Section title="Inspección Mensual" sub={`Cumplimiento % · año ${año}`}>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={mensual.map(m => ({ ...m, fill: pctColor(m.pct) }))}
                    margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false}
                      tickLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<MensualTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                    <ReferenceLine y={85} stroke="#16a34a" strokeDasharray="4 3" strokeWidth={1}
                      label={{ value: '85%', position: 'right', fontSize: 9, fill: '#16a34a' }} />
                    <ReferenceLine y={65} stroke="#d97706" strokeDasharray="4 3" strokeWidth={1}
                      label={{ value: '65%', position: 'right', fontSize: 9, fill: '#d97706' }} />
                    <Bar dataKey="pct" radius={[3, 3, 0, 0]} maxBarSize={48}>
                      {mensual.map((m, i) => (
                        <Cell key={i} fill={pctColor(m.pct)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>

            {/* ── Tabla: Anomalías por extintor ── */}
            <Section
              title="Inspecciones de Extintores — Anomalías"
              sub={`${matrix.filas.length} ítems × ${matrix.extintores.length} extintores`}
              defaultOpen={false}>
              {matrix.filas.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  Sin datos de inspecciones registradas para {año}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse" style={{ minWidth: `${200 + matrix.extintores.length * 64}px` }}>
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="sticky left-0 bg-gray-50 z-10 px-4 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide text-[10px] min-w-[220px] border-r border-gray-200">
                          Lista de Anomalías Verificadas
                        </th>
                        {matrix.extintores.map((e, i) => (
                          <th key={e.id} className="px-2 py-2.5 text-center font-bold text-gray-500 min-w-[56px]"
                            title={e.nombre}>
                            {i + 1}
                          </th>
                        ))}
                        <th className="px-3 py-2.5 text-center font-bold text-gray-700 bg-gray-100 border-l border-gray-200">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrix.filas.map((fila, fi) => {
                        const vals = matrix.extintores.map(e => fila.por_equipo?.[e.id] ?? null)
                        const valid = vals.filter(v => v != null)
                        const prom  = valid.length ? Math.round(valid.reduce((s, v) => s + v, 0) / valid.length) : null
                        return (
                          <tr key={fi} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="sticky left-0 bg-white z-10 px-4 py-2 font-medium text-gray-700 border-r border-gray-100">
                              {fila.descripcion.length > 55 ? fila.descripcion.slice(0, 53) + '…' : fila.descripcion}
                            </td>
                            {vals.map((v, vi) => (
                              <td key={vi} className="px-2 py-2 text-center">
                                <PctCell v={v} />
                              </td>
                            ))}
                            <td className={`px-3 py-2 text-center font-black border-l border-gray-100 ${prom != null ? pctBg(prom) : 'text-gray-400'}`}>
                              {prom != null ? `${prom}%` : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {/* Leyenda de extintores */}
                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-3">
                    {matrix.extintores.map((e, i) => (
                      <span key={e.id} className="text-[10px] text-gray-500 flex items-center gap-1">
                        <span className="font-bold text-gray-700">{i + 1}</span> = {e.nombre ?? e.codigo}
                        {e.area && <span className="text-gray-400">({e.area})</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* ── Tabla: Ubicación de extintores ── */}
            <Section
              title="Ubicación de Extintores — Estado Mensual"
              sub={`${ubics.length} unidades · año ${año}`}
              defaultOpen={false}>
              {ubics.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">Sin unidades registradas</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse" style={{ minWidth: '900px' }}>
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="sticky left-0 bg-gray-50 z-10 px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide text-[10px] w-8 border-r border-gray-100">N°</th>
                        <th className="sticky left-8 bg-gray-50 z-10 px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide text-[10px] min-w-[180px] border-r border-gray-100">Ubicación</th>
                        <th className="px-3 py-2.5 text-center font-bold text-gray-500 uppercase tracking-wide text-[10px]">Tipo</th>
                        <th className="px-3 py-2.5 text-center font-bold text-gray-500 uppercase tracking-wide text-[10px]">Área</th>
                        <th className="px-3 py-2.5 text-center font-bold text-gray-500 uppercase tracking-wide text-[10px] border-r border-gray-100">Vencimiento</th>
                        {MESES_SHORT.map(m => (
                          <th key={m} className="px-1.5 py-2.5 text-center font-bold text-gray-500 uppercase tracking-wide text-[10px] min-w-[40px]">{m}</th>
                        ))}
                        <th className="px-3 py-2.5 text-center font-bold text-gray-700 bg-gray-100 border-l border-gray-200">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ubics.map((u, idx) => {
                        const vals  = Object.values(u.mensual ?? {})
                        const valid = vals.filter(v => v != null)
                        const prom  = valid.length ? Math.round(valid.reduce((s, v) => s + v, 0) / valid.length) : null
                        return (
                          <tr key={u.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${u.estado_venc === 'vencido' ? 'bg-red-50/30' : ''}`}>
                            <td className="sticky left-0 bg-white z-10 px-3 py-2.5 font-bold text-gray-500 text-center border-r border-gray-100">{idx + 1}</td>
                            <td className="sticky left-8 bg-white z-10 px-3 py-2.5 font-medium text-gray-800 border-r border-gray-100">
                              <div className="flex items-center gap-1.5">
                                <MapPin size={10} className="text-gray-300 flex-shrink-0" />
                                {u.ubicacion ?? u.nombre ?? u.codigo}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center text-gray-600">{u.tipo ?? '—'}</td>
                            <td className="px-3 py-2.5 text-center text-gray-500">{u.area ?? '—'}</td>
                            <td className="px-3 py-2.5 text-center border-r border-gray-100">
                              <VencBadge fecha={u.vencimiento} estado={u.estado_venc} />
                            </td>
                            {Object.values(u.mensual ?? {}).map((v, mi) => (
                              <td key={mi} className="px-1.5 py-2.5 text-center">
                                <PctCell v={v} />
                              </td>
                            ))}
                            <td className={`px-3 py-2.5 text-center font-black border-l border-gray-100 ${prom != null ? pctBg(prom) : 'text-gray-300'}`}>
                              {prom != null ? `${prom}%` : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            {/* ── Footer ── */}
            <p className="text-xs text-gray-400 text-center pb-2">
              Año {año} · Solo inspecciones ejecutadas / cerradas / con hallazgos
            </p>
          </>
        )}
      </div>
    </div>
  )
}
