import { useState, useEffect } from 'react'
import { Plus, Edit2, KeyRound, ToggleLeft, ToggleRight, X, Info, ChevronDown } from 'lucide-react'
import api from '../../services/api'
import { ROLES_CONFIG } from '../../utils/roles'

const ROLES = Object.fromEntries(
  Object.entries(ROLES_CONFIG).map(([k, v]) => [k, { label: v.label, color: v.color }])
)

const MODULO_LABEL = {
  dashboard: 'Dashboard', inspecciones: 'Inspecciones', iperc: 'IPERC', ats: 'ATS',
  accidentes: 'Accidentes', capacitaciones: 'Capacitaciones', epps: 'EPPs',
  salud: 'Salud/EMO', seguimiento: 'Seguimiento', reportes: 'Reportes MINTRA',
  formatos: 'Formatos', documentos: 'Documentos', personal: 'Gestión Humana',
  simulacros: 'Simulacros', auditorias: 'Auditorías', vehiculos: 'Vehículos',
  equipos: 'Equipos', programa: 'Programa SST', firmas: 'Firmas digitales',
  configuracion: 'Configuración del sistema',
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios]     = useState([])
  const [areas, setAreas]           = useState([])
  const [personalList, setPersonal] = useState([])
  const [personalSearch, setPS]     = useState('')
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(false)
  const [editId, setEditId]         = useState(null)
  const [form, setForm]             = useState({ nombres: '', apellidos: '', email: '', rol: 'operativo', area_id: '', personal_id: '', activo: true })

  useEffect(() => { cargar() }, [])

  // Buscar personal cuando el admin escribe en el campo
  useEffect(() => {
    if (personalSearch.length >= 2) {
      api.get('/personal', { params: { search: personalSearch, per_page: 10 } })
        .then(r => setPersonal(r.data.data || r.data))
        .catch(() => {})
    } else {
      setPersonal([])
    }
  }, [personalSearch])

  const cargar = async () => {
    setLoading(true)
    try {
      const [{ data: u }, { data: a }] = await Promise.all([
        api.get('/usuarios'),
        api.get('/areas').catch(() => ({ data: [] })),
      ])
      setUsuarios(Array.isArray(u) ? u : (u.data || []))
      setAreas(Array.isArray(a) ? a : (a.data || []))
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const abrirModal = (u = null) => {
    setEditId(u?.id || null)
    setPS(u?.personal ? `${u.personal.nombres} ${u.personal.apellidos}` : '')
    setPersonal([])
    setForm(u ? {
      nombres: u.nombres || '', apellidos: u.apellidos || '',
      email: u.email || '', rol: u.rol || 'operativo',
      area_id: u.area_id || '', personal_id: u.personal_id || '', activo: u.activo ?? true,
    } : { nombres: '', apellidos: '', email: '', password: '', rol: 'operativo', area_id: '', personal_id: '', activo: true })
    setModal(true)
  }

  const guardar = async () => {
    try {
      if (editId) {
        await api.put(`/usuarios/${editId}`, form)
      } else {
        await api.post('/usuarios', form)
      }
      setModal(false)
      await cargar()
    } catch { /* silent */ }
  }

  const toggleActivo = async (id) => {
    try {
      await api.post(`/usuarios/${id}/toggle-activo`)
      await cargar()
    } catch { /* silent */ }
  }

  const resetPassword = async (id) => {
    if (!confirm('¿Resetear contraseña? Se enviará nueva contraseña al email.')) return
    try {
      await api.post(`/usuarios/${id}/reset-password`)
      alert('Contraseña reseteada exitosamente')
    } catch { /* silent */ }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const stats = {
    total:  usuarios.length,
    activos: usuarios.filter(u => u.activo).length,
    porRol: Object.keys(ROLES).reduce((acc, r) => ({ ...acc, [r]: usuarios.filter(u => u.rol === r).length }), {}),
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión de accesos al sistema</p>
        </div>
        <button onClick={() => abrirModal()} className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> Nuevo Usuario
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total usuarios', valor: stats.total, color: 'text-gray-800' },
          { label: 'Activos', valor: stats.activos, color: 'text-emerald-600' },
          { label: 'Administradores', valor: stats.porRol.administrador || 0, color: 'text-purple-600' },
          { label: 'Supervisores SST', valor: stats.porRol.supervisor_sst || 0, color: 'text-blue-600' },
        ].map(({ label, valor, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className={`text-2xl font-bold ${color}`}>{valor}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Usuario', 'Email', 'Rol', 'Área', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usuarios.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No hay usuarios</td></tr>
            ) : usuarios.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-roka-500/10 flex items-center justify-center text-xs font-bold text-roka-600">
                      {(u.nombres || '?')[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{u.nombres} {u.apellidos}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLES[u.rol]?.color || 'bg-gray-100 text-gray-600'}`}>
                    {ROLES[u.rol]?.label || u.rol}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{areas.find(a => a.id === u.area_id)?.nombre || '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActivo(u.id)} className={`flex items-center gap-1 text-xs font-medium ${u.activo ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {u.activo ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="px-4 py-3 flex items-center gap-1">
                  <button onClick={() => abrirModal(u)} className="p-1.5 text-gray-400 hover:text-roka-600 hover:bg-roka-50 rounded-lg" title="Editar"><Edit2 size={14} /></button>
                  <button onClick={() => resetPassword(u.id)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg" title="Reset contraseña"><KeyRound size={14} /></button>
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
              <h3 className="text-base font-semibold text-gray-800">{editId ? 'Editar' : 'Nuevo'} Usuario</h3>
              <button onClick={() => setModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['nombres', 'Nombres *'], ['apellidos', 'Apellidos *'], ['email', 'Email *']].map(([k, l]) => (
                <div key={k} className={k === 'email' ? 'col-span-2' : ''}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{l}</label>
                  <input type={k === 'email' ? 'email' : 'text'} value={form[k] || ''} onChange={e => f(k, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </div>
              ))}
              {!editId && (
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Contraseña *</label>
                  <input type="password" value={form.password || ''} onChange={e => f('password', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </div>
              )}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Rol *</label>
                <select value={form.rol || ''} onChange={e => f('rol', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
                  {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                {form.rol && ROLES_CONFIG[form.rol] && (
                  <div className={`mt-2 p-3 rounded-lg border text-xs ${ROLES_CONFIG[form.rol].color}`}>
                    <p className="font-semibold mb-1">{ROLES_CONFIG[form.rol].label}</p>
                    <p className="text-xs opacity-80 mb-2">{ROLES_CONFIG[form.rol].descripcion}</p>
                    <p className="font-medium mb-1">Módulos con acceso:</p>
                    {ROLES_CONFIG[form.rol].modulos.includes('*') ? (
                      <span className="font-bold">Acceso completo a todo el sistema</span>
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ROLES_CONFIG[form.rol].modulos.map(m => (
                          <span key={m} className="bg-white/60 border border-current/20 px-2 py-0.5 rounded-full text-[10px] font-medium">
                            {MODULO_LABEL[m] || m}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Área</label>
                <select value={form.area_id || ''} onChange={e => f('area_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
                  <option value="">Sin área</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>

              {/* Trabajador vinculado — permite acceder a Mi ficha médica */}
              <div className="col-span-2 relative">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Trabajador vinculado
                  <span className="ml-1 text-gray-400 font-normal">(necesario para Mi ficha médica / Mi panel)</span>
                </label>
                <input
                  value={personalSearch}
                  onChange={e => { setPS(e.target.value); if (!e.target.value) f('personal_id', '') }}
                  placeholder="Buscar por nombre o DNI..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500"
                />
                {personalList.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {personalList.map(p => (
                      <button key={p.id} type="button"
                        onClick={() => { f('personal_id', p.id); setPS(`${p.nombres} ${p.apellidos}`); setPersonal([]) }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm border-b border-gray-100 last:border-0">
                        <span className="font-medium text-gray-800">{p.nombres} {p.apellidos}</span>
                        <span className="text-gray-400 ml-2 text-xs font-mono">{p.dni}</span>
                      </button>
                    ))}
                  </div>
                )}
                {form.personal_id && (
                  <p className="text-xs text-emerald-600 mt-1">✓ Vinculado — ID trabajador: {form.personal_id}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModal(false)} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={guardar} className="px-4 py-2 bg-roka-500 hover:bg-roka-600 text-white rounded-lg text-sm font-medium">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
