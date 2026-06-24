import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  GraduationCap, Plus, CalendarRange, BarChart3, Users,
  Clock, CheckCircle, AlertTriangle, ChevronRight, Play,
  BookOpen, TrendingUp, Calendar, FileSpreadsheet, ClipboardList,
} from 'lucide-react'
import {
  Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, Cell,
} from 'recharts'
import api from '../../services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const TIPO_COLOR = {
  induccion:       'bg-blue-50 text-blue-700 border-blue-200',
  especifica:      'bg-purple-50 text-purple-700 border-purple-200',
  general:         'bg-emerald-50 text-emerald-700 border-emerald-200',
  sensibilizacion: 'bg-amber-50 text-amber-700 border-amber-200',
}
const TIPO_LABEL = {
  induccion: 'Inducción', especifica: 'Específica', general: 'General', sensibilizacion: 'Sensibilización',
}
const ESTADO_COLOR = {
  programada:   'bg-blue-50 text-blue-700',
  ejecutada:    'bg-emerald-50 text-emerald-700',
  cancelada:    'bg-red-50 text-red-700',
  reprogramada: 'bg-amber-50 text-amber-700',
}
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

// Paleta de colores para los gráficos
const TIPO_FILL = {
  induccion:       '#3b82f6',   // azul
  especifica:      '#8b5cf6',   // púrpura
  general:         '#10b981',   // verde
  sensibilizacion: '#f59e0b',   // ámbar
}
const TIPO_FILL_FALLBACK = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b']
const TEMA_COLORS = Array(10).fill('#6366f1')

