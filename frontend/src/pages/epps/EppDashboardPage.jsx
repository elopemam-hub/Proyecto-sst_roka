import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LabelList,
} from 'recharts'
import {
  HardHat, AlertTriangle, Package, RotateCcw, Plus, ArrowRight,
  Truck, Wrench, BarChart3, Settings, ClipboardList,
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

  // Generar últimos 6 meses completos
  const porMesData = (() => {
    const meses = []
    const hoy = new Date()

    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
      const mesKey = format(fecha, 'yyyy-MM')
      const mesLabel = format(fecha, 'MMM', { locale: es })

      const dataDelMes = (data?.por_mes || []).find(m => m.mes === mesKey)

      meses.push({
        mes: mesLabel,
        total: dataDelMes ? dataDelMes.total : 0,
      })
    }

    return meses
  })()

  // Preparar datos con categoría + talla para el gráfico
  const porCatData = (data?.por_categoria_talla || []).map(item => ({
    name: item.talla ? `${item.categoria} (${item.talla})` : item.categoria,
    value: item.stock_disponible,
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
          <button onClick={() => navigate('/epps/reportes')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <BarChart3 size={14} /> Reportes
          </button>
          <button onClick={() => navigate('/epps/configuracion')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Settings size={14} /> Configuración
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
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

      {/* Charts - 3 columnas a la misma altura */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Entregas por mes */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-roka-500" />
            <h2 className="font-semibold text-gray-800">Entregas — últimos 6 meses</h2>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={porMesData} barSize={40} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                width={32}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={v => [v, 'Entregas']}
                cursor={{ fill: 'rgba(14, 165, 233, 0.1)' }}
              />
              <Bar dataKey="total" fill="#0ea5e9" radius={[6,6,0,0]} animationDuration={800}>
                <LabelList
                  dataKey="total"
                  position="top"
                  style={{ fontSize: 13, fontWeight: 700, fill: '#374151' }}
                  formatter={(value) => value > 0 ? value : ''}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Resumen EPPs por categoría y talla */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <HardHat size={16} className="text-roka-500" />
            <h2 className="font-semibold text-gray-800">Resumen de EPPs</h2>
          </div>
          {(data?.por_categoria_talla || []).length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Sin datos</div>
          ) : (
            <div className="overflow-y-auto max-h-[280px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-700 bg-gray-50">Categoría</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700 bg-gray-50">Talla</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700 bg-gray-50">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.por_categoria_talla || []).map((item, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-2 px-3 text-gray-800">{item.categoria}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                          {item.talla}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg bg-emerald-100 text-emerald-700 font-bold">
                          {item.stock_disponible}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top 5 EPPs más entregados */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-roka-500" />
            <h2 className="font-semibold text-gray-800">Top 5 EPPs</h2>
          </div>
          {(data?.top_entregados || []).length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Sin entregas</div>
          ) : (
            <div className="space-y-3">
              {(data.top_entregados || []).map((item, i) => {
                const max = data.top_entregados[0].total_entregas
                const pct = Math.round((item.total_entregas / max) * 100)
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-roka-100 text-roka-700 text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-gray-800 truncate">{item.nombre}</p>
                        <span className="text-sm font-bold text-roka-600 ml-2">{item.total_entregas}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-roka-500 to-roka-600 h-1.5 rounded-full"
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* EPPs por Trabajador + Últimas entregas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Tabla resumen por trabajador */}
        {(data?.por_trabajador || []).length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HardHat size={16} className="text-roka-500" />
              <h2 className="font-semibold text-gray-800">EPPs por Trabajador</h2>
            </div>
            <span className="text-xs text-gray-500">
              {data.por_trabajador.length} trabajadores con EPPs activos
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-3 font-semibold text-gray-700 bg-gray-50">Trabajador</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-700 bg-blue-50">Casco</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-700 bg-amber-50">Lentes</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-700 bg-emerald-50">Guantes</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-700 bg-orange-50">Zapatos</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-700 bg-purple-50">Chaleco</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-700 bg-gray-100">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.por_trabajador.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-gray-800">{item.trabajador}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-semibold ${
                        item.casco > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {item.casco}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-semibold ${
                        item.lentes > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {item.lentes}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-semibold ${
                        item.guantes > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {item.guantes}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-semibold ${
                        item.zapatos > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {item.zapatos}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-semibold ${
                        item.chaleco > 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {item.chaleco}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-200 text-gray-800 font-bold">
                        {item.total}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Últimas entregas */}
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
