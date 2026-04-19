import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

/**
 * Tarjeta de KPI reutilizable para el dashboard
 */
export default function KpiCard({
  label,
  value,
  unit       = '',
  trend      = null,   // 'up' | 'down' | 'neutral'
  trendLabel = '',
  icon:  Icon,
  iconBg = 'bg-roka-500/15',
  iconColor = 'text-roka-400',
  status = 'normal',   // 'normal' | 'warning' | 'danger' | 'success'
  loading = false,
}) {
  const statusColors = {
    normal:  '',
    success: 'border-emerald-500/30',
    warning: 'border-amber-500/30',
    danger:  'border-red-500/30',
  }

  const trendConfig = {
    up:      { icon: TrendingUp,   color: 'text-emerald-400' },
    down:    { icon: TrendingDown, color: 'text-red-400'     },
    neutral: { icon: Minus,        color: 'text-slate-500'   },
  }

  const TrendIcon = trendConfig[trend]?.icon

  return (
    <div className={`kpi-card ${statusColors[status]}`}>
      <div className="flex items-start justify-between">
        {/* Ícono */}
        {Icon && (
          <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
            <Icon size={20} className={iconColor} />
          </div>
        )}

        {/* Trend badge */}
        {trend && TrendIcon && (
          <div className={`flex items-center gap-1 text-xs ${trendConfig[trend].color}`}>
            <TrendIcon size={14} />
            <span>{trendLabel}</span>
          </div>
        )}
      </div>

      {/* Valor */}
      <div>
        {loading ? (
          <div className="space-y-2">
            <div className="h-8 w-24 bg-slate-800 rounded-md animate-pulse" />
            <div className="h-3 w-32 bg-slate-800 rounded animate-pulse" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-slate-100 tabular-nums">
                {typeof value === 'number' ? value.toLocaleString('es-PE') : (value ?? '—')}
              </span>
              {unit && <span className="text-sm text-slate-500">{unit}</span>}
            </div>
            <p className="text-sm text-slate-400 mt-0.5">{label}</p>
          </>
        )}
      </div>
    </div>
  )
}
