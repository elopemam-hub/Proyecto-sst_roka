import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Calendar, CheckCircle2, Clock,
  AlertTriangle, ChevronDown, ChevronRight, ClipboardCheck,
  Package, X, Save, RotateCcw,
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format, parseISO, isPast, isToday } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_CFG = {
  programada:    { label: 'Programada',    cls: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-500' },
  en_ejecucion:  { label: 'En ejecución',  cls: 'bg-amber-50 text-amber-700 border-amber-200',  dot: 'bg-amber-500' },
  ejecutada:     { label: 'Ejecutada',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  con_hallazgos: { label: 'Con hallazgos', cls: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  cerrada:       { label: 'Cerrada',       cls: 'bg-gray-100 text-gray-600 border-gray-200',    dot: 'bg-gray-400' },
}

const FREQ_LABEL = {
  diaria:'Diaria', semanal:'Semanal', mensual:'Mensual',
  trimestral:'Trimestral', semestral:'Semestral', anual:'Anual',
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500 text-gray-800'

// ── Modal de programar ────────────────────────────────────────────────────
function ModalProgramar({ catalogoId, catalogoNombre, onClose, onCreado }) {
  const [personal, setPersonal] = useState([])
  const [areas, setAreas]       = useState([])
  const [saving, setSaving]     = useState(false)
  const [form, setForm] = useState({
    equipo_catalogo_id: catalogoId,
    planificada_para:   new Date(Date.now() + 86400000).toISOString().substring(0, 10),
    inspector_id:       '',
    turno:              'mañana',
    area_id:            '',
    observaciones:      '',
  })

  useEffect(() => {
    api.get('/personal', { params: { per_page: 200 } }).then(({ data }) => setPersonal(data.data || data)).catch(() => {})
    api.get('/areas', { params: { per_page: 1000 } }).then(({ data }) => setAreas(Array.isArray(data) ? data : data.data || [])).catch(() => {})
  }, [])

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const guardar = async () => {
    if (!form.planificada_para) { toast.error('Selecciona una fecha'); return }
    setSaving(true)
    try {
      const { data } = await api.post('/inspecciones/programar-checklist', form)
      toast.success(`Inspección ${data.codigo} programada`)
      onCreado(data)
    } catch (e) { toast.error(e.response?.data?.message || 'Error al programar') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">Programar inspección</h2>
            <p className="text-xs text-gray-400 mt-0.5">{catalogoNombre}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Fecha planificada *</label>
            <input type="date" value={form.planificada_para}
              min={new Date().toISOString().substring(0,10)}
              onChange={e => f('planificada_para', e.target.value)}
              className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Inspector</label>
              <select value={form.inspector_id} onChange={e => f('inspector_id', e.target.value)} className={inp}>
                <option value="">Sin asignar</option>
                {personal.map(p => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Turno</label>
              <select value={form.turno} onChange={e => f('turno', e.target.value)} className={inp}>
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Área</label>
            <select value={form.area_id} onChange={e => f('area_id', e.target.value)} className={inp}>
              <option value="">Sin área</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Observaciones</label>
            <textarea rows={2} value={form.observaciones} onChange={e => f('observaciones', e.target.value)}
              className={inp + ' resize-none'} placeholder="Instrucciones adicionales..." />
          </div>
        </div>
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={guardar} disabled={saving || !form.planificada_para}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40">
            <Save size={14}/> {saving ? 'Programando...' : 'Programar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta de equipo con historial ──────────────────────────────────────
function TarjetaEquipo({ equipo, onProgramar, onEjecutar, navigate }) {
  const [abierto, setAbierto] = useState(false)
  const proxima = equipo.proxima_programada
  const ultima  = equipo.ultima_inspeccion
  const hoy     = new Date().toISOString().substring(0, 10)
  const vencida = proxima && proxima.fecha < hoy
  const hoyMismo = proxima && proxima.fecha === hoy

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => setAbierto(!abierto)}>
        <div className="w-10 h-10 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-center flex-shrink-0">
          <Package size={18} className="text-purple-600"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {equipo.catalogo_codigo && (
              <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{equipo.catalogo_codigo}</span>
            )}
            <h3 className="font-semibold text-gray-800">{equipo.catalogo_nombre}</h3>
            {equipo.frecuencia && (
              <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
                {FREQ_LABEL[equipo.frecuencia] || equipo.frecuencia}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-gray-400">{equipo.total} inspecciones · {equipo.completadas} completadas</span>
            {equipo.pct_prom > 0 && (
              <span className={`text-xs font-semibold ${equipo.pct_prom >= 90 ? 'text-emerald-600' : equipo.pct_prom >= 70 ? 'text-amber-600' : 'text-red-500'}`}>
                {equipo.pct_prom}% promedio
              </span>
            )}
          </div>
        </div>

        {/* Estado de próxima inspección */}
        <div className="flex-shrink-0 text-right">
          {proxima ? (
            <div className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium ${
              vencida ? 'bg-red-50 text-red-700 border-red-200'
              : hoyMismo ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              {vencida ? '⚠ Vencida' : hoyMismo ? '📅 Hoy'  : '📌 Programada'}
              <p className="font-normal mt-0.5">
                {format(parseISO(proxima.fecha), 'dd MMM yyyy', { locale: es })}
              </p>
            </div>
          ) : ultima ? (
            <div className="text-xs text-gray-400 text-right">
              <p className="text-gray-500 font-medium">Última</p>
              <p>{format(parseISO(ultima.fecha), 'dd MMM yyyy', { locale: es })}</p>
            </div>
          ) : (
            <span className="text-xs text-gray-400">Sin inspecciones</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Botón programar */}
          <button
            onClick={e => { e.stopPropagation(); onProgramar(equipo) }}
            className="flex items-center gap-1 text-xs bg-roka-50 hover:bg-roka-100 text-roka-600 border border-roka-200 px-2.5 py-1.5 rounded-lg font-medium transition-colors">
            <Plus size={12}/> Programar
          </button>
          {/* Botón ejecutar si hay programada */}
          {proxima && (
            <button
              onClick={e => { e.stopPropagation(); navigate(`/inspecciones/checklist/${proxima.id}`) }}
              className="flex items-center gap-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1.5 rounded-lg font-medium transition-colors">
              <ClipboardCheck size={12}/> Ejecutar
            </button>
          )}
          {abierto ? <ChevronDown size={15} className="text-gray-400"/> : <ChevronRight size={15} className="text-gray-400"/>}
        </div>
      </div>

      {/* Historial colapsable */}
      {abierto && (
        <div className="border-t border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Código','Fecha','Estado','%','Inspector','Turno','Acción'].map(h => (
                  <th key={h} className="text-left px-4 py-2 text-[11px] font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {equipo.inspecciones.map(ins => {
                const cfg = ESTADO_CFG[ins.estado]
                const venc = ins.estado === 'programada' && ins.fecha < hoy
                return (
                  <tr key={ins.id} className={`hover:bg-gray-50 ${venc ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-2.5">
                      <button onClick={() => navigate(`/inspecciones/${ins.id}`)}
                        className="font-mono text-xs text-roka-600 hover:underline">
                        {ins.codigo}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">
                      {ins.fecha ? format(parseISO(ins.fecha), 'dd MMM yyyy', { locale: es }) : '—'}
                      {venc && <span className="ml-1 text-red-500 text-[10px] font-medium">VENCIDA</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg?.cls || ''}`}>
                        {cfg?.label || ins.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {ins.porcentaje != null ? (
                        <span className={`text-xs font-bold ${ins.porcentaje >= 90 ? 'text-emerald-600' : ins.porcentaje >= 70 ? 'text-amber-600' : 'text-red-500'}`}>
                          {Number(ins.porcentaje).toFixed(1)}%
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{ins.inspector || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-400 capitalize">{ins.turno || '—'}</td>
                    <td className="px-4 py-2.5">
                      {ins.estado === 'programada' && (
                        <button onClick={() => navigate(`/inspecciones/checklist/${ins.id}`)}
                          className="text-xs text-roka-600 hover:text-roka-700 font-medium border border-roka-200 hover:bg-roka-50 px-2 py-0.5 rounded-full">
                          Ejecutar
                        </button>
                      )}
                      {['ejecutada','con_hallazgos','cerrada'].includes(ins.estado) && (
                        <button onClick={() => navigate(`/inspecciones/${ins.id}`)}
                          className="text-xs text-gray-500 hover:text-gray-700 font-medium">
                          Ver
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────
export default function InspeccionProgramarPage() {
  const navigate = useNavigate()
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [busq, setBusq]         = useState('')
  const [modal, setModal]       = useState(null) // { catalogoId, catalogoNombre }
  const [filtroEstado, setFiltroEstado] = useState('todos') // todos|programadas|vencidas

  const cargar = async () => {
    setLoading(true)
    try {
      const { data: d } = await api.get('/inspecciones/programadas-checklist')
      setData(d)
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  const equiposFiltrados = (data?.por_equipo || []).filter(e => {
    if (busq) {
      const q = busq.toLowerCase()
      if (!e.catalogo_nombre?.toLowerCase().includes(q) && !e.catalogo_codigo?.toLowerCase().includes(q)) return false
    }
    if (filtroEstado === 'programadas') return e.programadas > 0
    if (filtroEstado === 'vencidas') {
      const hoy = new Date().toISOString().substring(0, 10)
      return e.proxima_programada && e.proxima_programada.fecha < hoy
    }
    return true
  })

  const totalVencidas = (data?.total_vencidas || 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/inspecciones')} className="btn-back">
            <ArrowLeft size={14}/> Inspecciones
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar size={22} className="text-roka-600"/> Programar Inspecciones
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Agenda y historial de inspecciones por equipo
            </p>
          </div>
        </div>
        <button onClick={cargar}
          className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
          <RotateCcw size={13}/> Actualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Equipos con checklist', val: data?.total_equipos || 0,    color: 'text-purple-600', bg: 'bg-purple-50',  border: 'border-purple-200', icon: Package },
          { label: 'Inspecciones programadas', val: data?.total_programadas || 0, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: Calendar },
          { label: 'Vencidas sin ejecutar', val: totalVencidas,               color: totalVencidas > 0 ? 'text-red-600' : 'text-gray-400', bg: totalVencidas > 0 ? 'bg-red-50' : 'bg-gray-50', border: 'border-red-200', icon: AlertTriangle },
          { label: 'Listas para ejecutar',   val: (data?.total_programadas || 0) - totalVencidas, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 },
        ].map(({ label, val, color, bg, border, icon: Icon }) => (
          <div key={label} className={`${bg} border ${border} rounded-xl p-4 flex items-center gap-3 shadow-sm`}>
            <Icon size={20} className={`${color} flex-shrink-0`}/>
            <div>
              <p className={`text-2xl font-black ${color}`}>{val}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        {/* Buscador */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <input value={busq} onChange={e => setBusq(e.target.value)}
            placeholder="Buscar equipo..."
            className="w-full border border-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500 pr-7"/>
          {busq && <button onClick={() => setBusq('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13}/></button>}
        </div>
        {/* Filtro estado */}
        <div className="flex gap-1">
          {[
            { key:'todos',       label:'Todos' },
            { key:'programadas', label:'Con programada' },
            { key:'vencidas',    label:`⚠ Vencidas${totalVencidas > 0 ? ` (${totalVencidas})` : ''}` },
          ].map(f => (
            <button key={f.key} onClick={() => setFiltroEstado(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filtroEstado === f.key ? 'bg-roka-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de equipos */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-roka-500 border-t-transparent rounded-full animate-spin"/></div>
      ) : equiposFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <Calendar size={40} className="text-gray-200 mx-auto mb-3"/>
          <p className="text-gray-500 font-medium">No hay equipos con inspecciones de checklist</p>
          <p className="text-xs text-gray-400 mt-1">Ejecuta una inspección de checklist desde el módulo de Equipos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {equiposFiltrados.map(equipo => (
            <TarjetaEquipo
              key={equipo.catalogo_id}
              equipo={equipo}
              navigate={navigate}
              onProgramar={e => setModal({ catalogoId: e.catalogo_id, catalogoNombre: e.catalogo_nombre })}
              onEjecutar={id => navigate(`/inspecciones/checklist/${id}`)}
            />
          ))}
        </div>
      )}

      {/* Modal programar */}
      {modal && (
        <ModalProgramar
          catalogoId={modal.catalogoId}
          catalogoNombre={modal.catalogoNombre}
          onClose={() => setModal(null)}
          onCreado={() => { setModal(null); cargar() }}
        />
      )}
    </div>
  )
}
