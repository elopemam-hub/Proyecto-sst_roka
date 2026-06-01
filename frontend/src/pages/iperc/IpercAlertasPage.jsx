import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, AlertTriangle, Clock, Calendar, Eye, ArrowLeft, Edit } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format, parseISO, isValid } from 'date-fns'

const CLASIF_COLOR = {
  trivial:     'text-emerald-600',
  tolerable:   'text-lime-600',
  moderado:    'text-amber-600',
  importante:  'text-orange-600',
  intolerable: 'text-red-600',
}

const CLASIF_BG = {
  trivial:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  tolerable:   'bg-lime-50 text-lime-700 border-lime-200',
  moderado:    'bg-amber-50 text-amber-700 border-amber-200',
  importante:  'bg-orange-50 text-orange-700 border-orange-200',
  intolerable: 'bg-red-50 text-red-700 border-red-200',
}

function safeDate(val) {
  if (!val) return '—'
  try {
    const d = parseISO(String(val).substring(0, 10))
    return isValid(d) ? format(d, 'dd/MM/yyyy') : '—'
  } catch {
    return '—'
  }
}

export default function IpercAlertasPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('significativos')

  useEffect(() => {
    api.get('/iperc/alertas')
      .then(({ data }) => setData(data))
      .catch(err => {
        const msg = err?.response?.data?.message || err?.message || 'Error de conexión'
        toast.error(`Error al cargar alertas: ${msg}`)
      })
      .finally(() => setLoading(false))
  }, [])

  const tabs = [
    {
      key: 'significativos', label: 'Riesgos Significativos',
      icon: AlertTriangle, count: data?.riesgos_significativos?.length || 0,
      color: 'text-red-600', bg: 'bg-red-50', iconBg: 'bg-red-100',
    },
    {
      key: 'proximos', label: 'Próximos a vencer',
      icon: Clock, count: data?.proximos_vencer?.length || 0,
      color: 'text-amber-600', bg: 'bg-amber-50', iconBg: 'bg-amber-100',
    },
    {
      key: 'vencidos', label: 'IPERC Vencidos',
      icon: Calendar, count: data?.vencidos?.length || 0,
      color: 'text-rose-600', bg: 'bg-rose-50', iconBg: 'bg-rose-100',
    },
  ]

  const active = tabs.find(t => t.key === tab)

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Encabezado */}
      <div>
        <button onClick={() => navigate('/iperc')} className="btn-back mb-3">
          <ArrowLeft size={16} /> Volver a IPERC
        </button>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <span>Riesgos y Control</span><span>/</span>
          <span>IPERC</span><span>/</span>
          <span>Alertas</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Alertas IPERC</h1>
        <p className="text-slate-400 text-sm mt-0.5">Riesgos críticos y vencimientos que requieren atención inmediata</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tabs.map(({ key, label, icon: Icon, count, color, bg, iconBg }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`card p-4 text-left transition-all ring-1 ring-inset ${
              tab === key ? 'ring-roka-500' : 'ring-transparent hover:ring-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${iconBg}`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className={`text-2xl font-bold tabular-nums ${color}`}>
                  {loading ? '—' : count}
                </p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Contenido del tab */}
      {loading ? (
        <div className="card p-12 text-center">
          <div className="inline-block w-5 h-5 border-2 border-roka-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-slate-500 text-sm">Cargando alertas...</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Tab header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            {active && <active.icon size={16} className={active.color} />}
            <p className="text-sm font-semibold text-slate-200">{active?.label}</p>
            <span className={`text-sm font-bold ml-auto ${active?.color}`}>{active?.count}</span>
          </div>

          {/* Riesgos Significativos */}
          {tab === 'significativos' && (
            (data?.riesgos_significativos || []).length === 0 ? (
              <div className="p-12 text-center">
                <Bell size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-slate-500">No hay riesgos significativos activos</p>
                <p className="text-slate-400 text-xs mt-1">Solo se muestran peligros de matrices en estado "Aprobado"</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Peligro / Riesgo', 'NR', 'Clasificación', 'Proceso', 'IPERC', 'Área', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.riesgos_significativos.map(r => (
                      <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 max-w-52">
                          <div className="text-gray-800 text-xs font-medium">{r.descripcion_peligro}</div>
                          <div className="text-xs text-gray-400">{r.riesgo}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xl font-bold tabular-nums ${CLASIF_COLOR[r.clasificacion_inicial] || 'text-gray-700'}`}>
                            {r.nivel_riesgo_inicial}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs capitalize font-medium px-2 py-0.5 rounded-full border ${CLASIF_BG[r.clasificacion_inicial] || 'text-gray-500'}`}>
                            {r.clasificacion_inicial}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-36 truncate">{r.proceso}</td>
                        <td className="px-4 py-3">
                          <code className="text-xs font-mono text-roka-600">{r.codigo}</code>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{r.area_nombre}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate(`/iperc/${r.iperc_id}`)}
                            className="p-1.5 rounded-md text-gray-400 hover:text-roka-600 hover:bg-gray-100 transition-colors"
                            title="Ver detalle"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Próximos a vencer */}
          {tab === 'proximos' && (
            (data?.proximos_vencer || []).length === 0 ? (
              <div className="p-12 text-center">
                <Clock size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-slate-500">No hay IPERC próximos a vencer en los próximos 30 días</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Código', 'Título', 'Área', 'Días restantes', 'Vigencia', 'Estado', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.proximos_vencer.map(item => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <code className="text-xs font-mono text-roka-600">{item.codigo}</code>
                        </td>
                        <td className="px-4 py-3 text-gray-800 font-medium">{item.titulo}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{item.area?.nombre || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold tabular-nums ${item.dias_restantes <= 7 ? 'text-red-600' : 'text-amber-600'}`}>
                            {item.dias_restantes}d
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{safeDate(item.fecha_vigencia)}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-500 capitalize">{item.estado?.replace('_', ' ')}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => navigate(`/iperc/${item.id}`)} className="p-1.5 rounded-md text-gray-400 hover:text-roka-600 hover:bg-gray-100 transition-colors" title="Ver detalle">
                              <Eye size={14} />
                            </button>
                            <button onClick={() => navigate(`/iperc/${item.id}/editar`)} className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Editar">
                              <Edit size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Vencidos */}
          {tab === 'vencidos' && (
            (data?.vencidos || []).length === 0 ? (
              <div className="p-12 text-center">
                <Calendar size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-slate-500">No hay IPERC vencidos</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Código', 'Título', 'Área', 'Venció el', 'Estado', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.vencidos.map(item => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <code className="text-xs font-mono text-roka-600">{item.codigo}</code>
                        </td>
                        <td className="px-4 py-3 text-gray-800 font-medium">{item.titulo}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{item.area?.nombre || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="text-red-600 text-xs font-medium">{safeDate(item.fecha_vigencia)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-500 capitalize">{item.estado?.replace('_', ' ')}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => navigate(`/iperc/${item.id}`)} className="p-1.5 rounded-md text-gray-400 hover:text-roka-600 hover:bg-gray-100 transition-colors" title="Ver detalle">
                              <Eye size={14} />
                            </button>
                            <button onClick={() => navigate(`/iperc/${item.id}/editar`)} className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Editar">
                              <Edit size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
