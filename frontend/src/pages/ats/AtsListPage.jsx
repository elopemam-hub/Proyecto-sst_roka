import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Filter, ClipboardList, Calendar,
  AlertTriangle, CheckCircle2, Clock, Eye, AlertCircle,
  HardHat, Zap
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

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
      const { data } = await api.get('/ats', {
        params: {
          estado:       filtros.estado  || undefined,
          nivel_riesgo: filtros.nivel_riesgo || undefined,
        }
      })
      setItems(data.data || [])
    } catch (err) {
      toast.error('Error al cargar ATS')
    } finally {
      setLoading(false)
    }
  }

  // Conteos rápidos
  const resumen = {
    hoy:         items.filter(a => new Date(a.fecha_ejecucion).toDateString() === new Date().toDateString()).length,
    en_curso:    items.filter(a => a.estado === 'en_ejecucion').length,
    pendientes:  items.filter(a => a.estado === 'pendiente_firma').length,
    criticos:    items.filter(a => a.nivel_riesgo === 'critico').length,
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-300 font-medium">No hay ATS registrados</p>
            <p className="text-slate-500 text-sm mt-1 mb-4">Crea un ATS antes de ejecutar un trabajo con riesgos</p>
            <button onClick={() => navigate('/ats/nuevo')} className="btn-primary">
              Crear primer ATS
            </button>
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
                {items.map((ats) => {
                  const nivel = NIVELES_RIESGO[ats.nivel_riesgo]
                  const estadoCfg = ESTADOS[ats.estado]
                  const EstadoIcon = estadoCfg?.icon ?? ClipboardList

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
                        <span className="badge badge-gray">{ats.area?.nombre}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${nivel.color}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {nivel.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400">
                        <div>{format(new Date(ats.fecha_ejecucion), 'dd MMM yyyy', { locale: es })}</div>
                        <div className="text-slate-500">{ats.hora_inicio?.substring(0, 5)}
                          {ats.hora_fin && ` - ${ats.hora_fin.substring(0, 5)}`}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`badge ${estadoCfg.color} inline-flex items-center gap-1`}>
                          <EstadoIcon size={10} />
                          {estadoCfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/ats/${ats.id}`) }}
                          className="p-1.5 rounded-md text-slate-400 hover:text-roka-400 hover:bg-slate-800 transition-colors"
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
