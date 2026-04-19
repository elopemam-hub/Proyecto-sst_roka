import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Database, Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight,
  Download, ChevronDown, ChevronLeft, X, Save, Loader2, BookOpen
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

// ── Metadatos de tabs ─────────────────────────────────────────────────────────
const TABS = [
  { key: 'actividad',    label: 'Actividades',       color: 'text-blue-400',    campos: ['nombre','descripcion','categoria','area_aplicacion','norma_referencia'] },
  { key: 'tarea',        label: 'Tareas',             color: 'text-violet-400',  campos: ['nombre','descripcion','categoria','area_aplicacion'] },
  { key: 'puesto',       label: 'Puestos de Trabajo', color: 'text-indigo-400',  campos: ['nombre','descripcion','nivel_cargo','area_aplicacion'] },
  { key: 'situacion',    label: 'Situaciones',        color: 'text-amber-400',   campos: ['nombre','descripcion','categoria'] },
  { key: 'peligro',      label: 'Peligros',           color: 'text-red-400',     campos: ['nombre','descripcion','categoria','norma_referencia'] },
  { key: 'riesgo',       label: 'Riesgos',            color: 'text-orange-400',  campos: ['nombre','descripcion','categoria'] },
  { key: 'consecuencia', label: 'Consecuencias',      color: 'text-rose-400',    campos: ['nombre','descripcion','categoria'] },
  { key: 'capacitacion', label: 'Capacitaciones',     color: 'text-teal-400',    campos: ['nombre','descripcion','duracion_horas','modalidad','norma_referencia'] },
  { key: 'control',      label: 'Controles',          color: 'text-emerald-400', campos: ['nombre','descripcion','tipo_control','costo_referencial','norma_referencia'] },
]

const CATEGORIAS_PELIGRO = ['fisico','quimico','biologico','ergonomico','psicosocial','mecanico','electrico','locativo','fenomeno_natural','otro']
const TIPOS_CONTROL = ['eliminacion','sustitucion','ingenieria','administrativo','epp']
const NIVELES_CARGO = ['operativo','tecnico','supervisor','jefatura','gerencial']
const MODALIDADES = ['presencial','virtual','mixta']

const CAT_LABEL_CONTROL = {
  eliminacion: '1. Eliminación', sustitucion: '2. Sustitución', ingenieria: '3. Ingeniería',
  administrativo: '4. Administrativo', epp: '5. EPP',
}

const EMPTY_FORM = {
  nombre: '', descripcion: '', codigo: '', categoria: '', subcategoria: '',
  area_aplicacion: '', norma_referencia: '', tipo_control: '', costo_referencial: '',
  duracion_horas: '', modalidad: '', nivel_cargo: '', activo: true,
}

