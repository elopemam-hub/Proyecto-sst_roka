import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, Eye, ChevronLeft } from 'lucide-react'
import api from '../../services/api'
import { format, parseISO } from 'date-fns'

const TIPO_CTRL_COLOR = {
  eliminacion:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  sustitucion:   'bg-teal-500/10 text-teal-400 border-teal-500/20',
  ingenieria:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  administrativo:'bg-violet-500/10 text-violet-400 border-violet-500/20',
  epp:           'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

const ESTADO_COLOR = {
  pendiente:    'bg-red-500/10 text-red-400',
  en_proceso:   'bg-amber-500/10 text-amber-400',
  implementado: 'bg-emerald-500/10 text-emerald-400',
  verificado:   'bg-blue-500/10 text-blue-400',
}

const JERARQUIA = {
  eliminacion:    '1. Eliminación',
  sustitucion:    '2. Sustitución',
  ingenieria:     '3. Ingeniería',
  administrativo: '4. Administrativo',
  epp:            '5. EPP',
}

export default function IpercControlesPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [tipoControl, setTipoControl] = useState('')
  const [estado, setEstado] = useState('')
  const [pagina, setPagina] = useState(1)
  const [meta, setMeta] = useState(null)

  useEffect(() => { cargar() }, [pagina, tipoControl, estado])

  const cargar = async () => {
    setLoading(true)
    try {
      const params = { page: pagina, per_page: 20 }
      if (tipoControl) params.tipo_control = tipoControl
      if (estado)      params.estado       = estado
      const { data } = await api.get('/iperc/controles-all', { params })
      setItems(data.data || [])
      setMeta(data.meta || null)
    } catch { /* silent */ } finally { setLoading(false) }
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
        <h1 className="text-2xl font-bold text-white">Controles</h1>
        <p className="text-slate-400 text-sm mt-1">Jerarquía de controles por peligro identificado · ISO 45001 §8.1.2</p>
      </div>

      {/* Jerarquía visual */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Jerarquía de controles (orden de prioridad)</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(JERARQUIA).map(([key, label]) => (
            <span key={key} className={`text-xs px-3 py-1.5 rounded-full border font-medium ${TIPO_CTRL_COLOR[key]}`}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex flex-wrap gap-3">
        <select value={tipoControl} onChange={e => { setTipoControl(e.target.value); setPagina(1) }} className="input w-48">
          <option value="">Todos los tipos</option>
          {Object.entries(JERARQUIA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={estado} onChange={e => { setEstado(e.target.value); setPagina(1) }} className="input w-48">
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_proceso">En proceso</option>
          <option value="implementado">Implementado</option>
          <option value="verificado">Verificado</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              {['Control', 'Tipo', 'Peligro', 'Área/IPERC', 'Responsable', 'Fecha', 'Estado', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-500">Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-500">
                <Settings size={32} className="mx-auto mb-2 text-slate-700" />
                <p>No hay controles registrados</p>
              </td></tr>
            ) : items.map(item => (
              <tr key={item.id} className="hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3 max-w-48">
                  <div className="text-slate-200 text-xs leading-relaxed">{item.descripcion}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${TIPO_CTRL_COLOR[item.tipo_control]}`}>
                    {JERARQUIA[item.tipo_control] || item.tipo_control}
                  </span>
                </td>
                <td className="px-4 py-3 max-w-40">
                  <div className="text-xs text-slate-400 truncate">{item.descripcion_peligro}</div>
                  <div className="text-xs text-slate-600 capitalize">{item.clasificacion_inicial}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs text-slate-400">{item.area_nombre}</div>
                  <code className="text-xs font-mono text-roka-400">{item.codigo}</code>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">{item.responsable_nombre || '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {item.fecha_implementacion ? format(parseISO(item.fecha_implementacion + 'T00:00:00'), 'dd/MM/yyyy') : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${ESTADO_COLOR[item.estado_implementacion]}`}>
                    {item.estado_implementacion?.replace('_', ' ')}
                  </span>
                </td>
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
