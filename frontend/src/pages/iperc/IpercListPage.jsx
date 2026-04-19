import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Filter, AlertTriangle, Shield,
  TrendingUp, Calendar, FileText, Eye, Edit, Trash2,
  AlertCircle, CheckCircle2, Clock
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Metadatos de clasificación de riesgos
const CLASIFICACIONES = {
  trivial:     { label: 'Trivial',     color: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30' },
  tolerable:   { label: 'Tolerable',   color: 'bg-lime-500/15 text-lime-400 ring-lime-500/30' },
  moderado:    { label: 'Moderado',    color: 'bg-amber-500/15 text-amber-400 ring-amber-500/30' },
  importante:  { label: 'Importante',  color: 'bg-orange-500/15 text-orange-400 ring-orange-500/30' },
  intolerable: { label: 'Intolerable', color: 'bg-red-500/15 text-red-400 ring-red-500/30' },
}

const ESTADOS = {
  borrador:    { label: 'Borrador',     color: 'badge-gray',   icon: Edit },
  en_revision: { label: 'En revisión',  color: 'badge-yellow', icon: Clock },
  aprobado:    { label: 'Aprobado',     color: 'badge-green',  icon: CheckCircle2 },
  vencido:     { label: 'Vencido',      color: 'badge-red',    icon: AlertCircle },
  archivado:   { label: 'Archivado',    color: 'badge-gray',   icon: FileText },
}

export default function IpercListPage() {
  const navigate = useNavigate()
  const [items,     setItems]     = useState([])
  const [matriz,    setMatriz]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [estado,    setEstado]    = useState('')
  const [pagina,    setPagina]    = useState(1)

  useEffect(() => {
    cargarDatos()
  }, [pagina, estado])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const [{ data: list }, { data: mat }] = await Promise.all([
        api.get('/iperc', { params: { page: pagina, estado: estado || undefined, search: search || undefined } }),
        api.get('/iperc/matriz-riesgos'),
      ])
      setItems(list.data || [])
      setMatriz(mat)
    } catch (err) {
      toast.error('Error al cargar IPERC')
    } finally {
      setLoading(false)
    }
  }

  const handleBuscar = (e) => {
    e.preventDefault()
    setPagina(1)
    cargarDatos()
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Encabezado ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Riesgos y Control</span>
            <span>/</span>
            <span>IPERC</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Matriz IPERC</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Identificación de Peligros, Evaluación y Control de Riesgos
          </p>
        </div>

        <button
          onClick={() => navigate('/iperc/nuevo')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          Nuevo IPERC
        </button>
      </div>

      {/* ── Resumen matriz de riesgos ──────────────────────────────── */}
      {matriz && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 stagger">
          {['trivial', 'tolerable', 'moderado', 'importante', 'intolerable'].map((clave) => {
            const clasif = CLASIFICACIONES[clave]
            return (
              <div key={clave} className={`card p-4 ring-1 ring-inset ${clasif.color.replace('bg-', 'bg-').replace('text-', '')}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${clasif.color.split(' ')[0]}`} />
                  <p className="text-xs font-medium text-slate-400">{clasif.label}</p>
                </div>
                <p className="text-2xl font-bold text-slate-100 tabular-nums">{matriz[clave]}</p>
                <p className="text-xs text-slate-500 mt-0.5">peligros identificados</p>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Filtros ────────────────────────────────────────────────── */}
      <div className="card p-4">
        <form onSubmit={handleBuscar} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código o título..."
              className="input pl-9"
            />
          </div>

          <select
            value={estado}
            onChange={(e) => { setEstado(e.target.value); setPagina(1) }}
            className="input sm:w-52"
          >
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>

          <button type="submit" className="btn-secondary flex items-center gap-2">
            <Filter size={14} />
            Filtrar
          </button>
        </form>
      </div>

      {/* ── Lista ──────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 text-sm mt-3">Cargando matrices IPERC...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Shield size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-300 font-medium">No hay matrices IPERC</p>
            <p className="text-slate-500 text-sm mt-1 mb-4">Crea tu primera matriz de riesgos para comenzar</p>
            <button onClick={() => navigate('/iperc/nuevo')} className="btn-primary">
              Crear primera matriz
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 border-b border-slate-800">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Código</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Título</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Área</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Riesgos</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Vigencia</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const estadoCfg = ESTADOS[it.estado]
                  const EstadoIcon = estadoCfg?.icon ?? FileText
                  const vencido = it.esta_vencido

                  return (
                    <tr
                      key={it.id}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/iperc/${it.id}`)}
                    >
                      <td className="py-3 px-4">
                        <code className="text-xs font-mono text-roka-400">{it.codigo}</code>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200">{it.titulo}</div>
                        <div className="text-xs text-slate-500">v{it.version}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="badge badge-gray capitalize">{it.area?.nombre}</span>
                      </td>
                      <td className="py-3 px-4">
                        {it.resumen_riesgos ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-slate-300 font-semibold tabular-nums">
                              {it.resumen_riesgos.total}
                            </span>
                            {it.resumen_riesgos.significativos > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs text-red-400 ml-1">
                                <AlertTriangle size={10} />
                                {it.resumen_riesgos.significativos}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`badge ${estadoCfg.color} inline-flex items-center gap-1`}>
                          <EstadoIcon size={10} />
                          {estadoCfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {it.fecha_vigencia ? (
                          <div className={`text-xs ${vencido ? 'text-red-400' : 'text-slate-400'}`}>
                            <Calendar size={10} className="inline mr-1" />
                            {format(new Date(it.fecha_vigencia), 'dd MMM yyyy', { locale: es })}
                            {vencido && <span className="ml-1">(vencido)</span>}
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs">Sin vigencia</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/iperc/${it.id}`) }}
                          className="p-1.5 rounded-md text-slate-400 hover:text-roka-400 hover:bg-slate-800 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye size={14} />
                        </button>
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
