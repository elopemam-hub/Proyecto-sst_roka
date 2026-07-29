import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  ArrowLeft, Search, Plus, ChevronRight, CheckCircle,
  Clock, XCircle, AlertCircle, Download, LayoutList, BarChart2,
  Edit, Trash2,
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const SEMAFORO = {
  al_dia:     { icon: CheckCircle,  color:'text-emerald-500', bg:'bg-emerald-50',  badge:'bg-emerald-50 text-emerald-700 border-emerald-200',  label:'Al día',      bar:'#10b981' },
  por_vencer: { icon: Clock,        color:'text-amber-500',   bg:'bg-amber-50',    badge:'bg-amber-50   text-amber-700   border-amber-200',    label:'Por vencer',  bar:'#f59e0b' },
  vencido:    { icon: XCircle,      color:'text-red-500',     bg:'bg-red-50',      badge:'bg-red-50     text-red-700     border-red-200',      label:'Vencido',     bar:'#ef4444' },
  sin_examen: { icon: AlertCircle,  color:'text-gray-400',    bg:'bg-gray-100',    badge:'bg-gray-100   text-gray-600   border-gray-200',      label:'Sin examen',  bar:'#d1d5db' },
}
const RESULTADO_LABEL = { apto:'APTO', apto_con_restricciones:'APTO C/R', no_apto:'NO APTO' }
const RESULTADO_COLOR  = {
  apto:'text-emerald-600 bg-emerald-50 border-emerald-200',
  apto_con_restricciones:'text-amber-600 bg-amber-50 border-amber-200',
  no_apto:'text-red-600 bg-red-50 border-red-200',
}
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

