import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList, Plus, Calendar, Zap, Clock, AlertTriangle,
  CheckCircle2, ChevronRight, Bell, Play, ListChecks,
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

function safeDate(val) {
  if (!val) return '—'
  try {
    const d = parseISO(String(val).substring(0, 10))
    return isValid(d) ? format(d, 'dd MMM', { locale: es }) : '—'
  } catch { return '—' }
}

const ESTADO_COLORS = {
  borrador:        'bg-gray-100 text-gray-600',
  pendiente_firma: 'bg-amber-50 text-amber-700',
  autorizado:      'bg-emerald-50 text-emerald-700',
  en_ejecucion:    'bg-blue-50 text-blue-700',
  cerrado:         'bg-gray-100 text-gray-500',
  cancelado:       'bg-red-50 text-red-600',
}

const ESTADO_LABELS = {
  borrador: 'Borrador', pendiente_firma: 'Pendiente firma',
  autorizado: 'Autorizado', en_ejecucion: 'En ejecución',
  cerrado: 'Cerrado', cancelado: 'Cancelado',
}

const NIVEL_COLORS = {
  bajo: 'text-emerald-600', medio: 'text-amber-600',
  alto: 'text-orange-600', critico: 'text-red-600',
}

export default function AtsDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats]   = useState(null)
  const [hoy, setHoy]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().substring(0, 10)
      const [statsRes, listRes] = await Promise.all([
        api.get('/ats/estadisticas'),
        api.get('/ats', { params: { fecha_desde: today, fecha_hasta: today } }),
      ])
      setStats(statsRes.data)
      setHoy(listRes.data.data || [])
    } catch {
      toast.error('Error al cargar dashboard ATS')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-roka-500" />
      </div>
    )
  }

  const porEstado = stats?.por_estado || {}
  const porRiesgo = stats?.por_riesgo || {}

  const estados = [
    { key: 'borrador',        label: 'Borrador',        color: 'bg-gray-100 text-gray-600' },
    { key: 'pendiente_firma', label: 'Pend. firma',     color: 'bg-amber-100 text-amber-700' },
    { key: 'autorizado',      label: 'Autorizado',      color: 'bg-emerald-100 text-emerald-700' },
    { key: 'en_ejecucion',    label: 'En ejecución',    color: 'bg-blue-100 text-blue-700' },
    { key: 'cerrado',         label: 'Cerrado',         color: 'bg-gray-100 text-gray-500' },
    { key: 'cancelado',       label: 'Cancelado',       color: 'bg-red-100 text-red-600' },
  ]

  const niveles = [
    { key: 'bajo',    label: 'Bajo',    dot: 'bg-emerald-500' },
    { key: 'medio',   label: 'Medio',   dot: 'bg-amber-500' },
    { key: 'alto',    label: 'Alto',    dot: 'bg-orange-500' },
    { key: 'critico', label: 'Crítico', dot: 'bg-red-500' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Riesgos y Control</span>
            <span>/</span>
            <span>ATS</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Análisis de Trabajo Seguro</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Visión general del módulo — {format(new Date(), "EEEE dd 'de' MMMM", { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/ats/alertas')}
            className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/20 rounded-lg text-sm transition-colors"
          >
            <Bell size={14} /> Alertas
          </button>
          <button
            onClick={() => navigate('/ats/gestion')}
            className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
          >
            <ListChecks size={14} /> Ver todos
          </button>
          <button
            onClick={() => navigate('/ats/nuevo')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Nuevo ATS
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={14} className="text-slate-400" />
            <p className="text-xs text-slate-500">Hoy</p>
          </div>
          <p className="text-2xl font-bold text-slate-100 tabular-nums">{stats?.hoy ?? 0}</p>
          <p className="text-xs text-slate-500">ATS programados</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={14} className="text-roka-400" />
            <p className="text-xs text-slate-500">En ejecución</p>
          </div>
          <p className="text-2xl font-bold text-roka-400 tabular-nums">{stats?.en_curso ?? 0}</p>
          <p className="text-xs text-slate-500">Trabajando ahora</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-amber-400" />
            <p className="text-xs text-slate-500">Pendientes firma</p>
          </div>
          <p className="text-2xl font-bold text-amber-400 tabular-nums">{stats?.pendientes ?? 0}</p>
          <p className="text-xs text-slate-500">Requieren firma</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <p className="text-xs text-slate-500">Autorizados</p>
          </div>
          <p className="text-2xl font-bold text-emerald-400 tabular-nums">{stats?.autorizados ?? 0}</p>
          <p className="text-xs text-slate-500">Listos para iniciar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ATS de hoy */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Calendar size={15} className="text-roka-500" /> ATS de hoy
              <span className="ml-1 text-xs font-normal text-slate-400">({format(new Date(), 'dd/MM/yyyy')})</span>
            </h2>
            <button
              onClick={() => navigate('/ats/gestion')}
              className="text-xs text-roka-500 hover:text-roka-600 flex items-center gap-1"
            >
              Ver todos <ChevronRight size={12} />
            </button>
          </div>
          {hoy.length === 0 ? (
            <div className="p-10 text-center">
              <ClipboardList size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No hay ATS programados para hoy</p>
              <button
                onClick={() => navigate('/ats/nuevo')}
                className="mt-3 btn-primary text-xs"
              >
                Crear ATS para hoy
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {hoy.map(ats => (
                <div
                  key={ats.id}
                  className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/ats/${ats.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-roka-500">{ats.codigo}</code>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ESTADO_COLORS[ats.estado] || 'bg-gray-100 text-gray-600'}`}>
                        {ESTADO_LABELS[ats.estado] || ats.estado}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-700 truncate mt-0.5">{ats.titulo_trabajo}</p>
                    <p className="text-xs text-slate-400">{ats.area?.nombre || '—'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xs font-semibold capitalize ${NIVEL_COLORS[ats.nivel_riesgo] || ''}`}>
                      {ats.nivel_riesgo}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {ats.hora_inicio?.substring(0, 5) || '—'}
                    </p>
                  </div>
                  {ats.estado === 'autorizado' && (
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/ats/${ats.id}`) }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      <Play size={11} /> Iniciar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Distribución */}
        <div className="space-y-4">

          {/* Por estado */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Por estado (total: {stats?.total ?? 0})</h3>
            <div className="space-y-2">
              {estados.map(({ key, label, color }) => {
                const count = porEstado[key] ?? 0
                const pct = stats?.total ? Math.round((count / stats.total) * 100) : 0
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium w-28 text-center flex-shrink-0 ${color}`}>
                      {label}
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-roka-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 w-5 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Por nivel de riesgo */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Por nivel de riesgo</h3>
            <div className="grid grid-cols-2 gap-2">
              {niveles.map(({ key, label, dot }) => (
                <div key={key} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                  <div>
                    <p className="text-xs font-medium text-slate-700">{label}</p>
                    <p className="text-lg font-bold text-slate-800 leading-tight">{porRiesgo[key] ?? 0}</p>
                  </div>
                </div>
              ))}
            </div>
            {(porRiesgo['critico'] ?? 0) > 0 && (
              <div className="mt-3 flex items-center gap-2 p-2.5 bg-red-50 border border-red-100 rounded-lg">
                <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600">
                  {porRiesgo['critico']} ATS de riesgo crítico activos
                </p>
              </div>
            )}
          </div>

          {/* Accesos rápidos */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Accesos rápidos</h3>
            <div className="space-y-1.5">
              {[
                { label: 'Ver todos los ATS',   to: '/ats/gestion',  icon: ListChecks },
                { label: 'Alertas y pendientes',to: '/ats/alertas',  icon: Bell },
                { label: 'Nuevo ATS',           to: '/ats/nuevo',    icon: Plus },
              ].map(({ label, to, icon: Icon }) => (
                <button
                  key={to}
                  onClick={() => navigate(to)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-roka-600 hover:bg-roka-50 rounded-lg transition-colors text-left"
                >
                  <Icon size={14} className="text-slate-400" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
