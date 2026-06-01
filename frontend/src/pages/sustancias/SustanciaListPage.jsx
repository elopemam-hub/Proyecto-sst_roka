import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, X, FlaskConical, AlertTriangle, FileWarning, ShieldAlert, ChevronRight, Download, BarChart2, GitCompare, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import api from '../../services/api'

const GHS_INFO = {
  GHS01: { label: 'Explosivo',        emoji: '💥', color: 'bg-red-100 text-red-800 border-red-300' },
  GHS02: { label: 'Inflamable',       emoji: '🔥', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  GHS03: { label: 'Comburente',       emoji: '⭕', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  GHS04: { label: 'Gas a presión',    emoji: '🔵', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  GHS05: { label: 'Corrosivo',        emoji: '⚗️', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  GHS06: { label: 'Tóxico agudo',     emoji: '☠️', color: 'bg-gray-100 text-gray-800 border-gray-400' },
  GHS07: { label: 'Nocivo/Irritante', emoji: '⚠️', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  GHS08: { label: 'Peligro salud',    emoji: '🫁', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  GHS09: { label: 'Peligro MA',       emoji: '🌿', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
}

const RIESGO_CFG = {
  muy_alto: { label: 'Muy alto', cls: 'bg-red-100 text-red-700 border-red-300',         dot: 'bg-red-500' },
  alto:     { label: 'Alto',     cls: 'bg-orange-100 text-orange-700 border-orange-300', dot: 'bg-orange-500' },
  medio:    { label: 'Medio',    cls: 'bg-amber-100 text-amber-700 border-amber-300',    dot: 'bg-amber-500' },
  bajo:     { label: 'Bajo',     cls: 'bg-emerald-100 text-emerald-700 border-emerald-300', dot: 'bg-emerald-500' },
}

const ESTADO_FISICO = {
  liquido:  '💧 Líquido',
  solido:   '🧱 Sólido',
  gas:      '💨 Gas',
  aerosol:  '🌫️ Aerosol',
  polvo:    '🌪️ Polvo',
}

export default function SustanciaListPage() {
  const navigate = useNavigate()
  const [sustancias, setSustancias] = useState([])
  const [stats, setStats]           = useState(null)
  const [loading, setLoading]       = useState(true)
  const [busq, setBusq]             = useState('')
  const [filtroRiesgo, setFiltroRiesgo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [pagina, setPagina]         = useState(1)
  const [meta, setMeta]             = useState(null)

  useEffect(() => { cargarStats() }, [])
  useEffect(() => { setPagina(1) }, [busq, filtroRiesgo, filtroEstado])
  useEffect(() => { cargar() }, [busq, filtroRiesgo, filtroEstado, pagina])

  const cargar = async () => {
    setLoading(true)
    try {
      const params = { per_page: 15, page: pagina }
      if (busq.trim())    params.search       = busq.trim()
      if (filtroRiesgo)   params.nivel_riesgo = filtroRiesgo
      if (filtroEstado)   params.estado_fisico = filtroEstado
      const { data } = await api.get('/sustancias', { params })
      setSustancias(data.data || [])
      if (data.last_page) setMeta({ current_page: data.current_page, last_page: data.last_page, total: data.total })
      else setMeta(null)
    } catch { } finally { setLoading(false) }
  }

  const cargarStats = async () => {
    try { const { data } = await api.get('/sustancias/estadisticas'); setStats(data) }
    catch { }
  }

  const eliminar = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar "${nombre}"?`)) return
    try { await api.delete(`/sustancias/${id}`); cargar(); cargarStats() }
    catch (e) { alert(e.response?.data?.message || 'Error') }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical size={24} className="text-purple-600" /> Sustancias Peligrosas
          </h1>
          <p className="text-gray-500 text-sm mt-1">Inventario y gestión de sustancias químicas · GHS/SGA · NTP 399.015</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => navigate('/sustancias/dashboard')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <BarChart2 size={14}/> Dashboard
          </button>
          <button onClick={() => navigate('/sustancias/incompatibilidades')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <GitCompare size={14}/> Incompatibilidades
          </button>
          <button onClick={async () => {
            const { data } = await api.get('/sustancias/exportar')
            const ws = XLSX.utils.json_to_sheet(data)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Sustancias')
            XLSX.writeFile(wb, `inventario_sustancias_peligrosas_${new Date().toISOString().slice(0,10)}.xlsx`)
          }} className="flex items-center gap-2 border border-emerald-300 text-emerald-700 hover:bg-emerald-50 px-3 py-2 rounded-lg text-sm font-medium">
            <Download size={14}/> Exportar Excel
          </button>
          <button onClick={() => navigate('/sustancias/inventario')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <BarChart2 size={14}/> Inventario Stock
          </button>
          <button onClick={() => navigate('/sustancias/importar')}
            className="flex items-center gap-2 border border-purple-300 text-purple-700 hover:bg-purple-50 px-3 py-2 rounded-lg text-sm font-medium">
            <Upload size={14}/> Importar Excel
          </button>
          <button onClick={() => navigate('/sustancias/nueva')}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Nueva sustancia
          </button>
        </div>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total sustancias', val: stats.total,    icon: FlaskConical,  color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Riesgo muy alto',  val: stats.muy_alto, icon: ShieldAlert,   color: 'text-red-600',    bg: 'bg-red-50' },
            { label: 'Riesgo alto',      val: stats.alto,     icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Sin HDS vigente',  val: stats.sin_hds,  icon: FileWarning,   color: stats.sin_hds > 0 ? 'text-amber-600' : 'text-gray-400', bg: stats.sin_hds > 0 ? 'bg-amber-50' : 'bg-gray-50' },
          ].map(({ label, val, icon: Icon, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3`}>
              <Icon size={20} className={`${color} flex-shrink-0`} />
              <div>
                <p className={`text-2xl font-black ${color}`}>{val}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busq} onChange={e => setBusq(e.target.value)}
            placeholder="Buscar sustancia o CAS..."
            className="w-full border border-gray-300 text-sm rounded-lg pl-8 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500" />
          {busq && <button onClick={() => setBusq('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
        </div>
        <select value={filtroRiesgo} onChange={e => setFiltroRiesgo(e.target.value)}
          className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todos los riesgos</option>
          {Object.entries(RIESGO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_FISICO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {(busq || filtroRiesgo || filtroEstado) && (
          <button onClick={() => { setBusq(''); setFiltroRiesgo(''); setFiltroEstado('') }}
            className="text-xs text-gray-500 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50">
            Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Nombre', 'CAS / ONU', 'Estado físico', 'Pictogramas GHS', 'Nivel riesgo', 'HDS', 'Área uso', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            ) : sustancias.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No se encontraron sustancias</td></tr>
            ) : sustancias.map(s => {
              const riesgo = RIESGO_CFG[s.nivel_riesgo]
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800">{s.nombre}</p>
                    {s.nombre_quimico && <p className="text-xs text-gray-400 mt-0.5">{s.nombre_quimico}</p>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {s.cas_number && <div>CAS: {s.cas_number}</div>}
                    {s.numero_onu && <div>ONU: {s.numero_onu}</div>}
                    {!s.cas_number && !s.numero_onu && '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{ESTADO_FISICO[s.estado_fisico] || s.estado_fisico}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(s.pictogramas_ghs || []).map(g => (
                        <span key={g} title={GHS_INFO[g]?.label}
                          className={`text-xs px-1.5 py-0.5 rounded border font-mono ${GHS_INFO[g]?.color || 'bg-gray-100'}`}>
                          {GHS_INFO[g]?.emoji} {g}
                        </span>
                      ))}
                      {(!s.pictogramas_ghs || s.pictogramas_ghs.length === 0) && <span className="text-gray-300 text-xs">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${riesgo?.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${riesgo?.dot}`} />
                      {riesgo?.label || s.nivel_riesgo}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${s.hds_disponible ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                      {s.hds_disponible ? (s.hds_actualizado ? '✓ Vigente' : '⚠ Desact.') : '✗ Sin HDS'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[130px] truncate" title={s.area_uso}>{s.area_uso || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/sustancias/${s.id}`)}
                        className="text-xs text-roka-600 hover:text-roka-700 font-medium flex items-center gap-0.5">
                        Ver <ChevronRight size={12} />
                      </button>
                      <button onClick={() => navigate(`/sustancias/${s.id}/editar`)}
                        className="text-xs text-gray-500 hover:text-gray-700 font-medium ml-1">Editar</button>
                      <button onClick={() => eliminar(s.id, s.nombre)}
                        className="text-xs text-red-400 hover:text-red-600 font-medium ml-1">Eliminar</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Paginación */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Total: {meta.total} sustancias</p>
            <div className="flex gap-1">
              <button disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}
                className="px-3 py-1 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50">← Anterior</button>
              <span className="px-3 py-1 text-xs bg-roka-50 text-roka-700 border border-roka-200 rounded-lg font-medium">
                {pagina} / {meta.last_page}
              </span>
              <button disabled={pagina >= meta.last_page} onClick={() => setPagina(p => p + 1)}
                className="px-3 py-1 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50">Siguiente →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