// ── Gantt ─────────────────────────────────────────────────────────
function GanttChart({ filas, anio, onVerEmo, onNuevoEmo }) {
  const hoy       = new Date()
  const inicioAnio= new Date(anio, 0, 1)
  const finAnio   = new Date(anio, 11, 31, 23, 59, 59)
  const totalMs   = finAnio - inicioAnio

  const pct = (fecha) =>
    Math.max(0, Math.min(100, ((new Date(fecha) - inicioAnio) / totalMs) * 100))

  const hoyPct = pct(hoy)

  // Anchos de columnas del mes
  const mesWidths = Array.from({ length: 12 }, (_, m) => {
    const ini = new Date(anio, m, 1)
    const fin = new Date(anio, m + 1, 0, 23, 59, 59)
    return ((Math.min(fin, finAnio) - Math.max(ini, inicioAnio)) / totalMs) * 100
  })

  const ROW_H = 44
  const LABEL_W = 220

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ minWidth: 900 }}>

          {/* Cabecera de meses */}
          <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
            <div style={{ width: LABEL_W, minWidth: LABEL_W }}
              className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 flex-shrink-0">
              Trabajador
            </div>
            <div className="flex flex-1 relative">
              {MESES.map((mes, i) => (
                <div key={mes}
                  style={{ width: `${mesWidths[i]}%` }}
                  className="text-center text-[11px] font-semibold text-gray-500 uppercase py-2.5 border-r border-gray-100 last:border-0">
                  {mes}
                </div>
              ))}
            </div>
          </div>

          {/* Filas */}
          <div className="relative">
            {/* Líneas verticales de meses (fondo) */}
            <div className="absolute inset-0 left-0 flex pointer-events-none" style={{ paddingLeft: LABEL_W }}>
              {MESES.map((mes, i) => (
                <div key={mes}
                  style={{ width: `${mesWidths[i]}%` }}
                  className="border-r border-gray-100 last:border-0 h-full" />
              ))}
            </div>

            {/* Línea de HOY */}
            {anio === hoy.getFullYear() && (
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none"
                style={{ left: `calc(${LABEL_W}px + ${hoyPct}% * (100% - ${LABEL_W}px) / 100)` }}>
                <div className="w-px h-full bg-roka-500 opacity-70" />
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-roka-500 text-white text-[9px] font-bold px-1 py-0.5 rounded whitespace-nowrap">
                  Hoy
                </div>
              </div>
            )}

            {filas.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">Sin resultados</div>
            ) : filas.map((r, idx) => {
              const s    = SEMAFORO[r.semaforo] || SEMAFORO.sin_examen
              const Icon = s.icon
              const dias = r.dias_para_vencer

              // Calcular barra Gantt
              let barLeft = null, barWidth = null
              if (r.ultimo_examen && r.fecha_vencimiento) {
                const ini = new Date(r.ultimo_examen)
                const fin = new Date(r.fecha_vencimiento)
                barLeft  = pct(ini)
                barWidth = Math.max(0.5, pct(fin) - barLeft)
              }

              return (
                <div key={r.personal_id}
                  className={`flex items-center border-b border-gray-100 last:border-0 transition-colors hover:bg-gray-50/60 ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
                  style={{ height: ROW_H }}>

                  {/* Etiqueta trabajador */}
                  <div style={{ width: LABEL_W, minWidth: LABEL_W }}
                    className="flex items-center gap-2.5 px-3 border-r border-gray-200 h-full flex-shrink-0 overflow-hidden">
                    <div className={`w-6 h-6 ${s.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon size={12} className={s.color} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate leading-tight">
                        {r.apellidos}, {r.nombres}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">{r.area || '—'}</p>
                    </div>
                  </div>

                  {/* Zona Gantt */}
                  <div className="flex-1 relative h-full flex items-center px-1">
                    {barLeft !== null ? (
                      <div
                        className="absolute rounded-full flex items-center justify-end pr-1.5 cursor-pointer group transition-all hover:brightness-90"
                        style={{
                          left:   `${barLeft}%`,
                          width:  `${barWidth}%`,
                          height: 24,
                          backgroundColor: s.bar,
                          minWidth: 28,
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                        onClick={() => r.emo_id && onVerEmo(r.emo_id)}
                        title={`${r.ultimo_examen ? format(new Date(r.ultimo_examen), 'd MMM yyyy', { locale: es }) : '—'} → ${r.fecha_vencimiento ? format(new Date(r.fecha_vencimiento), 'd MMM yyyy', { locale: es }) : '—'}`}>
                        {/* Etiqueta en la barra */}
                        {barWidth > 8 && (
                          <span className="text-[9px] font-bold text-white opacity-90 ml-2 whitespace-nowrap overflow-hidden">
                            {RESULTADO_LABEL[r.resultado] || ''}
                          </span>
                        )}
                        {/* Tooltip días */}
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-medium px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-lg">
                          {dias != null
                            ? (dias < 0 ? `Vencido hace ${Math.abs(dias)}d` : `Vence en ${dias}d`)
                            : 'Sin fecha de vencimiento'}
                        </div>
                      </div>
                    ) : (
                      /* Sin examen: línea punteada */
                      <div className="w-full h-px border-t-2 border-dashed border-gray-200" />
                    )}

                    {/* Acciones al final de la fila */}
                    <div className="absolute right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 hover:opacity-100 z-10"
                      style={{ top: '50%', transform: 'translateY(-50%)' }}>
                      {r.emo_id && (
                        <button onClick={() => onVerEmo(r.emo_id)}
                          className="p-1 text-gray-400 hover:text-roka-600 hover:bg-white rounded shadow-sm border border-gray-100">
                          <ChevronRight size={11} />
                        </button>
                      )}
                      <button onClick={() => onNuevoEmo(r.personal_id)}
                        className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-white rounded shadow-sm border border-gray-100">
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Días restantes (columna derecha fija) */}
                  <div className="w-16 flex-shrink-0 text-right pr-3">
                    {dias != null ? (
                      <span className={`text-xs font-bold ${dias < 0 ? 'text-red-500' : dias <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {dias < 0 ? `−${Math.abs(dias)}d` : `+${dias}d`}
                      </span>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-5 px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex-wrap">
        {Object.entries(SEMAFORO).map(([k, s]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.bar }} />
            {s.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 ml-2">
          <span className="w-px h-3 bg-roka-500 opacity-70" />
          Hoy
        </span>
        <span className="ml-auto">{filas.length} trabajadores</span>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────
export default function CronogramaMedicoPage() {
  const navigate = useNavigate()
  const user     = useSelector(s => s.auth.user)
  const esAdmin  = user?.rol === 'administrador'
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filtroSemaforo, setFiltro] = useState('')
  const [areas, setAreas]           = useState([])
  const [filtroArea, setFiltroArea] = useState('')
  const [vista, setVista]           = useState('gantt')   // 'tabla' | 'gantt'
  const [anio, setAnio]             = useState(new Date().getFullYear())
  const [eliminando, setEliminando] = useState(null)

  useEffect(() => {
    api.get('/areas', { params: { per_page: 1000 } }).then(r => setAreas(r.data.data || r.data)).catch(() => {})
  }, [])

  useEffect(() => { cargar() }, [filtroArea])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data: d } = await api.get('/salud/cronograma-medico', {
        params: { area_id: filtroArea || undefined },
      })
      setData(d)
    } catch { } finally { setLoading(false) }
  }

  /** Elimina el examen más reciente del trabajador — solo administrador */
  const eliminarExamen = async (r) => {
    const fecha = r.ultimo_examen
      ? format(new Date(r.ultimo_examen), 'd MMM yyyy', { locale: es })
      : 'sin fecha'

    if (!confirm(
      `¿Eliminar el examen del ${fecha} de ${r.apellidos}, ${r.nombres}?\n\n` +
      'Se borra del historial. Si el trabajador tiene exámenes anteriores, ' +
      'el cronograma pasará a mostrar el más reciente de ellos.\n\n' +
      'Esta acción no se puede deshacer.'
    )) return

    setEliminando(r.emo_id)
    try {
      await api.delete(`/salud/${r.emo_id}`)
      toast.success('Examen eliminado')
      await cargar()
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo eliminar el examen')
    } finally {
      setEliminando(null)
    }
  }

  const exportarCSV = () => {
    if (!data?.data) return
    const cols = ['Apellidos','Nombres','DNI','Área','Cargo','Último examen','Vencimiento','Días restantes','Estado','Resultado']
    const rows = filtrados.map(r => [
      r.apellidos, r.nombres, r.dni, r.area || '—', r.cargo || '—',
      r.ultimo_examen ? format(new Date(r.ultimo_examen), 'dd/MM/yyyy') : '—',
      r.fecha_vencimiento ? format(new Date(r.fecha_vencimiento), 'dd/MM/yyyy') : '—',
      r.dias_para_vencer ?? '—',
      SEMAFORO[r.semaforo]?.label || r.semaforo,
      RESULTADO_LABEL[r.resultado] || '—',
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))
    const blob = new Blob([cols.join(',') + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `cronograma_medico_${new Date().toISOString().split('T')[0]}.csv`; a.click()
    URL.revokeObjectURL(a.href)
  }

  const lista    = data?.data || []
  const filtrados = lista.filter(r => {
    const ok1 = !filtroSemaforo || r.semaforo === filtroSemaforo
    const ok2 = !search || `${r.nombres} ${r.apellidos} ${r.dni}`.toLowerCase().includes(search.toLowerCase())
    return ok1 && ok2
  })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/salud')} className="btn-back">
            <ArrowLeft size={14} /> Salud
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cronograma médico</h1>
            <p className="text-gray-500 text-sm mt-0.5">Estado de exámenes médicos por trabajador</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportarCSV}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <Download size={14} /> Exportar
          </button>
          <button onClick={() => navigate('/salud/nuevo')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={15} /> Nuevo examen
          </button>
        </div>
      </div>

      {/* KPIs semáforo */}
      {data?.totales && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(SEMAFORO).map(([key, s]) => {
            const Icon = s.icon
            return (
              <button key={key}
                onClick={() => setFiltro(filtroSemaforo === key ? '' : key)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${filtroSemaforo === key ? 'border-roka-500 bg-roka-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon size={18} className={s.color} />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-800">{data.totales[key] || 0}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Barra de controles */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar trabajador..."
            className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
        </div>
        <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todas las áreas</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
        {filtroSemaforo && (
          <button onClick={() => setFiltro('')}
            className="text-xs text-gray-500 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50">
            Limpiar filtro
          </button>
        )}

        {/* Selector año (solo Gantt) */}
        {vista === 'gantt' && (
          <div className="flex items-center gap-1 border border-gray-300 rounded-lg overflow-hidden">
            <button onClick={() => setAnio(a => a - 1)}
              className="px-2.5 py-2 text-gray-500 hover:bg-gray-100 text-sm">‹</button>
            <span className="px-2 text-sm font-bold text-gray-700">{anio}</span>
            <button onClick={() => setAnio(a => a + 1)}
              className="px-2.5 py-2 text-gray-500 hover:bg-gray-100 text-sm">›</button>
          </div>
        )}

        {/* Toggle vista */}
        <div className="flex border border-gray-300 rounded-lg overflow-hidden ml-auto">
          <button onClick={() => setVista('gantt')}
            title="Vista Gantt"
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${vista === 'gantt' ? 'bg-roka-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            <BarChart2 size={13} /> Gantt
          </button>
          <button onClick={() => setVista('tabla')}
            title="Vista tabla"
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${vista === 'tabla' ? 'bg-roka-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            <LayoutList size={13} /> Tabla
          </button>
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex justify-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="w-7 h-7 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : vista === 'gantt' ? (
        <GanttChart
          filas={filtrados}
          anio={anio}
          onVerEmo={(id) => navigate(`/salud/${id}`)}
          onNuevoEmo={(pid) => navigate(`/salud/nuevo?personal_id=${pid}`)}
        />
      ) : (
        /* ── Vista tabla ── */
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {filtrados.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Sin resultados</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Estado','Trabajador','Área / Cargo','Último examen','Vencimiento','Días','Resultado','Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map(r => {
                  const s = SEMAFORO[r.semaforo] || SEMAFORO.sin_examen
                  const Icon = s.icon
                  const dias = r.dias_para_vencer
                  return (
                    <tr key={r.personal_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className={`w-8 h-8 ${s.bg} rounded-xl flex items-center justify-center`}>
                          <Icon size={15} className={s.color} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{r.apellidos}, {r.nombres}</p>
                        <p className="text-xs text-gray-400 font-mono">{r.dni}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        <p>{r.area || '—'}</p>
                        <p className="text-gray-400">{r.cargo || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {r.ultimo_examen ? format(new Date(r.ultimo_examen), 'd MMM yyyy', { locale: es }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {r.fecha_vencimiento ? format(new Date(r.fecha_vencimiento), 'd MMM yyyy', { locale: es }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {dias != null ? (
                          <span className={`text-xs font-bold ${dias < 0 ? 'text-red-500' : dias <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {dias < 0 ? `−${Math.abs(dias)}d` : `+${dias}d`}
                          </span>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r.resultado ? (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${RESULTADO_COLOR[r.resultado]}`}>
                            {RESULTADO_LABEL[r.resultado]}
                          </span>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {r.emo_id && (
                            <button onClick={() => navigate(`/salud/${r.emo_id}`)}
                              title="Ver detalle del examen"
                              className="p-1.5 text-gray-400 hover:text-roka-600 hover:bg-roka-50 rounded-lg">
                              <ChevronRight size={14} />
                            </button>
                          )}

                          {/* Modificar / Eliminar — solo administrador y si hay examen */}
                          {esAdmin && r.emo_id && (
                            <>
                              <button onClick={() => navigate(`/salud/${r.emo_id}/editar`)}
                                title="Modificar examen"
                                className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg">
                                <Edit size={14} />
                              </button>
                              <button onClick={() => eliminarExamen(r)}
                                disabled={eliminando === r.emo_id}
                                title="Eliminar examen"
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40">
                                {eliminando === r.emo_id
                                  ? <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                                  : <Trash2 size={14} />}
                              </button>
                            </>
                          )}

                          <button onClick={() => navigate(`/salud/nuevo?personal_id=${r.personal_id}`)}
                            title="Registrar nuevo examen"
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                            <Plus size={14} />
                          </button>
                          <button onClick={() => navigate(`/salud/certificado/${r.personal_id}`)}
                            title="Certificado de aptitud"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                            <Download size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 text-right">{filtrados.length} trabajadores mostrados</p>
    </div>
  )
}
