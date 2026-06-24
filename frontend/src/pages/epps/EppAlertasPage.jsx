import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Clock, PackageX, PackageOpen, Eye, RefreshCw, Bell } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return '—'
  }
}

export default function EppAlertasPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('vencidos')

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/epps/alertas')
      setData(res)
    } catch (err) {
      console.error('Error al cargar alertas:', err)
      toast.error('Error al cargar alertas de EPPs')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    {
      key: 'vencidos',
      label: 'EPPs Vencidos',
      icon: AlertTriangle,
      count: data?.resumen?.total_vencidos || 0,
      color: 'text-red-600',
      bg: 'bg-red-50',
      iconBg: 'bg-red-100',
      borderColor: 'border-red-200',
      data: data?.vencidos || [],
    },
    {
      key: 'proximos',
      label: 'Próximos a vencer (30 días)',
      icon: Clock,
      count: data?.resumen?.total_por_vencer || 0,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      borderColor: 'border-amber-200',
      data: data?.proximos_vencer || [],
    },
    {
      key: 'stock_bajo',
      label: 'Stock Bajo',
      icon: PackageOpen,
      count: data?.resumen?.total_stock_bajo || 0,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      iconBg: 'bg-orange-100',
      borderColor: 'border-orange-200',
      data: data?.stock_bajo || [],
    },
    {
      key: 'stock_critico',
      label: 'Stock CRÍTICO',
      icon: PackageX,
      count: data?.resumen?.total_stock_critico || 0,
      color: 'text-red-700',
      bg: 'bg-red-50',
      iconBg: 'bg-red-100',
      borderColor: 'border-red-300',
      data: data?.stock_critico || [],
    },
  ]

  const activeTab = tabs.find(t => t.key === tab)

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/epps/inventario')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a EPPs
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Bell className="w-7 h-7 text-red-500" />
              Alertas de EPPs
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Vencimientos, stock bajo y stock crítico · Ley 29783 Art. 61
            </p>
          </div>

          <button
            onClick={cargar}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {tabs.map(({ key, label, icon: Icon, count, color, bg, iconBg, borderColor }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`bg-white rounded-lg p-5 border-2 transition-all ${
              tab === key
                ? `${borderColor} shadow-md`
                : 'border-transparent hover:border-gray-200 shadow'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${iconBg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="text-left">
                <p className={`text-3xl font-bold ${color}`}>
                  {loading ? '—' : count}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-gray-500 text-sm">Cargando alertas...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Tab header */}
          <div className={`px-5 py-4 border-b flex items-center gap-3 ${activeTab?.bg}`}>
            {activeTab && <activeTab.icon className={`w-5 h-5 ${activeTab.color}`} />}
            <div>
              <p className={`text-sm font-semibold ${activeTab?.color}`}>
                {activeTab?.label}
              </p>
              <p className="text-xs text-gray-500">
                {activeTab?.count} {activeTab?.count === 1 ? 'registro' : 'registros'}
              </p>
            </div>
          </div>

          {/* Empty state */}
          {activeTab?.data.length === 0 ? (
            <div className="p-12 text-center">
              {activeTab.icon && (
                <activeTab.icon className={`w-12 h-12 mx-auto mb-3 ${activeTab.color} opacity-30`} />
              )}
              <p className="text-gray-500">No hay alertas en esta categoría</p>
              <p className="text-gray-400 text-sm mt-1">
                {tab === 'vencidos' && 'Todos los EPPs están vigentes'}
                {tab === 'proximos' && 'No hay EPPs próximos a vencer en los próximos 30 días'}
                {tab === 'stock_bajo' && 'Todos los EPPs tienen stock suficiente'}
                {tab === 'stock_critico' && 'No hay EPPs con stock crítico'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {(tab === 'vencidos' || tab === 'proximos') ? (
                      <>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          EPP
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Personal
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          DNI
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Fecha Vencimiento
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          {tab === 'vencidos' ? 'Días Vencido' : 'Días Restantes'}
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Cantidad
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Código
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          EPP
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Categoría
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Talla
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Stock Disponible
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Stock Mínimo
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Diferencia
                        </th>
                      </>
                    )}
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeTab.data.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {(tab === 'vencidos' || tab === 'proximos') ? (
                        <>
                          <td className="px-5 py-3">
                            <div>
                              <p className="font-medium text-gray-800">{item.epp_nombre}</p>
                              {item.epp_codigo && (
                                <code className="text-xs font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                                  {item.epp_codigo}
                                </code>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-gray-700 text-sm">
                            {item.personal_nombre}
                          </td>
                          <td className="px-5 py-3 text-gray-600 text-xs">
                            {item.personal_dni}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-medium ${tab === 'vencidos' ? 'text-red-600' : 'text-amber-600'}`}>
                              {formatDate(item.fecha_vencimiento)}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                tab === 'vencidos'
                                  ? 'bg-red-100 text-red-700'
                                  : item.dias_restantes <= 7
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {tab === 'vencidos' ? item.dias_vencido : item.dias_restantes}d
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-700 text-sm">
                            {item.cantidad}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-5 py-3">
                            <code className="text-xs font-mono bg-purple-50 text-purple-700 px-2 py-1 rounded">
                              {item.codigo_interno || '—'}
                            </code>
                          </td>
                          <td className="px-5 py-3 font-medium text-gray-800">
                            {item.nombre}
                          </td>
                          <td className="px-5 py-3 text-gray-600 text-sm">
                            {item.categoria}
                          </td>
                          <td className="px-5 py-3 text-gray-600 text-sm">
                            {item.talla || '—'}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`font-bold ${
                              tab === 'stock_critico' ? 'text-red-600' : 'text-orange-600'
                            }`}>
                              {item.stock_disponible}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {item.stock_minimo}
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-red-600 font-semibold">
                              {item.diferencia || (item.stock_disponible - item.stock_minimo)}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="px-5 py-3">
                        <button
                          onClick={() => navigate('/epps/inventario')}
                          className="p-2 rounded-md text-purple-600 hover:bg-purple-50 transition-colors"
                          title="Ver EPP"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
