import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Layers, Eye, ChevronLeft } from 'lucide-react'
import api from '../../services/api'

const TIPO_COLOR = {
  rutinaria:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
  no_rutinaria:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  emergencia:    'bg-red-500/10 text-red-400 border-red-500/20',
}

const ESTADO_COLOR = {
  borrador:    'bg-slate-500/10 text-slate-400',
  en_revision: 'bg-amber-500/10 text-amber-400',
  aprobado:    'bg-emerald-500/10 text-emerald-400',
  vencido:     'bg-red-500/10 text-red-400',
  archivado:   'bg-slate-500/10 text-slate-500',
}

export default function IpercProcesosPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tipoActividad, setTipoActividad] = useState('')
  const [pagina, setPagina] = useState(1)
  const [meta, setMeta] = useState(null)

  useEffect(() => { cargar() }, [pagina, tipoActividad])

  const cargar = async () => {
    setLoading(true)
    try {
      const params = { page: pagina, per_page: 20 }
      if (tipoActividad) params.tipo_actividad = tipoActividad
      if (search) params.search = search
      const { data } = await api.get('/iperc/procesos-all', { params })
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
          <h1 className="text-2xl font-bold text-white">Procesos y Actividades</h1>
          <p className="text-slate-400 text-sm mt-1">Procesos identificados en todas las matrices IPERC</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <form onSubmit={handleBuscar} className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar proceso o actividad..." className="input pl-9" />
          </div>
          <select value={tipoActividad} onChange={e => { setTipoActividad(e.target.value); setPagina(1) }}
            className="input w-48">
            <option value="">Todos los tipos</option>
            <option value="rutinaria">Rutinaria</option>
            <option value="no_rutinaria">No rutinaria</option>
            <option value="emergencia">Emergencia</option>
          </select>
          <button type="submit" className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg text-sm hover:bg-slate-600 transition-colors">
            Filtrar
          </button>
        </form>
      </div>

      {/* Tabla */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              {['Proceso / Actividad', 'Tipo', 'IPERC', 'Área', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-500">Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-500">
                <Layers size={32} className="mx-auto mb-2 text-slate-700" />
                <p>No hay procesos registrados</p>
              </td></tr>
            ) : items.map(item => (
              <tr key={item.id} className="hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-200">{item.proceso}</div>
                  <div className="text-xs text-slate-500">{item.actividad}</div>
                  {item.tarea && <div className="text-xs text-slate-600 italic">{item.tarea}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${TIPO_COLOR[item.tipo_actividad]}`}>
                    {item.tipo_actividad?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <code className="text-xs font-mono text-roka-400">{item.codigo}</code>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">{item.area_nombre}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${ESTADO_COLOR[item.estado]}`}>
                    {item.estado?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => navigate(`/iperc/${item.iperc_id}`)}
                    className="p-1.5 rounded text-slate-400 hover:text-roka-400 hover:bg-slate-700 transition-colors" title="Ver IPERC">
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
