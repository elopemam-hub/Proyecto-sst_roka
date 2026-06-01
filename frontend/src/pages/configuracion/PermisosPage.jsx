import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ShieldCheck, Save, RotateCcw,
  ChevronDown, ChevronRight, User, Users, AlertTriangle, Check,
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const ROLES = [
  { key:'administrador',  label:'Administrador',   color:'bg-purple-100 text-purple-700 border-purple-300' },
  { key:'supervisor_sst', label:'Supervisor SST',  color:'bg-blue-100 text-blue-700 border-blue-300' },
  { key:'tecnico_sst',    label:'Técnico SST',     color:'bg-teal-100 text-teal-700 border-teal-300' },
  { key:'operativo',      label:'Operativo',       color:'bg-amber-100 text-amber-700 border-amber-300' },
  { key:'vigilante',      label:'Vigilante',       color:'bg-orange-100 text-orange-700 border-orange-300' },
  { key:'solo_lectura',   label:'Solo lectura',    color:'bg-gray-100 text-gray-600 border-gray-300' },
]

const ACCIONES = [
  { key:'puede_ver',      label:'Ver',      icon:'👁' },
  { key:'puede_crear',    label:'Crear',    icon:'➕' },
  { key:'puede_editar',   label:'Editar',   icon:'✏️' },
  { key:'puede_eliminar', label:'Eliminar', icon:'🗑' },
  { key:'puede_aprobar',  label:'Aprobar',  icon:'✅' },
  { key:'puede_exportar', label:'Exportar', icon:'📥' },
]

const GRUPO_LABEL = {
  general:'General', operaciones:'Operaciones', gestion:'Gestión',
  rrhh:'RRHH', activos:'Activos', documental:'Documental',
  calidad:'Calidad', admin:'Administración',
}

