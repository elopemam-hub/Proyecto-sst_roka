import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Plus, X } from 'lucide-react'
import api from '../../services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_ACT_COLOR = {
  pendiente:   'bg-gray-100 text-gray-600',
  en_proceso:  'bg-blue-50 text-blue-700',
  completado:  'bg-emerald-50 text-emerald-700',
  vencido:     'bg-red-50 text-red-700',
  cancelado:   'bg-amber-50 text-amber-700',
}

export default function ProgramaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [programa, setPrograma]       = useState(null)
  const [actividades, setActividades] = useState([])
  const [personal, setPersonal]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState(null) // {tipo:'nueva'|'avance', actividad?}
  const [form, setForm]               = useState({})
  const [saving, setSaving]           = useState(false)

  useEffect(() => {
    cargar()
    cargarPersonal()
  }, [id])

  const cargar = async () => {
    setLoading(true)
    try {
      const [{ data: p }, { data: a }] = await Promise.all([
        api.get(`/programa/${id}`),
        api.get(`/programa/${id}/actividades`),
      ])
      setPrograma(p.data || p)
      setActividades(Array.isArray(a) ? a : (a.data || []))
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const cargarPersonal = async () => {
    try {
      const { data } = await api.get('/personal', { params: { per_page: 200 } }).catch(() => ({ data: [] }))
      setPersonal(Array.isArray(data) ? data : (data.data || []))
    } catch { /* silent */ }
  }

  const abrirNueva = () => {
    setForm({ objetivo: '', descripcion: '', responsable_id: '', fecha_inicio: '', fecha_fin: '', presupuesto: '' })
    setModal({ tipo: 'nueva' })
  }

  const abrirAvance = (act) => {
    setForm({ avance: act.avance || 0, observaciones: act.observaciones || '', estado: act.estado || 'en_proceso' })
    setModal({ tipo: 'avance', actividad: act })
  }

  const guardar = async () => {
    setSaving(true)
    try {
      if (modal.tipo === 'nueva') {
        await api.post(`/programa/${id}/actividades`, form)
      } else {
        await api.put(`/programa/actividades/${modal.actividad.id}`, form)
      }
      setModal(null)
      await cargar()
    } catch { /* silent */ } finally { setSaving(false) }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const pct = programa?.porcentaje_cumplimiento ?? 0

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/programa')} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Programa SST {programa?.anio}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_ACT_COLOR[programa?.estado] || 'bg-gray-100 text-gray-600'}`}>
              {programa?.estado}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">{programa?.nombre}</p>
        </div>
        <button onClick={() => navigate(`/programa/${id}/editar`)}
          className="text-sm text-gray-500 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">
          Editar programa
        </button>
      </div>

      {/* Progreso */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Cumplimiento global</span>
          <span className={`text-2xl font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {programa?.objetivo_general && (
          <p className="text-xs text-gray-500 mt-3">{programa.objetivo_general}</p>
        )}
      </div>

      {/* Tabla actividades */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Actividades</h2>
          <button onClick={abrirNueva}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
            <Plus size={14} /> Agregar Actividad
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Objetivo', 'Actividad', 'Responsable', 'Plazo', 'Avance', 'Estado', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {actividades.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">No hay actividades registradas</td></tr>
            ) : actividades.map(act => (
              <tr key={act.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">{act.objetivo || '—'}</td>
                <td className="px-4 py-3 text-gray-800 max-w-xs">{act.descripcion}</td>
                <td className="px-4 py-3 text-gray-500">
                  {personal.find(p => p.id === act.responsable_id)
                    ? `${personal.find(p => p.id === act.responsable_id).nombres} ${personal.find(p => p.id === act.responsable_id).apellidos}`
                    : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {act.fecha_fin ? format(new Date(act.fecha_fin), 'dd MMM yyyy', { locale: es }) : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-roka-500 rounded-full" style={{ width: `${act.avance || 0}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{act.avance || 0}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_ACT_COLOR[act.estado] || 'bg-gray-100 text-gray-600'}`}>
                    {act.estado}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => abrirAvance(act)}
                    className="text-xs text-roka-600 hover:text-roka-700 font-medium">Actualizar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800">
                {modal.tipo === 'nueva' ? 'Nueva Actividad' : 'Actualizar Avance'}
              </h3>
              <button onClick={() => setModal(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            {modal.tipo === 'nueva' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Objetivo</label>
                  <input value={form.objetivo || ''} onChange={e => f('objetivo', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Descripción *</label>
                  <textarea value={form.descripcion || ''} onChange={e => f('descripcion', e.target.value)} rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Responsable</label>
                    <select value={form.responsable_id || ''} onChange={e => f('responsable_id', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
                      <option value="">Sin asignar</option>
                      {personal.map(p => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Presupuesto (S/)</label>
                    <input type="number" value={form.presupuesto || ''} onChange={e => f('presupuesto', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Fecha inicio</label>
                    <input type="date" value={form.fecha_inicio || ''} onChange={e => f('fecha_inicio', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Fecha fin</label>
                    <input type="date" value={form.fecha_fin || ''} onChange={e => f('fecha_fin', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Avance: {form.avance}%</label>
                  <input type="range" min="0" max="100" step="5" value={form.avance || 0}
                    onChange={e => f('avance', parseInt(e.target.value))}
                    className="w-full accent-roka-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                  <select value={form.estado || ''} onChange={e => f('estado', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
                    {Object.entries(ESTADO_ACT_COLOR).map(([k]) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Observaciones</label>
                  <textarea value={form.observaciones || ''} onChange={e => f('observaciones', e.target.value)} rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500 resize-none" />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModal(null)} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="px-4 py-2 bg-roka-500 hover:bg-roka-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
