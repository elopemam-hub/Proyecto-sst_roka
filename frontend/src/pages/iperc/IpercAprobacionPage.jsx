import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckSquare, Eye, FileSignature, Clock, CheckCircle2, AlertCircle, ChevronLeft } from 'lucide-react'
import api from '../../services/api'
import { format, parseISO } from 'date-fns'

const ESTADOS_FLUJO = [
  { key: 'borrador',    label: 'Borrador',    icon: AlertCircle,  color: 'text-slate-400',   bg: 'bg-slate-700/30' },
  { key: 'en_revision', label: 'En revisión', icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  { key: 'aprobado',    label: 'Aprobado',    icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { key: 'vencido',     label: 'Vencido',     icon: AlertCircle,  color: 'text-red-400',     bg: 'bg-red-500/10' },
]

export default function IpercAprobacionPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')

  useEffect(() => { cargar() }, [filtroEstado])

  const cargar = async () => {
    setLoading(true)
    try {
      const params = { per_page: 50 }
      if (filtroEstado) params.estado = filtroEstado
      const { data } = await api.get('/iperc', { params })
      setItems(data.data || data)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const counts = items.reduce((acc, i) => {
    acc[i.estado] = (acc[i.estado] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => navigate('/iperc')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-200 hover:text-white bg-slate-600/80 hover:bg-slate-600 px-2.5 py-1.5 rounded-lg border border-slate-600/50 transition-colors mb-3"
        >
          <ChevronLeft size={13} /> Volver al módulo IPERC
        </button>
        <h1 className="text-2xl font-bold text-white">Flujo de Aprobación</h1>
        <p className="text-slate-400 text-sm mt-1">Estado de aprobación de matrices IPERC · Firmas digitales</p>
      </div>

      {/* KPIs por estado */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {ESTADOS_FLUJO.map(({ key, label, icon: Icon, color, bg }) => (
          <button key={key} onClick={() => setFiltroEstado(filtroEstado === key ? '' : key)}
            className={`${bg} border rounded-xl p-4 text-left transition-all ${filtroEstado === key ? 'border-roka-500' : 'border-slate-700'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={16} className={color} />
              <span className="text-xs text-slate-400">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{counts[key] || 0}</p>
          </button>
        ))}
      </div>

      {/* Flujo de aprobación */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
        <p className="text-sm font-semibold text-slate-300 mb-4">Flujo de aprobación IPERC</p>
        <div className="flex flex-wrap items-center gap-3">
          {[
            { paso: '1', label: 'Elaboración', sub: 'Responsable SST', color: 'border-blue-500 text-blue-400' },
            { paso: '→', label: '', sub: '', color: '' },
            { paso: '2', label: 'Revisión', sub: 'Supervisor / Jefe', color: 'border-amber-500 text-amber-400' },
            { paso: '→', label: '', sub: '', color: '' },
            { paso: '3', label: 'Firma digital', sub: 'Módulo de firmas', color: 'border-violet-500 text-violet-400' },
            { paso: '→', label: '', sub: '', color: '' },
            { paso: '4', label: 'Aprobación', sub: 'Gerente / Dirección', color: 'border-emerald-500 text-emerald-400' },
          ].map(({ paso, label, sub, color }, i) => (
            <div key={i}>
              {paso === '→' ? (
                <span className="text-slate-600 text-lg">→</span>
              ) : (
                <div className={`border-l-2 pl-3 ${color}`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold ${color.split(' ')[1]}`}>{paso}</span>
                    <span className="text-sm font-medium text-slate-200">{label}</span>
                  </div>
                  <p className="text-xs text-slate-500">{sub}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-3">
          <button onClick={() => navigate('/firmas/pendientes')}
            className="flex items-center gap-2 px-4 py-2 bg-roka-500 hover:bg-roka-600 text-white text-sm rounded-lg transition-colors">
            <FileSignature size={14} /> Ver firmas pendientes
          </button>
        </div>
      </div>

      {/* Lista de matrices */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-300">
            Matrices IPERC {filtroEstado ? `— ${filtroEstado.replace('_', ' ')}` : ''}
          </p>
          {filtroEstado && (
            <button onClick={() => setFiltroEstado('')} className="text-xs text-slate-400 hover:text-slate-200">
              Limpiar filtro
            </button>
          )}
        </div>
        {loading ? (
          <div className="text-center py-12 text-slate-500">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <CheckSquare size={32} className="mx-auto mb-2 text-slate-700" />
            <p>No hay matrices en este estado</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                {['Código', 'Título', 'Área', 'Elaborado', 'Vigencia', 'Estado', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {items.map(item => {
                const cfg = ESTADOS_FLUJO.find(e => e.key === item.estado)
                const Icon = cfg?.icon || AlertCircle
                return (
                  <tr key={item.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3"><code className="text-xs font-mono text-roka-400">{item.codigo}</code></td>
                    <td className="px-4 py-3 text-slate-200">{item.titulo}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{item.area?.nombre}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{item.elaborador?.nombre}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {item.fecha_vigencia ? format(parseISO(item.fecha_vigencia + 'T00:00:00'), 'dd/MM/yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs capitalize ${cfg?.color || 'text-slate-400'}`}>
                        <Icon size={12} /> {item.estado?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/iperc/${item.id}`)}
                        className="p-1.5 rounded text-slate-400 hover:text-roka-400 hover:bg-slate-700 transition-colors">
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
