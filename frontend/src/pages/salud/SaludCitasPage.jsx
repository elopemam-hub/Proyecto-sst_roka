import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CalendarClock, Search, FileSpreadsheet, RefreshCw,
  CheckCircle, Trash2, X, AlertTriangle, Clock, BarChart2, LayoutList,
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import CitasGantt, { ESTADOS_CITA as ESTADOS, TIPO_LABEL } from '../../components/salud/CitasGantt'

const fmt = (iso) => (iso ? format(parseISO(iso.slice(0, 10)), "dd MMM yyyy", { locale: es }) : '—')

export default function SaludCitasPage() {
  const navigate = useNavigate()

  const [citas, setCitas]     = useState([])
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [citaCerrar, setCitaCerrar] = useState(null)
  const [vista, setVista]     = useState('gantt')   // 'gantt' | 'tabla'

  useEffect(() => { cargar() }, [filtroEstado])

  const cargar = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filtroEstado) params.estado = filtroEstado
      const { data } = await api.get('/salud/citas', { params })
      setCitas(data.citas || [])
      setResumen(data.resumen || null)
    } catch {
      toast.error('Error al cargar la agenda')
    } finally {
      setLoading(false)
    }
  }

  const cambiarEstado = async (cita, estado) => {
    try {
      await api.put(`/salud/citas/${cita.id}`, { estado })
      toast.success('Cita actualizada')
      cargar()
    } catch {
      toast.error('No se pudo actualizar')
    }
  }

  const eliminar = async (cita) => {
    if (!confirm('¿Eliminar esta cita de la agenda?')) return
    try {
      await api.delete(`/salud/citas/${cita.id}`)
      toast.success('Cita eliminada')
      cargar()
    } catch {
      toast.error('No se pudo eliminar')
    }
  }

  const filtradas = citas.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const p = c.personal || {}
    return `${p.apellidos || ''} ${p.nombres || ''}`.toLowerCase().includes(q)
      || String(p.dni || '').includes(q)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/salud')} className="btn-back">
            <ArrowLeft size={14} /> Salud / EMO
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agenda de citas EMO</h1>
            <p className="text-gray-500 text-sm mt-0.5">Exámenes programados pendientes de realizar</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={cargar}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <RefreshCw size={14} /> Actualizar
          </button>
          <button onClick={() => navigate('/salud/importar')}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <FileSpreadsheet size={15} /> Importar agenda
          </button>
        </div>
      </div>

      {/* KPIs */}
      {resumen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Pendientes',    valor: resumen.pendientes,  color: 'text-blue-600' },
            { label: 'Esta semana',   valor: resumen.esta_semana, color: 'text-indigo-600' },
            { label: 'Fecha vencida', valor: resumen.vencidas,    color: resumen.vencidas > 0 ? 'text-red-600' : 'text-gray-400' },
            { label: 'Realizadas',    valor: resumen.realizadas,  color: 'text-emerald-600' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <p className={`text-2xl font-bold ${k.color}`}>{k.valor}</p>
              <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar por nombre o DNI…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        {/* Toggle vista */}
        <div className="flex border border-gray-300 rounded-lg overflow-hidden ml-auto">
          <button onClick={() => setVista('gantt')} title="Cronograma Gantt"
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${vista === 'gantt' ? 'bg-roka-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            <BarChart2 size={13} /> Cronograma
          </button>
          <button onClick={() => setVista('tabla')} title="Vista tabla"
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${vista === 'tabla' ? 'bg-roka-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            <LayoutList size={13} /> Tabla
          </button>
        </div>
      </div>

      {/* Cronograma Gantt */}
      {vista === 'gantt' && (
        loading ? (
          <div className="flex justify-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="w-7 h-7 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <CitasGantt
            citas={filtradas}
            onRealizar={(c) => setCitaCerrar(c)}
            onCambiarEstado={cambiarEstado}
            onEliminar={eliminar}
          />
        )
      )}

      {/* Tabla */}
      {vista === 'tabla' && (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Fecha', 'Hora', 'Trabajador', 'Tipo', 'Clínica', 'Estado', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Cargando…</td></tr>
              ) : filtradas.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16">
                  <CalendarClock size={28} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-gray-500 font-medium">No hay citas en la agenda</p>
                  <p className="text-sm text-gray-400 mt-1">Impórtalas desde Excel o créalas al programar un examen.</p>
                </td></tr>
              ) : filtradas.map(c => {
                const est = ESTADOS[c.estado] || ESTADOS.programada
                const p = c.personal || {}
                return (
                  <tr key={c.id} className={`hover:bg-gray-50 ${c.vencida ? 'bg-red-50/40' : ''}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={c.vencida ? 'text-red-600 font-medium' : 'text-gray-700'}>
                        {fmt(c.fecha_cita)}
                      </span>
                      {c.vencida && (
                        <span title="La fecha ya pasó y la cita sigue abierta" className="ml-1 text-red-500">
                          <AlertTriangle size={12} className="inline -mt-0.5" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {c.hora ? String(c.hora).slice(0, 5) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-800 font-medium">{p.apellidos} {p.nombres}</div>
                      <div className="text-xs text-gray-400 font-mono">{p.dni}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{TIPO_LABEL[c.tipo] || c.tipo}</td>
                    <td className="px-4 py-3 text-gray-500">{c.clinica || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full border ${est.clase}`}>
                        {est.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {['programada', 'confirmada'].includes(c.estado) && (
                          <>
                            <button onClick={() => setCitaCerrar(c)}
                              title="Registrar resultado y cerrar la cita"
                              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                              <CheckCircle size={16} />
                            </button>
                            <button onClick={() => cambiarEstado(c, 'no_asistio')}
                              title="Marcar como no asistió"
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                              <X size={16} />
                            </button>
                          </>
                        )}
                        <button onClick={() => eliminar(c)} title="Eliminar cita"
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {citaCerrar && (
        <ModalRealizar cita={citaCerrar}
          onCerrar={() => setCitaCerrar(null)}
          onHecho={() => { setCitaCerrar(null); cargar() }} />
      )}
    </div>
  )
}

// ── Modal: registrar el resultado y cerrar la cita ────────────────
function ModalRealizar({ cita, onCerrar, onHecho }) {
  const [form, setForm] = useState({
    fecha_examen:      (cita.fecha_cita || '').slice(0, 10),
    fecha_vencimiento: '',
    resultado:         'apto',
    clinica:           cita.clinica || '',
    medico:            cita.medico || '',
    restricciones:     '',
    observaciones:     '',
  })
  const [guardando, setGuardando] = useState(false)
  const p = cita.personal || {}

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    if (form.resultado === 'apto_con_restricciones' && !form.restricciones.trim()) {
      toast.error('Indica las restricciones')
      return
    }
    setGuardando(true)
    try {
      const payload = { ...form }
      if (!payload.fecha_vencimiento) delete payload.fecha_vencimiento
      await api.post(`/salud/citas/${cita.id}/realizar`, payload)
      toast.success('Examen registrado y cita cerrada')
      onHecho()
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo registrar el examen')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={() => !guardando && onCerrar()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <CheckCircle size={17} className="text-emerald-600" /> Registrar examen
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {p.apellidos} {p.nombres} · {TIPO_LABEL[cita.tipo] || cita.tipo}
            </p>
          </div>
          <button onClick={onCerrar} disabled={guardando} className="text-gray-400 hover:text-gray-600 disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fecha del examen *</label>
              <input type="date" value={form.fecha_examen} onChange={e => set('fecha_examen', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Vencimiento</label>
              <input type="date" value={form.fecha_vencimiento} onChange={e => set('fecha_vencimiento', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
              <p className="text-[10px] text-gray-400 mt-1">Vacío = un año después</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Resultado *</label>
            <select value={form.resultado} onChange={e => set('resultado', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
              <option value="apto">Apto</option>
              <option value="apto_con_restricciones">Apto con restricciones</option>
              <option value="no_apto">No apto</option>
            </select>
          </div>

          {form.resultado === 'apto_con_restricciones' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Restricciones *</label>
              <textarea rows={2} value={form.restricciones} onChange={e => set('restricciones', e.target.value)}
                placeholder="Ej: No trabajos en altura"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Clínica</label>
              <input type="text" value={form.clinica} onChange={e => set('clinica', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Médico</label>
              <input type="text" value={form.medico} onChange={e => set('medico', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800 flex items-start gap-1.5">
            <Clock size={13} className="mt-0.5 shrink-0" />
            <span>Al guardar se crea el examen en el historial y la cita queda como realizada.
              A partir de ahí cuenta para el cronograma médico y las alertas de vencimiento.</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <button onClick={onCerrar} disabled={guardando}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando || !form.fecha_examen}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-40">
            {guardando ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle size={15} />}
            {guardando ? 'Guardando…' : 'Registrar examen'}
          </button>
        </div>
      </div>
    </div>
  )
}
