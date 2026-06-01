import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Users, UserCheck, Car,
  FileX, FileWarning, CreditCard, Clock, Timer, FileSpreadsheet,
} from 'lucide-react'
import api from '../../services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

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
  const [personal, setPersonal]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filtroArea, setFiltroArea]     = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [areas, setAreas]               = useState([])
  const [pagina, setPagina]             = useState(1)
  const [meta, setMeta]                 = useState(null)
  const [stats, setStats]               = useState(null)

  useEffect(() => { cargarAreas(); cargarStats() }, [])
  useEffect(() => { cargar() }, [search, filtroArea, filtroEstado, pagina])

  const cargarAreas = async () => {
    try { const { data } = await api.get('/areas'); setAreas(data.data || data) } catch {}
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
      const { data } = await api.get('/personal', { params })
      const lista = data.data || data
      setPersonal(lista)
      setMeta(data.meta || null)
    } catch {} finally { setLoading(false) }
  }

  const iniciales = (p) => {
    const n = p.nombres?.split(' ')[0] || ''
    const a = p.apellidos?.split(' ')[0] || ''
    return `${n[0] || ''}${a[0] || ''}`.toUpperCase()
  }

  const COLS = [
    'Personal', 'DNI', 'Cargo', 'Área', 'F. Ingreso', 'Contrato',
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
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/personal/${p.id}`)}
                        className="text-xs text-roka-400 hover:text-roka-300 px-2 py-1 rounded hover:bg-slate-700">
                        Ver
                      </button>
                      <button onClick={() => navigate(`/personal/${p.id}/editar`)}
                        className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-700">
                        Editar
                      </button>
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
