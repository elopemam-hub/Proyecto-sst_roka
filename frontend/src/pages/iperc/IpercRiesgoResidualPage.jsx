import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingDown, Eye, ArrowRight, ChevronLeft } from 'lucide-react'
import api from '../../services/api'

const CLASIF_COLOR = {
  trivial:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  tolerable:   'bg-lime-500/10 text-lime-400 border-lime-500/20',
  moderado:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
  importante:  'bg-orange-500/10 text-orange-400 border-orange-500/20',
  intolerable: 'bg-red-500/10 text-red-400 border-red-500/20',
}

function ClasifBadge({ c }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${CLASIF_COLOR[c] || 'text-slate-400'}`}>
      {c || '—'}
    </span>
  )
}

export default function IpercRiesgoResidualPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [clasificacion, setClasificacion] = useState('')
  const [pagina, setPagina] = useState(1)
  const [meta, setMeta] = useState(null)

  useEffect(() => { cargar() }, [pagina, clasificacion])

  const cargar = async () => {
    setLoading(true)
    try {
      const params = { page: pagina, per_page: 20 }
      if (clasificacion) params.clasificacion = clasificacion
      const { data } = await api.get('/iperc/riesgo-residual', { params })
      setItems(data.data || [])
      setMeta(data.meta || null)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const reduccion = (item) => {
    if (!item.nivel_riesgo_inicial || !item.nivel_riesgo_residual) return null
    return Math.round((1 - item.nivel_riesgo_residual / item.nivel_riesgo_inicial) * 100)
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => navigate('/iperc')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-200 hover:text-white bg-slate-600/80 hover:bg-slate-600 px-2.5 py-1.5 rounded-lg border border-slate-600/50 transition-colors mb-3"
        >
          <ChevronLeft size={13} /> Volver al módulo IPERC
        </button>
        <h1 className="text-2xl font-bold text-white">Riesgo Residual</h1>
        <p className="text-slate-400 text-sm mt-1">Evaluación del riesgo después de aplicar controles</p>
      </div>

      {/* Filtros */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <select value={clasificacion} onChange={e => { setClasificacion(e.target.value); setPagina(1) }} className="input w-48">
          <option value="">Todas las clasificaciones residuales</option>
          {['trivial','tolerable','moderado','importante','intolerable'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              {['Peligro / Riesgo', 'Riesgo inicial', 'Riesgo residual', 'Reducción', 'Proceso', 'IPERC', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-500">Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-500">
                <TrendingDown size={32} className="mx-auto mb-2 text-slate-700" />
                <p>No hay evaluaciones de riesgo residual</p>
                <p className="text-xs mt-1">Ingresa valores IP/IS residuales en el formulario IPERC</p>
              </td></tr>
            ) : items.map(item => {
              const red = reduccion(item)
              return (
                <tr key={item.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 max-w-44">
                    <div className="text-slate-200 text-xs">{item.descripcion_peligro}</div>
                    <div className="text-xs text-slate-500">{item.riesgo}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-200">{item.nivel_riesgo_inicial}</span>
                      <ClasifBadge c={item.clasificacion_inicial} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ArrowRight size={12} className="text-slate-600" />
                      <span className="text-lg font-bold text-slate-200">{item.nivel_riesgo_residual}</span>
                      <ClasifBadge c={item.clasificacion_residual} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {red !== null ? (
                      <span className={`text-sm font-bold ${red >= 50 ? 'text-emerald-400' : red >= 25 ? 'text-amber-400' : 'text-red-400'}`}>
                        -{red}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs max-w-36 truncate">{item.proceso}</td>
                  <td className="px-4 py-3">
                    <code className="text-xs font-mono text-roka-400">{item.codigo}</code>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/iperc/${item.iperc_id}`)}
                      className="p-1.5 rounded text-slate-400 hover:text-roka-400 hover:bg-slate-700 transition-colors">
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {meta && meta.last_page > 1 && (
          <div className="border-t border-slate-700 px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-slate-400">Total: {meta.total}</span>
            <div className="flex gap-2">
              <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}
                className="px-3 py-1 rounded bg-slate-700 text-slate-300 disabled:opacity-40">Anterior</button>
              <button disabled={pagina === meta.last_page} onClick={() => setPagina(p => p + 1)}
                className="px-3 py-1 rounded bg-slate-700 text-slate-300 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
