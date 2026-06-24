import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, Save, X, Tag } from 'lucide-react'
import api from '../../services/api'

const ICONOS_SUGERIDOS = [
  'wrench', 'hammer', 'gauge', 'zap', 'truck', 'flame',
  'shield-alert', 'package', 'settings', 'activity', 'box',
]

const formVacio = { nombre: '', descripcion: '', icono: '', activo: true, orden: 0 }

export default function EquipoTiposPage() {
  const navigate = useNavigate()
  const [tipos, setTipos]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(false)
  const [editando, setEditando]     = useState(null)
  const [form, setForm]             = useState(formVacio)
  const [errors, setErrors]         = useState({})
  const [saving, setSaving]         = useState(false)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/equipos-tipos')
      setTipos(data)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const abrirNuevo = () => {
    setEditando(null)
    setForm(formVacio)
    setErrors({})
    setModal(true)
  }

  const abrirEditar = (t) => {
    setEditando(t)
    setForm({ nombre: t.nombre, descripcion: t.descripcion || '', icono: t.icono || '', activo: t.activo, orden: t.orden })
    setErrors({})
    setModal(true)
  }

  const guardar = async () => {
    if (!form.nombre.trim()) { setErrors({ nombre: 'Requerido' }); return }
    setSaving(true)
    try {
      if (editando) {
        const { data } = await api.put(`/equipos-tipos/${editando.id}`, form)
        setTipos(t => t.map(x => x.id === editando.id ? data : x))
      } else {
        const { data } = await api.post('/equipos-tipos', form)
        setTipos(t => [...t, data])
      }
      setModal(false)
    } catch (err) {
      if (err.response?.data?.errors) setErrors(err.response.data.errors)
    } finally { setSaving(false) }
  }

  const eliminar = async (t) => {
    if (!confirm(`¿Eliminar el tipo "${t.nombre}"?`)) return
    try {
      await api.delete(`/equipos-tipos/${t.id}`)
      setTipos(prev => prev.filter(x => x.id !== t.id))
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar')
    }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const inputCls = (k) =>
    `w-full border ${errors[k] ? 'border-red-400' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-roka-500`

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/equipos')}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Tipos de Equipo</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Categorías específicas de activos físicos de tu empresa
          </p>
        </div>
        <button onClick={abrirNuevo}
          className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={15} /> Nuevo tipo
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Orden', 'Nombre', 'Descripción', 'Icono', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            ) : tipos.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16">
                  <Tag size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">Sin tipos de equipo</p>
                  <p className="text-gray-400 text-xs mt-1">Crea el primer tipo para organizar tu inventario</p>
                  <button onClick={abrirNuevo}
                    className="mt-3 text-roka-500 hover:text-roka-600 text-sm font-medium">
                    + Crear primer tipo
                  </button>
                </td>
              </tr>
            ) : tipos.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400 text-xs font-mono">{t.orden}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{t.nombre}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{t.descripcion || '—'}</td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{t.icono || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    t.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {t.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => abrirEditar(t)}
                      className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Editar">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => eliminar(t)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded" title="Eliminar">
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800">
                {editando ? 'Editar tipo' : 'Nuevo tipo de equipo'}
              </h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
                <input value={form.nombre} onChange={e => f('nombre', e.target.value)}
                  className={inputCls('nombre')} placeholder="Ej: Montacargas Toyota, Extintor CO2 6kg" autoFocus />
                {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
                <input value={form.descripcion} onChange={e => f('descripcion', e.target.value)}
                  className={inputCls('descripcion')} placeholder="Descripción opcional" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Icono (nombre Lucide)</label>
                <input value={form.icono} onChange={e => f('icono', e.target.value)}
                  className={inputCls('icono')} placeholder="wrench, flame, truck…" />
                <div className="flex flex-wrap gap-1 mt-2">
                  {ICONOS_SUGERIDOS.map(ic => (
                    <button key={ic} type="button"
                      onClick={() => f('icono', ic)}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                        form.icono === ic
                          ? 'bg-roka-500 text-white border-roka-500'
                          : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Orden</label>
                  <input type="number" min="0" value={form.orden} onChange={e => f('orden', parseInt(e.target.value) || 0)}
                    className={inputCls('orden')} />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.activo} onChange={e => f('activo', e.target.checked)}
                      className="w-4 h-4 rounded accent-roka-500" />
                    <span className="text-sm text-gray-700">Activo</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-roka-500 hover:bg-roka-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                <Save size={14} /> {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
