import { useState, useEffect } from 'react'
import { Building2, Plus, Edit2, Save, X, MapPin, Trash2 } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function EmpresaPage() {
  const [empresa, setEmpresa]   = useState(null)
  const [sedes, setSedes]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [editando, setEditando] = useState(false)
  const [form, setForm]         = useState({})
  const [modalSede, setModalSede]   = useState(false)
  const [sedeForm, setSedeForm]     = useState({ nombre: '', direccion: '', ciudad: '' })
  const [sedeEditId, setSedeEditId] = useState(null)
  const [savingSede, setSavingSede] = useState(false)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const [{ data: emp }, { data: sds }] = await Promise.all([
        api.get('/empresa/mia'),
        api.get('/sedes').catch(() => ({ data: [] })),
      ])
      setEmpresa(emp)
      setForm({
        razon_social:        emp.razon_social || '',
        ruc:                 emp.ruc || '',
        ciiu:                emp.ciiu || '',
        representante_legal: emp.representante_legal || '',
        dni_representante:   emp.dni_representante || '',
        direccion:           emp.direccion || '',
        telefono:            emp.telefono || '',
        email:               emp.email || '',
      })
      setSedes(Array.isArray(sds) ? sds : (sds.data || []))
    } catch { toast.error('Error al cargar datos de la empresa') }
    finally { setLoading(false) }
  }

  const guardar = async () => {
    if (!form.razon_social?.trim()) { toast.error('La razón social es obligatoria'); return }
    setSaving(true)
    try {
      await api.put(`/empresas/${empresa.id}`, form)
      toast.success('Información actualizada')
      await cargar()
      setEditando(false)
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors) toast.error(Object.values(errors)[0]?.[0] || 'Error al guardar')
      else toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const abrirModalSede = (sede = null) => {
    setSedeEditId(sede?.id || null)
    setSedeForm(sede
      ? { nombre: sede.nombre || '', direccion: sede.direccion || '', ciudad: sede.ciudad || sede.distrito || '' }
      : { nombre: '', direccion: '', ciudad: '' }
    )
    setModalSede(true)
  }

  const guardarSede = async () => {
    if (!sedeForm.nombre?.trim()) { toast.error('El nombre de la sede es obligatorio'); return }
    setSavingSede(true)
    try {
      if (sedeEditId) {
        await api.put(`/sedes/${sedeEditId}`, sedeForm)
        toast.success('Sede actualizada')
      } else {
        await api.post('/sedes', sedeForm)
        toast.success('Sede creada')
      }
      setModalSede(false)
      const { data } = await api.get('/sedes').catch(() => ({ data: [] }))
      setSedes(Array.isArray(data) ? data : (data.data || []))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar sede')
    } finally { setSavingSede(false) }
  }

  const eliminarSede = async (id, nombre) => {
    if (!confirm(`¿Eliminar la sede "${nombre}"? Esta acción no se puede deshacer.`)) return
    try {
      await api.delete(`/sedes/${id}`)
      toast.success('Sede eliminada')
      setSedes(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo eliminar la sede')
    }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresa</h1>
          <p className="text-gray-500 text-sm mt-1">Datos de la organización y sedes</p>
        </div>
        {!editando ? (
          <button onClick={() => setEditando(true)}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Edit2 size={16} /> Editar
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => { setEditando(false); setForm({ razon_social: empresa?.razon_social || '', ruc: empresa?.ruc || '', ciiu: empresa?.ciiu || '', representante_legal: empresa?.representante_legal || '', dni_representante: empresa?.dni_representante || '', direccion: empresa?.direccion || '', telefono: empresa?.telefono || '', email: empresa?.email || '' }) }}
              className="flex items-center gap-2 border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              <X size={16} /> Cancelar
            </button>
            <button onClick={guardar} disabled={saving}
              className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
              <Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        )}
      </div>

      {/* Información General */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-roka-500/10 flex items-center justify-center">
            <Building2 size={20} className="text-roka-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-800">Información General</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Razón Social',        key: 'razon_social',        required: true },
            { label: 'RUC',                 key: 'ruc' },
            { label: 'CIIU (Act. económica)',key: 'ciiu' },
            { label: 'Representante Legal', key: 'representante_legal' },
            { label: 'DNI Representante',   key: 'dni_representante' },
            { label: 'Dirección',           key: 'direccion' },
            { label: 'Teléfono',            key: 'telefono' },
            { label: 'Email',               key: 'email' },
          ].map(({ label, key, required }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              {editando ? (
                <input value={form[key] || ''} onChange={e => f(key, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-roka-500" />
              ) : (
                <p className="text-sm text-gray-900 py-2">{empresa?.[key] || <span className="text-gray-400">—</span>}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sedes */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <MapPin size={20} className="text-blue-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-800">Sedes / Plantas</h2>
          </div>
          <button onClick={() => abrirModalSede()}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
            <Plus size={14} /> Nueva Sede
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Nombre', 'Ciudad', 'Dirección', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sedes.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">No hay sedes registradas</td></tr>
              ) : sedes.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{s.ciudad || s.distrito || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{s.direccion || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => abrirModalSede(s)}
                        className="p-1.5 text-gray-400 hover:text-roka-600 hover:bg-roka-50 rounded-lg transition-colors" title="Editar">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => eliminarSede(s.id, s.nombre)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
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

      {/* Modal Sede */}
      {modalSede && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">
              {sedeEditId ? 'Editar Sede' : 'Nueva Sede'}
            </h3>
            <div className="space-y-3">
              {[
                ['nombre',    'Nombre *'],
                ['ciudad',    'Ciudad / Distrito'],
                ['direccion', 'Dirección'],
              ].map(([k, l]) => (
                <div key={k}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{l}</label>
                  <input value={sedeForm[k] || ''} onChange={e => setSedeForm(p => ({ ...p, [k]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalSede(false)}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={guardarSede} disabled={savingSede}
                className="px-4 py-2 bg-roka-500 hover:bg-roka-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {savingSede ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
