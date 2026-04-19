import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  BarChart3, AlertTriangle, ClipboardCheck, GraduationCap,
  HardHat, HeartPulse, ShieldCheck, Printer, RefreshCw,
  TrendingDown, TrendingUp, Minus,
} from 'lucide-react'
import api from '../../services/api'

const ANIO_ACTUAL = new Date().getFullYear()
const ANIOS = Array.from({ length: 5 }, (_, i) => ANIO_ACTUAL - i)

const COLORS_PIE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const KpiCard = ({ label, valor, sub, color = 'text-white', icon: Icon, iconColor = 'text-roka-400' }) => (
  <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{valor ?? '—'}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
      {Icon && <Icon size={20} className={iconColor} />}
    </div>
  </div>
)

const SectionTitle = ({ children }) => (
  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{children}</h3>
)

// ─── Tab Consolidado ─────────────────────────────────────────────────────────

function TabConsolidado({ anio }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/reportes/consolidado', { params: { anio } })
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [anio])

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>
  if (!data) return <div className="text-center py-12 text-slate-500">Sin datos disponibles</div>

  const { accidentabilidad: acc, inspecciones: insp, capacitaciones: cap, salud, epps, auditorias } = data

  return (
    <div className="space-y-6">
      {/* Indicadores legales */}
      <div>
        <SectionTitle>Indicadores de Accidentabilidad — {anio}</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Accidentes" valor={acc.accidentes} sub={`${acc.mortales} mortal(es)`} icon={AlertTriangle} iconColor="text-red-400" color={acc.accidentes > 0 ? 'text-red-400' : 'text-white'} />
          <KpiCard label="Índice de Frecuencia" valor={acc.indice_frecuencia} sub="× 10⁶ HHT" icon={TrendingUp} iconColor="text-orange-400" />
          <KpiCard label="Índice de Gravedad" valor={acc.indice_gravedad} sub="× 10⁶ HHT" icon={TrendingDown} iconColor="text-amber-400" />
          <KpiCard label="Días sin accidentes" valor={acc.dias_sin_accidentes} icon={ShieldCheck} iconColor="text-emerald-400" color="text-emerald-400" />
        </div>
      </div>

      {/* Gestión SST */}
      <div>
        <SectionTitle>Gestión SST — {anio}</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Inspecciones" valor={insp.total} sub={`${insp.cumplimiento_pct}% cumplimiento`} icon={ClipboardCheck} iconColor="text-blue-400" />
          <KpiCard label="Capacitaciones" valor={cap.total} sub={`${cap.horas}h ejecutadas`} icon={GraduationCap} iconColor="text-purple-400" />
          <KpiCard label="EMO Vencidos" valor={salud.emos_vencidos} sub={`${salud.emos_proximos} próximos 30d`} icon={HeartPulse} iconColor={salud.emos_vencidos > 0 ? 'text-red-400' : 'text-slate-500'} color={salud.emos_vencidos > 0 ? 'text-red-400' : 'text-white'} />
          <KpiCard label="EPP Stock Crítico" valor={epps.stock_critico} sub={`${epps.entregas_mes} entregas este mes`} icon={HardHat} iconColor={epps.stock_critico > 0 ? 'text-amber-400' : 'text-slate-500'} color={epps.stock_critico > 0 ? 'text-amber-400' : 'text-white'} />
        </div>
      </div>

      {/* Tabla resumen */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              {['Módulo', 'KPI Principal', 'Valor', 'Estado'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {[
              { mod: 'Accidentabilidad',  kpi: 'Accidentes año',        val: acc.accidentes,           ok: acc.accidentes === 0 },
              { mod: 'Inspecciones',      kpi: 'Cumplimiento %',         val: `${insp.cumplimiento_pct}%`, ok: insp.cumplimiento_pct >= 80 },
              { mod: 'Capacitaciones',    kpi: 'Ejecutadas vs. programadas', val: `${cap.ejecutadas}/${cap.total}`, ok: cap.cumplimiento_pct >= 80 },
              { mod: 'Salud/EMO',         kpi: 'EMO vencidos',           val: salud.emos_vencidos,       ok: salud.emos_vencidos === 0 },
              { mod: 'EPPs',              kpi: 'Stock crítico',          val: epps.stock_critico,        ok: epps.stock_critico === 0 },
              { mod: 'Auditorías',        kpi: 'Hallazgos abiertos',     val: auditorias.hallazgos_abiertos, ok: auditorias.hallazgos_abiertos === 0 },
            ].map(({ mod, kpi, val, ok }) => (
              <tr key={mod} className="hover:bg-slate-700/30">
                <td className="px-4 py-3 text-slate-200 font-medium">{mod}</td>
                <td className="px-4 py-3 text-slate-400">{kpi}</td>
                <td className="px-4 py-3 text-slate-200">{val}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full border ${ok ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {ok ? 'OK' : 'Atención'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab Accidentabilidad ────────────────────────────────────────────────────

function TabAccidentabilidad({ anio }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/reportes/accidentabilidad', { params: { anio } })
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [anio])

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>
  if (!data) return <div className="text-center py-12 text-slate-500">Sin datos</div>

  const { resumen: r, serie } = data

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Accidentes" valor={r.total_accidentes} sub={`${r.mortales} mortal(es)`} icon={AlertTriangle} iconColor="text-red-400" color={r.total_accidentes > 0 ? 'text-red-400' : 'text-white'} />
        <KpiCard label="IF" valor={r.IF_anual} sub="Índice de Frecuencia" />
        <KpiCard label="IG" valor={r.IG_anual} sub="Índice de Gravedad" />
        <KpiCard label="ISAL" valor={r.ISAL_anual} sub="Índice de Accidentabilidad" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>Accidentes e Incidentes por mes</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={serie} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} />
              <Legend />
              <Bar dataKey="accidentes" name="Accidentes" fill="#ef4444" radius={[4,4,0,0]} />
              <Bar dataKey="incidentes" name="Incidentes" fill="#f59e0b" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>IF mensual (Índice de Frecuencia)</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={serie} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} />
              <Line type="monotone" dataKey="IF" name="IF" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="IG" name="IG" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla mensual */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              {['Mes', 'Accid.', 'Incid.', 'Días perd.', 'IF', 'IG', 'ISAL'].map(h => (
                <th key={h} className="text-left px-3 py-3 text-xs font-medium text-slate-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {serie.map(row => (
              <tr key={row.mes} className="hover:bg-slate-700/30">
                <td className="px-3 py-2 text-slate-300 font-medium">{row.mes}</td>
                <td className="px-3 py-2 text-slate-400">{row.accidentes}</td>
                <td className="px-3 py-2 text-slate-400">{row.incidentes}</td>
                <td className="px-3 py-2 text-slate-400">{row.dias_perdidos}</td>
                <td className="px-3 py-2 text-slate-300">{row.IF}</td>
                <td className="px-3 py-2 text-slate-300">{row.IG}</td>
                <td className="px-3 py-2 text-slate-300">{row.ISAL}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab Inspecciones ────────────────────────────────────────────────────────

function TabInspecciones({ anio }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/reportes/inspecciones', { params: { anio } })
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [anio])

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>
  if (!data) return <div className="text-center py-12 text-slate-500">Sin datos</div>

  const total = data.por_mes.reduce((s, m) => s + m.total, 0)
  const cerradas = data.por_mes.reduce((s, m) => s + m.cerradas, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total" valor={total} icon={ClipboardCheck} iconColor="text-blue-400" />
        <KpiCard label="Cerradas" valor={cerradas} icon={ClipboardCheck} iconColor="text-emerald-400" />
        <KpiCard label="Cumplimiento" valor={`${total > 0 ? Math.round((cerradas/total)*100) : 0}%`} />
        <KpiCard label="Hallazgos abiertos" valor={data.hallazgos_por_estado?.find(h => h.estado === 'abierto')?.total ?? 0} iconColor="text-amber-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>Inspecciones por mes</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.por_mes} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} />
              <Bar dataKey="total" name="Programadas" fill="#3b82f6" radius={[4,4,0,0]} />
              <Bar dataKey="cerradas" name="Cerradas" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>Por tipo de inspección</SectionTitle>
          {data.por_tipo?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.por_tipo} dataKey="total" nameKey="tipo" cx="50%" cy="50%" outerRadius={90} label={({ tipo, percent }) => `${tipo} ${(percent * 100).toFixed(0)}%`}>
                  {data.por_tipo.map((_, i) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Sin inspecciones registradas</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab Capacitaciones ──────────────────────────────────────────────────────

function TabCapacitaciones({ anio }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/reportes/capacitaciones', { params: { anio } })
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [anio])

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>
  if (!data) return <div className="text-center py-12 text-slate-500">Sin datos</div>

  const total = data.por_mes.reduce((s, m) => s + m.total, 0)
  const exec  = data.por_mes.reduce((s, m) => s + m.ejecutadas, 0)
  const horas = data.por_mes.reduce((s, m) => s + m.horas, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total programadas" valor={total} icon={GraduationCap} iconColor="text-purple-400" />
        <KpiCard label="Ejecutadas" valor={exec} iconColor="text-emerald-400" />
        <KpiCard label="Horas totales" valor={horas} sub="horas-capacitación" />
        <KpiCard label="Asistencia promedio" valor={`${data.asistencia_promedio}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>Capacitaciones y horas por mes</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.por_mes} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} />
              <Bar yAxisId="left" dataKey="ejecutadas" name="Ejecutadas" fill="#8b5cf6" radius={[4,4,0,0]} />
              <Bar yAxisId="right" dataKey="horas" name="Horas" fill="#06b6d4" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>Por modalidad</SectionTitle>
          {data.por_modalidad?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.por_modalidad} dataKey="total" nameKey="modalidad" cx="50%" cy="50%" outerRadius={90}
                  label={({ modalidad, percent }) => `${modalidad} ${(percent*100).toFixed(0)}%`}>
                  {data.por_modalidad.map((_, i) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Sin datos de modalidad</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab Salud ───────────────────────────────────────────────────────────────

function TabSalud({ anio }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/reportes/salud', { params: { anio } })
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [anio])

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>
  if (!data) return <div className="text-center py-12 text-slate-500">Sin datos</div>

  const totalEmos = data.por_mes.reduce((s, m) => s + m.emos, 0)
  const totalAten = data.por_mes.reduce((s, m) => s + m.atenciones, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="EMO realizados" valor={totalEmos} icon={HeartPulse} iconColor="text-emerald-400" />
        <KpiCard label="Atenciones" valor={totalAten} />
        <KpiCard label="Restricciones activas" valor={data.restricciones_activas} iconColor="text-amber-400" />
        <KpiCard label="Bajas laborales" valor={data.por_mes.reduce((s, m) => s + m.bajas, 0)} iconColor="text-red-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>EMO y atenciones por mes</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.por_mes} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} />
              <Bar dataKey="emos" name="EMO" fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="atenciones" name="Atenciones" fill="#3b82f6" radius={[4,4,0,0]} />
              <Bar dataKey="bajas" name="Bajas" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>EMO por resultado</SectionTitle>
          {data.por_resultado?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.por_resultado} dataKey="total" nameKey="resultado" cx="50%" cy="50%" outerRadius={90}
                  label={({ resultado, percent }) => `${resultado?.replace(/_/g,' ')} ${(percent*100).toFixed(0)}%`}>
                  {data.por_resultado.map((_, i) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Sin EMO registrados</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab EPPs ────────────────────────────────────────────────────────────────

function TabEpps({ anio }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/reportes/epps', { params: { anio } })
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [anio])

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>
  if (!data) return <div className="text-center py-12 text-slate-500">Sin datos</div>

  const totalEntregas = data.por_mes.reduce((s, m) => s + m.entregas, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Entregas en el año" valor={totalEntregas} icon={HardHat} iconColor="text-roka-400" />
        <KpiCard label="Stock crítico" valor={data.stock_critico} iconColor={data.stock_critico > 0 ? 'text-red-400' : 'text-slate-500'} color={data.stock_critico > 0 ? 'text-red-400' : 'text-white'} />
        <KpiCard label="Categorías" valor={data.por_categoria?.length ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>Entregas por mes</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.por_mes} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} />
              <Bar dataKey="entregas" name="Entregas" fill="#f59e0b" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>Stock por categoría</SectionTitle>
          {data.por_categoria?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.por_categoria} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis type="category" dataKey="categoria" width={90} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} />
                <Bar dataKey="stock" name="Stock disp." fill="#3b82f6" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Sin EPPs registrados</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab SUNAFIL ─────────────────────────────────────────────────────────────

function TabSunafil({ anio }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/reportes/sunafil', { params: { anio } })
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [anio])

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>
  if (!data) return <div className="text-center py-12 text-slate-500">Sin datos</div>

  const { empresa, personal, accidentabilidad: a, gestion: g } = data

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Encabezado imprimible */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{empresa.razon_social || 'Empresa'}</h2>
            <p className="text-slate-400 text-sm">RUC: {empresa.ruc} · Año: {anio}</p>
            <p className="text-xs text-slate-500 mt-1">Generado: {new Date(data.generado_en).toLocaleString('es-PE')}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Resumen para inspección</p>
            <p className="text-xs font-semibold text-roka-400">SUNAFIL</p>
          </div>
        </div>
      </div>

      {/* Personal */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
        <SectionTitle>Personal y Horas-Hombre</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <KpiCard label="Total trabajadores activos" valor={personal.total_activo} />
          <KpiCard label="HHT estimadas (año)" valor={personal.hht_anual.toLocaleString('es-PE')} />
        </div>
      </div>

      {/* Accidentabilidad */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
        <SectionTitle>Registro de Accidentabilidad — {anio}</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Accidentes mortales" valor={a.mortales} color={a.mortales > 0 ? 'text-red-400' : 'text-white'} />
          <KpiCard label="Accidentes incapacitantes" valor={a.incapacitantes} />
          <KpiCard label="Accidentes leves" valor={a.leves} />
          <KpiCard label="Incidentes peligrosos" valor={a.incidentes} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <KpiCard label="Días perdidos" valor={a.dias_perdidos} />
          <KpiCard label="IF" valor={a.IF} sub="Índice de Frecuencia" />
          <KpiCard label="IG" valor={a.IG} sub="Índice de Gravedad" />
          <KpiCard label="ISAL" valor={a.ISAL} sub="Índice de Accidentabilidad" />
        </div>
      </div>

      {/* Gestión SST */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
        <SectionTitle>Gestión SST — {anio}</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Inspecciones" valor={g.inspecciones} />
          <KpiCard label="Capacitaciones ejecutadas" valor={`${g.capacitaciones_ejec}/${g.capacitaciones_total}`} />
          <KpiCard label="Simulacros" valor={g.simulacros} />
          <KpiCard label="Auditorías SST" valor={g.auditorias} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <KpiCard label="EMO vencidos" valor={g.emos_vencidos} color={g.emos_vencidos > 0 ? 'text-red-400' : 'text-white'} />
          <KpiCard label="Documentos vigentes" valor={g.documentos_vigentes} />
          <KpiCard label="Formatos RM-050 vigentes" valor={g.formatos_vigentes} />
        </div>
      </div>

      <p className="text-xs text-slate-600 text-center">
        Resumen generado automáticamente por SST ROKA — No reemplaza los registros físicos obligatorios (RM 050-2013-TR)
      </p>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

const TABS = [
  { key: 'consolidado',    label: 'Consolidado',    icon: BarChart3 },
  { key: 'accidentabilidad', label: 'Accidentabilidad', icon: AlertTriangle },
  { key: 'inspecciones',   label: 'Inspecciones',   icon: ClipboardCheck },
  { key: 'capacitaciones', label: 'Capacitaciones', icon: GraduationCap },
  { key: 'salud',          label: 'Salud/EMO',      icon: HeartPulse },
  { key: 'epps',           label: 'EPPs',           icon: HardHat },
  { key: 'sunafil',        label: 'SUNAFIL',        icon: ShieldCheck },
]

export default function ReportesPage() {
  const [tab, setTab]   = useState('consolidado')
  const [anio, setAnio] = useState(ANIO_ACTUAL)

  const TabComponent = {
    consolidado:    TabConsolidado,
    accidentabilidad: TabAccidentabilidad,
    inspecciones:   TabInspecciones,
    capacitaciones: TabCapacitaciones,
    salud:          TabSalud,
    epps:           TabEpps,
    sunafil:        TabSunafil,
  }[tab]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reportes MINTRA</h1>
          <p className="text-slate-400 text-sm mt-1">Indicadores legales SST · RM 050-2013-TR · Ley 29783</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={anio}
            onChange={e => setAnio(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2"
          >
            {ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 border border-slate-700 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-sm"
          >
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 rounded-lg p-1 flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Contenido del tab activo */}
      <TabComponent anio={anio} key={`${tab}-${anio}`} />
    </div>
  )
}
