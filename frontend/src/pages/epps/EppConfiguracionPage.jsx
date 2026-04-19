import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, Edit2, Trash2, Settings, ToggleLeft, ToggleRight } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const EMPTY = { nombre: '', requiere_talla: false, color: '' }

const COLORES = [
  { value: 'blue',   label: 'Azul',     cls: 'bg-blue-500'   },
  { value: 'green',  label: 'Verde',    cls: 'bg-green-500'  },
  { value: 'yellow', label: 'Amarillo', cls: 'bg-yellow-500' },
  { value: 'orange', label: 'Naranja',  cls: 'bg-orange-500' },
  { value: 'red',    label: 'Rojo',     cls: 'bg-red-500'    },
  { value: 'purple', label: 'Morado',   cls: 'bg-purple-500' },
  { value: 'gray',   label: 'Gris',     cls: 'bg-gray-500'   },
]

export default function EppConfiguracionPage() {
  const navigate          = useNavigate()
  const [cats, setCats]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving]   = useState(false)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/epps/categorias')
      setCats(Array.isArray(data) ? data : [])
    } catch { toast.error('Error al cargar') }
    finally { setLoading(false) }
  }

  const openNew  = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit = (c) => { setEditing(c.id); setForm({ nombre: c.nombre, requiere_talla: !!c.requiere_talla, color: c.color || '' }); setModal(true) }

  const guardar = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/epps/categorias/${editing}`, form)
        toast.success('Categoría actualizada')
      } else {
        await api.post('/epps/categorias', form)
        toast.success('Categoría creada')
      }
      setModal(false)
      cargar()
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar esta categoría? Asegúrate de que no tenga EPPs asociados.')) return
    try {
      await api.delete(`/epps/categorias/${id}`)
      toast.success('Eliminada')
      cargar()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error al eliminar')
    }
  }

  const toggleActiva = async (c) => {
    try {
      await api.put(`/epps/categorias/${c.id}`, { activa: !c.activa })
      cargar()
    } catch { toast.error('Error') }
  }

  const colorCls = (val) => COLORES.find(c => c.value === val)?.cls || 'bg-gray-400'

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración EPPs</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión de categorías de equipos de protección</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => navigate('/epps')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <ArrowLeft size={14} /> EPPs
          </button>
          <button onClick={openNew}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Nueva Categoría
          </button>
        </div>
      </div>

      {/* Categorías */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <Settings size={16} className="text-roka-500" />
          <h2 className="font-semibold text-gray-800">Categorías de EPP</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Color', 'Nombre', 'Requiere Talla', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            ) : cats.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">
                <Settings size={32} className="mx-auto mb-2 text-gray-300" />
                <p>No hay categorías registradas</p>
              </td></tr>
            ) : cats.map(c => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <span className={`inline-block w-5 h-5 rounded-full ${colorCls(c.color)}`} />
                </td>
                <td className="px-4 py-3 font-medium text-gray-800">{c.nombre}</td>
                <td className="px-4 py-3 text-gray-600">{c.requiere_talla ? 'Sí' : 'No'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActiva(c)}>
                    {c.activa ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-gray-400" />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(c)}
                      className="p-1.5 text-gray-400 hover:text-roka-600 hover:bg-roka-50 rounded-lg transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => eliminar(c.id)}
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

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">{editing ? 'Editar categoría' : 'Nueva categoría'}</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={guardar} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                  placeholder="Ej: Protección craneal"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORES.map(cl => (
                    <button key={cl.value} type="button"
                      onClick={() => setForm({...form, color: cl.value})}
                      className={`w-7 h-7 rounded-full ${cl.cls} transition-transform ${form.color === cl.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                      title={cl.label}
                    />
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.requiere_talla} onChange={e => setForm({...form, requiere_talla: e.target.checked})}
                  className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-700">Requiere talla</span>
              </label>
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