export default function CapacitacionDashboardPage() {
  const navigate = useNavigate()
  const user = useSelector(s => s.auth.user)
  const [stats, setStats]     = useState(null)
  const [proximas, setProximas] = useState([])
  const [loading, setLoading] = useState(true)
  const anio = new Date().getFullYear()

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const [{ data: st }, { data: prox }] = await Promise.all([
        api.get('/capacitaciones/estadisticas', { params: { anio } }),
        api.get('/capacitaciones', { params: { estado: 'programada', per_page: 8, anio } }),
      ])
      setStats(st)
      setProximas(prox.data || prox)
    } catch { } finally { setLoading(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const porMes = stats?.por_mes || {}
  const maxMes = Math.max(...Object.values(porMes).map(m => m.total || 0), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Capacitaciones</h1>
          <p className="text-gray-500 text-sm mt-1">Plan anual {anio} · Ley 29783 Art. 27</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/capacitaciones/lista')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <ClipboardList size={15} /> Lista
          </button>
          <button onClick={() => navigate('/capacitaciones/cronograma')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <CalendarRange size={15} /> Cronograma
          </button>
          <button onClick={() => navigate('/capacitaciones/importar')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <FileSpreadsheet size={15} /> Importar / Exportar
          </button>
          {user?.rol !== 'operativo' && user?.rol !== 'vigilante' && user?.rol !== 'solo_lectura' && (
            <button onClick={() => navigate('/capacitaciones/nueva')}
              className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Plus size={15} /> Nueva Capacitación
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Programadas',   value: stats?.programadas ?? 0,              color: 'text-blue-600',    icon: Calendar,    bg: 'bg-blue-50' },
          { label: 'Ejecutadas',    value: stats?.ejecutadas ?? 0,               color: 'text-emerald-600', icon: CheckCircle, bg: 'bg-emerald-50' },
          { label: 'Cumplimiento',  value: `${stats?.cumplimiento ?? 0}%`,        color: stats?.cumplimiento >= 80 ? 'text-emerald-600' : 'text-amber-600', icon: TrendingUp, bg: 'bg-amber-50' },
          { label: 'Horas acum.',   value: `${stats?.horas_acumuladas ?? 0}h`,    color: 'text-purple-600',  icon: Clock,       bg: 'bg-purple-50' },
          { label: 'Asistencia',    value: stats?.porcentaje_asistencia != null ? `${stats.porcentaje_asistencia}%` : '—', color: 'text-roka-600', icon: Users, bg: 'bg-roka-50' },
        ].map(({ label, value, color, icon: Icon, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de barras por mes */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <BarChart3 size={16} className="text-roka-500" /> Distribución mensual {anio}
            </h2>
            <button onClick={() => navigate('/capacitaciones/cronograma')}
              className="text-xs text-roka-600 hover:text-roka-700 flex items-center gap-1">
              Ver cronograma <ChevronRight size={12} />
            </button>
          </div>
          <div className="flex items-end gap-1 h-32">
            {MESES.map((mes, i) => {
              const m = porMes[i + 1] || { total: 0, ejecutadas: 0, programadas: 0 }
              const h = maxMes > 0 ? Math.round((m.total / maxMes) * 100) : 0
              const pct = m.total > 0 ? Math.round(m.ejecutadas / m.total * 100) : 0
              return (
                <div key={mes} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col justify-end relative" style={{ height: '96px' }}>
                    {/* Valor encima de la barra */}
                    {m.total > 0 && (
                      <span className="absolute w-full text-center text-[10px] font-bold text-gray-600"
                        style={{ bottom: `${Math.max(h, 8)}%`, marginBottom: 2 }}>
                        {m.total}
                      </span>
                    )}
                    <div
                      className="w-full rounded-t-sm cursor-pointer transition-all hover:opacity-80 relative"
                      style={{
                        height: `${Math.max(h, m.total > 0 ? 8 : 0)}%`,
                        background: pct === 100 ? '#10b981' : pct > 0 ? '#3b82f6' : m.total > 0 ? '#e5e7eb' : 'transparent',
                      }}
                      title={`${mes}: ${m.ejecutadas}/${m.total} ejecutadas`}
                    />
                  </div>
                  <span className="text-[9px] text-gray-400">{mes}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-emerald-500 rounded-sm inline-block"/>`100% ejecutado`</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-500 rounded-sm inline-block"/>Parcial</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-gray-200 rounded-sm inline-block"/>Pendiente</span>
          </div>
        </div>

        {/* Gráfico de barras: Por bloque */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <BarChart3 size={16} className="text-roka-500" /> Por bloque
          </h2>
          <p className="text-xs text-gray-400 mb-4">Total y ejecutadas por bloque de capacitación</p>
          {(stats?.por_bloque || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-300 text-center px-4">
              <BarChart3 size={24} className="mb-2 opacity-40" />
              <p className="text-sm">Sin bloques definidos</p>
              <p className="text-xs mt-1 text-gray-400">Completa la columna BLOQUE en tus capacitaciones</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, (stats.por_bloque || []).length * 46)}>
              <BarChart
                data={(stats.por_bloque || []).map(b => ({
                  bloque:     b.bloque,
                  Total:      b.total,
                  Ejecutadas: b.ejecutadas,
                  Pendientes: b.total - b.ejecutadas,
                }))}
                layout="vertical"
                margin={{ top: 4, right: 55, left: 8, bottom: 4 }}
                barGap={3}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#4b5563', fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="bloque"
                  width={175}
                  tick={{ fontSize: 12, fill: '#111827', fontWeight: 600 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #d1d5db',
                    fontSize: 13,
                    fontWeight: 600,
                    backgroundColor: '#ffffff',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  labelStyle={{ color: '#111827', fontWeight: 700, marginBottom: 4 }}
                  itemStyle={{ color: '#374151', fontWeight: 600 }}
                />
                <Bar dataKey="Ejecutadas" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} maxBarSize={22}>
                  <LabelList dataKey="Ejecutadas" position="insideRight"
                    style={{ fontSize: 10, fontWeight: 700, fill: 'white' }}
                    formatter={v => v > 0 ? v : ''}
                  />
                </Bar>
                <Bar dataKey="Pendientes" stackId="a" fill="#e5e7eb" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  <LabelList dataKey="Total" position="right"
                    style={{ fontSize: 11, fontWeight: 700, fill: '#374151' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {/* Leyenda */}
          {(stats?.por_bloque || []).length > 0 && (
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-800 font-medium">
              <span className="flex items-center gap-2"><span className="w-4 h-3 bg-emerald-500 rounded-sm inline-block"/>Ejecutadas</span>
              <span className="flex items-center gap-2"><span className="w-4 h-3 bg-gray-300 rounded-sm inline-block"/>Pendientes</span>
            </div>
          )}
        </div>
      </div>

      {/* Gráfico de barras horizontales: Por tema */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <BarChart3 size={16} className="text-roka-500" /> Por tema
          </h2>
          <span className="text-xs text-gray-400">Top 10 temas más frecuentes</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">Número de capacitaciones registradas por cada tema</p>
        {(stats?.por_tema || []).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-300">
            <BarChart3 size={24} className="mb-2 opacity-40" />
            <p className="text-sm">Sin temas registrados — completa el campo "Tema" al crear capacitaciones</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, (stats.por_tema || []).length * 38)}>
            <BarChart
              data={(stats.por_tema || []).map(t => ({ tema: t.tema, total: t.total }))}
              layout="vertical"
              margin={{ top: 0, right: 50, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="tema"
                width={180}
                tick={{ fontSize: 11, fill: '#374151' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: '#f9fafb' }}
                formatter={(value) => [`${value} capacitaciones`, 'Total']}
                contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Bar dataKey="total" fill="#a7f3d0" radius={[0, 6, 6, 0]} maxBarSize={28}>
                <LabelList
                  dataKey="total"
                  position="right"
                  style={{ fontSize: 11, fontWeight: 700, fill: '#065f46' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Próximas capacitaciones */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Play size={15} className="text-roka-500" /> Próximas capacitaciones
          </h2>
          <button onClick={() => navigate('/capacitaciones/lista')}
            className="text-xs text-roka-600 hover:text-roka-700 flex items-center gap-1">
            Ver todas <ChevronRight size={12} />
          </button>
        </div>
        {proximas.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            <GraduationCap size={28} className="mx-auto mb-2 opacity-30" />
            No hay capacitaciones programadas
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {proximas.map(cap => (
              <div key={cap.id}
                onClick={() => navigate(`/capacitaciones/${cap.id}`)}
                className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="w-10 h-10 bg-roka-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <GraduationCap size={18} className="text-roka-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{cap.titulo}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {cap.expositor && <>{cap.expositor} · </>}
                    {cap.area?.nombre && <>{cap.area.nombre} · </>}
                    {cap.duracion_horas}h
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TIPO_COLOR[cap.tipo] || 'bg-gray-100 text-gray-500'}`}>
                    {TIPO_LABEL[cap.tipo] || cap.tipo}
                  </span>
                  <span className="text-xs text-gray-500">
                    {format(new Date(cap.fecha_programada), 'd MMM', { locale: es })}
                  </span>
                </div>
                <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acceso rápido: mis capacitaciones (para operativos) */}
      {(user?.rol === 'operativo' || user?.rol === 'tecnico_sst') && (
        <button onClick={() => navigate('/capacitaciones/mis-capacitaciones')}
          className="w-full flex items-center justify-between bg-roka-500 hover:bg-roka-600 text-white px-5 py-4 rounded-xl font-medium transition-colors">
          <div className="flex items-center gap-3">
            <Users size={20} />
            <div className="text-left">
              <p className="font-semibold">Mis Capacitaciones</p>
              <p className="text-xs text-roka-100">Ver historial personal y evaluaciones pendientes</p>
            </div>
          </div>
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  )
}
