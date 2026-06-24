import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Search, ChevronLeft, ChevronRight,
  ClipboardList, Eye, Plus, Calendar,
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_CFG = {
  programada:    { label: 'Programada',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  en_ejecucion:  { label: 'En ejecución',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  ejecutada:     { label: 'Ejecutada',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  con_hallazgos: { label: 'Con hallazgos', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  cerrada:       { label: 'Cerrada',       cls: 'bg-gray-100 text-gray-600 border-gray-200' },
}

const TIPOS = { equipos: 'Equipos', infraestructura: 'Infraestructura', emergencias: 'Emergencias', general: 'General' }

export default function InspeccionTablaMensualPage() {
  const navigate   = useNavigate()
  const anioActual = new Date().getFullYear()
  const mesActual  = new Date().getMonth() + 1

  const [inspecciones, setInspecciones] = useState([])
  const [loading, setLoading]   = useState(true)
  const [anio, setAnio]         = useState(anioActual)
  const [mes, setMes]           = useState(mesActual)
  const [search, setSearch]     = useState('')
  const [filtroTipo, setFiltroTipo]   = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [pagina, setPagina]     = useState(1)
  const [meta, setMeta]         = useState(null)
  const [stats, setStats]       = useState(null)

  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  useEffect(() => { cargar() }, [anio, mes, search, filtroTipo, filtroEstado, pagina])

  const cargar = async () => {
    setLoading(true)
    try {
      const desde = `${anio}-${String(mes).padStart(2,'0')}-01`
      const hasta = new Date(anio, mes, 0).toISOString().split('T')[0]
      const params = {
        page: pagina, per_page: 20,
        fecha_desde: desde, fecha_hasta: hasta,
        tipo_frecuencia: 'mensual',   // excluir diarias
      }
      if (search)       params.search = search
      if (filtroTipo)   params.tipo   = filtroTipo
      if (filtroEstado) params.estado = filtroEstado

      const { data } = await api.get('/inspecciones/mensuales-tabla', { params })
      setInspecciones(data.data || [])
      if (data.last_page) {
        setMeta({ current_page: data.current_page, last_page: data.last_page, total: data.total, from: data.from, to: data.to })
      }
      // Stats del mes
      const cerradas = (data.data || []).filter(i => ['cerrada','ejecutada','con_hallazgos'].includes(i.estado)).length
      const total    = data.total || 0
      const pcts     = (data.data || []).map(i => i.porcentaje_cumplimiento).filter(v => v != null)
      setStats({
        total,
        cerradas,
        cumplimiento: pcts.length ? Math.round(pcts.reduce((a,b) => a+b, 0) / pcts.length) : null,
      })
    } catch (error) {
      console.error('❌ Error cargando inspecciones mensuales:', error)
      toast.error('No se pudieron cargar las inspecciones mensuales')
    } finally { setLoading(false) }
  }

  const cambiarMes = (d) => {
    let m = mes + d, a = anio
    if (m < 1)  { m = 12; a-- }
    if (m > 12) { m = 1;  a++ }
    setMes(m); setAnio(a); setPagina(1)
  }

  const pctColor = v => v >= 90 ? 'text-emerald-600' : v >= 70 ? 'text-amber-600' : 'text-red-500'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-back">
            <ArrowLeft size={14}/> Atrás
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList size={20} className="text-roka-500"/> Inspecciones Mensuales
            </h1>
            <p className="text-gray-500 text-sm">Checklist periódico de equipos, infraestructura y emergencias</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Navegador mes/año */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
            <button onClick={() => cambiarMes(-1)} className="p-1 text-gray-400 hover:text-gray-700"><ChevronLeft size={16}/></button>
            <div className="flex gap-1">
              {MESES.map((m, i) => (
                <button key={i} onClick={() => { setMes(i+1); setPagina(1) }}
                  className={`w-9 h-7 rounded text-xs font-medium transition-colors ${
                    mes === i+1 ? 'bg-roka-500 text-white' : 'text-gray-500 hover:bg-gray-100'
                  }`}>
                  {m}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 ml-2 border-l border-gray-200 pl-2">
              <button onClick={() => { setAnio(a=>a-1); setPagina(1) }} className="p-1 text-gray-400 hover:text-gray-700"><ChevronLeft size={14}/></button>
              <span className="font-bold text-gray-800 w-12 text-center text-sm">{anio}</span>
              <button onClick={() => { setAnio(a=>a+1); setPagina(1) }} className="p-1 text-gray-400 hover:text-gray-700"><ChevronRight size={14}/></button>
            </div>
          </div>
          <button onClick={() => navigate('/inspecciones/checklist/nueva')}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold">
            <Plus size={15}/> Nueva
          </button>
        </div>
      </div>

      {/* KPIs del mes */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <ClipboardList size={20} className="text-roka-500"/>
            <div>
              <p className="text-2xl font-black text-gray-800">{stats.total}</p>
              <p className="text-xs text-gray-500">Total {MESES[mes-1]} {anio}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <Calendar size={20} className="text-emerald-500"/>
            <div>
              <p className="text-2xl font-black text-emerald-600">{stats.cerradas}</p>
              <p className="text-xs text-gray-500">Ejecutadas</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <ClipboardList size={20} className={stats.cumplimiento >= 90 ? 'text-emerald-500' : stats.cumplimiento >= 70 ? 'text-amber-500' : 'text-red-400'}/>
            <div>
              <p className={`text-2xl font-black ${pctColor(stats.cumplimiento ?? 0)}`}>
                {stats.cumplimiento != null ? `${stats.cumplimiento}%` : '—'}
              </p>
              <p className="text-xs text-gray-500">% Cumplimiento</p>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-48 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <Search size={14} className="text-gray-400"/>
          <input value={search} onChange={e => { setSearch(e.target.value); setPagina(1) }}
            placeholder="Buscar por código o título..." className="bg-transparent text-sm text-gray-700 outline-none flex-1"/>
        </div>
        <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPagina(1) }}
          className="border border-gray-300 text-sm rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todos los tipos</option>
          {Object.entries(TIPOS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPagina(1) }}
          className="border border-gray-300 text-sm rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Código','Tipo','Título','Área','Fecha planificada','Estado','Cumplimiento','Hallazgos',''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12">
                <div className="w-6 h-6 border-2 border-roka-400 border-t-transparent rounded-full animate-spin mx-auto"/>
              </td></tr>
            ) : inspecciones.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                <ClipboardList size={32} className="mx-auto mb-2 text-gray-200"/>
                Sin inspecciones mensuales en {MESES[mes-1]} {anio}
              </td></tr>
            ) : inspecciones.map(ins => (
              <tr key={ins.id} onClick={() => navigate(`/inspecciones/${ins.id}`)}
                className="hover:bg-gray-50 cursor-pointer transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-roka-600">{ins.codigo}</td>
                <td className="px-4 py-3 text-gray-500">{TIPOS[ins.tipo] || ins.tipo}</td>
                <td className="px-4 py-3 font-medium text-gray-800 max-w-[200px] truncate">{ins.titulo}</td>
                <td className="px-4 py-3 text-gray-500">{ins.area?.nombre || '—'}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {ins.planificada_para ? format(parseISO(ins.planificada_para), 'dd MMM yyyy', { locale: es }) : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ESTADO_CFG[ins.estado]?.cls || ''}`}>
                    {ESTADO_CFG[ins.estado]?.label || ins.estado}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {ins.porcentaje_cumplimiento != null
                    ? <span className={`font-bold ${pctColor(ins.porcentaje_cumplimiento)}`}>{Number(ins.porcentaje_cumplimiento).toFixed(1)}%</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  {ins.hallazgos_count > 0
                    ? <span className="text-orange-600 font-medium">{ins.hallazgos_count}</span>
                    : <span className="text-gray-300">0</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="text-roka-600 hover:text-roka-700 font-medium flex items-center gap-1">
                    <Eye size={13}/> Ver
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paginación */}
        {meta && (
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between bg-gray-50 text-xs">
            <span className="text-gray-500">
              {meta.total > 0 ? `Mostrando ${meta.from}–${meta.to} de ${meta.total}` : '0 registros'}
            </span>
            {meta.last_page > 1 && (
              <div className="flex items-center gap-1">
                <button disabled={pagina<=1} onClick={() => setPagina(1)} className="px-2 py-1 rounded border border-gray-300 text-gray-500 disabled:opacity-30 hover:bg-white">«</button>
                <button disabled={pagina<=1} onClick={() => setPagina(p=>p-1)} className="px-2 py-1 rounded border border-gray-300 text-gray-500 disabled:opacity-30 hover:bg-white">‹</button>
                {Array.from({length: Math.min(meta.last_page, 5)}, (_, i) => {
                  const p = Math.max(1, Math.min(meta.last_page-4, pagina-2)) + i
                  return p <= meta.last_page ? (
                    <button key={p} onClick={() => setPagina(p)}
                      className={`w-7 h-7 rounded border text-xs font-medium ${p===pagina?'bg-roka-500 text-white border-roka-500':'border-gray-300 text-gray-600 hover:bg-white'}`}>
                      {p}
                    </button>
                  ) : null
                })}
                <button disabled={pagina>=meta.last_page} onClick={() => setPagina(p=>p+1)} className="px-2 py-1 rounded border border-gray-300 text-gray-500 disabled:opacity-30 hover:bg-white">›</button>
                <button disabled={pagina>=meta.last_page} onClick={() => setPagina(meta.last_page)} className="px-2 py-1 rounded border border-gray-300 text-gray-500 disabled:opacity-30 hover:bg-white">»</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
