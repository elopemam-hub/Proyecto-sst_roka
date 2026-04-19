import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, TrendingDown, RefreshCw, Link2, CheckSquare,
  Bell, BarChart3, BookOpen, Plus, ArrowRight,
  AlertCircle, Clock, CheckCircle2, Database, FileSpreadsheet
} from 'lucide-react'
import api from '../../services/api'

const CLASIF_COLOR = {
  trivial:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  tolerable:   'bg-lime-500/10 text-lime-400 border-lime-500/20',
  moderado:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
  importante:  'bg-orange-500/10 text-orange-400 border-orange-500/20',
  intolerable: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const SUBMODULOS = [
  { key: 'gestion',        label: 'Gestión',                icon: Shield,       to: '/iperc/gestion',        desc: 'Matrices IPERC registradas',    color: 'text-blue-400' },
  { key: 'riesgo-residual',label: 'Riesgo Residual',        icon: TrendingDown, to: '/iperc/riesgo-residual',desc: 'Riesgos tras controles',         color: 'text-cyan-400' },
  { key: 'continuo',       label: 'IPERC Continuo',         icon: RefreshCw,    to: '/iperc/continuo',       desc: 'Metodología continua',           color: 'text-green-400' },
  { key: 'integracion',    label: 'Integración SST',        icon: Link2,        to: '/iperc/integracion',    desc: 'Vínculos con otros módulos',     color: 'text-purple-400' },
  { key: 'aprobacion',     label: 'Aprobación',             icon: CheckSquare,  to: '/iperc/aprobacion',     desc: 'Flujo de aprobación',            color: 'text-emerald-400' },
  { key: 'alertas',        label: 'Alertas',                icon: Bell,         to: '/iperc/alertas',        desc: 'Riesgos críticos y vencimientos', color: 'text-rose-400' },
  { key: 'reportes',       label: 'Reportes',               icon: BarChart3,    to: '/iperc/reportes',       desc: 'Resúmenes y estadísticas',       color: 'text-sky-400' },
  { key: 'guia',           label: 'Guía Referencial',       icon: BookOpen,     to: '/iperc/guia',           desc: 'Catálogo de peligros y riesgos', color: 'text-orange-400' },
  { key: 'banco',          label: 'Banco de Datos',         icon: Database,        to: '/iperc/banco',          desc: 'Peligros, controles y más',      color: 'text-slate-400' },
  { key: 'tabla',          label: 'Tabla IPERC',            icon: FileSpreadsheet, to: '/iperc/tabla',          desc: 'Formato oficial RM 050-2013-TR',  color: 'text-lime-400' },
]

export default function IpercDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/iperc/estadisticas')
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const porEstado = stats?.por_estado || {}
  const porClasif = stats?.por_clasificacion || {}
  const controles = stats?.controles_por_estado || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">IPERC</h1>
          <p className="text-slate-400 text-sm mt-1">
            Identificación de Peligros, Evaluación y Control de Riesgos · Ley 29783 / ISO 45001
          </p>
        </div>
        <button
          onClick={() => navigate('/iperc/nuevo')}
          className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Nueva Matriz
        </button>
      </div>

      {/* KPIs */}
      {!loading && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total IPERC',      valor: stats.total_iperc,     color: 'text-blue-400' },
            { label: 'Procesos',         valor: stats.total_procesos,  color: 'text-violet-400' },
            { label: 'Peligros',         valor: stats.total_peligros,  color: 'text-red-400' },
            { label: 'Significativos',   valor: stats.significativos,  color: 'text-orange-400' },
            { label: 'Vencidos',         valor: stats.vencidos,        color: 'text-rose-400' },
          ].map(({ label, valor, color }) => (
            <div key={label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <p className={`text-2xl font-bold ${color}`}>{valor ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Resumen distribución */}
      {!loading && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Por clasificación */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <p className="text-sm font-semibold text-slate-300 mb-3">Peligros por nivel de riesgo</p>
            <div className="space-y-2">
              {['intolerable', 'importante', 'moderado', 'tolerable', 'trivial'].map(c => (
                <div key={c} className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${CLASIF_COLOR[c]}`}>{c}</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${c === 'intolerable' ? 'bg-red-500' : c === 'importante' ? 'bg-orange-500' : c === 'moderado' ? 'bg-amber-500' : c === 'tolerable' ? 'bg-lime-500' : 'bg-emerald-500'}`}
                      style={{ width: `${stats.total_peligros > 0 ? ((porClasif[c] || 0) / stats.total_peligros * 100) : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono text-slate-300 w-6 text-right">{porClasif[c] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Controles por estado */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <p className="text-sm font-semibold text-slate-300 mb-3">Estado de controles</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'implementado', label: 'Implementado', color: 'text-emerald-400', icon: CheckCircle2 },
                { key: 'en_proceso',   label: 'En proceso',   color: 'text-amber-400',   icon: Clock },
                { key: 'pendiente',    label: 'Pendiente',    color: 'text-red-400',     icon: AlertCircle },
                { key: 'verificado',   label: 'Verificado',   color: 'text-blue-400',    icon: CheckSquare },
              ].map(({ key, label, color, icon: Icon }) => (
                <div key={key} className="flex items-center gap-2 bg-slate-700/50 rounded-lg p-3">
                  <Icon size={16} className={color} />
                  <div>
                    <p className={`text-lg font-bold ${color}`}>{controles[key] || 0}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Submodulos grid */}
      <div>
        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Submódulos</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {SUBMODULOS.map(({ key, label, icon: Icon, to, desc, color }) => (
            <button
              key={key}
              onClick={() => navigate(to)}
              className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-left hover:border-slate-500 hover:bg-slate-700/80 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <Icon size={20} className={color} />
                <ArrowRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
              </div>
              <p className="text-sm font-semibold text-slate-200">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-tight">{desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
