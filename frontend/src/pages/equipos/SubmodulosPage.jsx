import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, Save, X, Layers } from 'lucide-react'
import api from '../../services/api'

const TIPOS_INSPECCION = {
  equipos:        { label: 'Equipos / Pre-operacional', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  infraestructura:{ label: 'Infraestructura / Mensual', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  emergencias:    { label: 'Emergencias',               color: 'bg-red-50 text-red-700 border-red-200' },
}

// Paleta de colores predefinida para selección rápida
const PALETTE = [
  '#6366f1', '#3b82f6', '#0ea5e9', '#14b8a6', '#10b981',
  '#84cc16', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6',
  '#64748b', '#374151',
]

const formVacio = { codigo: '', nombre: '', descripcion: '', color: '#6366f1', tipo_inspeccion: 'equipos', activo: true, orden: 0 }

export default function SubmodulosPage() {
  const navigate = useNavigate()
  const [submodulos, setSubmodulos] = useState([])
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
      const { data } = await api.get('/submodulos')
      setSubmodulos(data)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const abrirNuevo = () => {
    setEditando(null)
    setForm({ ...formVacio, orden: submodulos.length })
    setErrors({})
    setModal(true)
  }

  const abrirEditar = (s) => {
    setEditando(s)
    setForm({
      codigo:          s.codigo,
      nombre:          s.nombre,
      descripcion:     s.descripcion || '',
      color:           s.color || '#6366f1',
      tipo_inspeccion: s.tipo_inspeccion || 'equipos',
      activo:          s.activo,
      orden:           s.orden,
    })
    setErrors({})
    setModal(true)
  }

  const guardar = async () => {
    const e = {}
    if (!form.codigo.trim()) e.codigo = 'Requerido'
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    if (!form.tipo_inspeccion) e.tipo_inspeccion = 'Requerido'
    setErrors(e)
    if (Object.keys(e).length) return

    setSaving(true)
    try {
      if (editando) {
        const { data } = await api.put(`/submodulos/${editando.id}`, form)
        setSubmodulos(prev => prev.map(x => x.id === editando.id ? data : x))
      } else {
        const { data } = await api.post('/submodulos', form)
        setSubmodulos(prev => [...prev, data])
      }
      setModal(false)
    } catch (err) {
      if (err.response?.data?.errors) setErrors(err.response.data.errors)
      else if (err.response?.data?.message) setErrors({ _: err.response.data.message })
    } finally { setSaving(false) }
  }

  const eliminar = async (s) => {
    if (!confirm(`¿Eliminar sub-módulo "${s.codigo} — ${s.nombre}"?`)) return
    try {
      await api.delete(`/submodulos/${s.id}`)
      setSubmodulos(prev => prev.filter(x => x.id !== s.id))
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
        <button onClick={() => navigate('/equipos/catalogo')}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers size={20} className="text-roka-500" />
            Sub-módulos de Inspección
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Agrupa las plantillas de checklist y define el tipo de inspección que generan
          </p>
        </div>
        <button onClick={abrirNuevo}
          className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={15} /> Nuevo sub-módulo
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Código', 'Nombre', 'Tipo de inspección', 'Color', 'Orden', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            ) : submodulos.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <Layers size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">Sin sub-módulos configurados</p>
                  <button onClick={abrirNuevo}
                    className="mt-3 text-roka-500 hover:text-roka-600 text-sm font-medium">
                    + Crear primer sub-módulo
                  </button>
                </td>
              </tr>
            ) : submodulos.map(s => {
              const tipoConfig = TIPOS_INSPECCION[s.tipo_inspeccion]
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-bold font-mono text-sm px-2 py-0.5 rounded border"
                      style={{ borderColor: s.color + '60', color: s.color, backgroundColor: s.color + '15' }}>
                      {s.codigo}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{s.nombre}</div>
                    {s.descripcion && <div className="text-xs text-gray-400 mt-0.5">{s.descripcion}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {tipoConfig && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${tipoConfig.color}`}>
                        {tipoConfig.label}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full border border-gray-200 shadow-sm flex-shrink-0"
                        style={{ backgroundColor: s.color }} />
                      <span className="text-xs font-mono text-gray-400">{s.color}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{s.orden}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => abrirEditar(s)}
                        className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Editar">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => eliminar(s)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded" title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-medium mb-1">¿Cómo funcionan los sub-módulos?</p>
        <ul className="space-y-1 text-xs opacity-90">
          <li>• Cada plantilla de checklist pertenece a un sub-módulo.</li>
          <li>• El <strong>tipo de inspección</strong> del sub-módulo define cómo se clasifica la inspección generada.</li>
          <li>• El <strong>color</strong> se usa en los tabs de la página de catálogo y en las badges del inventario.</li>
          <li>• Los equipos de emergencia se determinan por el tipo <strong>"Emergencias"</strong> — no por el código.</li>
        </ul>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800">
                {editando ? 'Editar sub-módulo' : 'Nuevo sub-módulo'}
              </h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {errors._ && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errors._}</p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Código *</label>
                  <input value={form.codigo} onChange={e => f('codigo', e.target.value.toUpperCase())}
                    maxLength={10} placeholder="Ej: A, B, C, D1…"
                    className={inputCls('codigo')} autoFocus />
                  {errors.codigo && <p className="text-xs text-red-500 mt-1">{errors.codigo}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Orden</label>
                  <input type="number" min="0" value={form.orden} onChange={e => f('orden', parseInt(e.target.value) || 0)}
                    className={inputCls('orden')} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
                <input value={form.nombre} onChange={e => f('nombre', e.target.value)}
                  placeholder="Ej: Pre-operacional, Mensual, Emergencias"
                  className={inputCls('nombre')} />
                {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
                <input value={form.descripcion} onChange={e => f('descripcion', e.target.value)}
                  placeholder="Descripción opcional"
                  className={inputCls('descripcion')} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de inspección *</label>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(TIPOS_INSPECCION).map(([val, { label, color }]) => (
                    <label key={val}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                        form.tipo_inspeccion === val
                          ? color + ' ring-2 ring-offset-1 ring-current'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}>
                      <input type="radio" name="tipo_inspeccion" value={val}
                        checked={form.tipo_inspeccion === val}
                        onChange={() => f('tipo_inspeccion', val)}
                        className="accent-roka-500" />
                      <span className="text-sm font-medium">{label}</span>
                    </label>
                  ))}
                </div>
                {errors.tipo_inspeccion && <p className="text-xs text-red-500 mt-1">{errors.tipo_inspeccion}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Color</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PALETTE.map(c => (
                    <button key={c} type="button"
                      onClick={() => f('color', c)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                        form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.color} onChange={e => f('color', e.target.value)}
                    className="w-10 h-8 rounded border border-gray-300 cursor-pointer p-0.5" />
                  <input type="text" value={form.color} onChange={e => f('color', e.target.value)}
                    placeholder="#6366f1" maxLength={7}
                    className="w-28 border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-roka-500" />
                  <div className="flex-1 h-8 rounded-lg border border-gray-200"
                    style={{ backgroundColor: form.color }} />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.activo} onChange={e => f('activo', e.target.checked)}
                  className="w-4 h-4 rounded accent-roka-500" />
                <span className="text-sm text-gray-700">Activo</span>
              </label>
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
