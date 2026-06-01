import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, ClipboardList, Calendar, ArrowLeft,
  AlertTriangle, CheckCircle2, Clock, Eye, AlertCircle,
  Zap, Trash2, Pencil
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

function safeDate(val) {
  if (!val) return '—'
  try {
    const d = parseISO(String(val).substring(0, 10))
    return isValid(d) ? format(d, 'dd MMM yyyy', { locale: es }) : '—'
  } catch { return '—' }
}

const NIVELES_RIESGO = {
  bajo:    { label: 'Bajo',    color: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30' },
  medio:   { label: 'Medio',   color: 'bg-amber-500/15 text-amber-400 ring-amber-500/30' },
  alto:    { label: 'Alto',    color: 'bg-orange-500/15 text-orange-400 ring-orange-500/30' },
  critico: { label: 'Crítico', color: 'bg-red-500/15 text-red-400 ring-red-500/30' },
}

const ESTADOS = {
  borrador:         { label: 'Borrador',          color: 'badge-gray',   icon: ClipboardList },
  pendiente_firma:  { label: 'Pendiente firma',   color: 'badge-yellow', icon: Clock },
  autorizado:       { label: 'Autorizado',        color: 'badge-green',  icon: CheckCircle2 },
  en_ejecucion:     { label: 'En ejecución',      color: 'badge-blue',   icon: Zap },
  cerrado:          { label: 'Cerrado',           color: 'badge-gray',   icon: CheckCircle2 },
  cancelado:        { label: 'Cancelado',         color: 'badge-red',    icon: AlertCircle },
}

export default function AtsListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState({
    search:      '',
    estado:      '',
    nivel_riesgo: '',
  })

  useEffect(() => {
    cargar()
  }, [filtros.estado, filtros.nivel_riesgo])

  const cargar = async () => {
    setLoading(true)
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get('/ats', {
          params: {
            estado:       filtros.estado       || undefined,
            nivel_riesgo: filtros.nivel_riesgo || undefined,
          }
        }),
        api.get('/ats/estadisticas'),
      ])
      setItems(listRes.data.data || [])
      setStats(statsRes.data)
    } catch (err) {
      toast.error('Error al cargar ATS')
    } finally {
      setLoading(false)
    }
  }

  const eliminar = async (e, atsId) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar este ATS? Solo se puede eliminar ATS en borrador o cancelado.')) return
    try {
      await api.delete(`/ats/${atsId}`)
      toast.success('ATS eliminado')
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar')
    }
  }

  // Filtro cliente: búsqueda por código/título
  const filtered = items.filter(a => {
    if (!filtros.search) return true
    const q = filtros.search.toLowerCase()
    return (
      a.codigo?.toLowerCase().includes(q) ||
      a.titulo_trabajo?.toLowerCase().includes(q) ||
      a.ubicacion?.toLowerCase().includes(q)
    )
  })

  const resumen = {
    hoy:        stats?.hoy        ?? 0,
    en_curso:   stats?.en_curso   ?? 0,
    pendientes: stats?.pendientes ?? 0,
    criticos:   stats?.criticos   ?? 0,
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/ats')}
            className="btn-back"
            title="Volver al dashboard ATS"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Riesgos y Control</span>
              <span>/</span>
              <span>ATS</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Análisis de Trabajo Seguro</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Análisis previos a la ejecución de tareas con riesgos
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/ats/nuevo')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          Nuevo ATS
        </button>
      </div>

      {/* ── Resumen ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={14} className="text-slate-400" />
            <p className="text-xs text-slate-500">Hoy</p>
          </div>
          <p className="text-2xl font-bold text-slate-100 tabular-nums">{resumen.hoy}</p>
          <p className="text-xs text-slate-500">ATS programados</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={14} className="text-roka-400" />
            <p className="text-xs text-slate-500">En curso</p>
          </div>
          <p className="text-2xl font-bold text-roka-400 tabular-nums">{resumen.en_curso}</p>
          <p className="text-xs text-slate-500">Ejecutándose ahora</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-amber-400" />
            <p className="text-xs text-slate-500">Pendientes</p>
          </div>
          <p className="text-2xl font-bold text-amber-400 tabular-nums">{resumen.pendientes}</p>
          <p className="text-xs text-slate-500">Firmas pendientes</p>
        </div>
        <div className="card p-4 ring-1 ring-red-500/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-red-400" />
            <p className="text-xs text-slate-500">Críticos</p>
          </div>
          <p className="text-2xl font-bold text-red-400 tabular-nums">{resumen.criticos}</p>
          <p className="text-xs text-slate-500">Nivel crítico</p>
        </div>
      </div>

      {/* ── Filtros ──────────────────────────────────────────────── */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={filtros.search}
              onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
              placeholder="Buscar por código o título..."
              className="input pl-9"
            />
          </div>
          <select
            value={filtros.estado}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
            className="input sm:w-48"
          >
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select
            value={filtros.nivel_riesgo}
            onChange={(e) => setFiltros({ ...filtros, nivel_riesgo: e.target.value })}
            className="input sm:w-44"
          >
            <option value="">Todo nivel</option>
            {Object.entries(NIVELES_RIESGO).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Lista ────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 text-sm mt-3">Cargando ATS...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-300 font-medium">
              {items.length === 0 ? 'No hay ATS registrados' : 'Sin resultados para la búsqueda'}
            </p>
            {items.length === 0 && (
              <>
                <p className="text-slate-500 text-sm mt-1 mb-4">Crea un ATS antes de ejecutar un trabajo con riesgos</p>
                <button onClick={() => navigate('/ats/nuevo')} className="btn-primary">Crear primer ATS</button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 border-b border-slate-800">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Código</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Trabajo</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Área</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Riesgo</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Ejecución</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ats) => {
                  const nivel     = NIVELES_RIESGO[ats.nivel_riesgo] || NIVELES_RIESGO.medio
                  const estadoCfg = ESTADOS[ats.estado] || { label: ats.estado, color: 'badge-gray', icon: ClipboardList }
                  const EstadoIcon = estadoCfg.icon

                  return (
                    <tr
                      key={ats.id}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/ats/${ats.id}`)}
                    >
                      <td className="py-3 px-4">
                        <code className="text-xs font-mono text-roka-400">{ats.codigo}</code>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200">{ats.titulo_trabajo}</div>
                        <div className="text-xs text-slate-500 truncate max-w-xs">{ats.ubicacion}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="badge badge-gray">{ats.area?.nombre || '—'}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${nivel.color}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {nivel.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400">
                        <div>{safeDate(ats.fecha_ejecucion)}</div>
                        <div className="text-slate-500">
                          {ats.hora_inicio?.substring(0, 5)}
                          {ats.hora_fin ? ` — ${ats.hora_fin.substring(0, 5)}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`badge ${estadoCfg.color} inline-flex items-center gap-1`}>
                          <EstadoIcon size={10} />
                          {estadoCfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/ats/${ats.id}`) }}
                            className="p-1.5 rounded-md text-gray-500 hover:text-roka-600 hover:bg-roka-50 border border-transparent hover:border-roka-200 transition-colors"
                            title="Ver detalle"
                          >
                            <Eye size={14} />
                          </button>
                          {['borrador', 'pendiente_firma'].includes(ats.estado) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/ats/${ats.id}/editar`) }}
                              className="p-1.5 rounded-md text-gray-500 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {['borrador', 'cancelado'].includes(ats.estado) && (
                            <button
                              onClick={(e) => eliminar(e, ats.id)}
                              className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
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
