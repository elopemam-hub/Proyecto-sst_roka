import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderArchive, Search } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const TIPOS = ['politica', 'procedimiento', 'instructivo', 'registro', 'plan', 'programa', 'otro']

const TIPOS_LABELS = {
  politica:      'Política',
  procedimiento: 'Procedimiento',
  instructivo:   'Instructivo',
  registro:      'Registro',
  plan:          'Plan',
  programa:      'Programa',
  otro:          'Otro',
}

const TIPO_COLORS = {
  politica:      'bg-purple-900/50 text-purple-400',
  procedimiento: 'bg-blue-900/50 text-blue-400',
  instructivo:   'bg-cyan-900/50 text-cyan-400',
  registro:      'bg-amber-900/50 text-amber-400',
  plan:          'bg-orange-900/50 text-orange-400',
  programa:      'bg-indigo-900/50 text-indigo-400',
  otro:          'bg-slate-700 text-slate-300',
}

const ESTADO_COLORS = {
  borrador:    'bg-slate-700 text-slate-300',
  en_revision: 'bg-yellow-900/50 text-yellow-400',
  aprobado:    'bg-green-900/50 text-green-400',
  obsoleto:    'bg-slate-800 text-slate-500',
}

export default function DocumentoListPage() {
  const navigate = useNavigate()
  const [documentos, setDocumentos] = useState([])
  const [estadisticas, setEstadisticas] = useState(null)
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState({ tipo: '', estado: '', area_id: '', search: '' })
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState(null)

  useEffect(() => {
    cargar()
    cargarEstadisticas()
    cargarAreas()
  }, [filtros, page])

  const cargar = async () => {
    setLoading(true)
    try {
      const params = { page, ...Object.fromEntries(Object.entries(filtros).filter(([, v]) => v)) }
      const { data } = await api.get('/documentos', { params })
      setDocumentos(data.data || [])
      setMeta(data)
    } catch {
      toast.error('Error al cargar documentos')
    } finally {
      setLoading(false)
    }
  }

  const cargarEstadisticas = async () => {
    try {
      const { data } = await api.get('/documentos/estadisticas')
      setEstadisticas(data)
    } catch { /* silent */ }
  }

  const cargarAreas = async () => {
    try {
      const { data } = await api.get('/areas')
      setAreas(data.data || data || [])
    } catch { /* silent */ }
  }

  const handleFiltro = (key, value) => {
    setFiltros(f => ({ ...f, [key]: value }))
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Documentos SST</h1>
          <p className="text-slate-400 text-sm mt-1">Gestión documental con versionado y ciclo de vida</p>
        </div>
        <button
          onClick={() => navigate('/documentos/nuevo')}
          className="flex items-center gap-2 px-4 py-2 bg-roka-600 hover:bg-roka-500 text-white rounded-lg text-sm font-medium"
        >
          <Plus size={16} />
          Nuevo Documento
        </button>
      </div>

      {/* KPIs */}
      {estadisticas && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{estadisticas.total}</div>
            <div className="text-xs text-slate-400 mt-1">Total documentos</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{estadisticas.aprobados}</div>
            <div className="text-xs text-slate-400 mt-1">Aprobados</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-400">{estadisticas.en_revision}</div>
            <div className="text-xs text-slate-400 mt-1">En revisión</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-amber-400">{estadisticas.proximos_vencer}</div>
            <div className="text-xs text-slate-400 mt-1">Próximos a vencer</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-slate-800 rounded-lg p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por título, código..."
            value={filtros.search}
            onChange={e => handleFiltro('search', e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500"
          />
        </div>
        <select
          value={filtros.tipo}
          onChange={e => handleFiltro('tipo', e.target.value)}
          className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{TIPOS_LABELS[t]}</option>)}
        </select>
        <select
          value={filtros.estado}
          onChange={e => handleFiltro('estado', e.target.value)}
          className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="en_revision">En revisión</option>
          <option value="aprobado">Aprobado</option>
          <option value="obsoleto">Obsoleto</option>
        </select>
        <select
          value={filtros.area_id}
          onChange={e => handleFiltro('area_id', e.target.value)}
          className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="">Todas las áreas</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-slate-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Cargando documentos...</div>
        ) : documentos.length === 0 ? (
          <div className="p-12 text-center">
            <FolderArchive size={40} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400">No hay documentos registrados. Crea el primer documento SST.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Título</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Versión</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Área</th>
                <th className="px-4 py-3 text-left">Aprobado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {documentos.map(d => (
                <tr key={d.id} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{d.codigo}</td>
                  <td className="px-4 py-3 text-white max-w-xs">
                    <div className="truncate">{d.titulo}</div>
                    {d.archivo_nombre && (
                      <div className="text-xs text-slate-500 truncate">{d.archivo_nombre}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${TIPO_COLORS[d.tipo] || ''}`}>
                      {TIPOS_LABELS[d.tipo] || d.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs font-mono">v{d.version_actual}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${ESTADO_COLORS[d.estado] || ''}`}>
                      {d.estado === 'en_revision' ? 'En revisión' : d.estado.charAt(0).toUpperCase() + d.estado.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{d.area?.nombre || '—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {d.fecha_aprobacion ? new Date(d.fecha_aprobacion).toLocaleDateString('es-PE') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => navigate(`/documentos/${d.id}`)}
                      className="text-roka-400 hover:text-roka-300 text-xs font-medium"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Paginación */}
        {meta && meta.last_page > 1 && (
          <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between text-sm text-slate-400">
            <span>Página {meta.current_page} de {meta.last_page} · {meta.total} documentos</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40">Anterior</button>
              <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page}
                className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
