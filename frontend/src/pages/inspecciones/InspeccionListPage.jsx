import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ClipboardCheck, AlertTriangle, CheckCircle, Clock, Download, XCircle, ClipboardList, Wrench, BookOpen } from 'lucide-react'
import api from '../../services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADOS = {
  programada:    { label: 'Programada',    color: 'bg-blue-50 text-blue-700 border-blue-200' },
  en_ejecucion:  { label: 'En ejecución',  color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ejecutada:     { label: 'Ejecutada',     color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  con_hallazgos: { label: 'Con hallazgos', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  cerrada:       { label: 'Cerrada',       color: 'bg-gray-100 text-gray-600 border-gray-200' },
  anulada:       { label: 'Anulada',       color: 'bg-red-50 text-red-600 border-red-200' },
}

const TIPOS = {
  equipos: 'Equipos', infraestructura: 'Infraestructura', emergencias: 'Emergencias',
  epps: 'EPPs', orden_limpieza: 'Orden/Limpieza', higiene: 'Higiene', general: 'General',
}

const TABS = [
  { key: '',             label: 'Todas' },
  { key: 'programada',   label: 'Pendientes' },
  { key: 'en_ejecucion', label: 'En ejecución' },
  { key: 'cerrada',      label: 'Cerradas' },
]

function exportarCSV(rows) {
  const cols = ['Código', 'Tipo', 'Título', 'Área', 'Fecha', 'Cumplimiento %', 'Hallazgos', 'Estado']
  const lines = rows.map(r => [
    r.codigo, TIPOS[r.tipo] || r.tipo, r.titulo, r.area?.nombre || '',
    r.planificada_para || '', r.porcentaje_cumplimiento || 0,
    r.hallazgos_count || 0, ESTADOS[r.estado]?.label || r.estado,
  ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
  const blob = new Blob([cols.join(',') + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
  a.download = 'inspecciones.csv'; a.click()
  URL.revokeObjectURL(a.href)
}

export default function InspeccionListPage() {
  const navigate = useNavigate()
  const [inspecciones, setInspecciones] = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [tab, setTab]                   = useState('')
  const [filtroTipo, setFiltroTipo]     = useState('')
  const [pagina, setPagina]             = useState(1)
  const [meta, setMeta]                 = useState(null)
  const [stats, setStats]               = useState(null)

  useEffect(() => { cargar() }, [search, tab, filtroTipo, pagina])
  useEffect(() => { cargarStats() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const params = { page: pagina, per_page: 20 }
      if (search)    params.search = search
      if (tab)       params.estado = tab
      if (filtroTipo) params.tipo  = filtroTipo
      const { data } = await api.get('/inspecciones', { params })
      setInspecciones(data.data || [])
      setMeta(data.meta || null)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const cargarStats = async () => {
    try {
      const { data } = await api.get('/inspecciones/estadisticas')
      setStats(data)
    } catch { /* silent */ }
  }

  const cumplimientoColor = (pct) => {
    if (pct >= 90) return 'text-emerald-600'
    if (pct >= 70) return 'text-amber-600'
    return 'text-red-500'
  }

  const handleTab = (key) => { setTab(key); setPagina(1) }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inspecciones</h1>
          <p className="text-gray-500 text-sm mt-1">RM-050-2013-TR — Registro 06</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Accesos directos del sub-módulo */}
          <button
            onClick={() => navigate('/inspecciones/checklist/nueva')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ClipboardList size={14} /> Checklist
          </button>
          <button
            onClick={() => navigate('/inspecciones/equipos')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Wrench size={14} /> Catálogo Equipos
          </button>
          <button
            onClick={() => navigate('/inspecciones/preguntas')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BookOpen size={14} /> Banco Preguntas
          </button>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          <button
            onClick={() => exportarCSV(inspecciones)}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download size={14} /> Exportar CSV
          </button>
          <button
            onClick={() => navigate('/inspecciones')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Dashboard
          </button>
          <button
            onClick={() => navigate('/inspecciones/nueva')}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Nueva Inspección
          </button>
        </div>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Programadas',    valor: stats.por_estado?.programada?.[0]?.total ?? 0,    icon: Clock,          color: 'text-blue-600',    bg: 'bg-blue-50' },
            { label: 'Con hallazgos',  valor: stats.por_estado?.con_hallazgos?.[0]?.total ?? 0, icon: AlertTriangle,   color: 'text-orange-600',  bg: 'bg-orange-50' },
            { label: 'Cerradas',       valor: stats.por_estado?.cerrada?.[0]?.total ?? 0,       icon: CheckCircle,     color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: '% Cumplimiento', valor: `${stats.porcentaje_cumplimiento_promedio ?? 0}%`, icon: ClipboardCheck,  color: 'text-roka-600',    bg: 'bg-roka-50' },
          ].map(({ label, valor, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
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

      {/* Tabs + filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {TABS.map(t => (
            <button key={t.key} onClick={() => handleTab(t.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-48 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <Search size={15} className="text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPagina(1) }}
              placeholder="Buscar por código o título..."
              className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none flex-1"
            />
          </div>
          <select
            value={filtroTipo}
            onChange={e => { setFiltroTipo(e.target.value); setPagina(1) }}
            className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500"
          >
            <option value="">Todos los tipos</option>
            {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Código', 'Tipo', 'Título', 'Área', 'Fecha', 'Cumplimiento', 'Hallazgos', 'Estado'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            ) : inspecciones.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No se encontraron inspecciones</td></tr>
            ) : inspecciones.map(ins => (
              <tr
                key={ins.id}
                onClick={() => navigate(`/inspecciones/${ins.id}`)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs text-roka-600">{ins.codigo}</td>
                <td className="px-4 py-3 text-gray-600">{TIPOS[ins.tipo] || ins.tipo}</td>
                <td className="px-4 py-3 text-gray-800 font-medium max-w-48 truncate">{ins.titulo}</td>
                <td className="px-4 py-3 text-gray-500">{ins.area?.nombre}</td>
                <td className="px-4 py-3 text-gray-500">
                  {ins.planificada_para ? format(new Date(ins.planificada_para), 'dd MMM yyyy', { locale: es }) : '—'}
                </td>
                <td className="px-4 py-3">
                  {ins.porcentaje_cumplimiento > 0 ? (
                    <span className={`font-semibold ${cumplimientoColor(ins.porcentaje_cumplimiento)}`}>
                      {ins.porcentaje_cumplimiento}%
                    </span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  {ins.hallazgos_count > 0 ? (
                    <span className="text-orange-600 font-medium">{ins.hallazgos_count}</span>
                  ) : <span className="text-gray-300">0</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full border ${ESTADOS[ins.estado]?.color}`}>
                    {ESTADOS[ins.estado]?.label || ins.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {meta && meta.last_page > 1 && (
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-gray-400">
              Mostrando {meta.from}–{meta.to} de {meta.total}
            </span>
            <div className="flex gap-2">
              <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-gray-50 text-xs">
                Anterior
              </button>
              <button disabled={pagina === meta.last_page} onClick={() => setPagina(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-gray-50 text-xs">
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
