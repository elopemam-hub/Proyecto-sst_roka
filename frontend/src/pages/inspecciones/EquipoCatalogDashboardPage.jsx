import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
  PieChart, Pie, Legend,
} from 'recharts'
import {
  Package, CalendarCheck, AlertTriangle, CheckCircle2, ChevronUp, ChevronDown, RefreshCw, ArrowLeft,
} from 'lucide-react'
import api from '../../services/api'

const AREA_COLORS = ['#dc2626','#1d4ed8','#059669','#d97706','#7c3aed','#0891b2','#db2777','#65a30d']

function pctColor(v) {
  if (v == null) return 'text-gray-400'
  if (v >= 90) return 'text-emerald-600'
  if (v >= 70) return 'text-amber-600'
  return 'text-red-500'
}
function pctBg(v) {
  if (v == null) return 'bg-gray-200'
  if (v >= 90) return 'bg-emerald-500'
  if (v >= 70) return 'bg-amber-500'
  return 'bg-red-500'
}

function PctCell({ v }) {
  if (v == null) return <td className="px-3 py-2 text-center text-gray-300 text-xs">—</td>
  return (
    <td className={`px-3 py-2 text-center text-xs font-bold ${pctColor(v)}`}>
      {v}%
    </td>
  )
}

const RESULT_MAP = {
  C:          { label: 'Sí',      cls: 'text-emerald-600' },
  S:          { label: 'Sí',      cls: 'text-emerald-600' },
  A:          { label: 'Acción',  cls: 'text-orange-600 font-bold' },
  N:          { label: 'No',      cls: 'text-red-500' },
  NA:         { label: 'N/A',     cls: 'text-gray-400' },
  conforme:   { label: 'Sí',      cls: 'text-emerald-600' },
  no_conforme:{ label: 'No',      cls: 'text-red-500' },
  observacion:{ label: 'Obs',     cls: 'text-amber-600' },
}

// Resultado categórico → porcentaje de cumplimiento (Sí = 100%, No = 0%)
const RESULT_PCT = {
  C: 100, S: 100, conforme: 100,
  A: 50,  observacion: 50,
  N: 0,   no_conforme: 0,
}

function ResultCell({ v }) {
  if (v == null) return <td className="px-3 py-2 text-center text-gray-300 text-xs">—</td>
  if (v === 'NA' || v === 'na') return <td className="px-3 py-2 text-center text-gray-400 text-xs">N/A</td>
  const pct = RESULT_PCT[v]
  if (pct == null) {
    const cfg = RESULT_MAP[v] || { label: v, cls: 'text-gray-500' }
    return <td className={`px-3 py-2 text-center text-xs font-semibold ${cfg.cls}`}>{cfg.label}</td>
  }
  return (
    <td className={`px-3 py-2 text-center text-xs font-bold ${pctColor(pct)}`}>
      {pct}%
    </td>
  )
}

