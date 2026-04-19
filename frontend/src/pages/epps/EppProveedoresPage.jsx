import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, Edit2, Trash2, Truck, ToggleLeft, ToggleRight } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const EMPTY = { nombre: '', ruc: '', contacto: '', telefono: '', email: '' }

export default function EppProveedoresPage() {
  const navigate          = useNavigate()
  const [rows, setRows]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving]   = useState(false)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/epps/proveedores')
      setRows(Array.isArray(data) ? data : (data.data || []))
    } catch { toast.error('Error al cargar proveedores') }
    finally { setLoading(false) }
  }

  const openNew  = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit = (r) => { setEditing(r.id); setForm({ nombre: r.nombre, ruc: r.ruc||'', contacto: r.contacto||'', telefono: r.telefono||'', email: r.email||'' }); setModal(true) }

  const guardar = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/epps/proveedores/${editing}`, form)
        toast.success('Proveedor actualizado')
      } else {
        await api.post('/epps/proveedores', form)
        toast.success('Proveedor creado')
      }
      setModal(false)
      cargar()
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este proveedor?')) return
    try {
      await api.delete(`/epps/proveedores/${id}`)
      toast.success('Eliminado')
      cargar()
    } catch { toast.error('Error al eliminar') }
  }

  const toggleActivo = async (r) => {
    try {
      await api.put(`/epps/proveedores/${r.id}`, { activo: !r.activo })
      cargar()
    } catch { toast.error('Error') }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proveedores EPP</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión de proveedores de equipos de protección</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => navigate('/epps')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <ArrowLeft size={14} /> EPPs
          </button>
          <button onClick={openNew}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Nombre', 'RUC', 'Contacto', 'Teléfono', 'Email', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                <Truck size={32} className="mx-auto mb-2 text-gray-300" />
                <p>No hay proveedores registrados</p>
              </td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-800">{r.nombre}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.ruc || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{r.contacto || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{r.telefono || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{r.email || '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActivo(r)}>
                    {r.activo ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-gray-400" />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(r)}
                      className="p-1.5 text-gray-400 hover:text-roka-600 hover:bg-roka-50 rounded-lg transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => eliminar(r.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">{editing ? 'Editar proveedor' : 'Nuevo proveedor'}</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={guardar} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RUC</label>
                  <input value={form.ruc} onChange={e => setForm({...form, ruc: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Persona de contacto</label>
                <input value={form.contacto} onChange={e => setForm({...form, contacto: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
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
