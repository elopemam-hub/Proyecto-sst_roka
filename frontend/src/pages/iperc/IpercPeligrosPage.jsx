import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, AlertTriangle, Eye, ChevronLeft } from 'lucide-react'
import api from '../../services/api'

const CLASIF_COLOR = {
  trivial:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  tolerable:   'bg-lime-500/10 text-lime-400 border-lime-500/20',
  moderado:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
  importante:  'bg-orange-500/10 text-orange-400 border-orange-500/20',
  intolerable: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const TIPOS_PELIGRO = ['fisico','quimico','biologico','ergonomico','psicosocial','mecanico','electrico','locativo','fenomeno_natural','otro']

export default function IpercPeligrosPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tipoPeligro, setTipoPeligro] = useState('')
  const [clasificacion, setClasificacion] = useState('')
  const [soloSignificativos, setSoloSignificativos] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [meta, setMeta] = useState(null)

  useEffect(() => { cargar() }, [pagina, tipoPeligro, clasificacion, soloSignificativos])

  const cargar = async () => {
    setLoading(true)
    try {
      const params = { page: pagina, per_page: 20 }
      if (tipoPeligro)        params.tipo_peligro   = tipoPeligro
      if (clasificacion)      params.clasificacion   = clasificacion
      if (soloSignificativos) params.significativo   = 1
      if (search)             params.search         = search
      const { data } = await api.get('/iperc/peligros-all', { params })
      setItems(data.data || [])
      setMeta(data.meta || null)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const handleBuscar = (e) => { e.preventDefault(); setPagina(1); cargar() }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
        <button
          onClick={() => navigate('/iperc')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-200 hover:text-white bg-slate-600/80 hover:bg-slate-600 px-2.5 py-1.5 rounded-lg border border-slate-600/50 transition-colors mb-3"
        >
          <ChevronLeft size={13} /> Volver al módulo IPERC
        </button>
          <h1 className="text-2xl font-bold text-white">Peligros Identificados</h1>
          <p className="text-slate-400 text-sm mt-1">Catálogo de peligros de todas las matrices IPERC</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex flex-wrap gap-3">
        <form onSubmit={handleBuscar} className="flex gap-3 flex-1 min-w-48">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar peligro o riesgo..." className="input pl-9" />
          </div>
          <button type="submit" className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg text-sm hover:bg-slate-600 transition-colors">
            Buscar
          </button>
        </form>
        <select value={tipoPeligro} onChange={e => { setTipoPeligro(e.target.value); setPagina(1) }} className="input w-44">
          <option value="">Todos los tipos</option>
          {TIPOS_PELIGRO.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
        <select value={clasificacion} onChange={e => { setClasificacion(e.target.value); setPagina(1) }} className="input w-44">
          <option value="">Todas las clasificaciones</option>
          {['trivial','tolerable','moderado','importante','intolerable'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input type="checkbox" checked={soloSignificativos} onChange={e => { setSoloSignificativos(e.target.checked); setPagina(1) }} className="w-4 h-4" />
          Solo significativos
        </label>
      </div>

      {/* Tabla */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              {['Peligro / Riesgo', 'Tipo', 'NR', 'Clasificación', 'Proceso', 'IPERC', 'Área', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-500">Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-500">
                <AlertTriangle size={32} className="mx-auto mb-2 text-slate-700" />
                <p>No hay peligros registrados</p>
              </td></tr>
            ) : items.map(item => (
              <tr key={item.id} className="hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3 max-w-48">
                  <div className="font-medium text-slate-200 truncate">{item.descripcion_peligro}</div>
                  <div className="text-xs text-slate-500 truncate">{item.riesgo}</div>
                  {item.es_riesgo_significativo === 1 && (
                    <span className="text-xs text-red-400">⚠ Significativo</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-slate-400 capitalize">{item.tipo_peligro?.replace('_', ' ')}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-lg font-bold text-slate-200">{item.nivel_riesgo_inicial}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${CLASIF_COLOR[item.clasificacion_inicial]}`}>
                    {item.clasificacion_inicial}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs max-w-36 truncate">{item.proceso}</td>
                <td className="px-4 py-3">
                  <code className="text-xs font-mono text-roka-400">{item.codigo}</code>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">{item.area_nombre}</td>
                <td className="px-4 py-3">
                  <button onClick={() => navigate(`/iperc/${item.iperc_id}`)}
                    className="p-1.5 rounded text-slate-400 hover:text-roka-400 hover:bg-slate-700 transition-colors">
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
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
