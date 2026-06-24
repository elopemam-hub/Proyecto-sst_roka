import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Search, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, AlertTriangle, Zap, Eye, Filter,
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format, parseISO, isToday } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_CFG = {
  programada:    { label: 'Programada',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  en_ejecucion:  { label: 'En ejecución',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  ejecutada:     { label: 'Ejecutada',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  con_hallazgos: { label: 'Con hallazgos', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  cerrada:       { label: 'Cerrada',       cls: 'bg-gray-100 text-gray-600 border-gray-200' },
}

export default function InspeccionTablaDiariaPage() {
  const navigate  = useNavigate()
  const anioActual = new Date().getFullYear()
  const mesActual  = new Date().getMonth() + 1

  const [inspecciones, setInspecciones] = useState([])
  const [catalogos, setCatalogos]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [anio, setAnio]     = useState(anioActual)
  const [mes, setMes]       = useState(mesActual)
  const [search, setSearch] = useState('')
  const [filtroEquipo, setFiltroEquipo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [pagina, setPagina] = useState(1)
  const [meta, setMeta]     = useState(null)

  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  useEffect(() => { cargarCatalogos() }, [])
  useEffect(() => { cargar() }, [anio, mes, search, filtroEquipo, filtroEstado, pagina])

  const cargarCatalogos = async () => {
    try {
      const { data } = await api.get('/checklist/equipos', { params: { activos: false } })
      setCatalogos((data || []).filter(c => c.frecuencia_inspeccion === 'diaria'))
    } catch (error) {
      console.error('❌ Error cargando catálogos diarios:', error)
      toast.error('Error al cargar los catálogos de inspección')
    }
  }

  const cargar = async () => {
    setLoading(true)
    try {
      const desde = `${anio}-${String(mes).padStart(2,'0')}-01`
      const hasta = new Date(anio, mes, 0).toISOString().split('T')[0]
      const params = { page: pagina, per_page: 20, fecha_desde: desde, fecha_hasta: hasta }
      if (search)       params.search        = search
      if (filtroEstado) params.estado        = filtroEstado
      if (filtroEquipo) params.equipo_catalogo_id = filtroEquipo

      const { data } = await api.get('/inspecciones/diarias-tabla', { params })
      setInspecciones(data.data || [])
      if (data.last_page) {
        setMeta({ current_page: data.current_page, last_page: data.last_page, total: data.total, from: data.from, to: data.to })
      }
    } catch (error) {
      console.error('❌ Error cargando inspecciones diarias:', error)
      toast.error('No se pudieron cargar las inspecciones diarias')
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
              <Zap size={20} className="text-amber-500"/> Inspecciones Diarias
            </h1>
            <p className="text-gray-500 text-sm">Historial de checklist pre-turno diario</p>
          </div>
        </div>
        {/* Navegador mes/año */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
          <button onClick={() => cambiarMes(-1)} className="p-1 text-gray-400 hover:text-gray-700 rounded">
            <ChevronLeft size={16}/>
          </button>
          <div className="flex gap-1">
            {MESES.map((m, i) => (
              <button key={i} onClick={() => { setMes(i+1); setPagina(1) }}
                className={`w-9 h-7 rounded text-xs font-medium transition-colors ${
                  mes === i+1 ? 'bg-amber-500 text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}>
                {m}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 ml-2 border-l border-gray-200 pl-2">
            <button onClick={() => { setAnio(a => a-1); setPagina(1) }} className="p-1 text-gray-400 hover:text-gray-700"><ChevronLeft size={14}/></button>
            <span className="font-bold text-gray-800 w-12 text-center text-sm">{anio}</span>
            <button onClick={() => { setAnio(a => a+1); setPagina(1) }} className="p-1 text-gray-400 hover:text-gray-700"><ChevronRight size={14}/></button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-48 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <Search size={14} className="text-gray-400"/>
          <input value={search} onChange={e => { setSearch(e.target.value); setPagina(1) }}
            placeholder="Buscar por código o equipo..." className="bg-transparent text-sm text-gray-700 outline-none flex-1"/>
        </div>
        <select value={filtroEquipo} onChange={e => { setFiltroEquipo(e.target.value); setPagina(1) }}
          className="border border-gray-300 text-sm rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400">
          <option value="">Todos los equipos</option>
          {catalogos.map(c => <option key={c.id} value={c.id}>{c.nombre?.replace(' — Inspección diaria pre-turno','').replace(' diaria','')}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPagina(1) }}
          className="border border-gray-300 text-sm rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-amber-50 border-b border-amber-100">
            <tr>
              {['Código','Equipo','Área','Fecha','Turno','Estado','Cumplimiento','Puntaje',''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12">
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto"/>
              </td></tr>
            ) : inspecciones.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                <Zap size={32} className="mx-auto mb-2 text-gray-200"/>
                Sin inspecciones diarias en {MESES[mes-1]} {anio}
              </td></tr>
            ) : inspecciones.map(ins => (
              <tr key={ins.id} onClick={() => navigate(`/inspecciones/${ins.id}`)}
                className="hover:bg-amber-50/40 cursor-pointer transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-amber-600">{ins.codigo}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800 max-w-[180px] truncate">
                    {ins.titulo?.replace(' — Inspección diaria pre-turno','').replace(' diaria - ','·').replace(' diaria','') || ins.titulo}
                  </p>
                </td>
                <td className="px-4 py-3 text-gray-500">{ins.area?.nombre || '—'}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {ins.planificada_para ? format(parseISO(ins.planificada_para), 'dd MMM', { locale: es }) : '—'}
                  {ins.planificada_para && isToday(parseISO(ins.planificada_para)) &&
                    <span className="ml-1 text-amber-600 font-bold text-[10px]">HOY</span>}
                </td>
                <td className="px-4 py-3 text-gray-500 capitalize">{ins.turno || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ESTADO_CFG[ins.estado]?.cls || ''}`}>
                    {ESTADO_CFG[ins.estado]?.label || ins.estado}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {ins.porcentaje_cumplimiento != null
                    ? <span className={`font-bold ${pctColor(ins.porcentaje_cumplimiento)}`}>{Number(ins.porcentaje_cumplimiento).toFixed(0)}%</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {ins.puntaje_obtenido != null ? `${ins.puntaje_obtenido}/${ins.puntaje_total}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className="text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
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
                      className={`w-7 h-7 rounded border text-xs font-medium ${p===pagina?'bg-amber-500 text-white border-amber-500':'border-gray-300 text-gray-600 hover:bg-white'}`}>
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
