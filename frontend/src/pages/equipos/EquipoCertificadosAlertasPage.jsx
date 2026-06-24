import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Clock, FileX, Eye, Plus, RefreshCw, Bell } from 'lucide-react'
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

export default function EquipoCertificadosAlertasPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('vencidos')

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/equipos-certificados/alertas')
      setData(res)
    } catch (err) {
      console.error('Error al cargar alertas:', err)
      toast.error('Error al cargar alertas de certificados')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    {
      key: 'vencidos',
      label: 'Certificados Vencidos',
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
      key: 'sin_certificado',
      label: 'Sin certificado asignado',
      icon: FileX,
      count: data?.resumen?.total_sin_certificado || 0,
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      iconBg: 'bg-gray-100',
      borderColor: 'border-gray-200',
      data: data?.sin_certificado || [],
    },
  ]

  const activeTab = tabs.find(t => t.key === tab)

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/equipos/certificados')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Certificados
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Bell className="w-7 h-7 text-amber-500" />
              Alertas de Certificados
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Certificados vencidos, próximos a vencer o sin asignar
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
              <p className="text-gray-500">No hay equipos en esta categoría</p>
              <p className="text-gray-400 text-sm mt-1">
                {tab === 'vencidos' && 'Todos los certificados están vigentes'}
                {tab === 'proximos' && 'No hay certificados próximos a vencer en los próximos 30 días'}
                {tab === 'sin_certificado' && 'Todos los equipos tienen certificados asignados'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Equipo
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Área
                    </th>
                    {tab === 'vencidos' && (
                      <>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Venció el
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Días vencido
                        </th>
                      </>
                    )}
                    {tab === 'proximos' && (
                      <>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Vence el
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Días restantes
                        </th>
                      </>
                    )}
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeTab.data.map(item => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <code className="text-xs font-mono bg-purple-50 text-purple-700 px-2 py-1 rounded">
                          {item.codigo}
                        </code>
                      </td>
                      <td className="px-5 py-3">
                        <div>
                          <p className="font-medium text-gray-800">{item.equipo_nombre || item.nombre}</p>
                          {item.equipo_codigo && (
                            <p className="text-xs text-gray-500">{item.equipo_codigo}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600 text-xs">
                        {item.area}
                      </td>
                      {tab === 'vencidos' && (
                        <>
                          <td className="px-5 py-3">
                            <span className="text-red-600 text-xs font-medium">
                              {formatDate(item.fecha_vencimiento)}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                              {item.dias_vencido}d
                            </span>
                          </td>
                        </>
                      )}
                      {tab === 'proximos' && (
                        <>
                          <td className="px-5 py-3">
                            <span className="text-amber-600 text-xs font-medium">
                              {formatDate(item.fecha_vencimiento)}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                item.dias_restantes <= 7
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {item.dias_restantes}d
                            </span>
                          </td>
                        </>
                      )}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {tab !== 'sin_certificado' ? (
                            <button
                              onClick={() => navigate(`/equipos/certificados`)}
                              className="p-2 rounded-md text-purple-600 hover:bg-purple-50 transition-colors"
                              title="Ver certificados"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate(`/equipos/certificados`)}
                              className="p-2 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Agregar certificado"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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
