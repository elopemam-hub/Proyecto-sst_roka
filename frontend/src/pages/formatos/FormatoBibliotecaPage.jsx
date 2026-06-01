import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Upload, Search, Download, Trash2, Edit2,
  FileText, File, Eye, X, Loader2, FolderOpen,
  LayoutGrid, LayoutList, Filter, HardDrive, TrendingDown,
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Constantes ────────────────────────────────────────────────────
const CATEGORIAS = {
  legal:         { label: 'Legal',          color: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-500' },
  procedimiento: { label: 'Procedimiento',  color: 'bg-purple-50 text-purple-700 border-purple-200',dot: 'bg-purple-500' },
  registro:      { label: 'Registro',       color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  formulario:    { label: 'Formulario',     color: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-500' },
  instructivo:   { label: 'Instructivo',    color: 'bg-orange-50 text-orange-700 border-orange-200',dot: 'bg-orange-500' },
  plantilla:     { label: 'Plantilla',      color: 'bg-teal-50 text-teal-700 border-teal-200',      dot: 'bg-teal-500' },
  otro:          { label: 'Otro',           color: 'bg-gray-100 text-gray-600 border-gray-200',     dot: 'bg-gray-400' },
}
const TIPOS_REGISTRO = {
  reg_01:'REG-01 Accidentes', reg_02:'REG-02 Enfermedades', reg_03:'REG-03 Incidentes',
  reg_04:'REG-04 Investigaciones', reg_05:'REG-05 Monitoreo', reg_06:'REG-06 Inspecciones',
  reg_07:'REG-07 Emergencias', reg_08:'REG-08 Auditorías', reg_09:'REG-09 Capacitaciones',
  reg_10:'REG-10 Estadísticas',
}
const EXT_CONFIG = {
  pdf:  { icon: '📄', color: 'bg-red-50 border-red-200 text-red-600',      label: 'PDF' },
  xlsx: { icon: '📊', color: 'bg-emerald-50 border-emerald-200 text-emerald-700', label: 'Excel' },
  xls:  { icon: '📊', color: 'bg-emerald-50 border-emerald-200 text-emerald-700', label: 'Excel' },
  docx: { icon: '📝', color: 'bg-blue-50 border-blue-200 text-blue-700',    label: 'Word' },
  doc:  { icon: '📝', color: 'bg-blue-50 border-blue-200 text-blue-700',    label: 'Word' },
  pptx: { icon: '📑', color: 'bg-orange-50 border-orange-200 text-orange-700', label: 'PPT' },
  ppt:  { icon: '📑', color: 'bg-orange-50 border-orange-200 text-orange-700', label: 'PPT' },
  csv:  { icon: '📋', color: 'bg-teal-50 border-teal-200 text-teal-700',    label: 'CSV' },
  txt:  { icon: '📃', color: 'bg-gray-50 border-gray-200 text-gray-600',    label: 'TXT' },
}
const extCfg = (ext) => EXT_CONFIG[ext?.toLowerCase()] || { icon: '📁', color: 'bg-gray-50 border-gray-200 text-gray-500', label: ext?.toUpperCase() || 'DOC' }

// ── Modal: subir archivo ──────────────────────────────────────────
function ModalSubir({ onClose, onSubido }) {
  const fileRef = useRef(null)
  const [file, setFile]     = useState(null)
  const [drag, setDrag]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm]     = useState({
    nombre: '', descripcion: '', categoria: 'otro', tipo_registro: '', version: 'v1.0',
  })

  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files?.[0]
    if (f) { setFile(f); if (!form.nombre) setForm(p => ({ ...p, nombre: f.name.replace(/\.[^.]+$/, '') })) }
  }
  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); if (!form.nombre) setForm(p => ({ ...p, nombre: f.name.replace(/\.[^.]+$/, '') })) }
  }

  const guardar = async () => {
    if (!file)        { toast.error('Selecciona un archivo'); return }
    if (!form.nombre) { toast.error('Ingresa un nombre'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('archivo', file)
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      await api.post('/formato-archivos', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Archivo subido correctamente')
      onSubido()
    } catch (err) { toast.error(err.response?.data?.message || 'Error al subir')
    } finally { setSaving(false) }
  }

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Upload size={17} className="text-roka-500" /> Subir archivo
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              drag ? 'border-roka-500 bg-roka-50' : 'border-gray-300 hover:border-roka-400 hover:bg-gray-50'
            }`}>
            <input ref={fileRef} type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
              className="hidden" onChange={handleFile} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl">{extCfg(file.name.split('.').pop()).icon}</span>
                <div className="text-left">
                  <p className="font-semibold text-gray-800 text-sm">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }}
                  className="ml-2 text-red-400 hover:text-red-600"><X size={16} /></button>
              </div>
            ) : (
              <>
                <Upload size={28} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-medium text-gray-600">Arrastra y suelta aquí</p>
                <p className="text-xs text-gray-400 mt-1">o haz clic para seleccionar</p>
                <p className="text-[10px] text-gray-300 mt-2">PDF · Excel · Word · PPT · CSV · TXT · Máx. 20 MB</p>
              </>
            )}
          </div>

          {/* Metadatos */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre del documento *</label>
            <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: Procedimiento de Evacuación v2.0"
              className={inp} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Categoría *</label>
              <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} className={inp}>
                {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Versión</label>
              <input value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))}
                placeholder="v1.0" className={inp} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de registro SST (opcional)</label>
            <select value={form.tipo_registro} onChange={e => setForm(p => ({ ...p, tipo_registro: e.target.value }))} className={inp}>
              <option value="">Sin registro específico</option>
              {Object.entries(TIPOS_REGISTRO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
            <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              rows={2} placeholder="Descripción breve del documento..."
              className={inp + ' resize-none'} />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
          <button onClick={guardar} disabled={saving || !file}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {saving ? 'Subiendo...' : 'Subir archivo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: editar metadatos ───────────────────────────────────────
function ModalEditar({ archivo, onClose, onGuardado }) {
  const [form, setForm] = useState({
    nombre: archivo.nombre, descripcion: archivo.descripcion || '',
    categoria: archivo.categoria, tipo_registro: archivo.tipo_registro || '',
    version: archivo.version || 'v1.0',
  })
  const [saving, setSaving] = useState(false)
  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500'

  const guardar = async () => {
    setSaving(true)
    try {
      await api.put(`/formato-archivos/${archivo.id}`, form)
      toast.success('Archivo actualizado')
      onGuardado()
    } catch { toast.error('Error al actualizar') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Editar documento</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
          <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} className={inp} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
            <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} className={inp}>
              {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Versión</label>
            <input value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} className={inp} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tipo registro</label>
          <select value={form.tipo_registro} onChange={e => setForm(p => ({ ...p, tipo_registro: e.target.value }))} className={inp}>
            <option value="">Sin registro específico</option>
            {Object.entries(TIPOS_REGISTRO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
          <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
            rows={2} className={inp + ' resize-none'} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm">Cancelar</button>
          <button onClick={guardar} disabled={saving}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
            {saving ? <Loader2 size={13} className="animate-spin" /> : null} Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta de archivo ────────────────────────────────────────────
function ArchivoCard({ archivo, onDescargar, onEditar, onEliminar }) {
  const cfg = extCfg(archivo.archivo_extension)
  const cat = CATEGORIAS[archivo.categoria] || CATEGORIAS.otro

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group">
      {/* Header con ícono */}
      <div className={`h-24 flex items-center justify-center border-b border-gray-100 ${cfg.color.split(' ')[0]} relative`}>
        <span className="text-4xl select-none">{cfg.icon}</span>
        <span className={`absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded border ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      {/* Contenido */}
      <div className="p-3.5 flex-1 space-y-1.5">
        <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">{archivo.nombre}</p>
        {archivo.descripcion && (
          <p className="text-[11px] text-gray-400 line-clamp-2">{archivo.descripcion}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cat.color}`}>
            {cat.label}
          </span>
          {archivo.version && (
            <span className="text-[10px] text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded">
              {archivo.version}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
          <span>{archivo.tamano_legible}</span>
          <span>{archivo.descargas} desc.</span>
        </div>
        <p className="text-[10px] text-gray-400">
          {archivo.created_at ? format(new Date(archivo.created_at), 'd MMM yyyy', { locale: es }) : '—'}
          {archivo.subido_por && ` · ${archivo.subido_por.nombres}`}
        </p>
      </div>

      {/* Acciones */}
      <div className="px-3.5 pb-3.5 flex gap-1.5">
        <button onClick={() => onDescargar(archivo)}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-roka-500 hover:bg-roka-600 text-white py-2 rounded-lg font-medium transition-colors">
          <Download size={13} /> Descargar
        </button>
        <button onClick={() => window.open(archivo.archivo_url, '_blank')}
          className="p-2 border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 rounded-lg transition-colors" title="Previsualizar">
          <Eye size={14} />
        </button>
        <button onClick={() => onEditar(archivo)}
          className="p-2 border border-gray-200 text-gray-500 hover:border-roka-400 hover:text-roka-600 rounded-lg transition-colors" title="Editar">
          <Edit2 size={14} />
        </button>
        <button onClick={() => onEliminar(archivo)}
          className="p-2 border border-gray-200 text-red-400 hover:border-red-300 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Fila de lista ─────────────────────────────────────────────────
function ArchivoFila({ archivo, onDescargar, onEditar, onEliminar }) {
  const cfg = extCfg(archivo.archivo_extension)
  const cat = CATEGORIAS[archivo.categoria] || CATEGORIAS.otro

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{cfg.icon}</span>
          <div>
            <p className="text-sm font-medium text-gray-800">{archivo.nombre}</p>
            {archivo.descripcion && <p className="text-xs text-gray-400 truncate max-w-[220px]">{archivo.descripcion}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cfg.color}`}>{cfg.label}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cat.color}`}>{cat.label}</span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {archivo.version || '—'}
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">{archivo.tamano_legible}</td>
      <td className="px-4 py-3 text-xs text-gray-400">
        {archivo.created_at ? format(new Date(archivo.created_at), 'd MMM yyyy', { locale: es }) : '—'}
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">{archivo.descargas}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button onClick={() => onDescargar(archivo)}
            className="p-1.5 text-roka-500 hover:bg-roka-50 rounded-lg transition-colors" title="Descargar">
            <Download size={14} />
          </button>
          <button onClick={() => window.open(archivo.archivo_url, '_blank')}
            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg" title="Ver">
            <Eye size={14} />
          </button>
          <button onClick={() => onEditar(archivo)}
            className="p-1.5 text-gray-400 hover:text-roka-600 hover:bg-roka-50 rounded-lg" title="Editar">
            <Edit2 size={14} />
          </button>
          <button onClick={() => onEliminar(archivo)}
            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="Eliminar">
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Página principal ──────────────────────────────────────────────
export default function FormatoBibliotecaPage() {
  const navigate   = useNavigate()
  const [archivos, setArchivos]   = useState([])
  const [stats, setStats]         = useState(null)
  const [meta, setMeta]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [showSubir, setShowSubir] = useState(false)
  const [editando, setEditando]   = useState(null)
  const [vista, setVista]         = useState('grid')
  const [pagina, setPagina]       = useState(1)
  const [search, setSearch]       = useState('')
  const [filtroCategoria, setFC]  = useState('')
  const [filtroExt, setFE]        = useState('')
  const [filtroTipo, setFT]       = useState('')

  useEffect(() => { cargarStats() }, [])
  useEffect(() => { setPagina(1) }, [search, filtroCategoria, filtroExt, filtroTipo])
  useEffect(() => { cargar() }, [pagina, search, filtroCategoria, filtroExt, filtroTipo])

  const cargarStats = async () => {
    try { const { data } = await api.get('/formato-archivos/estadisticas'); setStats(data) } catch {}
  }

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/formato-archivos', {
        params: {
          search:        search || undefined,
          categoria:     filtroCategoria || undefined,
          extension:     filtroExt || undefined,
          tipo_registro: filtroTipo || undefined,
          per_page: 24, page: pagina,
        },
      })
      setArchivos(data.data || data)
      setMeta(data.meta || null)
    } catch { toast.error('Error al cargar archivos') } finally { setLoading(false) }
  }

  const handleDescargar = async (archivo) => {
    try {
      const { data } = await api.get(`/formato-archivos/${archivo.id}/descargar`)
      const a = document.createElement('a')
      a.href = data.url; a.download = data.nombre; a.target = '_blank'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      toast.success('Descarga iniciada')
      cargar()
    } catch { toast.error('Error al descargar') }
  }

  const handleEliminar = async (archivo) => {
    if (!confirm(`¿Eliminar "${archivo.nombre}"? Esta acción no se puede deshacer.`)) return
    try {
      await api.delete(`/formato-archivos/${archivo.id}`)
      toast.success('Archivo eliminado')
      cargar(); cargarStats()
    } catch { toast.error('Error al eliminar') }
  }

  // Extensiones únicas de los archivos actuales
  const extensiones = [...new Set((stats?.por_extension || []).map(e => e.archivo_extension))]

  const tamanoTotal = stats?.tamano_total
    ? stats.tamano_total < 1048576
      ? `${(stats.tamano_total / 1024).toFixed(1)} KB`
      : `${(stats.tamano_total / 1048576).toFixed(1)} MB`
    : '0 MB'

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/formatos')} className="btn-back">
            <ArrowLeft size={14} /> Formatos
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Biblioteca de Documentos</h1>
            <p className="text-gray-500 text-sm mt-0.5">Repositorio de archivos SST · Excel, Word, PDF</p>
          </div>
        </div>
        <button onClick={() => setShowSubir(true)}
          className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm shadow-roka-500/20 transition-all">
          <Upload size={16} /> Subir documento
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:'Total archivos',   value: stats?.total ?? 0,              color:'text-gray-800',    icon:'📁' },
          { label:'Descargas totales',value: stats?.total_descargas ?? 0,    color:'text-roka-600',    icon:'⬇️' },
          { label:'Almacenamiento',   value: tamanoTotal,                     color:'text-purple-600',  icon:'💾' },
          { label:'Categorías',       value: stats?.por_categoria?.length ?? 0, color:'text-emerald-600', icon:'🗂️' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros + Toggle */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o descripción..."
            className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
        </div>
        <select value={filtroCategoria} onChange={e => setFC(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todas las categorías</option>
          {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filtroExt} onChange={e => setFE(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todos los tipos</option>
          {extensiones.map(e => <option key={e} value={e}>{extCfg(e).label} (.{e})</option>)}
        </select>
        <select value={filtroTipo} onChange={e => setFT(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todos los registros</option>
          {Object.entries(TIPOS_REGISTRO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {/* Toggle vista */}
        <div className="flex border border-gray-300 rounded-lg overflow-hidden ml-auto">
          <button onClick={() => setVista('grid')}
            className={`p-2 transition-colors ${vista === 'grid' ? 'bg-roka-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            <LayoutGrid size={15} />
          </button>
          <button onClick={() => setVista('list')}
            className={`p-2 transition-colors ${vista === 'list' ? 'bg-roka-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            <LayoutList size={15} />
          </button>
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : archivos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm text-gray-400">
          <FolderOpen size={40} className="mb-3 opacity-30" />
          <p className="font-medium text-gray-600">Sin documentos</p>
          <p className="text-sm mt-1">Sube el primer archivo haciendo clic en "Subir documento"</p>
          <button onClick={() => setShowSubir(true)}
            className="mt-4 flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Upload size={14} /> Subir documento
          </button>
        </div>
      ) : vista === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {archivos.map(a => (
            <ArchivoCard key={a.id} archivo={a}
              onDescargar={handleDescargar}
              onEditar={setEditando}
              onEliminar={handleEliminar} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Documento','Tipo','Categoría','Versión','Tamaño','Fecha','Desc.','Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {archivos.map(a => (
                <ArchivoFila key={a.id} archivo={a}
                  onDescargar={handleDescargar}
                  onEditar={setEditando}
                  onEliminar={handleEliminar} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {meta.from}–{meta.to} de {meta.total} documentos
          </p>
          <div className="flex gap-1">
            <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Anterior</button>
            <button disabled={pagina === meta.last_page} onClick={() => setPagina(p => p + 1)}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Siguiente →</button>
          </div>
        </div>
      )}

      {/* Modales */}
      {showSubir && (
        <ModalSubir
          onClose={() => setShowSubir(false)}
          onSubido={() => { setShowSubir(false); cargar(); cargarStats() }}
        />
      )}
      {editando && (
        <ModalEditar
          archivo={editando}
          onClose={() => setEditando(null)}
          onGuardado={() => { setEditando(null); cargar() }}
        />
      )}
    </div>
  )
}
