import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Zap, FileText, ChevronDown, Search, Filter } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const TIPOS = [
  { value: 'reg_01', label: 'Reg. 01 - Accidentes' },
  { value: 'reg_02', label: 'Reg. 02 - Enf. Ocupacionales' },
  { value: 'reg_03', label: 'Reg. 03 - Incidentes' },
  { value: 'reg_04', label: 'Reg. 04 - Investigaciones' },
  { value: 'reg_05', label: 'Reg. 05 - Monitoreo Agentes' },
  { value: 'reg_06', label: 'Reg. 06 - Inspecciones' },
  { value: 'reg_07', label: 'Reg. 07 - Equipos Emergencia' },
  { value: 'reg_08', label: 'Reg. 08 - Auditorías' },
  { value: 'reg_09', label: 'Reg. 09 - Capacitaciones/Simulacros' },
  { value: 'reg_10', label: 'Reg. 10 - Estadísticas SST' },
]

const ESTADOS_CONFIG = {
  borrador: 'bg-slate-700 text-slate-300',
  vigente:  'bg-green-900/50 text-green-400',
  anulado:  'bg-red-900/50 text-red-400',
}

export default function FormatoListPage() {
  const navigate = useNavigate()
  const [registros, setRegistros] = useState([])
  const [estadisticas, setEstadisticas] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [showGenerar, setShowGenerar] = useState(false)
  const [generarAnio, setGenerarAnio] = useState(new Date().getFullYear())
  const [filtros, setFiltros] = useState({ tipo_registro: '', estado: '', periodo_anio: '', search: '' })
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState(null)
  const generarRef = useRef(null)

  useEffect(() => {
    cargar()
    cargarEstadisticas()
  }, [filtros, page])

  useEffect(() => {
    const handleClick = (e) => {
      if (generarRef.current && !generarRef.current.contains(e.target)) setShowGenerar(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const params = { page, ...Object.fromEntries(Object.entries(filtros).filter(([, v]) => v)) }
      const { data } = await api.get('/formatos', { params })
      setRegistros(data.data || [])
      setMeta(data)
    } catch {
      toast.error('Error al cargar los registros')
    } finally {
      setLoading(false)
    }
  }

  const cargarEstadisticas = async () => {
    try {
      const { data } = await api.get('/formatos/estadisticas')
      setEstadisticas(data)
    } catch { /* silent */ }
  }

  const handleGenerar = async (tipo) => {
    setShowGenerar(false)
    setGenerando(true)
    try {
      const { data } = await api.post(`/formatos/generar/${tipo}`, { periodo_anio: generarAnio })
      toast.success('Registro generado correctamente')
      navigate(`/formatos/${data.id}`)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al generar el registro')
    } finally {
      setGenerando(false)
    }
  }

  const handleFiltro = (key, value) => {
    setFiltros(f => ({ ...f, [key]: value }))
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Formatos RM 050-2013-TR</h1>
          <p className="text-slate-400 text-sm mt-1">Registros obligatorios exigidos por la Ley 29783</p>
        </div>
        <div className="flex gap-2">
          {/* Botón Generar automático */}
          <div className="relative" ref={generarRef}>
            <button
              onClick={() => setShowGenerar(s => !s)}
              disabled={generando}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              <Zap size={16} />
              {generando ? 'Generando...' : 'Generar'}
              <ChevronDown size={14} />
            </button>
            {showGenerar && (
              <div className="absolute right-0 mt-1 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20">
                <div className="p-3 border-b border-slate-700">
                  <label className="text-xs text-slate-400 block mb-1">Año del periodo</label>
                  <input
                    type="number"
                    value={generarAnio}
                    onChange={e => setGenerarAnio(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                    min="2000" max="2100"
                  />
                </div>
                <div className="py-1 max-h-64 overflow-y-auto">
                  {TIPOS.map(t => (
                    <button
                      key={t.value}
                      onClick={() => handleGenerar(t.value)}
                      className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate('/formatos/nuevo')}
            className="flex items-center gap-2 px-4 py-2 bg-roka-600 hover:bg-roka-500 text-white rounded-lg text-sm font-medium"
          >
            <Plus size={16} />
            Nuevo Registro
          </button>
        </div>
      </div>

      {/* KPIs */}
      {estadisticas && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{estadisticas.vigentes}</div>
            <div className="text-xs text-slate-400 mt-1">Registros vigentes</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-amber-400">{estadisticas.borradores}</div>
            <div className="text-xs text-slate-400 mt-1">En borrador</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{estadisticas.total_anio}</div>
            <div className="text-xs text-slate-400 mt-1">Este año</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{estadisticas.tipos_con_registro}<span className="text-slate-500 text-lg">/10</span></div>
            <div className="text-xs text-slate-400 mt-1">Tipos con registro vigente</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-slate-800 rounded-lg p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por título o correlativo..."
            value={filtros.search}
            onChange={e => handleFiltro('search', e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500"
          />
        </div>
        <select
          value={filtros.tipo_registro}
          onChange={e => handleFiltro('tipo_registro', e.target.value)}
          className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white min-w-44"
        >
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select
          value={filtros.estado}
          onChange={e => handleFiltro('estado', e.target.value)}
          className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="vigente">Vigente</option>
          <option value="anulado">Anulado</option>
        </select>
        <input
          type="number"
          placeholder="Año"
          value={filtros.periodo_anio}
          onChange={e => handleFiltro('periodo_anio', e.target.value)}
          className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white w-24"
          min="2000" max="2100"
        />
      </div>

      {/* Tabla */}
      <div className="bg-slate-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Cargando registros...</div>
        ) : registros.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={40} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400">No hay registros. Crea uno manualmente o usa "Generar" para auto-poblar desde los datos del sistema.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Correlativo</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Periodo</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Creado por</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {registros.map(r => (
                <tr key={r.id} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{r.correlativo}</td>
                  <td className="px-4 py-3 text-white">{r.tipo_label}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {r.periodo_anio}{r.periodo_mes ? `/${String(r.periodo_mes).padStart(2, '0')}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${ESTADOS_CONFIG[r.estado] || ''}`}>
                      {r.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {r.creado_por?.nombres} {r.creado_por?.apellidos}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(r.created_at).toLocaleDateString('es-PE')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => navigate(`/formatos/${r.id}`)}
                      className="text-roka-400 hover:text-roka-300 text-xs font-medium"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Paginación */}
        {meta && meta.last_page > 1 && (
          <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between text-sm text-slate-400">
            <span>Página {meta.current_page} de {meta.last_page} · {meta.total} registros</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40">Anterior</button>
              <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page}
                className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