function VencBadge({ estado }) {
  const map = {
    ok:        'bg-emerald-100 text-emerald-700',
    proximo:   'bg-amber-100 text-amber-700',
    vencido:   'bg-red-100 text-red-700',
    sin_fecha: 'bg-gray-100 text-gray-500',
  }
  const lbl = { ok: 'Vigente', proximo: 'Por vencer', vencido: 'Vencido', sin_fecha: 'Sin fecha' }
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${map[estado] ?? map.sin_fecha}`}>
      {lbl[estado] ?? estado}
    </span>
  )
}

function KpiTile({ icon, label, value, sub, accent }) {
  return (
    <div className={`bg-white rounded-xl border-l-4 ${accent} p-4 flex items-start gap-3 shadow-sm`}>
      <div className="text-2xl">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value ?? '—'}</div>
        <div className="text-sm font-medium text-gray-700">{label}</div>
        {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

function Section({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-800">{title}</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.6
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {Math.round(percent * 100)}%
    </text>
  )
}

export default function EquipoCatalogDashboardPage() {
  const { catalogoId } = useParams()
  const navigate = useNavigate()
  const currentYear = new Date().getFullYear()
  const [año, setAño] = useState(currentYear)
  const [mesDiario, setMesDiario] = useState(null)   // filtro del gráfico diario (null = automático)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const initial = data === null
    if (initial) setLoading(true)
    setError(null)
    api.get(`/inspecciones/catalogo/${catalogoId}/dashboard`, { params: { año, mes_diario: mesDiario } })
      .then(r => setData(r.data))
      .catch(() => setError('No se pudo cargar el dashboard'))
      .finally(() => { if (initial) setLoading(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogoId, año, mesDiario])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={26} className="animate-spin text-blue-500" />
    </div>
  )

  if (error) return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>
    </div>
  )

  if (!data) return null

  const { kpis, por_area, por_tipo, mensual, anomalias_matrix, ubicaciones,
    es_diaria, semanal = [], diario = [], diario_periodo,
    diario_mes, diario_meses = [] } = data

  const pieData = por_tipo.map(t => ({ name: t.tipo_equipo, value: t.cantidad }))

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/inspecciones/catalogo')}
            className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
          >
            <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
            Tipos de equipo
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            Dashboard — {data.catalogo_nombre}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {[currentYear - 1, currentYear].map(y => (
            <button
              key={y}
              onClick={() => { setAño(y); setMesDiario(null) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                año === y ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiTile icon="📦" label="Total unidades"     value={kpis.total_unidades}       accent="border-blue-500"    />
        <KpiTile icon="🗓️"  label="Inspecciones"      value={kpis.inspecciones_año}      sub={`en ${año}`} accent="border-indigo-500"  />
        <KpiTile icon="⚠️"  label="Por vencer"        value={kpis.proximos_revision}     sub="próx. 90 días" accent="border-amber-500"  />
        <KpiTile icon="🔴"  label="Vencidos"          value={kpis.vencidos}              accent="border-red-500"     />
        <KpiTile
          icon={kpis.cumplimiento_general >= 90 ? '✅' : kpis.cumplimiento_general >= 70 ? '⚠️' : '❌'}
          label="Cumplimiento"
          value={kpis.cumplimiento_general != null ? `${kpis.cumplimiento_general}%` : '—'}
          sub={`promedio ${año}`}
          accent={kpis.cumplimiento_general >= 90 ? 'border-emerald-500' : kpis.cumplimiento_general >= 70 ? 'border-amber-500' : 'border-red-400'}
        />
        <KpiTile icon="🔧" label="Tipos distintos"    value={kpis.tipos_distintos}       accent="border-purple-500"  />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Por área */}
        {por_area.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Cumplimiento por Área</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={por_area} layout="vertical" margin={{ left: 10, right: 50, top: 4, bottom: 4 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="area" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => [`${v}%`, 'Cumplimiento']} />
                <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                  {por_area.map((row, i) => (
                    <Cell key={i} fill={AREA_COLORS[i % AREA_COLORS.length]} />
                  ))}
                  <LabelList dataKey="pct" position="right" formatter={v => `${v}%`} style={{ fontSize: 10, fill: '#374151' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Por tipo */}
        {pieData.length > 1 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Distribución por Tipo</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                  labelLine={false} label={PieLabel}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={AREA_COLORS[i % AREA_COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Evolución mensual */}
      {mensual.some(m => m.pct != null) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Evolución mensual {año}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={mensual} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v, _, p) => [`${v}%`, 'Cumplimiento']}
                labelFormatter={(_, pl) => `${pl?.[0]?.payload?.label} — ${pl?.[0]?.payload?.n} insp.`} />
              <Bar dataKey="pct" radius={[3, 3, 0, 0]}>
                {mensual.map((m, i) => (
                  <Cell key={i} fill={m.pct == null ? '#e5e7eb' : m.pct >= 90 ? '#10b981' : m.pct >= 70 ? '#f59e0b' : '#ef4444'} />
                ))}
                <LabelList dataKey="pct" position="top"
                  formatter={v => v != null ? `${v}%` : ''}
                  style={{ fontSize: 9, fill: '#6b7280' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Evolución semanal y diaria (solo equipos con inspección diaria) */}
      {es_diaria && (semanal.length > 0 || diario.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Semanal */}
          {semanal.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Cumplimiento semanal {año}</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={semanal} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    formatter={v => [`${v}%`, 'Cumplimiento']}
                    labelFormatter={(_, pl) => {
                      const p = pl?.[0]?.payload
                      return p ? `Semana ${p.semana} (${p.rango}) — ${p.n} insp.` : ''
                    }} />
                  <Bar dataKey="pct" radius={[3, 3, 0, 0]}>
                    {semanal.map((w, i) => (
                      <Cell key={i} fill={w.pct >= 90 ? '#10b981' : w.pct >= 70 ? '#f59e0b' : '#ef4444'} />
                    ))}
                    <LabelList dataKey="pct" position="top"
                      formatter={v => v != null ? `${v}%` : ''}
                      style={{ fontSize: 9, fill: '#6b7280' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Diario */}
          {diario.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <h2 className="font-semibold text-gray-800 mb-1">Cumplimiento diario</h2>
                  <p className="text-xs text-gray-400">{diario_periodo || 'Mes con más inspecciones'}</p>
                </div>
                {diario_meses.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {diario_meses.map(m => {
                      const activo = diario_mes === m.mes
                      const cls = activo
                        ? 'bg-blue-600 text-white'
                        : m.tiene_datos
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-gray-50 text-gray-300 hover:bg-gray-100'
                      return (
                        <button
                          key={m.mes}
                          onClick={() => setMesDiario(m.mes)}
                          title={m.tiene_datos ? '' : 'Sin inspecciones este mes'}
                          className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${cls}`}
                        >
                          {m.label.slice(0, 3)}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={diario} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    formatter={v => [`${v}%`, 'Cumplimiento']}
                    labelFormatter={(l, pl) => {
                      const p = pl?.[0]?.payload
                      return p ? `${p.fecha} — ${p.n} insp.` : `Día ${l}`
                    }} />
                  <Bar dataKey="pct" radius={[3, 3, 0, 0]}>
                    {diario.map((d, i) => (
                      <Cell key={i} fill={d.pct >= 90 ? '#10b981' : d.pct >= 70 ? '#f59e0b' : '#ef4444'} />
                    ))}
                    <LabelList dataKey="pct" position="top"
                      formatter={v => v != null ? `${v}%` : ''}
                      style={{ fontSize: 9, fill: '#6b7280' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Matriz de verificación por mes */}
      <Section title={`Matriz de Verificación (${anomalias_matrix.unidades ?? 0} unidades)`} defaultOpen={false}>
        {anomalias_matrix.filas.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Sin datos de checklist — la inspección no registró ítems de verificación.
          </p>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="text-xs border-collapse min-w-max w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 border border-gray-200 whitespace-nowrap">
                    Ítem de verificación
                  </th>
                  {MESES.map((m, i) => (
                    <th key={i} className="px-3 py-2 text-center font-medium text-gray-600 border border-gray-200 whitespace-nowrap min-w-[52px]">
                      {m}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 border border-gray-200 whitespace-nowrap min-w-[56px]">Prom.</th>
                </tr>
              </thead>
              <tbody>
                {anomalias_matrix.filas.map((fila, ri) => {
                  const rowPcts = MESES.map((_, i) => RESULT_PCT[fila.por_mes?.[i + 1]]).filter(v => v != null)
                  const rowProm = rowPcts.length ? Math.round(rowPcts.reduce((a, b) => a + b, 0) / rowPcts.length * 10) / 10 : null
                  return (
                    <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="sticky left-0 z-10 px-3 py-2 border border-gray-200 font-medium text-gray-700 whitespace-nowrap max-w-[260px] truncate"
                        style={{ backgroundColor: ri % 2 === 0 ? '#fff' : '#f9fafb' }}>
                        {fila.descripcion}
                      </td>
                      {MESES.map((_, i) => {
                        const v = fila.por_mes?.[i + 1] ?? null
                        return <ResultCell key={i} v={v} />
                      })}
                      <td className={`px-3 py-2 text-center border border-gray-200 font-bold ${pctColor(rowProm)}`}>
                        {rowProm != null ? `${rowProm}%` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td className="sticky left-0 z-10 bg-gray-100 px-3 py-2 border border-gray-200 text-gray-800 whitespace-nowrap">
                    Promedio
                  </td>
                  {MESES.map((_, i) => {
                    const colPcts = anomalias_matrix.filas
                      .map(f => RESULT_PCT[f.por_mes?.[i + 1]]).filter(v => v != null)
                    const colProm = colPcts.length ? Math.round(colPcts.reduce((a, b) => a + b, 0) / colPcts.length * 10) / 10 : null
                    return <PctCell key={i} v={colProm} />
                  })}
                  {(() => {
                    const allPcts = anomalias_matrix.filas.flatMap(f =>
                      MESES.map((_, i) => RESULT_PCT[f.por_mes?.[i + 1]]).filter(v => v != null))
                    const totProm = allPcts.length ? Math.round(allPcts.reduce((a, b) => a + b, 0) / allPcts.length * 10) / 10 : null
                    return (
                      <td className={`px-3 py-2 text-center border border-gray-200 font-bold ${pctColor(totProm)}`}>
                        {totProm != null ? `${totProm}%` : '—'}
                      </td>
                    )
                  })()}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Section>

      {/* Tabla de ubicaciones */}
      {ubicaciones.length > 0 && (
        <Section title={`Estado por Unidad — ${año}`} defaultOpen={false}>
          <div className="overflow-x-auto mt-2">
            <table className="text-xs border-collapse min-w-max w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left border border-gray-200 font-semibold text-gray-700 whitespace-nowrap">Cód.</th>
                  <th className="sticky left-12 z-10 bg-gray-50 px-3 py-2 text-left border border-gray-200 font-semibold text-gray-700 whitespace-nowrap min-w-[120px]">Ubicación</th>
                  <th className="px-3 py-2 text-center border border-gray-200 font-medium text-gray-600 whitespace-nowrap">Área</th>
                  <th className="px-3 py-2 text-center border border-gray-200 font-medium text-gray-600 whitespace-nowrap">Vencimiento</th>
                  {MESES.map(m => (
                    <th key={m} className="px-2 py-2 text-center border border-gray-200 font-medium text-gray-600 min-w-[36px]">{m}</th>
                  ))}
                  <th className="px-3 py-2 text-center border border-gray-200 font-semibold text-gray-700">Prom.</th>
                </tr>
              </thead>
              <tbody>
                {ubicaciones.map((u, ri) => {
                  const vals = Object.values(u.mensual).filter(v => v != null)
                  const prom = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null
                  return (
                    <tr key={u.id} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="sticky left-0 z-10 px-3 py-2 border border-gray-200 font-mono font-medium text-gray-800 whitespace-nowrap"
                        style={{ backgroundColor: ri % 2 === 0 ? '#fff' : '#f9fafb' }}>
                        {u.codigo}
                      </td>
                      <td className="sticky left-12 z-10 px-3 py-2 border border-gray-200 text-gray-700 whitespace-nowrap"
                        style={{ backgroundColor: ri % 2 === 0 ? '#fff' : '#f9fafb' }}>
                        {u.ubicacion || u.nombre || '—'}
                      </td>
                      <td className="px-3 py-2 text-center border border-gray-200 text-gray-600 whitespace-nowrap">{u.area ?? '—'}</td>
                      <td className="px-3 py-2 text-center border border-gray-200 whitespace-nowrap">
                        <VencBadge estado={u.estado_venc} />
                      </td>
                      {Object.entries(u.mensual).map(([m, v]) => <PctCell key={m} v={v} />)}
                      <td className={`px-3 py-2 text-center border border-gray-200 font-bold ${pctColor(prom)}`}>
                        {prom != null ? `${prom}%` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  )
}
