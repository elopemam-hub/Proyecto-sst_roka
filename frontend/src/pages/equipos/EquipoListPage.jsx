import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Wrench, CheckCircle2, AlertTriangle, Clock,
  LayoutList, BookOpen, ClipboardList, ClipboardCheck,
  ShieldAlert, Search, X, MapPin, FileText, QrCode, Printer, Tag, CalendarClock, Trash2,
} from 'lucide-react'
import api from '../../services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import QrModal from '../../components/qr/QrModal'

const TIPOS = {
  maquinaria: 'Maquinaria', herramienta: 'Herramienta',
  instrumento: 'Instrumento', equipo_medicion: 'Eq. medición',
  electrico: 'Eléctrico', vehiculo: 'Vehículo',
  extintor: 'Extintor', emergencias: 'Emergencias', otro: 'Otro',
}
const ESTADOS = {
  operativo:     { label: 'Operativo',     color: 'bg-emerald-50 text-emerald-700' },
  mantenimiento: { label: 'Mantenimiento', color: 'bg-amber-50 text-amber-700' },
  baja:          { label: 'Baja',          color: 'bg-red-50 text-red-700' },
  inactivo:      { label: 'Inactivo',      color: 'bg-gray-100 text-gray-500' },
}
const FREC_BADGE = {
  diaria:     { label: 'D',  title: 'Diaria',      color: 'bg-red-100 text-red-700 border-red-200' },
  semanal:    { label: 'S',  title: 'Semanal',     color: 'bg-orange-100 text-orange-700 border-orange-200' },
  mensual:    { label: 'M',  title: 'Mensual',     color: 'bg-blue-100 text-blue-700 border-blue-200' },
  trimestral: { label: 'T',  title: 'Trimestral',  color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  semestral:  { label: '6M', title: 'Semestral',   color: 'bg-purple-100 text-purple-700 border-purple-200' },
  anual:      { label: 'A',  title: 'Anual',       color: 'bg-gray-100 text-gray-600 border-gray-200' },
}

// Badges con nombre completo para la columna de frecuencia
const FREC_PILL = {
  diaria:     { label: 'Diaria',      color: 'bg-red-50 text-red-700 border-red-200' },
  semanal:    { label: 'Semanal',     color: 'bg-orange-50 text-orange-700 border-orange-200' },
  mensual:    { label: 'Mensual',     color: 'bg-blue-50 text-blue-700 border-blue-200' },
  trimestral: { label: 'Trimestral',  color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  semestral:  { label: 'Semestral',   color: 'bg-purple-50 text-purple-700 border-purple-200' },
  anual:      { label: 'Anual',       color: 'bg-gray-100 text-gray-600 border-gray-200' },
}

const fechaColor = (fecha) => {
  if (!fecha) return 'text-gray-400'
  const dias = Math.ceil((new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24))
  if (dias < 0)   return 'text-red-600 font-semibold'
  if (dias <= 30) return 'text-amber-600 font-semibold'
  return 'text-gray-700'
}

/** Dropdown de selección de plantilla para "Inspeccionar" */
function InspeccionarBtn({ plantillas, navigate }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (plantillas.length === 0) return null

  if (plantillas.length === 1) {
    return (
      <button
        onClick={() => navigate(`/inspecciones/checklist/nueva?catalogo_id=${plantillas[0].id}`)}
        className="inline-flex items-center gap-1 text-xs text-roka-600 hover:text-roka-700 font-medium border border-roka-200 hover:border-roka-400 bg-roka-50 hover:bg-roka-100 px-2 py-0.5 rounded-full transition-colors"
        title={`Inspeccionar — ${plantillas[0].nombre}`}>
        <ClipboardCheck size={11} /> Inspeccionar
      </button>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 text-xs text-roka-600 hover:text-roka-700 font-medium border border-roka-200 hover:border-roka-400 bg-roka-50 hover:bg-roka-100 px-2 py-0.5 rounded-full transition-colors">
        <ClipboardCheck size={11} /> Inspeccionar ▾
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl border border-gray-200 shadow-lg min-w-[200px] py-1">
          <p className="text-[10px] text-gray-400 px-3 pt-1 pb-1.5 uppercase font-medium">Seleccionar plantilla</p>
          {plantillas.map(p => {
            const frec = p.pivot?.frecuencia_inspeccion  // frecuencia de la asignación (pivot)
            const badge = FREC_BADGE[frec]
            return (
              <button key={p.id}
                onClick={() => {
                  setOpen(false)
                  navigate(`/inspecciones/checklist/nueva?catalogo_id=${p.id}`)
                }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-roka-50 transition-colors">
                {badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.color}`}>
                    {badge.label}
                  </span>
                )}
                <span className="text-gray-700">{p.nombre}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function EquipoListPage() {
  const navigate = useNavigate()
  const [equipos, setEquipos] = useState([])
  const [stats, setStats]     = useState(null)
  const [areas, setAreas]     = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo]               = useState('')
  const [filtroEstado, setFiltroEstado]           = useState('')
  const [filtroArea, setFiltroArea]               = useState('')
  const [filtroFrecuencias, setFiltroFrecuencias] = useState([])
  const [busqueda, setBusqueda]                   = useState('')
  const [pagina, setPagina]                       = useState(1)
  const [meta, setMeta]                           = useState(null)
  const [qrEquipoId, setQrEquipoId]               = useState(null)

  const toggleFrecuencia = (frec) =>
    setFiltroFrecuencias(prev =>
      prev.includes(frec) ? prev.filter(f => f !== frec) : [...prev, frec]
    )

  // Filtrado por frecuencia — derivado en tiempo real sin efecto asíncrono
  const equiposFiltrados = useMemo(() => {
    if (filtroFrecuencias.length === 0) return equipos
    return equipos.filter(e => {
      const freqs = (e.plantillas || []).map(p => p.pivot?.frecuencia_inspeccion).filter(Boolean)
      return filtroFrecuencias.every(f => freqs.includes(f))
    })
  }, [equipos, filtroFrecuencias])

  useEffect(() => { setPagina(1) }, [filtroTipo, filtroEstado, filtroArea, busqueda])
  useEffect(() => { cargar() }, [filtroTipo, filtroEstado, filtroArea, busqueda, pagina])
  useEffect(() => { cargarStats(); cargarAreas() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const params = { per_page: 15, page: pagina }
      if (filtroTipo)   params.tipo    = filtroTipo
      if (filtroEstado) params.estado  = filtroEstado
      if (filtroArea)   params.area_id = filtroArea
      if (busqueda.trim()) params.search = busqueda.trim()
      const { data } = await api.get('/equipos', { params })
      setEquipos(data.data || [])
      if (data.last_page) {
        setMeta({ current_page: data.current_page, last_page: data.last_page, total: data.total, from: data.from, to: data.to })
      } else {
        setMeta(null)
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const cargarStats = async () => {
    try {
      const { data } = await api.get('/equipos/estadisticas')
      setStats(data)
    } catch { /* silent */ }
  }

  const cargarAreas = async () => {
    try {
      const { data } = await api.get('/areas', { params: { per_page: 1000 } }).catch(() => ({ data: [] }))
      setAreas(Array.isArray(data) ? data : (data.data || []))
    } catch { /* silent */ }
  }

  const eliminar = async (equipo) => {
    if (!confirm(`¿Eliminar "${equipo.nombre}"?\nEsta acción no se puede deshacer.`)) return
    try {
      await api.delete(`/equipos/${equipo.id}`)
      cargar()
      cargarStats()
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar el equipo')
    }
  }

  const imprimirTodasEtiquetas = async () => {
    try {
      const { data } = await api.get('/equipos/todas-etiquetas', { responseType: 'text' })
      const blob = new Blob([data], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const w = window.open(url, '_blank')
      if (!w) alert('Por favor, permite ventanas emergentes para imprimir')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch {
      alert('Error al generar etiquetas')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipos</h1>
          <p className="text-gray-500 text-sm mt-1">Control de equipos, maquinaria e instrumentos</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button onClick={() => navigate('/equipos/programa')}
            className="flex items-center gap-2 border border-roka-300 text-roka-600 hover:bg-roka-50 px-3 py-2 rounded-lg text-sm font-medium">
            <CalendarClock size={14} /> Programa
          </button>
          <button onClick={() => navigate('/equipos/tipos')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <Tag size={14} /> Tipos de equipo
          </button>
          <button onClick={() => navigate('/equipos/catalogo')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <BookOpen size={14} /> Plantillas checklist
          </button>
          <button onClick={() => navigate('/equipos/preguntas')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <ClipboardList size={14} /> Banco de preguntas
          </button>
          <button onClick={() => navigate('/equipos/inventario')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <LayoutList size={15} /> Inventario por tipo
          </button>
          <button onClick={() => navigate('/equipos/inventario-area')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <MapPin size={15} /> Inventario por área
          </button>
          <button onClick={() => navigate('/equipos/certificados')}
            className="flex items-center gap-2 border border-purple-300 text-purple-600 hover:bg-purple-50 px-3 py-2 rounded-lg text-sm font-medium">
            <FileText size={15} /> Certificados
          </button>
          <button onClick={() => navigate('/equipos/emergencia')}
            className="flex items-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-medium">
            <ShieldAlert size={15} /> Inventario Emergencia
          </button>
          <button onClick={imprimirTodasEtiquetas}
            className="flex items-center gap-2 border border-blue-300 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm font-medium">
            <Printer size={15} /> Imprimir Etiquetas
          </button>
          <button onClick={() => navigate('/equipos/nuevo')}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Nuevo Equipo
          </button>
        </div>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total equipos',     valor: stats.total,           icon: Wrench,        color: 'text-gray-700',    bg: 'bg-gray-100' },
            { label: 'Operativos',        valor: stats.operativos,      icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'En mantenimiento',  valor: stats.mantenimiento,   icon: AlertTriangle, color: 'text-amber-600',   bg: 'bg-amber-50' },
            { label: 'Próx. calibración', valor: stats.proxCalibracion, icon: Clock,         color: 'text-blue-600',    bg: 'bg-blue-50' },
          ].map(({ label, valor, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon size={18} className={color} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${color}`}>{valor ?? 0}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por código o nombre..."
            className="w-full border border-gray-300 text-gray-700 text-sm rounded-lg pl-8 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todos los tipos</option>
          {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)}
          className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todas las áreas</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
        <div className="flex items-center gap-1.5 flex-wrap">
          {Object.entries(FREC_PILL).map(([k, v]) => {
            const activo = filtroFrecuencias.includes(k)
            return (
              <button key={k} onClick={() => toggleFrecuencia(k)}
                className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${
                  activo ? `${v.color} ring-2 ring-offset-1 ring-current` : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
                }`}>
                {v.label}
              </button>
            )
          })}
        </div>
        {(busqueda || filtroTipo || filtroEstado || filtroArea || filtroFrecuencias.length > 0) && (
          <button
            onClick={() => { setBusqueda(''); setFiltroTipo(''); setFiltroEstado(''); setFiltroArea(''); setFiltroFrecuencias([]) }}
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Código', 'Nombre / Tipo', 'Checklist', 'Frecuencia inspección', 'Área', 'Últ. mantenimiento', 'Próx. calibración', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            ) : equiposFiltrados.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">No se encontraron equipos</td></tr>
            ) : equiposFiltrados.map(e => {
              const plantillas = e.plantillas || []
              // Frecuencias únicas asignadas a este equipo (desde el pivot)
              const frecuencias = [...new Set(
                plantillas.map(p => p.pivot?.frecuencia_inspeccion).filter(Boolean)
              )]
              return (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{e.codigo || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{e.nombre}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-gray-400">{TIPOS[e.tipo] || e.tipo || '—'}</span>
                      {e.equipo_tipo && (
                        <>
                          <span className="text-gray-200">·</span>
                          <span className="text-xs text-gray-500">{e.equipo_tipo.nombre}</span>
                        </>
                      )}
                    </div>
                  </td>

                  {/* Columna Checklist — nombre de plantillas asignadas */}
                  <td className="px-4 py-3">
                    {plantillas.length === 0 ? (
                      <span className="text-xs text-gray-300">Sin checklist</span>
                    ) : (
                      <div className="space-y-0.5">
                        {plantillas.map(p => (
                          <div key={p.id} className="text-xs text-gray-600 truncate max-w-[160px]" title={p.nombre}>
                            {p.codigo
                              ? <span className="font-mono text-gray-400 mr-1">{p.codigo}</span>
                              : null}
                            {p.nombre}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Columna Frecuencia de inspección */}
                  <td className="px-4 py-3">
                    {frecuencias.length === 0 ? (
                      <span className="text-xs text-gray-300">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {frecuencias.map(frec => {
                          const pill = FREC_PILL[frec]
                          return pill ? (
                            <span key={frec}
                              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${pill.color}`}>
                              {pill.label}
                            </span>
                          ) : null
                        })}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 text-gray-500">{e.area?.nombre || '—'}</td>
                  <td className={`px-4 py-3 ${fechaColor(e.fecha_ultimo_mantenimiento)}`}>
                    {e.fecha_ultimo_mantenimiento
                      ? format(new Date(e.fecha_ultimo_mantenimiento), 'dd MMM yyyy', { locale: es })
                      : '—'}
                  </td>
                  <td className={`px-4 py-3 ${fechaColor(e.fecha_proxima_calibracion)}`}>
                    {e.fecha_proxima_calibracion
                      ? format(new Date(e.fecha_proxima_calibracion), 'dd MMM yyyy', { locale: es })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADOS[e.estado]?.color || 'bg-gray-100 text-gray-600'}`}>
                      {ESTADOS[e.estado]?.label || e.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setQrEquipoId(e.id)}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium border border-blue-200 hover:border-blue-400 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-full transition-colors"
                        title="Ver código QR">
                        <QrCode size={11} /> QR
                      </button>
                      <button onClick={() => navigate(`/equipos/${e.id}/editar`)}
                        className="text-xs text-gray-500 hover:text-gray-700 font-medium">
                        Editar
                      </button>
                      <InspeccionarBtn plantillas={plantillas} navigate={navigate} />
                      <button onClick={() => eliminar(e)}
                        className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar equipo">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Paginación */}
        {meta && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              {meta.total > 0 ? `Mostrando ${meta.from}–${meta.to} de ${meta.total} equipos` : 'Sin resultados'}
            </p>
            <div className="flex items-center gap-1">
              <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100 text-gray-600 transition-colors">
                ← Anterior
              </button>
              {Array.from({ length: meta.last_page }, (_, i) => i + 1)
                .filter(p => p === 1 || p === meta.last_page || Math.abs(p - pagina) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) => p === '...'
                  ? <span key={`e${i}`} className="px-2 text-xs text-gray-400">…</span>
                  : <button key={p} onClick={() => setPagina(p)}
                      className={`w-8 h-7 text-xs rounded-lg border transition-colors ${pagina === p ? 'bg-roka-500 text-white border-roka-500' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}>
                      {p}
                    </button>
                )}
              <button disabled={pagina === meta.last_page} onClick={() => setPagina(p => p + 1)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100 text-gray-600 transition-colors">
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Modal QR */}
      {qrEquipoId && (
        <QrModal equipoId={qrEquipoId} onClose={() => setQrEquipoId(null)} />
      )}
    </div>
  )
}
