import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingDown, Eye, ArrowRight, ArrowLeft, CheckCircle2, Clock } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const CLASIF_COLOR = {
  trivial:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  tolerable:   'bg-lime-500/10 text-lime-400 border-lime-500/20',
  moderado:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
  importante:  'bg-orange-500/10 text-orange-400 border-orange-500/20',
  intolerable: 'bg-red-500/10 text-red-400 border-red-500/20',
}

function ClasifBadge({ c }) {
  if (!c) return <span className="text-slate-500 text-xs">—</span>
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${CLASIF_COLOR[c] || 'text-slate-400'}`}>
      {c}
    </span>
  )
}

export default function IpercRiesgoResidualPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [clasificacion, setClasificacion] = useState('')
  const [estadoResidual, setEstadoResidual] = useState('')
  const [pagina, setPagina] = useState(1)
  const [meta, setMeta] = useState(null)

  useEffect(() => { cargar() }, [pagina, clasificacion, estadoResidual])

  const cargar = async () => {
    setLoading(true)
    try {
      const params = { page: pagina, per_page: 20 }
      if (clasificacion)   params.clasificacion    = clasificacion
      if (estadoResidual)  params.estado_residual  = estadoResidual
      const { data } = await api.get('/iperc/riesgo-residual', { params })
      setItems(data.data || [])
      // Laravel paginator pone los totales en el nivel raíz
      setMeta({
        total:      data.total,
        last_page:  data.last_page,
        from:       data.from,
        to:         data.to,
      })
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Error de conexión'
      toast.error(`Error al cargar riesgo residual: ${msg}`)
    } finally {
      setLoading(false) }
  }

  const reduccion = (item) => {
    if (!item.nivel_riesgo_inicial || !item.nivel_riesgo_residual) return null
    return Math.round((1 - item.nivel_riesgo_residual / item.nivel_riesgo_inicial) * 100)
  }

  const evaluados   = items.filter(i => i.ip_residual != null).length
  const pendientes  = items.filter(i => i.ip_residual == null).length

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div>
        <button
          onClick={() => navigate('/iperc')}
          className="btn-back mb-3"
        >
          <ArrowLeft size={16} /> Volver a IPERC
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Riesgo Residual</h1>
        <p className="text-slate-500 text-sm mt-1">Evaluación del riesgo después de aplicar controles</p>
      </div>

      {/* Contadores rápidos */}
      {!loading && meta && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4">
            <p className="text-xs text-slate-500 mb-1">Total peligros</p>
            <p className="text-2xl font-bold text-slate-800 tabular-nums">{meta.total ?? 0}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-emerald-600 mb-1 flex items-center gap-1">
              <CheckCircle2 size={11} /> Evaluados
            </p>
            <p className="text-2xl font-bold text-emerald-600 tabular-nums">{evaluados}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-amber-600 mb-1 flex items-center gap-1">
              <Clock size={11} /> Pendientes
            </p>
            <p className="text-2xl font-bold text-amber-600 tabular-nums">{pendientes}</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={clasificacion}
            onChange={e => { setClasificacion(e.target.value); setPagina(1) }}
            className="input w-52"
          >
            <option value="">Todas las clasificaciones</option>
            {['trivial','tolerable','moderado','importante','intolerable'].map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          <select
            value={estadoResidual}
            onChange={e => { setEstadoResidual(e.target.value); setPagina(1) }}
            className="input w-48"
          >
            <option value="">Todos los estados</option>
            <option value="evaluado">Evaluados</option>
            <option value="pendiente">Pendientes</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Peligro / Riesgo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Riesgo inicial</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Riesgo residual</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Reducción</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Proceso</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">IPERC</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="inline-block w-5 h-5 border-2 border-roka-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-slate-500 text-sm">Cargando...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <TrendingDown size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-slate-500">No hay peligros registrados</p>
                    <p className="text-slate-400 text-xs mt-1">Crea un IPERC con peligros para verlos aquí</p>
                  </td>
                </tr>
              ) : items.map(item => {
                const red = reduccion(item)
                const tieneResidual = item.ip_residual != null

                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 max-w-52">
                      <div className="text-gray-800 text-xs font-medium truncate">{item.descripcion_peligro}</div>
                      <div className="text-xs text-gray-400 truncate">{item.riesgo}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-700 tabular-nums">{item.nivel_riesgo_inicial}</span>
                        <ClasifBadge c={item.clasificacion_inicial} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {tieneResidual ? (
                        <div className="flex items-center gap-2">
                          <ArrowRight size={12} className="text-gray-400" />
                          <span className="text-lg font-bold text-gray-700 tabular-nums">{item.nivel_riesgo_residual}</span>
                          <ClasifBadge c={item.clasificacion_residual} />
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Clock size={10} />
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {red !== null ? (
                        <span className={`text-sm font-bold ${red >= 50 ? 'text-emerald-600' : red >= 25 ? 'text-amber-600' : 'text-red-500'}`}>
                          -{red}%
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-36 truncate">{item.proceso}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono text-roka-600">{item.codigo}</code>
                      {item.area_nombre && (
                        <div className="text-xs text-gray-400">{item.area_nombre}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/iperc/${item.iperc_id}/editar`)}
                        title="Editar IPERC para agregar evaluación residual"
                        className="p-1.5 rounded text-gray-400 hover:text-roka-600 hover:bg-gray-100 transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {meta && meta.last_page > 1 && (
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {meta.from}–{meta.to} de {meta.total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagina === 1}
                onClick={() => setPagina(p => p - 1)}
                className="px-3 py-1 rounded border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50"
              >
                Anterior
              </button>
              <button
                disabled={pagina === meta.last_page}
                onClick={() => setPagina(p => p + 1)}
                className="px-3 py-1 rounded border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
