import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, GraduationCap } from 'lucide-react'
import api from '../../services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const EMPTY = { tema: '', instructor: '', fecha: '', categoria_id: '', num_participantes: '', evidencia_url: '', observaciones: '' }

export default function EppCapacitacionPage() {
  const navigate           = useNavigate()
  const [rows, setRows]    = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]  = useState(false)
  const [form, setForm]    = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    cargar()
    api.get('/epps/categorias').then(({ data }) => setCategorias(Array.isArray(data) ? data : [])).catch(() => {})
  }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/epps/capacitaciones-epp')
      setRows(data.data || (Array.isArray(data) ? data : []))
    } catch { toast.error('Error al cargar capacitaciones') }
    finally { setLoading(false) }
  }

  const guardar = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/epps/capacitaciones-epp', form)
      toast.success('Capacitación registrada')
      setModal(false)
      setForm(EMPTY)
      cargar()
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Capacitación y Uso Correcto</h1>
          <p className="text-gray-500 text-sm mt-1">Registro de capacitaciones sobre uso correcto de EPPs</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => navigate('/epps')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <ArrowLeft size={14} /> EPPs
          </button>
          <button onClick={() => { setForm(EMPTY); setModal(true) }}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Nueva Capacitación
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Tema', 'Categoría EPP', 'Instructor', 'Fecha', 'Participantes', 'Evidencia'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                <GraduationCap size={32} className="mx-auto mb-2 text-gray-300" />
                <p>No hay capacitaciones registradas</p>
              </td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-800 max-w-xs truncate">{r.tema}</td>
                <td className="px-4 py-3 text-gray-600">{r.categoria_nombre || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{r.instructor || '—'}</td>
                <td className="px-4 py-3 text-gray-600">
                  {r.fecha ? format(new Date(r.fecha + 'T00:00:00'), 'dd MMM yyyy', { locale: es }) : '—'}
                </td>
                <td className="px-4 py-3 text-center text-gray-700 font-medium">{r.num_participantes || 0}</td>
                <td className="px-4 py-3">
                  {r.evidencia_url ? (
                    <a href={r.evidencia_url} target="_blank" rel="noreferrer"
                      className="text-xs text-roka-600 hover:underline">Ver evidencia</a>
                  ) : <span className="text-gray-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Nueva capacitación EPP</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={guardar} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tema *</label>
                <input required value={form.tema} onChange={e => setForm({...form, tema: e.target.value})}
                  placeholder="Ej: Uso correcto de casco de seguridad"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría EPP</label>
                  <select value={form.categoria_id} onChange={e => setForm({...form, categoria_id: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
                    <option value="">— Todas —</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                  <input type="date" required value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
                  <input value={form.instructor} onChange={e => setForm({...form, instructor: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° participantes</label>
                  <input type="number" min="0" value={form.num_participantes} onChange={e => setForm({...form, num_participantes: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Evidencia</label>
                <input type="url" value={form.evidencia_url} onChange={e => setForm({...form, evidencia_url: e.target.value})}
                  placeholder="https://..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})}
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-roka-500 hover:bg-roka-600 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
