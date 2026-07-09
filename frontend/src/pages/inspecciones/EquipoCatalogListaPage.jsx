import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Package, CalendarCheck, AlertTriangle, ChevronRight, RefreshCw } from 'lucide-react'
import api from '../../services/api'

function pctColor(v) {
  if (v == null) return 'text-gray-400'
  if (v >= 90) return 'text-emerald-600'
  if (v >= 70) return 'text-amber-600'
  return 'text-red-500'
}

function pctBg(v) {
  if (v == null) return 'bg-gray-200'
  if (v >= 90) return 'bg-emerald-500'
  if (v >= 70) return 'bg-amber-500'
  return 'bg-red-500'
}

export default function EquipoCatalogListaPage() {
  const navigate = useNavigate()
  const currentYear = new Date().getFullYear()
  const [año, setAño] = useState(currentYear)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api.get('/inspecciones/catalogo/lista', { params: { año } })
      .then(r => setData(r.data))
      .catch(() => setError('No se pudo cargar la lista de equipos'))
      .finally(() => setLoading(false))
  }, [año])

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/inspecciones')}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            ← Inspecciones
          </button>
          <div className="flex items-center gap-2">
            <BarChart3 size={22} className="text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Dashboard por Tipo de Equipo</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {[currentYear - 1, currentYear].map(y => (
            <button
              key={y}
              onClick={() => setAño(y)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                año === y
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <RefreshCw size={24} className="animate-spin text-blue-500" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {data && (
        <>
          <p className="text-sm text-gray-500">
            {data.catalogo.length} tipo{data.catalogo.length !== 1 ? 's' : ''} de equipo con actividad en {año}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.catalogo.map(cat => (
              <button
                key={cat.id}
                onClick={() => navigate(`/inspecciones/catalogo/${cat.id}/dashboard`)}
                className="text-left bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all group"
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors leading-tight">
                      {cat.nombre}
                    </h3>
                    {cat.categoria_emergencia && (
                      <span className="text-xs text-orange-600 font-medium">Emergencia</span>
                    )}
                  </div>
                  <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-500 mt-0.5 flex-shrink-0" />
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Package size={15} className="text-gray-400" />
                    <div>
                      <div className="text-base font-bold text-gray-800">{cat.total_unidades}</div>
                      <div className="text-xs text-gray-500">Unidades</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarCheck size={15} className="text-gray-400" />
                    <div>
                      <div className="text-base font-bold text-gray-800">{cat.inspecciones_año}</div>
                      <div className="text-xs text-gray-500">Inspecciones {año}</div>
                    </div>
                  </div>
                </div>

                {/* Cumplimiento bar */}
                {cat.cumplimiento != null ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Cumplimiento</span>
                      <span className={`text-sm font-bold ${pctColor(cat.cumplimiento)}`}>
                        {cat.cumplimiento}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pctBg(cat.cumplimiento)}`}
                        style={{ width: `${Math.min(cat.cumplimiento, 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <AlertTriangle size={13} />
                    Sin inspecciones en {año}
                  </div>
                )}

                {cat.ultima_inspeccion && (
                  <div className="mt-2 text-xs text-gray-400">
                    Última: {new Date(cat.ultima_inspeccion).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
