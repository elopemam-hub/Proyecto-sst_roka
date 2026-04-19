import { useState, useEffect } from 'react'
import { LayoutGrid, Plus, Edit2, Trash2, X, Save } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const NIVELES = { bajo: 'Bajo', medio: 'Medio', alto: 'Alto', critico: 'Crítico' }
const NIVEL_COLOR = {
  bajo:    'bg-emerald-50 text-emerald-700',
  medio:   'bg-amber-50 text-amber-700',
  alto:    'bg-orange-50 text-orange-700',
  critico: 'bg-red-50 text-red-700',
}

export default function AreasPage() {
  const [areas, setAreas]     = useState([])
  const [cargos, setCargos]   = useState([])
  const [sedes, setSedes]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null) // {tipo:'area'|'cargo', data}
  const [form, setForm]       = useState({})

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const [{ data: a }, { data: c }, { data: s }] = await Promise.all([
        api.get('/areas'),
        api.get('/cargos').catch(() => ({ data: [] })),
        api.get('/sedes').catch(() => ({ data: [] })),
      ])
      setAreas(Array.isArray(a) ? a : (a.data || []))
      setCargos(Array.isArray(c) ? c : (c.data || []))
      setSedes(Array.isArray(s) ? s : (s.data || []))
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const abrirModal = (tipo, data = {}) => {
    setForm(data.id ? { ...data } : {})
    setModal({ tipo, id: data.id })
  }

  const guardar = async () => {
    if (!form.nombre?.trim()) { toast.error('El nombre es obligatorio'); return }
    try {
      if (modal.tipo === 'area') {
        if (modal.id) await api.put(`/areas/${modal.id}`, form)
        else          await api.post('/areas', form)
        toast.success(modal.id ? 'Área actualizada' : 'Área creada')
      } else {
        if (modal.id) await api.put(`/cargos/${modal.id}`, form)
        else          await api.post('/cargos', form)
        toast.success(modal.id ? 'Cargo actualizado' : 'Cargo creado')
      }
      setModal(null)
      await cargar()
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors) toast.error(Object.values(errors)[0]?.[0] || 'Error al guardar')
      else toast.error(err.response?.data?.message || 'Error al guardar')
    }
  }

  const eliminar = async (tipo, id) => {
    if (!confirm('¿Eliminar este registro?')) return
    try {
      await api.delete(`/${tipo}/${id}`)
      await cargar()
    } catch { /* silent */ }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const totalPersonalArea = (areaId) => {
    return 0 // Placeholder — podría consultarse con /api/personal?area_id=
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Áreas y Cargos</h1>
        <p className="text-gray-500 text-sm mt-1">Estructura organizacional de la empresa</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-2xl font-bold text-gray-900">{areas.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Áreas registradas</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-2xl font-bold text-gray-900">{cargos.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Cargos registrados</p>
        </div>
      </div>

      {/* Tabla Áreas */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <LayoutGrid size={18} className="text-roka-500" />
            <h2 className="font-semibold text-gray-800">Áreas Operativas</h2>
          </div>
          <button onClick={() => abrirModal('area')} className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
            <Plus size={14} /> Nueva Área
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Nombre', 'Sede', 'Descripción', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {areas.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">No hay áreas registradas</td></tr>
              ) : areas.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{a.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{sedes.find(s => s.id === a.sede_id)?.nombre || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{a.descripcion || '—'}</td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <button onClick={() => abrirModal('area', a)} className="p-1.5 text-gray-400 hover:text-roka-600 hover:bg-roka-50 rounded-lg"><Edit2 size={14} /></button>
                    <button onClick={() => eliminar('areas', a.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla Cargos */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Cargos / Puestos de Trabajo</h2>
          <button onClick={() => abrirModal('cargo')} className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
            <Plus size={14} /> Nuevo Cargo
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Nombre', 'Código', 'Crítico', 'EMO', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargos.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">No hay cargos registrados</td></tr>
              ) : cargos.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.nombre}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.codigo || '—'}</td>
                  <td className="px-4 py-3">
                    {c.es_critico
                      ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">Sí</span>
                      : <span className="text-gray-400 text-xs">No</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.requiere_emo
                      ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Sí</span>
                      : <span className="text-gray-400 text-xs">No</span>}
                  </td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <button onClick={() => abrirModal('cargo', c)} className="p-1.5 text-gray-400 hover:text-roka-600 hover:bg-roka-50 rounded-lg"><Edit2 size={14} /></button>
                    <button onClick={() => eliminar('cargos', c.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">
              {modal.id ? 'Editar' : 'Nuevo'} {modal.tipo === 'area' ? 'Área' : 'Cargo'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
                <input value={form.nombre || ''} onChange={e => f('nombre', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
              </div>
              {modal.tipo === 'area' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Sede</label>
                  <select value={form.sede_id || ''} onChange={e => f('sede_id', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
                    <option value="">Sin sede</option>
                    {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              )}
              {modal.tipo === 'cargo' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Código</label>
                    <input value={form.codigo || ''} onChange={e => f('codigo', e.target.value)}
                      placeholder="Ej: GER-001"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={!!form.es_critico} onChange={e => f('es_critico', e.target.checked)} className="w-4 h-4" />
                      Cargo crítico (riesgo alto)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={form.requiere_emo !== false} onChange={e => f('requiere_emo', e.target.checked)} className="w-4 h-4" />
                      Requiere EMO
                    </label>
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
                <textarea value={form.descripcion || ''} onChange={e => f('descripcion', e.target.value)} rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModal(null)} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={guardar} className="px-4 py-2 bg-roka-500 hover:bg-roka-600 text-white rounded-lg text-sm font-medium">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
