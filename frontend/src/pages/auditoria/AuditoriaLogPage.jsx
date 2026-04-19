import { useState, useEffect } from 'react'
import { ScrollText, ChevronDown, ChevronRight, Download } from 'lucide-react'
import api from '../../services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ACCION_COLOR = {
  crear:    'bg-emerald-50 text-emerald-700',
  editar:   'bg-blue-50 text-blue-700',
  eliminar: 'bg-red-50 text-red-700',
  login:    'bg-purple-50 text-purple-700',
  logout:   'bg-gray-100 text-gray-600',
}

function exportCSV(rows) {
  const cols = ['id', 'fecha', 'usuario', 'modulo', 'accion', 'ip']
  const header = cols.join(',')
  const lines  = rows.map(r => [
    r.id,
    r.created_at,
    r.usuario?.nombres ? `${r.usuario.nombres} ${r.usuario.apellidos}` : r.usuario_id,
    r.modulo,
    r.accion,
    r.ip || '',
  ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
  const blob = new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url; a.download = 'auditoria_log.csv'; a.click()
  URL.revokeObjectURL(url)
}

export default function AuditoriaLogPage() {
  const [logs, setLogs]       = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const [meta, setMeta]       = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [filtros, setFiltros] = useState({ usuario_id: '', modulo: '', accion: '', fecha_desde: '', fecha_hasta: '' })

  const modulosOpts = ['personal', 'accidentes', 'inspecciones', 'iperc', 'ats', 'epps', 'salud', 'capacitaciones', 'simulacros', 'vehiculos', 'equipos', 'programa']
  const accionesOpts = ['crear', 'editar', 'eliminar', 'login', 'logout']

  useEffect(() => { cargar(1) }, [filtros])

  const cargar = async (p) => {
    setLoading(true)
    try {
      const params = { page: p, ...Object.fromEntries(Object.entries(filtros).filter(([, v]) => v)) }
      const { data } = await api.get('/auditoria-log', { params })
      setLogs(data.data || data)
      setMeta(data.meta || null)
      setPage(p)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  useEffect(() => {
    api.get('/usuarios').then(({ data }) => {
      setUsuarios(Array.isArray(data) ? data : (data.data || []))
    }).catch(() => {})
  }, [])

  const ff = (k, v) => setFiltros(p => ({ ...p, [k]: v }))

  const toggleExpand = (id) => setExpanded(prev => prev === id ? null : id)

  const formatJson = (val) => {
    if (!val) return null
    try { return JSON.stringify(typeof val === 'string' ? JSON.parse(val) : val, null, 2) }
    catch { return String(val) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auditoría del Sistema</h1>
          <p className="text-gray-500 text-sm mt-1">Registro de todas las acciones realizadas en el sistema</p>
        </div>
        <button onClick={() => exportCSV(logs)}
          className="flex items-center gap-2 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50">
          <Download size={15} /> Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3">
        <select value={filtros.usuario_id} onChange={e => ff('usuario_id', e.target.value)}
          className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todos los usuarios</option>
          {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>)}
        </select>
        <select value={filtros.modulo} onChange={e => ff('modulo', e.target.value)}
          className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todos los módulos</option>
          {modulosOpts.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filtros.accion} onChange={e => ff('accion', e.target.value)}
          className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todas las acciones</option>
          {accionesOpts.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <input type="date" value={filtros.fecha_desde} onChange={e => ff('fecha_desde', e.target.value)}
          className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500" />
        <input type="date" value={filtros.fecha_hasta} onChange={e => ff('fecha_hasta', e.target.value)}
          className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500" />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['', 'Fecha / Hora', 'Usuario', 'Módulo', 'Acción', 'IP'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No hay registros</td></tr>
            ) : logs.map(log => (
              <>
                <tr key={log.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(log.id)}>
                  <td className="px-4 py-3 text-gray-400">
                    {expanded === log.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {log.usuario ? `${log.usuario.nombres} ${log.usuario.apellidos}` : `#${log.usuario_id}`}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{log.modulo || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ACCION_COLOR[log.accion] || 'bg-gray-100 text-gray-600'}`}>
                      {log.accion}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{log.ip || '—'}</td>
                </tr>
                {expanded === log.id && (
                  <tr key={`${log.id}-detail`} className="bg-gray-50">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        {log.valor_anterior && (
                          <div>
                            <p className="text-xs font-semibold text-red-500 mb-1">Valor anterior</p>
                            <pre className="text-xs bg-red-50 border border-red-100 rounded-lg p-3 overflow-x-auto max-h-40 text-gray-700">
                              {formatJson(log.valor_anterior)}
                            </pre>
                          </div>
                        )}
                        {log.valor_nuevo && (
                          <div>
                            <p className="text-xs font-semibold text-emerald-600 mb-1">Valor nuevo</p>
                            <pre className="text-xs bg-emerald-50 border border-emerald-100 rounded-lg p-3 overflow-x-auto max-h-40 text-gray-700">
                              {formatJson(log.valor_nuevo)}
                            </pre>
                          </div>
                        )}
                        {!log.valor_anterior && !log.valor_nuevo && (
                          <p className="text-xs text-gray-400 col-span-2">Sin datos adicionales</p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {meta && meta.last_page > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(meta.last_page, 10) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => cargar(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium ${p === page ? 'bg-roka-500 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
