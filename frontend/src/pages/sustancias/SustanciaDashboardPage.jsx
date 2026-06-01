import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FlaskConical, ShieldAlert, AlertTriangle, FileWarning,
  Plus, List, GitCompare, Printer, CheckCircle2,
  TrendingUp, TrendingDown, Package, Clock,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, CartesianGrid,
  ComposedChart, Area, LabelList,
} from 'recharts'
import api from '../../services/api'

// ── Constantes ───────────────────────────────────────────────────────────────
const RIESGO_COLOR = { muy_alto:'#ef4444', alto:'#f97316', medio:'#f59e0b', bajo:'#10b981' }
const RIESGO_LABEL = { muy_alto:'Muy alto', alto:'Alto', medio:'Medio', bajo:'Bajo' }
const GHS_LABEL    = {
  GHS01:'Explosivo',GHS02:'Inflamable',GHS03:'Comburente',GHS04:'Gas presión',
  GHS05:'Corrosivo',GHS06:'Tóxico',GHS07:'Irritante',GHS08:'Peligro salud',GHS09:'Peligro MA',
}
const GHS_COLOR = ['#ef4444','#f97316','#f59e0b','#3b82f6','#8b5cf6','#6b7280','#eab308','#ec4899','#10b981']

// ── Gauge circular de % ──────────────────────────────────────────────────────
function GaugePct({ pct, label, color = '#10b981', size = 120 }) {
  const r       = 45
  const circ    = 2 * Math.PI * r
  const offset  = circ - (pct / 100) * circ
  const textClr = pct >= 80 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626'
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10"/>
        <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 55 55)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}/>
        <text x="55" y="52" textAnchor="middle" fill={textClr}
          fontSize="18" fontWeight="900">{pct}%</text>
        <text x="55" y="67" textAnchor="middle" fill="#9ca3af" fontSize="9">cumplimiento</text>
      </svg>
      <p className="text-xs font-semibold text-gray-600 text-center leading-tight">{label}</p>
    </div>
  )
}

// ── Tooltip personalizado ────────────────────────────────────────────────────
const TooltipCustom = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  )
}

