import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, CalendarRange, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'
import api from '../../services/api'

const ESTADO_COLOR = {
  borrador:   'bg-gray-100 text-gray-600',
  activo:     'bg-emerald-50 text-emerald-700',
  completado: 'bg-blue-50 text-blue-700',
  cancelado:  'bg-red-50 text-red-700',
}

export default function ProgramaListPage() {
  const navigate = useNavigate()
  const [programas, setProgramas] = useState([])
  const [stats, setStats]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [filtroAnio, setFiltroAnio] = useState('')

  const anioActual = new Date().getFullYear()
  const anios = Array.from({ length: 5 }, (_, i) => anioActual - 1 + i)

  useEffect(() => { cargar() }, [filtroAnio])
  useEffect(() => { cargarStats() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const params = filtroAnio ? { anio: filtroAnio } : {}
      const { data } = await api.get('/programa', { params })
      setProgramas(data.data || data)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const cargarStats = async () => {
    try {
      const { data } = await api.get('/programa/estadisticas')
      setStats(data)
    } catch { /* silent */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programa SST Anual</h1>
          <p className="text-gray-500 text-sm mt-1">Planificación y seguimiento de actividades de seguridad</p>
        </div>
        <button onClick={() => navigate('/programa/nuevo')}
          className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> Nuevo Programa
        </button>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: '% Cumplimiento global', valor: `${stats.porcentaje_global ?? 0}%`, icon: CalendarRange, color: 'text-roka-600',    bg: 'bg-roka-50' },
            { label: 'Completadas',           valor: stats.completadas ?? 0,             icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Vencidas',              valor: stats.vencidas ?? 0,                icon: AlertTriangle,color: 'text-red-600',     bg: 'bg-red-50' },
            { label: 'Pendientes',            valor: stats.pendientes ?? 0,              icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50' },
          ].map(({ label, valor, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon size={18} className={color} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${color}`}>{valor}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtro año */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex gap-3 items-center">
        <select value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)}
          className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todos los años</option>
          {anios.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Lista programas */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Cargando...</div>
        ) : programas.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center text-gray-400">
            No hay programas SST registrados
          </div>
        ) : programas.map(p => {
          const pct = p.porcentaje_cumplimiento ?? 0
          return (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-lg font-bold text-gray-900">{p.anio}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLOR[p.estado] || 'bg-gray-100 text-gray-600'}`}>
                      {p.estado}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 truncate">{p.nombre}</p>
                  {p.objetivo_general && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{p.objetivo_general}</p>
                  )}
                  {/* Barra de progreso */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Cumplimiento</span>
                      <span className="font-medium">{pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => navigate(`/programa/${p.id}`)}
                    className="text-xs text-roka-600 hover:text-roka-700 font-medium px-3 py-1.5 border border-roka-200 rounded-lg hover:bg-roka-50">
                    Ver detalle
                  </button>
                  <button onClick={() => navigate(`/programa/${p.id}/editar`)}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
                    Editar
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
