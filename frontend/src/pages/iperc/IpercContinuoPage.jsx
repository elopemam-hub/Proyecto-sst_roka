import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Plus, Eye, Edit, ChevronLeft } from 'lucide-react'
import api from '../../services/api'
import { format, parseISO } from 'date-fns'

const ESTADO_COLOR = {
  borrador:    'bg-slate-500/10 text-slate-400',
  en_revision: 'bg-amber-500/10 text-amber-400',
  aprobado:    'bg-emerald-500/10 text-emerald-400',
  vencido:     'bg-red-500/10 text-red-400',
  archivado:   'bg-slate-500/10 text-slate-500',
}

export default function IpercContinuoPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/iperc', { params: { metodologia: 'IPERC_CONTINUO', per_page: 50 } })
      .then(({ data }) => setItems(data.data || data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
          <h1 className="text-2xl font-bold text-white">IPERC Continuo</h1>
          <p className="text-slate-400 text-sm mt-1">Metodología de identificación continua de peligros en campo</p>
        </div>
        <button onClick={() => navigate('/iperc/nuevo')}
          className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Nuevo IPERC Continuo
        </button>
      </div>

      {/* Descripción metodología */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
        <p className="text-sm font-semibold text-slate-200 mb-3">¿Qué es el IPERC Continuo?</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400">
          <div className="bg-slate-700/50 rounded-lg p-3">
            <p className="text-roka-400 font-medium mb-1">Antes de iniciar</p>
            <p>El trabajador identifica peligros en el área de trabajo antes de comenzar la tarea. Duración: 5–10 minutos.</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <p className="text-amber-400 font-medium mb-1">Durante la tarea</p>
            <p>Monitoreo continuo de condiciones cambiantes. Si surge un nuevo peligro, se registra inmediatamente.</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <p className="text-emerald-400 font-medium mb-1">Al término</p>
            <p>Registro de hallazgos y lecciones aprendidas. Cierre y firma del registro por el trabajador y supervisor.</p>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-300">Matrices IPERC Continuo</p>
          <span className="text-xs text-slate-500">{items.length} registros</span>
        </div>
        {loading ? (
          <div className="text-center py-12 text-slate-500">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <RefreshCw size={32} className="mx-auto mb-3 text-slate-700" />
            <p className="text-slate-400">No hay IPERC continuos registrados</p>
            <p className="text-slate-500 text-sm mt-1 mb-4">Crea una nueva matriz con metodología "IPERC Continuo"</p>
            <button onClick={() => navigate('/iperc/nuevo')} className="btn-primary">
              Crear IPERC Continuo
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                {['Código', 'Título', 'Área', 'Fecha', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {items.map(item => (
                <tr key={item.id} onClick={() => navigate(`/iperc/${item.id}`)}
                  className="hover:bg-slate-700/30 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <code className="text-xs font-mono text-roka-400">{item.codigo}</code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-200">{item.titulo}</div>
                    <div className="text-xs text-slate-500">v{item.version}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{item.area?.nombre}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {item.fecha_elaboracion ? format(parseISO(item.fecha_elaboracion), 'dd/MM/yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${ESTADO_COLOR[item.estado]}`}>
                      {item.estado?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button onClick={() => navigate(`/iperc/${item.id}`)}
                        className="p-1.5 rounded text-slate-400 hover:text-roka-400 hover:bg-slate-700 transition-colors">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => navigate(`/iperc/${item.id}/editar`)}
                        className="p-1.5 rounded text-slate-400 hover:text-roka-400 hover:bg-slate-700 transition-colors">
                        <Edit size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