export default function IpercBancoPage() {
  const navigate  = useNavigate()
  const [tab, setTab]           = useState('actividad')
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [pagina, setPagina]     = useState(1)
  const [meta, setMeta]         = useState(null)
  const [modal, setModal]       = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [importing, setImporting] = useState(false)
  const searchRef = useRef(null)

  const tabCfg = TABS.find(t => t.key === tab)

  useEffect(() => { cargar() }, [tab, pagina])

  const cargar = async () => {
    setLoading(true)
    try {
      const params = { tipo: tab, page: pagina, per_page: 25 }
      if (search) params.search = search
      const { data } = await api.get('/iperc-banco', { params })
      setItems(data.data || data)
      setMeta(data.meta || null)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const handleBuscar = (e) => { e.preventDefault(); setPagina(1); cargar() }

  const abrirNuevo = () => {
    setEditItem(null)
    setForm({ ...EMPTY_FORM, tipo: tab })
    setModal(true)
  }

  const abrirEditar = (item) => {
    setEditItem(item)
    setForm({
      nombre:           item.nombre || '',
      descripcion:      item.descripcion || '',
      codigo:           item.codigo || '',
      categoria:        item.categoria || '',
      subcategoria:     item.subcategoria || '',
      area_aplicacion:  item.area_aplicacion || '',
      norma_referencia: item.norma_referencia || '',
      tipo_control:     item.tipo_control || '',
      costo_referencial:item.costo_referencial || '',
      duracion_horas:   item.duracion_horas || '',
      modalidad:        item.modalidad || '',
      nivel_cargo:      item.nivel_cargo || '',
      activo:           item.activo !== false,
    })
    setModal(true)
  }

  const cerrarModal = () => { setModal(false); setEditItem(null) }

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    setSaving(true)
    try {
      const payload = { ...form, tipo: tab }
      if (editItem) {
        await api.put(`/iperc-banco/${editItem.id}`, payload)
        toast.success('Ítem actualizado')
      } else {
        await api.post('/iperc-banco', payload)
        toast.success('Ítem agregado al banco')
      }
      cerrarModal()
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const handleEliminar = async (item) => {
    if (!confirm(`¿Eliminar "${item.nombre}" del banco?`)) return
    try {
      await api.delete(`/iperc-banco/${item.id}`)
      toast.success('Eliminado')
      setItems(prev => prev.filter(i => i.id !== item.id))
    } catch { toast.error('Error al eliminar') }
  }

  const handleToggle = async (item) => {
    try {
      const { data } = await api.patch(`/iperc-banco/${item.id}/toggle`)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, activo: data.activo } : i))
    } catch { toast.error('Error al cambiar estado') }
  }

  const handleImportar = async () => {
    setImporting(true)
    try {
      const { data } = await api.post('/iperc-banco/importar-predefinidos', { tipo: tab })
      toast.success(data.message)
      cargar()
    } catch { toast.error('Error al importar') } finally { setImporting(false) }
  }

  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
        <button
          onClick={() => navigate('/iperc')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-200 hover:text-white bg-slate-600/80 hover:bg-slate-600 px-2.5 py-1.5 rounded-lg border border-slate-600/50 transition-colors mb-3"
        >
          <ChevronLeft size={13} /> Volver al módulo IPERC
        </button>
          <h1 className="text-2xl font-bold text-white">Banco de Datos IPERC</h1>
          <p className="text-slate-400 text-sm mt-1">Catálogo de referencia reutilizable para elaboración de matrices</p>
        </div>
      </div>

      {/* Tabs horizontales */}
      <div className="flex flex-wrap gap-1 bg-slate-900 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t.key}
            onClick={() => { setTab(t.key); setPagina(1); setSearch('') }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === t.key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Barra de acciones */}
      <div className="flex flex-wrap gap-3 items-center">
        <form onSubmit={handleBuscar} className="flex gap-2 flex-1 min-w-48">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Buscar ${tabCfg?.label.toLowerCase()}...`} className="input pl-9" />
          </div>
          <button type="submit" className="px-3 py-2 bg-slate-700 text-slate-200 rounded-lg text-sm hover:bg-slate-600 transition-colors">
            Buscar
          </button>
        </form>
        <button onClick={handleImportar} disabled={importing}
          className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg border border-slate-600 transition-colors">
          {importing ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          Importar predefinidos
        </button>
        <button onClick={abrirNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-roka-500 hover:bg-roka-600 text-white text-sm rounded-lg transition-colors">
          <Plus size={14} /> Agregar {tabCfg?.label.slice(0,-1) || 'ítem'}
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider w-8">#</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Nombre / Descripción</th>
              {tab === 'peligro'      && <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Tipo</th>}
              {tab === 'control'      && <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Jerarquía</th>}
              {tab === 'capacitacion' && <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Duración</th>}
              {tab === 'puesto'       && <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Nivel</th>}
              {tab === 'consecuencia' && <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Categoría</th>}
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Norma</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider w-20">Estado</th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-500">
                <Loader2 size={24} className="animate-spin mx-auto mb-2" />Cargando...
              </td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12">
                <Database size={32} className="mx-auto mb-3 text-slate-700" />
                <p className="text-slate-400">No hay {tabCfg?.label.toLowerCase()} en el banco</p>
                <p className="text-slate-500 text-xs mt-1">Agrega ítems manualmente o usa "Importar predefinidos"</p>
              </td></tr>
            ) : items.map((item, idx) => (
              <tr key={item.id} className={`hover:bg-slate-700/30 transition-colors ${!item.activo ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 text-slate-600 text-xs">{(pagina - 1) * 25 + idx + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-200 truncate">{item.nombre}</div>
                      {item.descripcion && <div className="text-xs text-slate-500 truncate">{item.descripcion}</div>}
                      {item.codigo && <code className="text-xs text-roka-400/70 font-mono">{item.codigo}</code>}
                    </div>
                  </div>
                </td>
                {tab === 'peligro' && (
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-400 capitalize">{item.categoria?.replace('_', ' ')}</span>
                  </td>
                )}
                {tab === 'control' && (
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-300">{CAT_LABEL_CONTROL[item.tipo_control] || '—'}</span>
                  </td>
                )}
                {tab === 'capacitacion' && (
                  <td className="px-4 py-3">
                    <div className="text-xs text-slate-300">{item.duracion_horas ? `${item.duracion_horas}h` : '—'}</div>
                    {item.modalidad && <div className="text-xs text-slate-500 capitalize">{item.modalidad}</div>}
                  </td>
                )}
                {tab === 'puesto' && (
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-400 capitalize">{item.nivel_cargo || '—'}</span>
                  </td>
                )}
                {tab === 'consecuencia' && (
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-400 capitalize">{item.categoria?.replace('_', ' ') || '—'}</span>
                  </td>
                )}
                <td className="px-4 py-3 text-xs text-slate-500 max-w-36 truncate">{item.norma_referencia || '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggle(item)} title={item.activo ? 'Desactivar' : 'Activar'}>
                    {item.activo
                      ? <ToggleRight size={20} className="text-emerald-400" />
                      : <ToggleLeft size={20} className="text-slate-600" />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => abrirEditar(item)}
                      className="p-1.5 rounded text-slate-400 hover:text-roka-400 hover:bg-slate-700 transition-colors">
                      <Edit size={13} />
                    </button>
                    <button onClick={() => handleEliminar(item)}
                      className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {meta && meta.last_page > 1 && (
          <div className="border-t border-slate-700 px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-slate-400">Total: {meta.total}</span>
            <div className="flex gap-2">
              <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}
                className="px-3 py-1 rounded bg-slate-700 text-slate-300 disabled:opacity-40">Anterior</button>
              <span className="px-3 py-1 text-slate-400">{pagina}/{meta.last_page}</span>
              <button disabled={pagina === meta.last_page} onClick={() => setPagina(p => p + 1)}
                className="px-3 py-1 rounded bg-slate-700 text-slate-300 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {/* Info predefinidos */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-start gap-3">
        <BookOpen size={16} className="text-roka-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-slate-500">
          <p className="text-slate-400 font-medium mb-1">Banco de datos predefinidos</p>
          <p>Usa "Importar predefinidos" para cargar un catálogo base de {tabCfg?.label.toLowerCase()} alineado a Ley 29783, RM 050-2013-TR e ISO 45001:2018. Los ítems importados son editables y pueden desactivarse sin eliminarlos.</p>
        </div>
      </div>

      {/* Modal crear/editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <div>
                <p className="font-semibold text-slate-100">
                  {editItem ? 'Editar' : 'Nuevo'} — {tabCfg?.label.slice(0, -1) || 'Ítem'}
                </p>
                <p className="text-xs text-slate-500">Banco de Datos IPERC</p>
              </div>
              <button onClick={cerrarModal} className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-700">
                <X size={16} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleGuardar} className="p-5 space-y-4">

              {/* Código (opcional) */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Código (opcional)</label>
                <input type="text" value={form.codigo} onChange={e => f('codigo', e.target.value)}
                  className="input" placeholder="Ej: PEL-001" />
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nombre <span className="text-red-400">*</span></label>
                <input type="text" value={form.nombre} onChange={e => f('nombre', e.target.value)}
                  className="input" placeholder={`Nombre del ${tabCfg?.label.slice(0,-1).toLowerCase() || 'ítem'}`} required />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Descripción</label>
                <textarea value={form.descripcion} onChange={e => f('descripcion', e.target.value)}
                  className="input resize-none" rows={2} placeholder="Detalle o aclaración..." />
              </div>

              {/* Campos específicos por tipo */}
              {tab === 'peligro' && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Tipo de peligro</label>
                  <select value={form.categoria} onChange={e => f('categoria', e.target.value)} className="input">
                    <option value="">Seleccionar...</option>
                    {CATEGORIAS_PELIGRO.map(c => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
                  </select>
                </div>
              )}

              {(tab === 'actividad' || tab === 'tarea' || tab === 'situacion' || tab === 'riesgo' || tab === 'consecuencia') && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Categoría</label>
                  <input type="text" value={form.categoria} onChange={e => f('categoria', e.target.value)}
                    className="input" placeholder="Ej: logistica, ergonomica, salud..." />
                </div>
              )}

              {tab === 'control' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Jerarquía de control <span className="text-red-400">*</span></label>
                    <select value={form.tipo_control} onChange={e => f('tipo_control', e.target.value)} className="input">
                      <option value="">Seleccionar jerarquía...</option>
                      {TIPOS_CONTROL.map(c => <option key={c} value={c}>{CAT_LABEL_CONTROL[c]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Costo referencial (S/)</label>
                    <input type="number" value={form.costo_referencial} onChange={e => f('costo_referencial', e.target.value)}
                      className="input" placeholder="0.00" min="0" step="0.01" />
                  </div>
                </>
              )}

              {tab === 'capacitacion' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Duración (horas)</label>
                      <input type="number" value={form.duracion_horas} onChange={e => f('duracion_horas', e.target.value)}
                        className="input" min="1" placeholder="4" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Modalidad</label>
                      <select value={form.modalidad} onChange={e => f('modalidad', e.target.value)} className="input">
                        <option value="">Seleccionar...</option>
                        {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {tab === 'puesto' && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Nivel del cargo</label>
                  <select value={form.nivel_cargo} onChange={e => f('nivel_cargo', e.target.value)} className="input">
                    <option value="">Seleccionar...</option>
                    {NIVELES_CARGO.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              )}

              {/* Área de aplicación */}
              {['actividad','tarea','puesto','control'].includes(tab) && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Área de aplicación</label>
                  <input type="text" value={form.area_aplicacion} onChange={e => f('area_aplicacion', e.target.value)}
                    className="input" placeholder="Ej: Almacén, Producción, Todas las áreas" />
                </div>
              )}

              {/* Norma de referencia */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Norma de referencia</label>
                <input type="text" value={form.norma_referencia} onChange={e => f('norma_referencia', e.target.value)}
                  className="input" placeholder="Ej: Ley 29783 Art. 57, G.050, ISO 45001" />
              </div>

              {/* Activo */}
              <div className="flex items-center gap-3">
                <input type="checkbox" id="activo" checked={form.activo} onChange={e => f('activo', e.target.checked)}
                  className="w-4 h-4" />
                <label htmlFor="activo" className="text-sm text-slate-300">Activo (disponible para uso)</label>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={cerrarModal}
                  className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-roka-500 hover:bg-roka-600 text-white rounded-lg text-sm transition-colors disabled:opacity-60">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {editItem ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
