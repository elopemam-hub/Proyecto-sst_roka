import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts'
import {
  Activity, AlertTriangle, Calendar, CheckCircle2,
  Clock, HardHat, HeartPulse, RefreshCw, Shield,
  TrendingDown, Users, Zap, Package
} from 'lucide-react'
import {
  fetchKpis, fetchAccidentabilidad, fetchPorArea,
  selectKpis, selectAccidentabilidad, selectPorArea,
  selectDashboardLoading, selectLastUpdated
} from '../../store/slices/dashboardSlice'
import { selectUser } from '../../store/slices/authSlice'
import KpiCard from '../../components/dashboard/KpiCard'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Tooltip personalizado para Recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-400 mb-2 font-medium">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-slate-300">{entry.name}: </span>
          <span className="text-slate-100 font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const dispatch    = useDispatch()
  const user        = useSelector(selectUser)
  const kpis        = useSelector(selectKpis)
  const accData     = useSelector(selectAccidentabilidad)
  const porArea     = useSelector(selectPorArea)
  const loading     = useSelector(selectDashboardLoading)
  const lastUpdated = useSelector(selectLastUpdated)

  const [anio, setAnio] = useState(new Date().getFullYear())

  // Cargar datos al montar
  useEffect(() => {
    dispatch(fetchKpis(anio))
    dispatch(fetchAccidentabilidad(anio))
    dispatch(fetchPorArea())
  }, [dispatch, anio])

  const handleRefresh = () => {
    dispatch(fetchKpis(anio))
    dispatch(fetchAccidentabilidad(anio))
    dispatch(fetchPorArea())
  }

  const horaActual = new Date().getHours()
  const saludo = horaActual < 12 ? 'Buenos días' : horaActual < 19 ? 'Buenas tardes' : 'Buenas noches'

  // Datos de accidentabilidad por mes
  const chartData = accData?.datos || Array.from({ length: 12 }, (_, i) => ({
    mes: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'][i],
    accidentes: 0, incidentes: 0, dias_perdidos: 0,
  }))

  // Colores de estado para áreas
  const getAreaStatus = (area) => {
    if (area.accidentes_mes > 0)        return 'danger'
    if (area.inspecciones_pendientes > 2) return 'warning'
    return 'success'
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Encabezado ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-slate-400 text-sm">{saludo}, <span className="text-slate-200 font-medium">{user?.nombre}</span></p>
          <h1 className="text-2xl font-bold text-slate-100 mt-0.5">Dashboard SST</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Selector de año */}
          <select
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className="input w-auto text-sm"
          >
            {[2024, 2025, 2026].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Actualizar */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          {/* Última actualización */}
          {lastUpdated && (
            <p className="text-xs text-slate-600 hidden md:block">
              Actualizado {format(new Date(lastUpdated), "HH:mm", { locale: es })}
            </p>
          )}
        </div>
      </div>

      {/* ── KPIs principales — Fila 1 ───────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        <KpiCard
          label="Días sin accidentes"
          value={kpis?.dias_sin_accidentes}
          icon={Shield}
          iconBg="bg-emerald-500/15"
          iconColor="text-emerald-400"
          status={kpis?.dias_sin_accidentes > 0 ? 'success' : 'danger'}
          loading={loading}
        />
        <KpiCard
          label="Índice de frecuencia (IF)"
          value={kpis?.indice_frecuencia}
          unit="×10⁶ HH"
          icon={Activity}
          iconBg="bg-amber-500/15"
          iconColor="text-amber-400"
          status={kpis?.indice_frecuencia > 5 ? 'danger' : kpis?.indice_frecuencia > 2 ? 'warning' : 'success'}
          loading={loading}
        />
        <KpiCard
          label="Índice de severidad (IS)"
          value={kpis?.indice_severidad}
          unit="×10⁶ HH"
          icon={TrendingDown}
          iconBg="bg-red-500/15"
          iconColor="text-red-400"
          status={kpis?.indice_severidad > 100 ? 'danger' : 'normal'}
          loading={loading}
        />
        <KpiCard
          label="Cumplimiento programa SST"
          value={kpis?.cumplimiento_programa}
          unit="%"
          icon={CheckCircle2}
          iconBg="bg-roka-500/15"
          iconColor="text-roka-400"
          status={
            kpis?.cumplimiento_programa >= 80 ? 'success' :
            kpis?.cumplimiento_programa >= 50 ? 'warning' : 'danger'
          }
          loading={loading}
        />
      </div>

      {/* ── KPIs secundarios — Fila 2 ───────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 stagger">
        {[
          { label: 'Personal activo',      value: kpis?.total_personal,           icon: Users,       bg: 'bg-slate-700/50',      color: 'text-slate-300' },
          { label: 'EPPs stock crítico',   value: kpis?.epps_stock_critico,       icon: HardHat,     bg: 'bg-amber-500/10',      color: 'text-amber-400', status: kpis?.epps_stock_critico > 0 ? 'warning' : 'success' },
          { label: 'Inspecciones vencidas',value: kpis?.inspecciones_vencidas,    icon: Calendar,    bg: 'bg-red-500/10',        color: 'text-red-400',   status: kpis?.inspecciones_vencidas > 0 ? 'danger' : 'success' },
          { label: 'Capacitaciones pend.', value: kpis?.capacitaciones_pendientes, icon: Clock,      bg: 'bg-purple-500/10',     color: 'text-purple-400' },
          { label: 'EMOs por vencer',      value: kpis?.emos_proximos_vencer,     icon: HeartPulse,  bg: 'bg-pink-500/10',       color: 'text-pink-400',  status: kpis?.emos_proximos_vencer > 0 ? 'warning' : 'success' },
          { label: 'Accidentes en el año', value: kpis?.accidentes_anio,          icon: AlertTriangle, bg: 'bg-red-500/10',      color: 'text-red-400',   status: kpis?.accidentes_anio > 0 ? 'danger' : 'success' },
        ].map((kpi) => (
          <div key={kpi.label} className={`card p-4 flex items-center gap-3 ${kpi.status === 'danger' ? 'border-red-500/30' : kpi.status === 'warning' ? 'border-amber-500/30' : kpi.status === 'success' ? 'border-emerald-500/20' : ''}`}>
            <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center shrink-0`}>
              <kpi.icon size={16} className={kpi.color} />
            </div>
            <div className="min-w-0">
              {loading ? (
                <div className="h-5 w-10 bg-slate-800 rounded animate-pulse mb-1" />
              ) : (
                <p className="text-lg font-bold text-slate-100 tabular-nums">
                  {kpi.value ?? '—'}
                </p>
              )}
              <p className="text-xs text-slate-500 truncate">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Gráficos ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Accidentabilidad mensual — ocupa 2 columnas */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-slate-200">Accidentabilidad mensual</h3>
              <p className="text-xs text-slate-500 mt-0.5">Accidentes e incidentes — {anio}</p>
            </div>
            <span className="badge badge-blue">{anio}</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradAcc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="gradInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="accidentes" name="Accidentes"  stroke="#ef4444" fill="url(#gradAcc)" strokeWidth={2} />
              <Area type="monotone" dataKey="incidentes"  name="Incidentes" stroke="#f59e0b" fill="url(#gradInc)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Cumplimiento por tipo */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-200 mb-1">Estado del programa</h3>
          <p className="text-xs text-slate-500 mb-5">Avance de actividades SST</p>
          <div className="space-y-4">
            {[
              { label: 'Capacitaciones', pct: 72, color: 'bg-roka-500' },
              { label: 'Inspecciones',   pct: 85, color: 'bg-emerald-500' },
              { label: 'Simulacros',     pct: 50, color: 'bg-amber-500' },
              { label: 'Auditorías',     pct: 33, color: 'bg-purple-500' },
              { label: 'Monitoreo',      pct: 60, color: 'bg-pink-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">{item.label}</span>
                  <span className="text-slate-300 font-medium tabular-nums">{item.pct}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-700`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Estado por áreas operativas ─────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-slate-200">Estado por área operativa</h3>
            <p className="text-xs text-slate-500 mt-0.5">Resumen de seguridad por área</p>
          </div>
        </div>

        {porArea.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Package size={32} className="text-slate-700" />
            <p className="text-slate-500 text-sm">No hay áreas configuradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Área</th>
                  <th className="text-center py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Personal</th>
                  <th className="text-center py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Insp. pendientes</th>
                  <th className="text-center py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Accidentes mes</th>
                  <th className="text-center py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Cumplimiento</th>
                  <th className="text-center py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-800/50">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="py-3 px-3">
                            <div className="h-4 bg-slate-800 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : porArea.map((area) => {
                      const st = getAreaStatus(area)
                      return (
                        <tr key={area.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${st === 'success' ? 'bg-emerald-400' : st === 'warning' ? 'bg-amber-400' : 'bg-red-400'}`} />
                              <span className="text-slate-200 font-medium">{area.nombre}</span>
                              <span className="badge badge-gray capitalize">{area.tipo}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center text-slate-300 tabular-nums">{area.personal_activo}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={area.inspecciones_pendientes > 0 ? 'text-amber-400' : 'text-slate-500'}>
                              {area.inspecciones_pendientes}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={area.accidentes_mes > 0 ? 'text-red-400 font-semibold' : 'text-slate-500'}>
                              {area.accidentes_mes}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="h-1.5 w-16 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${area.cumplimiento >= 80 ? 'bg-emerald-500' : area.cumplimiento >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${area.cumplimiento}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-400 tabular-nums w-8">{area.cumplimiento}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`badge ${st === 'success' ? 'badge-green' : st === 'warning' ? 'badge-yellow' : 'badge-red'}`}>
                              {st === 'success' ? 'Normal' : st === 'warning' ? 'Atención' : 'Crítico'}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pie de página informativo ───────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pb-2">
        <span className="flex items-center gap-1.5">
          <Zap size={12} className="text-roka-600" />
          Tiempo real via WebSocket
        </span>
        <span>·</span>
        <span>Ley 29783 · DS 005-2012-TR · RM 050-2013-TR</span>
        <span>·</span>
        <span>SST ROKA v1.0 — Fase 1</span>
      </div>
    </div>
  )
}