// ── Tarjeta KPI ──────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color, bg, border, sub, onClick }) {
  return (
    <div onClick={onClick} className={`${bg} border ${border} rounded-xl p-5 flex items-center gap-3 ${onClick ? 'cursor-pointer hover:brightness-95 transition-all' : ''}`}>
      <Icon size={22} className={`${color} flex-shrink-0`}/>
      <div className="flex-1 min-w-0">
        <p className={`text-3xl font-black ${color}`}>{value ?? 0}</p>
        <p className="text-xs text-gray-500">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function SustanciaDashboardPage() {
  const navigate   = useNavigate()
  const [stats, setStats]       = useState(null)
  const [evol, setEvol]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [meses, setMeses]       = useState(6)

  useEffect(() => {
    setLoading(true)
    // Llamadas independientes — un error en evolucion no bloquea estadisticas
    const cargarStats = api.get('/sustancias/estadisticas')
      .then(({ data }) => setStats(data))
      .catch(e => console.error('estadisticas error:', e?.response?.data || e.message))

    const cargarEvol = api.get(`/sustancias/evolucion?meses=${meses}`)
      .then(({ data }) => setEvol(Array.isArray(data) ? data : []))
      .catch(e => console.error('evolucion error:', e?.response?.data || e.message))

    Promise.allSettled([cargarStats, cargarEvol])
      .finally(() => setLoading(false))
  }, [meses])

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  // ── Datos para gráficos ──────────────────────────────────────────────────
  const riesgoData = Object.entries(stats?.por_riesgo || {})
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: RIESGO_LABEL[k] || k, value: v, color: RIESGO_COLOR[k] }))

  const stockClaseData = Object.entries(stats?.stock_por_clase || {})
    .slice(0, 9)
    .map(([k, v], i) => ({ name: GHS_LABEL[k] || k, value: parseFloat(v.toFixed(2)), fill: GHS_COLOR[i] }))

  // Matriz área × riesgo
  const areaRiesgoMap = {}
  ;(stats?.por_area || []).forEach(({ area_uso, nivel_riesgo, total }) => {
    if (!areaRiesgoMap[area_uso]) areaRiesgoMap[area_uso] = {}
    areaRiesgoMap[area_uso][nivel_riesgo] = total
  })
  const areas = Object.keys(areaRiesgoMap)

  // Datos HDS para pie
  const conHdsVigente = stats?.con_hds_vigente || 0
  const hdsVencidas   = stats?.hds_vencidas    || 0
  const hdsPorVencer  = stats?.hds_por_vencer  || 0
  const sinHds        = stats?.sin_hds         || 0
  const hdsData = [
    { name: 'HDS vigente',     value: conHdsVigente, color: '#10b981' },
    { name: 'Por vencer',      value: hdsPorVencer,  color: '#f59e0b' },
    { name: 'HDS vencida',     value: hdsVencidas,   color: '#f97316' },
    { name: 'Sin HDS',         value: sinHds,        color: '#ef4444' },
  ].filter(d => d.value > 0)

  const mesActual = new Date().toLocaleDateString('es-PE',{ month:'long', year:'numeric' })

  return (
    <div className="space-y-6">

      {/* Header con botón imprimir */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical size={24} className="text-purple-600"/> Dashboard · Sustancias Peligrosas
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Informe ejecutivo SST · {mesActual} · GHS/SGA · NTP 399.015 · Ley 29783
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => navigate('/sustancias/incompatibilidades')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <GitCompare size={14}/> Incompatibilidades
          </button>
          <button onClick={() => navigate('/sustancias')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <List size={14}/> Inventario
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 border border-purple-300 text-purple-700 hover:bg-purple-50 px-3 py-2 rounded-lg text-sm font-medium">
            <Printer size={14}/> Imprimir informe
          </button>
          <button onClick={() => navigate('/sustancias/nueva')}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16}/> Nueva sustancia
          </button>
        </div>
      </div>

      {/* ── FILA 1: KPIs globales ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total sustancias"   value={stats?.total}          icon={FlaskConical}  color="text-purple-600" bg="bg-purple-50"  border="border-purple-200" onClick={() => navigate('/sustancias')}/>
        <KpiCard label="Riesgo muy alto"    value={stats?.muy_alto}       icon={ShieldAlert}   color="text-red-600"    bg="bg-red-50"     border="border-red-200"    onClick={() => navigate('/sustancias?nivel_riesgo=muy_alto')}/>
        <KpiCard label="Sin HDS válida"     value={(sinHds + hdsVencidas)}icon={FileWarning}   color={(sinHds + hdsVencidas) > 0 ? 'text-amber-600' : 'text-gray-400'} bg={(sinHds + hdsVencidas) > 0 ? 'bg-amber-50' : 'bg-gray-50'} border="border-amber-200"/>
        <KpiCard label="Bajo stock mínimo"  value={stats?.bajo_stock_count} icon={Package}     color={stats?.bajo_stock_count > 0 ? 'text-orange-600' : 'text-gray-400'} bg={stats?.bajo_stock_count > 0 ? 'bg-orange-50' : 'bg-gray-50'} border="border-orange-200"/>
      </div>

      {/* ── FILA 2: Alertas activas ── */}
      {(sinHds > 0 || hdsVencidas > 0 || hdsPorVencer > 0 || (stats?.bajo_stock_count||0) > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
            <AlertTriangle size={16}/> Alertas para el informe mensual
          </h3>
          <div className="flex flex-wrap gap-2">
            {sinHds > 0 && <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-full font-medium">⚠ {sinHds} sustancias sin HDS</span>}
            {hdsVencidas > 0 && <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-full font-medium">⚠ {hdsVencidas} HDS vencidas</span>}
            {hdsPorVencer > 0 && <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full font-medium">📅 {hdsPorVencer} HDS por vencer (90 días)</span>}
            {(stats?.bajo_stock_count||0) > 0 && <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-full font-medium">📦 {stats.bajo_stock_count} sustancias bajo stock mínimo</span>}
            {(stats?.capacitaciones_vencidas||0) > 0 && <span className="text-xs bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-full font-medium">🎓 {stats.capacitaciones_vencidas} capacitaciones vencidas</span>}
          </div>
        </div>
      )}

      {/* ── FILA 3: % HDS vigente + Distribución por riesgo + HDS pie ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* 1. Gauge HDS */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
            % HDS vigente · Ley 29783 Art. 35
          </h3>
          <div className="flex flex-col items-center gap-4">
            <GaugePct
              pct={stats?.pct_hds_vigente || 0}
              label="Sustancias con HDS disponible y actualizada"
              color={stats?.pct_hds_vigente >= 80 ? '#10b981' : stats?.pct_hds_vigente >= 50 ? '#f59e0b' : '#ef4444'}
              size={140}
            />
            <div className="w-full grid grid-cols-2 gap-2 text-center">
              {[
                { label: 'Con HDS vigente', val: conHdsVigente, cls: 'bg-emerald-50 text-emerald-700' },
                { label: 'Por vencer',      val: hdsPorVencer,  cls: 'bg-amber-50 text-amber-700' },
                { label: 'HDS vencida',     val: hdsVencidas,   cls: 'bg-orange-50 text-orange-700' },
                { label: 'Sin HDS',         val: sinHds,        cls: 'bg-red-50 text-red-700' },
              ].map(({ label, val, cls }) => (
                <div key={label} className={`${cls} rounded-lg p-2`}>
                  <p className="text-xl font-black">{val}</p>
                  <p className="text-[10px] font-medium leading-tight">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Distribución por nivel de riesgo */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
            Distribución por nivel de riesgo
          </h3>
          {riesgoData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={riesgoData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={75} innerRadius={32}
                    paddingAngle={3}
                    label={({ name, value, percent }) =>
                      `${value} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}>
                    {riesgoData.map((d, i) => <Cell key={i} fill={d.color}/>)}
                  </Pie>
                  <Tooltip content={<TooltipCustom/>}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {riesgoData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: d.color }}/>
                    <span className="text-gray-600">{d.name}: <strong>{d.value}</strong></span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-center text-gray-400 py-10 text-sm">Sin datos</p>}
        </div>

        {/* 3. Estado HDS pie */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
            Estado de HDS / Fichas de seguridad
          </h3>
          {hdsData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={hdsData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={75} paddingAngle={3}
                    label={({ value, percent }) =>
                      `${value} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}>
                    {hdsData.map((d, i) => <Cell key={i} fill={d.color}/>)}
                  </Pie>
                  <Tooltip content={<TooltipCustom/>}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {hdsData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: d.color }}/>
                      <span className="text-gray-600">{d.name}</span>
                    </span>
                    <span className="font-bold text-gray-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-center text-gray-400 py-10 text-sm">Sin datos</p>}
        </div>
      </div>

      {/* ── FILA 4: Sustancias por área × nivel de riesgo (mapa de calor) ── */}
      {areas.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
            Sustancias por área × nivel de riesgo
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100 min-w-[160px]">Área</th>
                  {['muy_alto','alto','medio','bajo'].map(r => (
                    <th key={r} className="px-3 py-2.5 text-xs font-semibold uppercase border-b border-gray-100 text-center min-w-[80px]"
                      style={{ color: RIESGO_COLOR[r] }}>
                      {RIESGO_LABEL[r]}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100 text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {areas.map((area, i) => {
                  const row  = areaRiesgoMap[area]
                  const tot  = Object.values(row).reduce((s, v) => s + v, 0)
                  return (
                    <tr key={area} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-3 py-2.5 font-medium text-gray-700 text-sm">{area}</td>
                      {['muy_alto','alto','medio','bajo'].map(r => {
                        const v   = row[r] || 0
                        const pct = tot > 0 ? v / tot : 0
                        return (
                          <td key={r} className="px-3 py-2.5 text-center">
                            {v > 0 ? (
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-black text-white"
                                style={{ background: RIESGO_COLOR[r], opacity: 0.4 + pct * 0.6 }}>
                                {v}
                              </span>
                            ) : <span className="text-gray-200 text-xs">—</span>}
                          </td>
                        )
                      })}
                      <td className="px-3 py-2.5 text-center font-bold text-gray-700">{tot}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">Color más intenso = mayor proporción de sustancias de ese riesgo en el área</p>
        </div>
      )}

      {/* ── FILA 5: Stock por clase GHS + Inventario por área ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Stock por clase de peligro GHS */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
            Stock por clase de peligro GHS
          </h3>
          {stockClaseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stockClaseData} layout="vertical"
                margin={{ top: 0, right: 55, bottom: 0, left: 80 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={75}/>
                <Tooltip content={<TooltipCustom/>}/>
                <Bar dataKey="value" name="Stock total" radius={[0,4,4,0]}>
                  {stockClaseData.map((d, i) => <Cell key={i} fill={d.fill}/>)}
                  <LabelList
                    dataKey="value"
                    position="right"
                    style={{ fontSize: 11, fontWeight: 700, fill: '#374151' }}
                    formatter={v => v % 1 === 0 ? v : v.toFixed(2)}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400 py-10 text-sm">
              Sin datos de stock por clase de peligro.<br/>
              <span className="text-xs">Asigna pictogramas GHS y cantidad de stock a las sustancias.</span>
            </p>
          )}
        </div>

        {/* Inventario por área (barras horizontales) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
            Sustancias por área de uso
          </h3>
          {Object.keys(stats?.por_area_resumen || {}).length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={Object.entries(stats.por_area_resumen).map(([k, v]) => ({ area: k, total: v }))}
                layout="vertical" margin={{ top: 0, right: 35, bottom: 0, left: 100 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false}/>
                <YAxis type="category" dataKey="area" tick={{ fontSize: 10 }} width={95}/>
                <Tooltip content={<TooltipCustom/>}/>
                <Bar dataKey="total" name="Sustancias" fill="#8b5cf6" radius={[0,4,4,0]}>
                  <LabelList dataKey="total" position="right"
                    style={{ fontSize: 11, fontWeight: 700, fill: '#374151' }}/>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-gray-400 py-10 text-sm">Sin sustancias con área asignada</p>}
        </div>
      </div>

      {/* ── FILA 6: Evolución mensual del inventario ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Evolución del inventario — entradas, salidas y nuevas sustancias
          </h3>
          <div className="flex gap-1">
            {[3, 6, 12].map(m => (
              <button key={m} onClick={() => setMeses(m)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  meses === m ? 'bg-roka-500 text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}>
                {m}M
              </button>
            ))}
          </div>
        </div>
        {evol.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={evol} margin={{ top: 20, right: 15, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
              <XAxis dataKey="label" tick={{ fontSize: 10 }}/>
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} allowDecimals={false}/>
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} allowDecimals={false}/>
              <Tooltip content={<TooltipCustom/>}/>
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }}/>
              <Area yAxisId="left" type="monotone" dataKey="entradas" name="Entradas de stock"
                fill="#d1fae5" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }}>
                <LabelList dataKey="entradas" position="top"
                  formatter={v => v > 0 ? v : ''}
                  style={{ fontSize: 10, fontWeight: 700, fill: '#059669' }}/>
              </Area>
              <Area yAxisId="left" type="monotone" dataKey="salidas" name="Salidas de stock"
                fill="#fee2e2" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }}>
                <LabelList dataKey="salidas" position="top"
                  formatter={v => v > 0 ? v : ''}
                  style={{ fontSize: 10, fontWeight: 700, fill: '#dc2626' }}/>
              </Area>
              <Bar yAxisId="right" dataKey="nuevas" name="Nuevas sustancias registradas"
                fill="#8b5cf6" radius={[4,4,0,0]} barSize={14}>
                <LabelList dataKey="nuevas" position="top"
                  formatter={v => v > 0 ? v : ''}
                  style={{ fontSize: 10, fontWeight: 700, fill: '#7c3aed' }}/>
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-sm gap-2">
            <TrendingUp size={28} className="text-gray-200"/>
            <p>Sin movimientos de stock registrados</p>
            <p className="text-xs text-gray-300">Registra entradas y salidas desde el módulo de stock de cada sustancia</p>
          </div>
        )}
      </div>

      {/* ── FILA 7: Sustancias bajo stock mínimo ── */}
      {(stats?.bajo_stock || []).length > 0 && (
        <div className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-orange-50 border-b border-orange-200 flex items-center gap-2">
            <Package size={16} className="text-orange-600"/>
            <h3 className="text-sm font-semibold text-orange-800">
              Sustancias bajo stock mínimo — requieren reposición ({stats.bajo_stock.length})
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['Sustancia','Nivel riesgo','Stock actual','Stock mínimo','Unidad',''].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.bajo_stock.map(s => (
                <tr key={s.id} className="hover:bg-orange-50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{s.nombre}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded-full border font-medium"
                      style={{ color: RIESGO_COLOR[s.nivel_riesgo], background: RIESGO_COLOR[s.nivel_riesgo] + '20', borderColor: RIESGO_COLOR[s.nivel_riesgo] + '60' }}>
                      {RIESGO_LABEL[s.nivel_riesgo]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-bold text-red-600">{s.cantidad_stock}</td>
                  <td className="px-4 py-2.5 text-gray-500">{s.stock_minimo}</td>
                  <td className="px-4 py-2.5 text-gray-400">{s.unidad_medida}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => navigate(`/sustancias/${s.id}/movimientos`)}
                      className="text-xs text-roka-600 hover:text-roka-700 font-medium border border-roka-200 hover:bg-roka-50 px-2 py-0.5 rounded-full">
                      + Entrada
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── FILA 8: Últimas sustancias registradas ── */}
      {stats?.recientes?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Registradas recientemente
          </h3>
          <div className="space-y-1.5">
            {stats.recientes.map(s => (
              <div key={s.id} onClick={() => navigate(`/sustancias/${s.id}`)}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <FlaskConical size={14} className="text-purple-400 flex-shrink-0"/>
                <span className="flex-1 text-sm font-medium text-gray-700">{s.nombre}</span>
                <span className="text-xs px-2 py-0.5 rounded-full border font-medium"
                  style={{ color: RIESGO_COLOR[s.nivel_riesgo], background: RIESGO_COLOR[s.nivel_riesgo] + '18', borderColor: RIESGO_COLOR[s.nivel_riesgo] + '50' }}>
                  {RIESGO_LABEL[s.nivel_riesgo]}
                </span>
                {!s.hds_disponible && <span className="text-xs text-red-500 font-medium">Sin HDS</span>}
                <span className="text-xs text-gray-300">
                  {new Date(s.created_at).toLocaleDateString('es-PE',{ day:'2-digit', month:'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSS de impresión */}
      <style>{`
        @media print {
          .btn-back, button { display: none !important; }
          @page { size: A4 portrait; margin: 12mm; }
          body { font-size: 11px; }
        }
      `}</style>
    </div>
  )
}