// ── Tab de ROL ───────────────────────────────────────────────────────────────
function TabRol({ rol, modulos, onSave }) {
  const [permisos, setPermisos] = useState({})
  const [loading, setLoading]  = useState(true)
  const [saving, setSaving]    = useState(false)
  const [grupos, setGrupos]    = useState({})

  useEffect(() => {
    if (rol.key === 'administrador') { setLoading(false); return }
    api.get(`/permisos/rol/${rol.key}`)
      .then(({ data }) => {
        const map = {}
        Object.values(data).forEach(p => { map[p.modulo_clave] = { ...p } })
        setPermisos(map)
      })
      .finally(() => setLoading(false))
  }, [rol.key])

  useEffect(() => {
    const g = {}
    modulos.forEach(m => {
      if (!g[m.grupo]) g[m.grupo] = []
      g[m.grupo].push(m)
    })
    setGrupos(g)
  }, [modulos])

  const toggle = (clave, accion) => {
    setPermisos(prev => ({
      ...prev,
      [clave]: {
        ...prev[clave],
        modulo_clave: clave,
        [accion]: !prev[clave]?.[accion],
        // Si activo Ver se habilita, si desactivo Ver se deshabilitan todos
        ...(accion === 'puede_ver' && prev[clave]?.[accion]
          ? { puede_crear:false, puede_editar:false, puede_eliminar:false, puede_aprobar:false, puede_exportar:false }
          : {}),
      }
    }))
  }

  const toggleGrupo = (grupoKey, accion, activar) => {
    const mods = grupos[grupoKey] || []
    setPermisos(prev => {
      const next = { ...prev }
      mods.forEach(m => {
        next[m.clave] = { ...next[m.clave], modulo_clave: m.clave, [accion]: activar }
      })
      return next
    })
  }

  const guardar = async () => {
    setSaving(true)
    try {
      const lista = Object.values(permisos)
      await api.put(`/permisos/rol/${rol.key}`, { permisos: lista })
      toast.success(`Permisos de "${rol.label}" guardados`)
      onSave?.()
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  if (rol.key === 'administrador') return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <ShieldCheck size={40} className="text-purple-400"/>
      <p className="text-gray-600 font-semibold">El Administrador tiene acceso total a todos los módulos.</p>
      <p className="text-xs text-gray-400">No se pueden restringir sus permisos.</p>
    </div>
  )

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-roka-500 border-t-transparent rounded-full animate-spin"/></div>

  return (
    <div className="space-y-4">
      {/* Cabecera de acciones */}
      <div className="sticky top-0 z-10 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-48">Módulo</th>
              {ACCIONES.map(a => (
                <th key={a.key} className="px-3 py-3 text-center font-semibold text-gray-500 min-w-[72px]">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{a.icon}</span>
                    <span>{a.label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>

      {/* Grupos de módulos */}
      {Object.entries(grupos).map(([grupoKey, mods]) => (
        <GrupoModulos
          key={grupoKey}
          grupoKey={grupoKey}
          grupoLabel={GRUPO_LABEL[grupoKey] || grupoKey}
          modulos={mods}
          permisos={permisos}
          onToggle={toggle}
          onToggleGrupo={toggleGrupo}
        />
      ))}

      {/* Botón guardar */}
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={guardar} disabled={saving}
          className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40">
          <Save size={15}/> {saving ? 'Guardando...' : `Guardar permisos de ${rol.label}`}
        </button>
      </div>
    </div>
  )
}

function GrupoModulos({ grupoKey, grupoLabel, modulos, permisos, onToggle, onToggleGrupo }) {
  const [abierto, setAbierto] = useState(true)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <button onClick={() => setAbierto(!abierto)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition-colors">
        <span className="text-xs font-bold text-gray-600 uppercase tracking-widest flex-1 text-left">{grupoLabel}</span>
        <span className="text-xs text-gray-400">{modulos.length} módulos</span>
        {abierto ? <ChevronDown size={14} className="text-gray-400"/> : <ChevronRight size={14} className="text-gray-400"/>}
      </button>

      {abierto && (
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-50">
            {modulos.map(m => {
              const p = permisos[m.clave] || {}
              return (
                <tr key={m.clave} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-gray-700 w-48">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400 text-xs font-mono">{m.clave}</span>
                      <span>{m.nombre}</span>
                    </div>
                  </td>
                  {ACCIONES.map(a => (
                    <td key={a.key} className="px-3 py-2.5 text-center min-w-[72px]">
                      <button
                        onClick={() => onToggle(m.clave, a.key)}
                        disabled={a.key !== 'puede_ver' && !p.puede_ver}
                        className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center mx-auto ${
                          p[a.key]
                            ? 'bg-roka-500 border-roka-500 text-white shadow-sm'
                            : a.key !== 'puede_ver' && !p.puede_ver
                              ? 'bg-gray-50 border-gray-100 text-gray-200 cursor-not-allowed'
                              : 'bg-white border-gray-300 text-gray-300 hover:border-roka-400 hover:text-roka-400'
                        }`}>
                        <Check size={13}/>
                      </button>
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Tab de USUARIO específico ────────────────────────────────────────────────
function TabUsuario({ modulos }) {
  const [usuarios, setUsuarios]   = useState([])
  const [selUser, setSelUser]     = useState(null)
  const [permisos, setPermisos]   = useState({})
  const [rolBase, setRolBase]     = useState({})
  const [loading, setLoading]     = useState(false)
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    api.get('/usuarios', { params: { per_page: 200 } })
      .then(({ data }) => setUsuarios(data.data || data))
      .catch(() => {})
  }, [])

  const cargarUsuario = async (userId) => {
    setLoading(true); setSelUser(userId)
    try {
      const { data } = await api.get(`/permisos/usuario/${userId}`)
      const map = {}
      Object.values(data.permisos || {}).forEach(p => { map[p.modulo_clave] = { ...p } })
      const base = {}
      // Rol base
      const rolData = await api.get(`/permisos/rol/${data.rol}`)
      Object.values(rolData.data).forEach(p => { base[p.modulo_clave] = { ...p } })
      setPermisos(map); setRolBase(base)
    } catch { } finally { setLoading(false) }
  }

  const toggle = (clave, accion) => {
    setPermisos(prev => ({
      ...prev,
      [clave]: {
        ...prev[clave],
        modulo_clave: clave,
        [accion]: !prev[clave]?.[accion],
        ...(accion === 'puede_ver' && prev[clave]?.[accion]
          ? { puede_crear:false, puede_editar:false, puede_eliminar:false, puede_aprobar:false, puede_exportar:false }
          : {}),
      }
    }))
  }

  const guardar = async () => {
    if (!selUser) return
    setSaving(true)
    try {
      await api.put(`/permisos/usuario/${selUser}`, { permisos: Object.values(permisos) })
      toast.success('Permisos del usuario actualizados')
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const limpiarOverrides = async () => {
    if (!selUser || !window.confirm('¿Restaurar permisos según el rol del usuario?')) return
    await api.delete(`/permisos/usuario/${selUser}/overrides`)
    toast.success('Permisos restaurados al rol por defecto')
    cargarUsuario(selUser)
  }

  const user = usuarios.find(u => u.id === selUser)

  return (
    <div className="space-y-4">
      {/* Selector de usuario */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">
          Seleccionar usuario para personalizar permisos
        </label>
        <select value={selUser || ''} onChange={e => e.target.value && cargarUsuario(Number(e.target.value))}
          className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Seleccionar usuario...</option>
          {usuarios.map(u => (
            <option key={u.id} value={u.id}>{u.nombre} {u.apellido || ''} — {u.rol}</option>
          ))}
        </select>
      </div>

      {selUser && (
        <>
          {/* Info usuario */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <User size={18} className="text-blue-600"/>
              <div>
                <p className="text-sm font-semibold text-blue-800">{user?.nombre}</p>
                <p className="text-xs text-blue-500">Rol base: <strong>{user?.rol}</strong> — Los cambios aquí sobreescriben los del rol para este usuario.</p>
              </div>
            </div>
            <button onClick={limpiarOverrides}
              className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-300 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium">
              <RotateCcw size={12}/> Restaurar al rol
            </button>
          </div>

          {loading ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-roka-500 border-t-transparent rounded-full animate-spin"/></div>
          : (
            <>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 w-48">Módulo</th>
                      {ACCIONES.map(a => (
                        <th key={a.key} className="px-3 py-3 text-center text-xs font-semibold text-gray-500 min-w-[72px]">
                          <div className="flex flex-col items-center gap-0.5">
                            <span>{a.icon}</span><span>{a.label}</span>
                          </div>
                        </th>
                      ))}
                      <th className="px-3 py-3 text-xs font-semibold text-gray-400 text-center">Rol base</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {modulos.map(m => {
                      const p    = permisos[m.clave] || {}
                      const base = rolBase[m.clave] || {}
                      const difiere = ACCIONES.some(a => !!p[a.key] !== !!base[a.key])
                      return (
                        <tr key={m.clave} className={`hover:bg-gray-50 ${difiere ? 'bg-blue-50/40' : ''}`}>
                          <td className="px-4 py-2.5 font-medium text-gray-700">
                            <div className="flex items-center gap-1.5">
                              {difiere && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"/>}
                              <span className="text-xs text-gray-400 font-mono">{m.clave}</span>
                              <span>{m.nombre}</span>
                            </div>
                          </td>
                          {ACCIONES.map(a => (
                            <td key={a.key} className="px-3 py-2.5 text-center">
                              <button onClick={() => toggle(m.clave, a.key)}
                                disabled={a.key !== 'puede_ver' && !p.puede_ver}
                                className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center mx-auto ${
                                  p[a.key]
                                    ? 'bg-roka-500 border-roka-500 text-white'
                                    : a.key !== 'puede_ver' && !p.puede_ver
                                      ? 'bg-gray-50 border-gray-100 text-gray-200 cursor-not-allowed'
                                      : 'bg-white border-gray-300 text-gray-300 hover:border-roka-400'
                                }`}>
                                <Check size={13}/>
                              </button>
                            </td>
                          ))}
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex justify-center gap-0.5 flex-wrap">
                              {ACCIONES.filter(a => base[a.key]).map(a => (
                                <span key={a.key} className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded">{a.icon}</span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-blue-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"/>
                  Filas azules = permisos personalizados (diferentes al rol base)
                </p>
                <button onClick={guardar} disabled={saving}
                  className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40">
                  <Save size={15}/> {saving ? 'Guardando...' : 'Guardar permisos del usuario'}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function PermisosPage() {
  const navigate  = useNavigate()
  const [modulos, setModulos]   = useState([])
  const [tabRol, setTabRol]     = useState('supervisor_sst')
  const [vista, setVista]       = useState('roles') // roles | usuarios

  useEffect(() => {
    api.get('/permisos/modulos').then(({ data }) => setModulos(data)).catch(() => {})
  }, [])

  const rolActual = ROLES.find(r => r.key === tabRol)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/configuracion/empresa')} className="btn-back">
            <ArrowLeft size={14}/> Configuración
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck size={22} className="text-roka-600"/> Permisos por Módulo
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Asigna accesos específicos por rol y por usuario individual
            </p>
          </div>
        </div>
      </div>

      {/* Selector vista: Roles o Usuarios */}
      <div className="flex gap-2">
        {[
          { key:'roles',    label:'Permisos por Rol',    icon: Users },
          { key:'usuarios', label:'Override por Usuario', icon: User  },
        ].map(v => (
          <button key={v.key} onClick={() => setVista(v.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
              vista === v.key ? 'bg-roka-500 border-roka-500 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-roka-300'
            }`}>
            <v.icon size={15}/> {v.label}
          </button>
        ))}
      </div>

      {/* Vista Roles */}
      {vista === 'roles' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Tabs de roles */}
          <div className="flex border-b border-gray-100 overflow-x-auto bg-gray-50">
            {ROLES.map(r => (
              <button key={r.key} onClick={() => setTabRol(r.key)}
                className={`flex-shrink-0 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                  tabRol === r.key
                    ? 'border-roka-500 text-roka-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/50'
                }`}>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${r.color}`}>
                  {r.label}
                </span>
              </button>
            ))}
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${rolActual?.color}`}>
                  {rolActual?.label}
                </span>
                <p className="text-xs text-gray-400">
                  Configura qué puede hacer este rol en cada módulo del sistema
                </p>
              </div>
              {tabRol !== 'administrador' && (
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-1.5">
                  <AlertTriangle size={11} className="text-amber-500"/>
                  Desactivar "Ver" deshabilita todas las acciones del módulo
                </div>
              )}
            </div>
            <TabRol key={tabRol} rol={rolActual} modulos={modulos} />
          </div>
        </div>
      )}

      {/* Vista Usuarios */}
      {vista === 'usuarios' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <User size={16} className="text-roka-600"/>
            <h2 className="text-sm font-semibold text-gray-700">Override de permisos por usuario individual</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            💡 Los permisos aquí configurados <strong>sobreescriben</strong> los del rol para ese usuario específico.
            Usa esto para dar acceso extra o restringir módulos puntuales sin cambiar el rol.
          </p>
          <TabUsuario modulos={modulos} />
        </div>
      )}
    </div>
  )
}
