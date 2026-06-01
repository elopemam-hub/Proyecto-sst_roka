import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckSquare, Eye, FileSignature, Clock, CheckCircle2, AlertCircle, ArrowLeft, Edit } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { isValid, parseISO, format } from 'date-fns'

const ESTADOS_FLUJO = [
  { key: 'borrador',    label: 'Borrador',    icon: AlertCircle,  color: 'text-gray-500',    bg: 'bg-gray-50',         border: 'border-gray-200' },
  { key: 'en_revision', label: 'En revisión', icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50',        border: 'border-amber-200' },
  { key: 'aprobado',    label: 'Aprobado',    icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50',      border: 'border-emerald-200' },
  { key: 'vencido',     label: 'Vencido',     icon: AlertCircle,  color: 'text-red-600',     bg: 'bg-red-50',          border: 'border-red-200' },
]

function safeDate(val) {
  if (!val) return '—'
  try {
    const d = parseISO(String(val).substring(0, 10))
    return isValid(d) ? format(d, 'dd/MM/yyyy') : '—'
  } catch {
    return '—'
  }
}

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
      setItems(data.data || data || [])
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Error de conexión'
      toast.error(`Error al cargar aprobaciones: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const counts = items.reduce((acc, i) => {
    acc[i.estado] = (acc[i.estado] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/iperc')} className="btn-back mb-3">
            <ArrowLeft size={16} /> Volver a IPERC
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Riesgos y Control</span>
            <span>/</span>
            <span>IPERC</span>
            <span>/</span>
            <span>Aprobación</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Flujo de Aprobación</h1>
          <p className="text-slate-400 text-sm mt-0.5">Estado de aprobación de matrices IPERC · Firmas digitales</p>
        </div>
        <button
          onClick={() => navigate('/firmas/pendientes')}
          className="btn-primary flex items-center gap-2"
        >
          <FileSignature size={16} />
          Ver firmas pendientes
        </button>
      </div>

      {/* KPIs por estado */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ESTADOS_FLUJO.map(({ key, label, icon: Icon, color, bg, border }) => (
          <button
            key={key}
            onClick={() => setFiltroEstado(filtroEstado === key ? '' : key)}
            className={`card p-4 text-left transition-all ring-1 ring-inset ${
              filtroEstado === key
                ? 'ring-roka-500 shadow-md'
                : 'ring-transparent hover:ring-gray-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} className={color} />
              <span className="text-xs text-slate-400">{label}</span>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${color}`}>{counts[key] || 0}</p>
          </button>
        ))}
      </div>

      {/* Diagrama de flujo */}
      <div className="card p-5">
        <p className="text-sm font-semibold text-slate-200 mb-4">Flujo de aprobación IPERC</p>
        <div className="flex flex-wrap items-center gap-3">
          {[
            { paso: '1', label: 'Elaboración',  sub: 'Responsable SST',    color: 'border-blue-500 text-blue-400' },
            { paso: '→' },
            { paso: '2', label: 'Revisión',     sub: 'Supervisor / Jefe',  color: 'border-amber-500 text-amber-400' },
            { paso: '→' },
            { paso: '3', label: 'Firma digital', sub: 'Módulo de firmas',  color: 'border-violet-500 text-violet-400' },
            { paso: '→' },
            { paso: '4', label: 'Aprobación',   sub: 'Gerente / Dirección', color: 'border-emerald-500 text-emerald-400' },
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
      </div>

      {/* Lista de matrices */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-200">
            Matrices IPERC{filtroEstado ? ` — ${filtroEstado.replace('_', ' ')}` : ''}
          </p>
          {filtroEstado && (
            <button onClick={() => setFiltroEstado('')} className="text-xs text-slate-400 hover:text-slate-200">
              Limpiar filtro
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-5 h-5 border-2 border-roka-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-slate-500 text-sm">Cargando...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <CheckSquare size={32} className="mx-auto mb-2 text-slate-700" />
            <p className="text-slate-500">No hay matrices en este estado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  {['Código', 'Título', 'Área', 'Elaborado por', 'Vigencia', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const cfg = ESTADOS_FLUJO.find(e => e.key === item.estado)
                  const Icon = cfg?.icon || AlertCircle
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <code className="text-xs font-mono text-roka-600">{item.codigo}</code>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-800">{item.titulo}</div>
                        <div className="text-xs text-gray-400">v{item.version}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{item.area?.nombre || '—'}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{item.elaborador?.nombre || '—'}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{safeDate(item.fecha_vigencia)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-xs capitalize font-medium ${cfg?.color || 'text-gray-500'}`}>
                          <Icon size={12} />
                          {item.estado?.replace('_', ' ') || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/iperc/${item.id}`)}
                            className="p-1.5 rounded-md text-gray-400 hover:text-roka-600 hover:bg-gray-100 transition-colors"
                            title="Ver detalle"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => navigate(`/iperc/${item.id}/editar`)}
                            className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Editar"
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
