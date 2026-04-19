import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, AlertTriangle, Clock, Calendar, Eye, ChevronLeft } from 'lucide-react'
import api from '../../services/api'
import { format, parseISO } from 'date-fns'

const CLASIF_COLOR = {
  trivial:     'text-emerald-400',
  tolerable:   'text-lime-400',
  moderado:    'text-amber-400',
  importante:  'text-orange-400',
  intolerable: 'text-red-400',
}

export default function IpercAlertasPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('significativos')

  useEffect(() => {
    api.get('/iperc/alertas')
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'significativos', label: 'Riesgos Significativos', icon: AlertTriangle, count: data?.riesgos_significativos?.length || 0, color: 'text-red-400' },
    { key: 'proximos',       label: 'Próximos a vencer',      icon: Clock,         count: data?.proximos_vencer?.length || 0,        color: 'text-amber-400' },
    { key: 'vencidos',       label: 'IPERC Vencidos',         icon: Calendar,      count: data?.vencidos?.length || 0,               color: 'text-rose-400' },
  ]

  const active = tabs.find(t => t.key === tab)

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => navigate('/iperc')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-200 hover:text-white bg-slate-600/80 hover:bg-slate-600 px-2.5 py-1.5 rounded-lg border border-slate-600/50 transition-colors mb-3"
        >
          <ChevronLeft size={13} /> Volver al módulo IPERC
        </button>
        <h1 className="text-2xl font-bold text-white">Alertas IPERC</h1>
        <p className="text-slate-400 text-sm mt-1">Riesgos críticos y vencimientos que requieren atención inmediata</p>
      </div>

      {/* KPIs */}
      {!loading && data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tabs.map(({ key, label, icon: Icon, count, color }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                tab === key ? 'bg-slate-700 border-roka-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500'
              }`}>
              <div className={`p-2 rounded-lg ${key === 'significativos' ? 'bg-red-500/10' : key === 'proximos' ? 'bg-amber-500/10' : 'bg-rose-500/10'}`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${color}`}>{count}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Tab content */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Cargando...</div>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
            {active && <active.icon size={16} className={active.color} />}
            <p className="text-sm font-semibold text-slate-300">{active?.label}</p>
            <span className={`text-sm font-bold ml-auto ${active?.color}`}>{active?.count}</span>
          </div>

          {tab === 'significativos' && (
            <>
              {(data?.riesgos_significativos || []).length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Bell size={32} className="mx-auto mb-2 text-slate-700" />
                  No hay riesgos significativos activos en matrices aprobadas
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-900 border-b border-slate-700">
                    <tr>
                      {['Peligro / Riesgo', 'NR', 'Clasificación', 'Proceso', 'IPERC', 'Área', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {data.riesgos_significativos.map(r => (
                      <tr key={r.id} className="hover:bg-slate-700/30">
                        <td className="px-4 py-3 max-w-44">
                          <div className="text-slate-200 text-xs font-medium">{r.descripcion_peligro}</div>
                          <div className="text-xs text-slate-500">{r.riesgo}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xl font-bold ${CLASIF_COLOR[r.clasificacion_inicial]}`}>{r.nivel_riesgo_inicial}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs capitalize font-medium ${CLASIF_COLOR[r.clasificacion_inicial]}`}>{r.clasificacion_inicial}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs max-w-36 truncate">{r.proceso}</td>
                        <td className="px-4 py-3"><code className="text-xs font-mono text-roka-400">{r.codigo}</code></td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{r.area_nombre}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => navigate(`/iperc/${r.iperc_id}`)}
                            className="p-1.5 rounded text-slate-400 hover:text-roka-400 hover:bg-slate-700 transition-colors">
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {(tab === 'proximos' || tab === 'vencidos') && (
            <>
              {(tab === 'proximos' ? data?.proximos_vencer : data?.vencidos)?.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Calendar size={32} className="mx-auto mb-2 text-slate-700" />
                  {tab === 'proximos' ? 'No hay IPERC próximos a vencer en 30 días' : 'No hay IPERC vencidos'}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-900 border-b border-slate-700">
                    <tr>
                      {['Código', 'Título', 'Área', tab === 'proximos' ? 'Días restantes' : 'Venció el', 'Estado', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {(tab === 'proximos' ? data.proximos_vencer : data.vencidos).map(item => (
                      <tr key={item.id} className="hover:bg-slate-700/30">
                        <td className="px-4 py-3"><code className="text-xs font-mono text-roka-400">{item.codigo}</code></td>
                        <td className="px-4 py-3 text-slate-200">{item.titulo}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{item.area?.nombre}</td>
                        <td className="px-4 py-3">
                          {tab === 'proximos' ? (
                            <span className="text-amber-400 font-medium">{item.dias_restantes}d</span>
                          ) : (
                            <span className="text-red-400 text-xs">
                              {item.fecha_vigencia ? format(parseISO(item.fecha_vigencia + 'T00:00:00'), 'dd/MM/yyyy') : '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-400 capitalize">{item.estado?.replace('_', ' ')}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => navigate(`/iperc/${item.id}`)}
                            className="p-1.5 rounded text-slate-400 hover:text-roka-400 hover:bg-slate-700 transition-colors">
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
