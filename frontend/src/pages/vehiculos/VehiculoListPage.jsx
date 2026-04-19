import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Truck, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import api from '../../services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const TIPOS = { camion: 'Camión', van: 'Van', auto: 'Auto', moto: 'Moto', bus: 'Bus', otro: 'Otro' }
const ESTADOS = {
  activo:       { label: 'Activo',        color: 'bg-emerald-50 text-emerald-700' },
  mantenimiento:{ label: 'Mantenimiento', color: 'bg-amber-50 text-amber-700' },
  baja:         { label: 'Baja',          color: 'bg-red-50 text-red-700' },
}

const fechaColor = (fecha) => {
  if (!fecha) return 'text-gray-400'
  const dias = Math.ceil((new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24))
  if (dias < 0)   return 'text-red-600 font-semibold'
  if (dias <= 30) return 'text-amber-600 font-semibold'
  return 'text-gray-700'
}

export default function VehiculoListPage() {
  const navigate = useNavigate()
  const [vehiculos, setVehiculos] = useState([])
  const [stats, setStats]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [filtroTipo, setFiltroTipo]     = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [soloVencidos, setSoloVencidos] = useState(false)

  useEffect(() => { cargar() }, [filtroTipo, filtroEstado, soloVencidos])
  useEffect(() => { cargarStats() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filtroTipo)   params.tipo    = filtroTipo
      if (filtroEstado) params.estado  = filtroEstado
      if (soloVencidos) params.vencidos = 1
      const { data } = await api.get('/vehiculos', { params })
      setVehiculos(data.data || data)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const cargarStats = async () => {
    try {
      const { data } = await api.get('/vehiculos/estadisticas')
      setStats(data)
    } catch { /* silent */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehículos</h1>
          <p className="text-gray-500 text-sm mt-1">Control de flota y documentos vehiculares</p>
        </div>
        <button onClick={() => navigate('/vehiculos/nuevo')}
          className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> Nuevo Vehículo
        </button>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total vehículos', valor: stats.total, icon: Truck, color: 'text-gray-700', bg: 'bg-gray-100' },
            { label: 'Activos', valor: stats.activos, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'SOAT vencido', valor: stats.soatVenc, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Rev. técnica vencida', valor: stats.revVenc, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
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

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todos los tipos</option>
          {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={soloVencidos} onChange={e => setSoloVencidos(e.target.checked)} className="rounded" />
          Solo con documentos vencidos
        </label>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Placa', 'Marca / Modelo', 'Tipo', 'Año', 'SOAT vence', 'Rev. Técnica', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            ) : vehiculos.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No se encontraron vehículos</td></tr>
            ) : vehiculos.map(v => (
              <tr key={v.id} className={`hover:bg-gray-50 transition-colors ${v.documentos_vencidos ? 'bg-red-50/30' : ''}`}>
                <td className="px-4 py-3 font-mono font-bold text-gray-800">{v.placa}</td>
                <td className="px-4 py-3 text-gray-700">{v.marca} {v.modelo}</td>
                <td className="px-4 py-3 text-gray-500">{TIPOS[v.tipo] || v.tipo}</td>
                <td className="px-4 py-3 text-gray-500">{v.anio || '—'}</td>
                <td className={`px-4 py-3 ${fechaColor(v.soat_vencimiento)}`}>
                  {v.soat_vencimiento ? format(new Date(v.soat_vencimiento), 'dd MMM yyyy', { locale: es }) : '—'}
                </td>
                <td className={`px-4 py-3 ${fechaColor(v.revision_tecnica_vencimiento)}`}>
                  {v.revision_tecnica_vencimiento ? format(new Date(v.revision_tecnica_vencimiento), 'dd MMM yyyy', { locale: es }) : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADOS[v.estado]?.color || 'bg-gray-100 text-gray-600'}`}>
                    {ESTADOS[v.estado]?.label || v.estado}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => navigate(`/vehiculos/${v.id}/editar`)}
                    className="text-xs text-roka-600 hover:text-roka-700 font-medium">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
