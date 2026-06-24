import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Plus, Search, Users, UserCheck, Car,
  FileX, FileWarning, CreditCard, Clock, Timer, FileSpreadsheet, Trash2,
  AlertTriangle, AlertCircle, ChevronDown, ChevronUp, Bell,
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Cuadro de alertas ────────────────────────────────────────────────────────
const TIPO_CFG = {
  dni_vencido:        { label: 'DNI Vencido',              color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    icon: FileX },
  dni_por_vencer:     { label: 'DNI Por vencer',           color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  icon: CreditCard },
  licencia_vencida:   { label: 'Licencia vencida',         color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    icon: Car },
  licencia_por_vencer:{ label: 'Licencia próx. a vencer',  color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  icon: Car },
}

function CuadroAlertas({ navigate }) {
  const [data, setData]       = useState(null)
  const [abierto, setAbierto] = useState(true)
  const [filtro, setFiltro]   = useState('todos')

  useEffect(() => {
    api.get('/personal/alertas').then(({ data }) => setData(data)).catch(() => {})
  }, [])

  if (!data || data.total === 0) return null

  const alertasFiltradas = filtro === 'todos'
    ? data.alertas
    : data.alertas.filter(a => a.nivel === filtro || a.tipo === filtro)

  return (
    <div className="bg-slate-800 rounded-xl border border-amber-500/30 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setAbierto(!abierto)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell size={18} className="text-amber-400" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {data.total}
            </span>
          </div>
          <span className="text-sm font-semibold text-white">Alertas de vencimiento</span>
          <div className="flex gap-2">
            {data.criticos > 0 && (
              <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-medium">
                {data.criticos} crítico{data.criticos !== 1 ? 's' : ''}
              </span>
            )}
            {data.advertencias > 0 && (
              <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                {data.advertencias} advertencia{data.advertencias !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        {abierto ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
      </button>

      {abierto && (
        <div className="border-t border-slate-700">
          {/* Filtros */}
          <div className="flex gap-2 px-4 py-2 border-b border-slate-700 flex-wrap">
            {[
              { key: 'todos',             label: `Todos (${data.total})` },
              { key: 'critico',           label: `Críticos (${data.criticos})` },
              { key: 'advertencia',       label: `Advertencias (${data.advertencias})` },
              { key: 'dni_vencido',       label: 'DNI Vencido' },
              { key: 'licencia_vencida',  label: 'Lic. Vencida' },
            ].map(f => (
              <button key={f.key} onClick={() => setFiltro(f.key)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  filtro === f.key
                    ? 'bg-roka-500 text-white border-roka-500'
                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Tabla de alertas */}
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-800 border-b border-slate-700">
                <tr>
                  {['Trabajador','Área','Alerta','Fecha','Días',''].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-[10px] font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {alertasFiltradas.map((a, i) => {
                  const cfg  = TIPO_CFG[a.tipo]
                  const Icon = cfg?.icon || AlertCircle
                  const esVencido = a.nivel === 'critico'
                  return (
                    <tr key={i} className={`hover:bg-slate-700/30 ${esVencido ? 'bg-red-500/5' : ''}`}>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-slate-200">{a.nombres} {a.apellidos}</p>
                        <p className="text-slate-500 text-[10px]">{a.cargo || '—'}</p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">{a.area || '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${cfg?.bg} ${cfg?.color} ${cfg?.border}`}>
                          <Icon size={10}/> {a.descripcion}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 font-mono">
                        {a.fecha ? format(parseISO(a.fecha), 'dd/MM/yyyy') : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {esVencido ? (
                          <span className="text-red-400 font-bold">Vencido</span>
                        ) : (
                          <span className="text-amber-400 font-semibold">{Math.round(a.dias)}d</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => navigate(`/personal/${a.id}/editar`)}
                          className="text-roka-400 hover:text-roka-300 font-medium">
                          Actualizar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const ESTADOS = {
  activo:     { label: 'Activo',     color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  inactivo:   { label: 'Inactivo',   color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  vacaciones: { label: 'Vacaciones', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  licencia:   { label: 'Licencia',   color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
}

const CONTRATOS = {
  indefinido: 'Indefinido', plazo_fijo: 'Plazo fijo', por_obra: 'Por obra',
  part_time: 'Part time', honorarios: 'Honorarios', practicante: 'Practicante',
}

function diasVencimiento(fecha) {
  if (!fecha) return null
  return Math.ceil((new Date(fecha) - new Date()) / 86400000)
}

export default function PersonalListPage() {
  const navigate = useNavigate()
  const user     = useSelector(s => s.auth.user)
  const esAdmin  = user?.rol === 'administrador'
  const [personal, setPersonal]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filtroArea, setFiltroArea]     = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTipo, setFiltroTipo]     = useState('')
  const [areas, setAreas]               = useState([])
  const [pagina, setPagina]             = useState(1)
  const [meta, setMeta]                 = useState(null)
  const [stats, setStats]               = useState(null)

  useEffect(() => { cargarAreas(); cargarStats() }, [])
  useEffect(() => { cargar() }, [search, filtroArea, filtroEstado, filtroTipo, pagina])

  const cargarAreas = async () => {
    try { const { data } = await api.get('/areas', { params: { per_page: 1000 } }); setAreas(data.data || data) } catch {}
  }

  const cargarStats = async () => {
    try { const { data } = await api.get('/personal/estadisticas'); setStats(data) } catch {}
  }

  const cargar = async () => {
    setLoading(true)
    try {
      const params = { page: pagina, per_page: 20 }
      if (search)       params.search  = search
      if (filtroArea)   params.area_id = filtroArea
      if (filtroEstado) params.estado  = filtroEstado
      if (filtroTipo)   params.tipo_trabajador = filtroTipo
      const { data } = await api.get('/personal', { params })
      const lista = data.data || data
      setPersonal(lista)
      setMeta(data.meta || null)
    } catch {} finally { setLoading(false) }
  }

  const eliminar = async (p) => {
    if (!window.confirm(`¿Eliminar a "${p.nombres} ${p.apellidos}"? Esta acción no se puede deshacer.`)) return
    try {
      await api.delete(`/personal/${p.id}`)
      toast.success('Personal eliminado')
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al eliminar')
    }
  }

  const iniciales = (p) => {
    const n = p.nombres?.split(' ')[0] || ''
    const a = p.apellidos?.split(' ')[0] || ''
    return `${n[0] || ''}${a[0] || ''}`.toUpperCase()
  }

  const COLS = [
    'Personal', 'DNI', 'Tipo', 'Cargo', 'Área', 'F. Ingreso', 'Contrato',
    'Teléfono', 'Licencia', 'Estado', 'Acciones',
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestión Humana</h1>
          <p className="text-slate-400 text-sm mt-1">Personal activo · Ley 29783</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/personal/importar')}
            className="flex items-center gap-2 border border-slate-600 text-slate-300 hover:bg-slate-700 px-3 py-2 rounded-lg text-sm transition-colors">
            <FileSpreadsheet size={15} /> Importar / Exportar
          </button>
          <button onClick={() => navigate('/personal/nuevo')}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Nuevo Personal
          </button>
        </div>
      </div>

      {/* Cuadro de alertas */}
      <CuadroAlertas navigate={navigate} />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: 'Total Personal',
            valor: stats?.total ?? '—',
            icon: Users,
            iconBg: 'bg-roka-500/15',
            iconColor: 'text-roka-400',
            valColor: 'text-white',
            border: 'border-slate-700',
          },
          {
            label: 'Activos',
            valor: stats?.activos ?? '—',
            icon: UserCheck,
            iconBg: 'bg-emerald-500/15',
            iconColor: 'text-emerald-400',
            valColor: 'text-emerald-300',
            border: 'border-emerald-500/20',
          },
          {
            label: 'DNI Vencido',
            valor: stats?.dni_vencidos ?? '—',
            icon: FileX,
            iconBg: 'bg-emerald-500/15',
            iconColor: 'text-emerald-400',
            valColor: stats?.dni_vencidos > 0 ? 'text-red-300' : 'text-white',
            border: stats?.dni_vencidos > 0 ? 'border-red-500/30' : 'border-slate-700',
          },
          {
            label: 'DNI Por vencer',
            valor: stats?.dni_por_vencer ?? '—',
            icon: CreditCard,
            iconBg: 'bg-emerald-500/15',
            iconColor: 'text-emerald-400',
            valColor: stats?.dni_por_vencer > 0 ? 'text-amber-300' : 'text-white',
            border: stats?.dni_por_vencer > 0 ? 'border-amber-500/25' : 'border-slate-700',
            sub: '≤ 30 días',
          },
          {
            label: 'Licencia vencida',
            valor: stats?.licencias_vencidas ?? '—',
            icon: FileX,
            iconBg: 'bg-emerald-500/15',
            iconColor: 'text-emerald-400',
            valColor: stats?.licencias_vencidas > 0 ? 'text-red-300' : 'text-white',
            border: stats?.licencias_vencidas > 0 ? 'border-red-500/30' : 'border-slate-700',
            sub: 'Conducir',
          },
          {
            label: 'Licencia x vencer',
            valor: stats?.licencias_por_vencer ?? '—',
            icon: Timer,
            iconBg: 'bg-emerald-500/15',
            iconColor: 'text-emerald-400',
            valColor: stats?.licencias_por_vencer > 0 ? 'text-amber-300' : 'text-white',
            border: stats?.licencias_por_vencer > 0 ? 'border-amber-500/25' : 'border-slate-700',
            sub: '≤ 30 días',
          },
        ].map(({ label, valor, icon: Icon, iconBg, iconColor, valColor, border, sub }) => (
          <div key={label} className={`bg-slate-800 rounded-xl p-3.5 border ${border} transition-all`}>
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon size={17} className={iconColor} />
              </div>
              <div className="min-w-0">
                <p className={`text-xl font-bold leading-tight ${valColor}`}>{valor}</p>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{label}</p>
                {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-48 bg-slate-900 rounded-lg px-3 py-2">
          <Search size={16} className="text-slate-500" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPagina(1) }}
            placeholder="Buscar por nombre o DNI..."
            className="bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none flex-1" />
        </div>
        <select value={filtroArea} onChange={e => { setFiltroArea(e.target.value); setPagina(1) }}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2">
          <option value="">Todas las áreas</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPagina(1) }}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPagina(1) }}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2">
          <option value="">Todos los tipos</option>
          <option value="interno">Personal Interno</option>
          <option value="tercero">Terceros / Proveedores</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              {COLS.map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {loading ? (
              <tr><td colSpan={COLS.length} className="text-center py-12 text-slate-500">Cargando...</td></tr>
            ) : personal.length === 0 ? (
              <tr><td colSpan={COLS.length} className="text-center py-12 text-slate-500">No se encontró personal</td></tr>
            ) : personal.map(p => {
              const diasLic = diasVencimiento(p.licencia_vencimiento)
              return (
                <tr key={p.id} className="hover:bg-slate-700/50 transition-colors">

                  {/* Personal */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-roka-500/20 text-roka-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {iniciales(p)}
                      </div>
                      <div>
                        <p className="text-slate-200 font-medium whitespace-nowrap">{p.nombres} {p.apellidos}</p>
                        <p className="text-xs text-slate-500">{p.email || ''}</p>
                      </div>
                    </div>
                  </td>

                  {/* DNI */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-mono text-xs text-slate-400">{p.dni}</p>
                    {p.dni_vencimiento && (() => {
                      const d = diasVencimiento(p.dni_vencimiento)
                      if (d < 0)   return <p className="text-[10px] text-red-400">⚠ Venc. hace {Math.abs(d)}d</p>
                      if (d <= 30) return <p className="text-[10px] text-amber-400">⚠ Vence en {d}d</p>
                      return null
                    })()}
                  </td>

                  {/* Tipo de Trabajador */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {p.tipo_trabajador === 'tercero' ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Tercero
                        </span>
                        {p.empresa_tercera && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[120px]" title={p.empresa_tercera}>
                            {p.empresa_tercera}
                          </span>
                        )}
                        {p.vigencia_hasta && (() => {
                          const d = diasVencimiento(p.vigencia_hasta)
                          if (d < 0)   return <span className="text-[10px] text-red-400 font-medium">⚠ Vencido</span>
                          if (d <= 30) return <span className="text-[10px] text-amber-400 font-medium">⚠ Vence en {d}d</span>
                          return <span className="text-[10px] text-emerald-400">✓ Vigente</span>
                        })()}
                      </div>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Interno
                      </span>
                    )}
                  </td>

                  {/* Cargo */}
                  <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                    {p.cargo?.nombre || p.cargo || '—'}
                  </td>

                  {/* Área */}
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                    {p.area?.nombre || '—'}
                  </td>

                  {/* Fecha de ingreso */}
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {p.fecha_ingreso
                      ? format(new Date(p.fecha_ingreso), 'd MMM yyyy', { locale: es })
                      : '—'}
                  </td>

                  {/* Contrato */}
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {CONTRATOS[p.tipo_contrato] || p.tipo_contrato || '—'}
                  </td>

                  {/* Teléfono */}
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {p.telefono || '—'}
                  </td>

                  {/* Licencia de conducir */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {p.licencia_conducir ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <Car size={11} className="text-slate-400 flex-shrink-0" />
                          <span className="text-xs font-mono text-slate-300">{p.licencia_conducir}</span>
                          {p.licencia_categoria && (
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-medium">
                              {p.licencia_categoria}
                            </span>
                          )}
                        </div>
                        {p.licencia_vencimiento && (
                          <span className={`text-[10px] font-medium ${
                            diasLic < 0  ? 'text-red-400' :
                            diasLic <= 30 ? 'text-amber-400' : 'text-slate-500'
                          }`}>
                            {diasLic < 0
                              ? `⚠ Vencida hace ${Math.abs(diasLic)}d`
                              : diasLic <= 30
                              ? `⚠ Vence en ${diasLic}d`
                              : `Vence: ${format(new Date(p.licencia_vencimiento), 'd MMM yyyy', { locale: es })}`}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full border ${ESTADOS[p.estado]?.color || ESTADOS.activo.color}`}>
                      {ESTADOS[p.estado]?.label || p.estado}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3">
                    <div className="flex gap-2 items-center">
                      <button onClick={() => navigate(`/personal/${p.id}`)}
                        className="text-xs text-roka-400 hover:text-roka-300 px-2 py-1 rounded hover:bg-slate-700">
                        Ver
                      </button>
                      <button onClick={() => navigate(`/personal/${p.id}/editar`)}
                        className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-700">
                        Editar
                      </button>
                      {esAdmin && (
                        <button onClick={() => eliminar(p)}
                          title="Eliminar personal"
                          className="text-xs text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-900/30 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Paginación */}
        {meta && meta.last_page > 1 && (
          <div className="border-t border-slate-700 px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-slate-400">Mostrando {meta.from}–{meta.to} de {meta.total}</span>
            <div className="flex gap-2">
              <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}
                className="px-3 py-1 rounded bg-slate-700 text-slate-300 disabled:opacity-40">Anterior</button>
              <button disabled={pagina === meta.last_page} onClick={() => setPagina(p => p + 1)}
                className="px-3 py-1 rounded bg-slate-700 text-slate-300 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
