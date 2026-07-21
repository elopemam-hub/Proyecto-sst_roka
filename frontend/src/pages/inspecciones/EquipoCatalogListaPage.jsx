import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Package, CalendarCheck, AlertTriangle, ChevronRight, RefreshCw, Search, X, ArrowLeft } from 'lucide-react'
import api from '../../services/api'

const SUBMOD_COLORS = {
  A: { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-300',   dot: 'bg-blue-500'   },
  B: { bg: 'bg-teal-100',   text: 'text-teal-700',   border: 'border-teal-300',   dot: 'bg-teal-500'   },
  C: { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300',    dot: 'bg-red-500'    },
  D: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', dot: 'bg-purple-500' },
  E: { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-300',  dot: 'bg-amber-500'  },
}

function getSubmodStyle(codigo) {
  return SUBMOD_COLORS[codigo] ?? { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300', dot: 'bg-gray-400' }
}

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

  const [año, setAño]               = useState(currentYear)
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  const [busqueda, setBusqueda]         = useState('')
  const [submoduloSel, setSubmoduloSel] = useState(null)
  const [areaSel, setAreaSel]           = useState('')

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = { año }
    if (areaSel) params.area_id = areaSel
    api.get('/inspecciones/catalogo/lista', { params })
      .then(r => setData(r.data))
      .catch(() => setError('No se pudo cargar la lista de equipos'))
      .finally(() => setLoading(false))
  }, [año, areaSel])

  const catalogoFiltrado = useMemo(() => {
    if (!data?.catalogo) return []
    return data.catalogo.filter(cat => {
      if (submoduloSel && cat.submodulo_id !== submoduloSel) return false
      if (busqueda.trim() && !cat.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
      return true
    })
  }, [data, submoduloSel, busqueda])

  const hayFiltros = busqueda || submoduloSel || areaSel

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => navigate('/inspecciones')}
            className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all">
            <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
            Inspecciones
          </button>
          <div className="flex items-center gap-2">
            <BarChart3 size={22} className="text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Dashboard por Tipo de Equipo</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {[currentYear - 1, currentYear].map(y => (
            <button key={y} onClick={() => setAño(y)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                año === y ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Búsqueda */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Buscar equipo</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Nombre del equipo..."
                className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
              {busqueda && (
                <button onClick={() => setBusqueda('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Área */}
          {data?.areas?.length > 0 && (
            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Área</label>
              <select value={areaSel} onChange={e => setAreaSel(e.target.value)}
                className="w-full py-2 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                <option value="">Todas las áreas</option>
                {data.areas.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {hayFiltros && (
            <button onClick={() => { setBusqueda(''); setSubmoduloSel(null); setAreaSel('') }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
              <X size={13} /> Limpiar
            </button>
          )}
        </div>

        {/* Chips de submodulo */}
        {data?.submodulos?.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
            <span className="text-xs font-medium text-gray-500 self-center">Catálogo:</span>
            <button
              onClick={() => setSubmoduloSel(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                !submoduloSel
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}>
              Todos ({data.catalogo.length})
            </button>
            {data.submodulos.map(sm => {
              const style  = getSubmodStyle(sm.codigo)
              const activo = submoduloSel === sm.id
              const count  = data.catalogo.filter(c => c.submodulo_id === sm.id).length
              return (
                <button key={sm.id} onClick={() => setSubmoduloSel(activo ? null : sm.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    activo
                      ? `${style.bg} ${style.text} ${style.border}`
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${activo ? style.dot : 'bg-gray-400'}`} />
                  {sm.codigo} — {sm.nombre}
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-xs ${activo ? 'bg-white/60' : 'bg-gray-100'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <RefreshCw size={24} className="animate-spin text-blue-500" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      )}

      {data && !loading && (
        <>
          <p className="text-sm text-gray-500">
            {catalogoFiltrado.length} tipo{catalogoFiltrado.length !== 1 ? 's' : ''}
            {hayFiltros ? ' (filtrado)' : ` con actividad en ${año}`}
          </p>

          {catalogoFiltrado.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <BarChart3 size={32} className="mx-auto mb-3 text-gray-200" />
              <p className="font-medium">Sin resultados</p>
              <p className="text-sm mt-1">Prueba con otros filtros</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogoFiltrado.map(cat => {
                const smStyle = cat.submodulo_codigo ? getSubmodStyle(cat.submodulo_codigo) : null
                return (
                  <button key={cat.id}
                    onClick={() => navigate(`/inspecciones/catalogo/${cat.id}/dashboard`)}
                    className="text-left bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all group">

                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 pr-2">
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors leading-tight">
                          {cat.nombre}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {smStyle && cat.submodulo_nombre && (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${smStyle.bg} ${smStyle.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${smStyle.dot}`} />
                              {cat.submodulo_codigo} — {cat.submodulo_nombre}
                            </span>
                          )}
                          {cat.categoria_emergencia && !smStyle && (
                            <span className="text-xs text-orange-600 font-medium">Emergencia</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-500 mt-0.5 flex-shrink-0" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4 mt-3">
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
                          <div className="text-xs text-gray-500">Insp. {año}</div>
                        </div>
                      </div>
                    </div>

                    {cat.cumplimiento != null ? (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">Cumplimiento</span>
                          <span className={`text-sm font-bold ${pctColor(cat.cumplimiento)}`}>
                            {cat.cumplimiento}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pctBg(cat.cumplimiento)}`}
                            style={{ width: `${Math.min(cat.cumplimiento, 100)}%` }} />
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
                        Última: {new Date(cat.ultima_inspeccion).toLocaleDateString('es-PE', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
