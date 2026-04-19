import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  HardHat, AlertTriangle, Package, RotateCcw, Plus, ArrowRight,
  Truck, Wrench, GraduationCap, BarChart3, Settings, ClipboardList,
  TrendingUp, PackagePlus,
} from 'lucide-react'
import api from '../../services/api'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const PIE_COLORS = ['#0ea5e9','#f59e0b','#10b981','#f97316','#6366f1','#ef4444','#14b8a6']

export default function EppDashboardPage() {
  const navigate  = useNavigate()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/epps/dashboard')
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const porMesData = (data?.por_mes || []).map(m => ({
    mes: format(parseISO(m.mes + '-01'), 'MMM', { locale: es }),
    total: m.total,
  }))

  const porCatData = (data?.por_categoria || []).map(c => ({
    name: c.name,
    value: c.value,
  }))

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard — EPPs</h1>
          <p className="text-gray-500 text-sm mt-1">Equipos de Protección Personal · Ley 29783 Art. 61</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => navigate('/epps/inventario')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <HardHat size={14} /> Inventario
          </button>
          <button onClick={() => navigate('/epps/inventario-inicial')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <PackagePlus size={14} /> Inventario Inicial
          </button>
          <button onClick={() => navigate('/epps/proveedores')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Truck size={14} /> Proveedores
          </button>
          <button onClick={() => navigate('/epps/mantenimiento')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Wrench size={14} /> Mantenimiento
          </button>
          <button onClick={() => navigate('/epps/capacitacion')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <GraduationCap size={14} /> Capacitación
          </button>
          <button onClick={() => navigate('/epps/reportes')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <BarChart3 size={14} /> Reportes
          </button>
          <button onClick={() => navigate('/epps/configuracion')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Settings size={14} /> Configuración
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <button onClick={() => navigate('/epps/entrega')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <ClipboardList size={14} /> Registrar entrega
          </button>
          <button onClick={() => navigate('/epps/nuevo')}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Nuevo EPP
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total EPPs activos',  value: data?.total_items ?? 0,      icon: HardHat,      color: 'text-roka-600',    bg: 'bg-roka-50'    },
          { label: 'Stock crítico',       value: data?.stock_critico ?? 0,    icon: AlertTriangle, color: 'text-red-600',     bg: 'bg-red-50'     },
          { label: 'Entregas del mes',    value: data?.entregas_mes ?? 0,     icon: Package,       color: 'text-blue-600',    bg: 'bg-blue-50'    },
          { label: 'Devoluciones del mes',value: data?.devoluciones_mes ?? 0, icon: RotateCcw,     color: 'text-emerald-600', bg: 'bg-emerald-50' },
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Entregas por mes */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-roka-500" />
            <h2 className="font-semibold text-gray-800">Entregas — últimos 6 meses</h2>
          </div>
          {porMesData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Sin datos de entregas</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={porMesData} barSize={28}>
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  formatter={v => [v, 'Entregas']} />
                <Bar dataKey="total" fill="#0ea5e9" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Por categoría */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <HardHat size={16} className="text-roka-500" />
            <h2 className="font-semibold text-gray-800">Por categoría</h2>
          </div>
          {porCatData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={porCatData} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                  dataKey="value" paddingAngle={3}>
                  {porCatData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top entregados + Últimas entregas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top 5 más entregados */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-roka-500" />
            <h2 className="font-semibold text-gray-800">Top 5 EPPs más entregados</h2>
          </div>
          {(data?.top_entregados || []).length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Sin entregas registradas</div>
          ) : (
            <div className="space-y-3">
              {(data.top_entregados || []).map((item, i) => {
                const max = data.top_entregados[0].total_entregas
                const pct = Math.round((item.total_entregas / max) * 100)
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-4 text-right font-mono">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-medium text-gray-700 truncate">{item.nombre}</p>
                        <span className="text-xs font-bold text-roka-600 ml-2 flex-shrink-0">{item.total_entregas}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-roka-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Últimas 5 entregas */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Últimas entregas</h2>
            <button onClick={() => navigate('/epps/reportes')}
              className="flex items-center gap-1 text-xs text-roka-600 hover:text-roka-700 font-medium">
              Ver todas <ArrowRight size={12} />
            </button>
          </div>
          {(data?.ultimas_entregas || []).length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Sin entregas registradas</div>
          ) : (
            <div className="space-y-2">
              {(data.ultimas_entregas || []).map(ent => (
                <div key={ent.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="w-2 h-2 rounded-full flex-shrink-0 bg-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{ent.inventario?.nombre}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {ent.personal?.nombres} {ent.personal?.apellidos}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-gray-600">{ent.cantidad} ud.</p>
                    <p className="text-[10px] text-gray-400">
                      {ent.fecha_entrega ? format(parseISO(ent.fecha_entrega), 'dd MMM', { locale: es }) : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
