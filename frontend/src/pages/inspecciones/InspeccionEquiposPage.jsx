import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Power, Wrench, Search, ArrowLeft, Trash2 } from 'lucide-react'
import api from '../../services/api'

const SUBMOD_COLOR = {
  A: 'bg-blue-100 text-blue-700 border-blue-200',
  B: 'bg-teal-100 text-teal-700 border-teal-200',
  C: 'bg-red-100 text-red-700 border-red-200',
}

const EMPTY = { submodulo_id: '', nombre: '', codigo: '', descripcion: '', requiere_operador: false, orden: 0, frecuencia_inspeccion: 'mensual' }

const FRECUENCIAS = [
  { value: 'diaria',      label: '📅 Diaria',      color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'semanal',     label: '📆 Semanal',     color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'mensual',     label: '🗓️ Mensual',     color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'trimestral',  label: '📋 Trimestral',  color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'semestral',   label: '📊 Semestral',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'anual',       label: '📈 Anual',       color: 'bg-gray-100 text-gray-600 border-gray-300' },
]

export default function InspeccionEquiposPage() {
  const navigate = useNavigate()
  const [submodulos, setSubmodulos] = useState([])
  const [equipos, setEquipos]       = useState([])
  const [tabSub, setTabSub]         = useState('A')
  const [busq, setBusq]             = useState('')
  const [modal, setModal]           = useState(false)
  const [form, setForm]             = useState(EMPTY)
  const [editId, setEditId]         = useState(null)
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    api.get('/checklist/submodulos').then(({ data }) => setSubmodulos(data)).catch(() => {})
    cargar()
  }, [])

  const cargar = () => {
    api.get('/checklist/inventario-resumen').then(({ data }) => setEquipos(data)).catch(() => {
      api.get('/checklist/equipos?activos=false').then(({ data }) => setEquipos(data)).catch(() => {})
    })
  }

  const subActual = submodulos.find(s => s.codigo === tabSub)

  const equiposFiltrados = equipos.filter(e =>
    e.submodulo?.codigo === tabSub &&
    (!busq || e.nombre.toLowerCase().includes(busq.toLowerCase()) || e.codigo?.toLowerCase().includes(busq.toLowerCase()))
  )

  const abrirNuevo = () => {
    setForm({ ...EMPTY, submodulo_id: subActual?.id || '' })
    setEditId(null)
    setModal(true)
  }

  const abrirEditar = (e) => {
    setForm({
      submodulo_id: e.submodulo_id, nombre: e.nombre, codigo: e.codigo || '',
      descripcion: e.descripcion || '', requiere_operador: e.requiere_operador, orden: e.orden,
      frecuencia_inspeccion: e.frecuencia_inspeccion || 'mensual',
    })
    setEditId(e.id)
    setModal(true)
  }

  const guardar = async () => {
    if (!form.nombre || !form.submodulo_id) return
    setSaving(true)
    try {
      if (editId) {
        await api.put(`/checklist/equipos/${editId}`, form)
      } else {
        await api.post('/checklist/equipos', form)
      }
      cargar()
      setModal(false)
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const toggle = async (e) => {
    await api.patch(`/checklist/equipos/${e.id}/toggle`).catch(() => {})
    cargar()
  }

  const eliminar = async (e) => {
    if (!window.confirm(`¿Eliminar "${e.nombre}" y todas sus preguntas? Esta acción no se puede deshacer.`)) return
    try {
      await api.delete(`/checklist/equipos/${e.id}`)
      cargar()
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar el equipo')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/equipos')}
            className="btn-back">
            <ArrowLeft size={14} /> Equipos
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Catálogo de Tipos de Equipo</h1>
            <p className="text-gray-500 text-sm mt-1">Tipos de equipo con checklist de inspección · Sub-módulos A·B·C</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/equipos/preguntas')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm transition-colors">
            <Wrench size={14} /> Banco de preguntas
          </button>
          <button onClick={abrirNuevo}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Nuevo tipo
          </button>
        </div>
      </div>

      {/* Tabs sub-módulo */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex border-b border-gray-200 px-4 pt-4 gap-2">
          {submodulos.map(s => (
            <button key={s.codigo}
              onClick={() => setTabSub(s.codigo)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors -mb-px ${
                tabSub === s.codigo
                  ? 'border-roka-500 text-roka-600 bg-roka-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              Sub-módulo {s.codigo} — {s.nombre}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4">
          {/* Búsqueda */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 max-w-xs">
            <Search size={14} className="text-gray-400" />
            <input value={busq} onChange={e => setBusq(e.target.value)}
              placeholder="Buscar equipo..."
              className="bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400 flex-1" />
          </div>

          {/* Tabla */}
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Código', 'Nombre', 'Frecuencia', 'Req. Operador', 'N° Preguntas', 'Orden', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {equiposFiltrados.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Sin equipos en este sub-módulo</td></tr>
              ) : equiposFiltrados.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.codigo || '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{e.nombre}</td>
                  <td className="px-4 py-3">
                    {(() => {
                      const fr = FRECUENCIAS.find(f => f.value === e.frecuencia_inspeccion) || FRECUENCIAS[2]
                      return (
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${fr.color}`}>
                          {fr.label}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      e.requiere_operador ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                    }`}>
                      {e.requiere_operador ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <span>{e.preguntas_count ?? '—'}</span>
                    {e.activos_total > 0 && (
                      <span className="ml-2 text-xs bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full font-medium">
                        {e.activos_total} activos
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{e.orden}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      e.activo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                    }`}>
                      {e.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => abrirEditar(e)} title="Editar"
                        className="text-gray-400 hover:text-gray-600 p-1.5 rounded hover:bg-gray-100">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => toggle(e)} title={e.activo ? 'Desactivar' : 'Activar'}
                        className={`p-1.5 rounded hover:bg-gray-100 ${e.activo ? 'text-gray-400 hover:text-amber-500' : 'text-gray-400 hover:text-emerald-500'}`}>
                        <Power size={14} />
                      </button>
                      <button onClick={() => eliminar(e)} title="Eliminar"
                        className="text-gray-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 text-lg">{editId ? 'Editar equipo' : 'Nuevo equipo'}</h2>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Sub-módulo *</label>
              <select value={form.submodulo_id} onChange={e => setForm(f => ({ ...f, submodulo_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-400">
                <option value="">Seleccionar...</option>
                {submodulos.map(s => <option key={s.id} value={s.id}>Sub-módulo {s.codigo} — {s.nombre}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Nombre *</label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Código</label>
                <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                  placeholder="EQ-099"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-400" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Descripción</label>
              <textarea rows={2} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-400" />
            </div>

            {/* Frecuencia de inspección */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">Frecuencia de inspección</label>
              <div className="flex flex-wrap gap-2">
                {FRECUENCIAS.map(fr => (
                  <button key={fr.value} type="button"
                    onClick={() => setForm(f => ({ ...f, frecuencia_inspeccion: fr.value }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      form.frecuencia_inspeccion === fr.value
                        ? fr.color + ' ring-2 ring-offset-1 ring-current shadow-sm'
                        : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
                    }`}>
                    {fr.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.requiere_operador}
                  onChange={e => setForm(f => ({ ...f, requiere_operador: e.target.checked }))}
                  className="rounded" />
                Requiere operador
              </label>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500">Orden</label>
                <input type="number" value={form.orden} onChange={e => setForm(f => ({ ...f, orden: +e.target.value }))}
                  className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-roka-400" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving || !form.nombre || !form.submodulo_id}
                className="px-4 py-2 text-sm bg-roka-500 hover:bg-roka-600 text-white rounded-lg font-medium disabled:opacity-40">
                {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Crear equipo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
