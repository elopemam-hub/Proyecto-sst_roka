import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Plus, Search, Filter, AlertTriangle, Shield,
  Calendar, FileText, Eye, Edit, Trash2,
  AlertCircle, CheckCircle2, Clock, ArrowLeft
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
  const navigate  = useNavigate()
  const user      = useSelector(s => s.auth.user)
  const esAdmin   = user?.rol === 'administrador'
  const [items,     setItems]     = useState([])
  const [matriz,    setMatriz]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [estado,    setEstado]    = useState('')
  const [pagina,    setPagina]    = useState(1)
  const [eliminando, setEliminando] = useState(null)

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
      const msg = err?.response?.data?.message || err?.message || 'Error de conexión'
      console.error('[IPERC] Error al cargar:', err?.response?.status, msg, err)
      toast.error(`Error al cargar IPERC: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const handleBuscar = (e) => {
    e.preventDefault()
    setPagina(1)
    cargarDatos()
  }

  const handleEliminar = async (e, id, codigo) => {
    e.stopPropagation()
    if (!confirm(`¿Eliminar el IPERC ${codigo}? Esta acción no se puede deshacer.`)) return
    setEliminando(id)
    try {
      await api.delete(`/iperc/${id}`)
      toast.success(`IPERC ${codigo} eliminado`)
      cargarDatos()
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo eliminar')
    } finally {
      setEliminando(null)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Encabezado ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/iperc')} className="btn-back mb-3">
            <ArrowLeft size={16} /> Volver a IPERC
          </button>
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
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Código</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Título</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Área</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Riesgos</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Vigencia</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
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
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/iperc/${it.id}`)}
                    >
                      <td className="py-3 px-4">
                        <code className="text-xs font-mono text-roka-600">{it.codigo}</code>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-800">{it.titulo}</div>
                        <div className="text-xs text-gray-400">v{it.version}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="badge badge-gray capitalize">{it.area?.nombre}</span>
                      </td>
                      <td className="py-3 px-4">
                        {it.resumen_riesgos ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-gray-700 font-semibold tabular-nums">
                              {it.resumen_riesgos.total}
                            </span>
                            {it.resumen_riesgos.significativos > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs text-red-500 ml-1">
                                <AlertTriangle size={10} />
                                {it.resumen_riesgos.significativos}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
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
                          <div className={`text-xs ${vencido ? 'text-red-500' : 'text-gray-500'}`}>
                            <Calendar size={10} className="inline mr-1" />
                            {format(new Date(it.fecha_vigencia), 'dd MMM yyyy', { locale: es })}
                            {vencido && <span className="ml-1">(vencido)</span>}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Sin vigencia</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Ver detalle — todos los usuarios */}
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/iperc/${it.id}`) }}
                            className="p-1.5 rounded-md text-gray-400 hover:text-roka-600 hover:bg-gray-100 transition-colors"
                            title="Ver detalle"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Modificar — todos los usuarios */}
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/iperc/${it.id}/editar`) }}
                            className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Modificar"
                          >
                            <Edit size={14} />
                          </button>

                          {/* Eliminar — solo administrador */}
                          {esAdmin && (
                            <button
                              onClick={(e) => handleEliminar(e, it.id, it.codigo)}
                              disabled={eliminando === it.id}
                              className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                              title="Eliminar"
                            >
                              {eliminando === it.id
                                ? <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                                : <Trash2 size={14} />
                              }
                            </button>
                          )}
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
