import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Edit, CheckCircle, AlertTriangle, Clock,
  ClipboardCheck, Plus, Lock, Download, Camera, X
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADOS = {
  programada:    { label: 'Programada',    color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200' },
  en_ejecucion:  { label: 'En ejecución',  color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
  ejecutada:     { label: 'Ejecutada',     color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  con_hallazgos: { label: 'Con hallazgos', color: 'text-orange-700',  bg: 'bg-orange-50 border-orange-200' },
  cerrada:       { label: 'Cerrada',       color: 'text-gray-600',    bg: 'bg-gray-100 border-gray-200' },
  anulada:       { label: 'Anulada',       color: 'text-red-600',     bg: 'bg-red-50 border-red-200' },
}

const CRITICIDAD = {
  leve:     { label: 'Leve',     color: 'bg-blue-50 text-blue-700 border-blue-200' },
  moderado: { label: 'Moderado', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  critico:  { label: 'Crítico',  color: 'bg-red-50 text-red-700 border-red-200' },
}

function exportarHallazgos(insp) {
  if (!insp?.hallazgos?.length) { toast.error('Sin hallazgos para exportar'); return }
  const cols = ['N°', 'Descripción', 'Tipo', 'Criticidad', 'Responsable', 'Fecha límite', 'Estado']
  const lines = insp.hallazgos.map(h => [
    h.numero_hallazgo, h.descripcion, h.tipo?.replace(/_/g, ' '),
    h.criticidad,
    h.responsable ? `${h.responsable.nombres} ${h.responsable.apellidos}` : '',
    h.fecha_limite_correccion || '',
    h.estado,
  ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
  const blob = new Blob([cols.join(',') + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `hallazgos_${insp.codigo}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

function CumplimientoPorCategoria({ items }) {
  if (!items?.length) return null
  const grupos = items.reduce((acc, item) => {
    const cat = item.categoria || 'Sin categoría'
    if (!acc[cat]) acc[cat] = { total: 0, conformes: 0 }
    if (item.aplica !== false) {
      acc[cat].total++
      if (item.resultado === 'conforme') acc[cat].conformes++
    }
    return acc
  }, {})

  return (
    <div className="space-y-2">
      {Object.entries(grupos).map(([cat, g]) => {
        const pct = g.total > 0 ? Math.round(g.conformes / g.total * 100) : 0
        const barColor = pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-400'
        return (
          <div key={cat}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">{cat}</span>
              <span className={`text-xs font-semibold ${pct >= 90 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-600' : 'text-red-500'}`}>
                {pct}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ModalHallazgo({ inspeccionId, personal, onClose, onCreado }) {
  const fileRef = useRef(null)
  const [form, setForm] = useState({
    descripcion: '', tipo: 'no_conformidad', criticidad: 'moderado',
    responsable_id: '', fecha_limite_correccion: '', observaciones: '', generar_seguimiento: true,
  })
  const [fotoBase64, setFotoBase64]   = useState('')
  const [fotoPreview, setFotoPreview] = useState('')
  const [saving, setSaving]           = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setFotoPreview(preview)
    const reader = new FileReader()
    reader.onload = ev => setFotoBase64(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.descripcion.trim()) { toast.error('La descripción es obligatoria'); return }
    setSaving(true)
    try {
      const payload = { ...form }
      if (fotoBase64) payload.foto_base64 = fotoBase64
      const { data } = await api.post(`/inspecciones/${inspeccionId}/hallazgos`, payload)
      toast.success(`Hallazgo ${data.numero_hallazgo} registrado`)
      onCreado(data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar hallazgo')
    } finally { setSaving(false) }
  }

  const inputCls = 'w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Registrar Hallazgo</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Descripción *</label>
            <textarea rows={3} value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
              placeholder="Describe el hallazgo encontrado..."
              className={inputCls + ' resize-none'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className={inputCls}>
                <option value="no_conformidad">No Conformidad</option>
                <option value="observacion">Observación</option>
                <option value="oportunidad_mejora">Oportunidad de Mejora</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Criticidad *</label>
              <select value={form.criticidad} onChange={e => set('criticidad', e.target.value)} className={inputCls}>
                <option value="leve">Leve</option>
                <option value="moderado">Moderado</option>
                <option value="critico">Crítico</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Responsable</label>
              <select value={form.responsable_id} onChange={e => set('responsable_id', e.target.value)} className={inputCls}>
                <option value="">Sin asignar</option>
                {personal.map(p => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fecha límite corrección</label>
              <input type="date" value={form.fecha_limite_correccion}
                onChange={e => set('fecha_limite_correccion', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Observaciones adicionales</label>
            <input type="text" value={form.observaciones} onChange={e => set('observaciones', e.target.value)}
              placeholder="Observaciones adicionales..." className={inputCls} />
          </div>

          {/* Foto evidencia */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Evidencia fotográfica</label>
            {fotoPreview ? (
              <div className="relative inline-block">
                <img src={fotoPreview} alt="preview" className="w-full max-h-36 object-cover rounded-lg border border-gray-200" />
                <button type="button" onClick={() => { setFotoBase64(''); setFotoPreview('') }}
                  className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow text-gray-500 hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 text-sm border border-dashed border-gray-300 text-gray-500 hover:border-roka-400 hover:text-roka-600 px-4 py-3 rounded-lg w-full justify-center transition-colors">
                <Camera size={16} /> Adjuntar foto
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFoto} className="hidden" />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="gen_seg" checked={form.generar_seguimiento}
              onChange={e => set('generar_seguimiento', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300" />
            <label htmlFor="gen_seg" className="text-sm text-gray-600">Generar acción de seguimiento automática</label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium">
              <CheckCircle size={15} />
              {saving ? 'Guardando...' : 'Registrar hallazgo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalEjecucion({ insp, onClose, onEjecutado }) {
  const [resultados, setResultados]               = useState(() => {
    const init = {}
    insp.items?.forEach(item => {
      init[item.id] = { resultado: item.resultado || '', observaciones: item.observaciones || '' }
    })
    return init
  })
  const [observacionesGenerales, setObs] = useState(insp.observaciones_generales || '')
  const [ejecutando, setEjecutando]      = useState(false)

  const handleEjecutar = async () => {
    const itemsData = Object.entries(resultados)
      .map(([itemId, r]) => ({
        id: Number(itemId),
        resultado: r.resultado,
        puntaje_obtenido: r.resultado === 'conforme' ? 1 : 0,
        observaciones: r.observaciones,
      }))
      .filter(i => i.resultado)

    if (!itemsData.length) { toast.error('Registra al menos un resultado'); return }
    setEjecutando(true)
    try {
      await api.post(`/inspecciones/${insp.id}/ejecutar`, {
        items: itemsData,
        observaciones_generales: observacionesGenerales,
      })
      toast.success('Resultados registrados')
      onEjecutado()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al ejecutar')
    } finally { setEjecutando(false) }
  }

  const setR = (itemId, field, val) =>
    setResultados(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: val } }))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Ejecutar Inspección</h2>
            <p className="text-xs text-gray-500">Registra el resultado de cada ítem</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-3">
          {insp.items?.map(item => (
            <div key={item.id} className="bg-gray-50 rounded-lg p-4 space-y-2 border border-gray-200">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-800">{item.descripcion}</p>
                {item.es_critico && <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex-shrink-0">CRÍTICO</span>}
              </div>
              {item.categoria && <p className="text-xs text-gray-400">{item.categoria}</p>}
              <div className="flex gap-2 flex-wrap">
                {['conforme', 'no_conforme', 'observacion', 'no_aplica'].map(r => (
                  <button key={r} type="button"
                    onClick={() => setR(item.id, 'resultado', r)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      resultados[item.id]?.resultado === r
                        ? r === 'conforme'    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-medium'
                        : r === 'no_conforme' ? 'bg-red-50 text-red-700 border-red-300 font-medium'
                        : r === 'observacion' ? 'bg-amber-50 text-amber-700 border-amber-300 font-medium'
                        : 'bg-gray-200 text-gray-700 border-gray-300 font-medium'
                        : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
                    }`}>
                    {r === 'conforme' ? 'Conforme' : r === 'no_conforme' ? 'No Conforme' : r === 'observacion' ? 'Observación' : 'No Aplica'}
                  </button>
                ))}
              </div>
              {resultados[item.id]?.resultado === 'no_conforme' && (
                <input placeholder="Descripción del hallazgo..."
                  value={resultados[item.id]?.observaciones || ''}
                  onChange={e => setR(item.id, 'observaciones', e.target.value)}
                  className="w-full border border-gray-300 text-gray-700 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-roka-500" />
              )}
            </div>
          ))}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Observaciones generales</label>
            <textarea rows={2} value={observacionesGenerales} onChange={e => setObs(e.target.value)}
              className="w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-roka-500" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleEjecutar} disabled={ejecutando}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium">
            <CheckCircle size={15} />
            {ejecutando ? 'Guardando...' : 'Guardar Resultados'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function InspeccionDetailPage() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const [insp, setInsp]                   = useState(null)
  const [personal, setPersonal]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [showEjecucion, setShowEjecucion] = useState(false)
  const [showHallazgo, setShowHallazgo]   = useState(false)

  useEffect(() => { cargar() }, [id])
  useEffect(() => {
    api.get('/personal', { params: { per_page: 200 } })
      .then(r => setPersonal(r.data.data || r.data))
      .catch(() => {})
  }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/inspecciones/${id}`)
      setInsp(data)
    } catch { toast.error('Error al cargar inspección') } finally { setLoading(false) }
  }

  const handleCerrar = async () => {
    if (!confirm('¿Cerrar definitivamente esta inspección?')) return
    try {
      await api.post(`/inspecciones/${id}/cerrar`)
      toast.success('Inspección cerrada')
      cargar()
    } catch (err) { toast.error(err.response?.data?.message || 'Error') }
  }

  const handleHallazgoCreado = (hallazgo) => {
    setShowHallazgo(false)
    setInsp(prev => ({
      ...prev,
      hallazgos: [...(prev.hallazgos || []), hallazgo],
    }))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!insp) return <div className="text-center text-gray-500 py-16">Inspección no encontrada</div>

  const estado = ESTADOS[insp.estado] || {}

  const resumenItems = (() => {
    if (!insp.items?.length) return {}
    const conteo = { conforme: 0, no_conforme: 0, observacion: 0, no_aplica: 0, sin_resultado: 0 }
    insp.items.forEach(i => { conteo[i.resultado || 'sin_resultado']++ })
    return conteo
  })()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/inspecciones')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{insp.titulo}</h1>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${estado.bg} ${estado.color}`}>
                {estado.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              <span className="font-mono text-roka-600">{insp.codigo}</span>
              {insp.area && <> · {insp.area.nombre}</>}
              {insp.sede && <> · {insp.sede.nombre}</>}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button onClick={() => exportarHallazgos(insp)}
            className="flex items-center gap-1.5 text-xs border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50">
            <Download size={13} /> Exportar
          </button>
          {insp.estado !== 'cerrada' && insp.estado !== 'anulada' && (
            <button onClick={() => navigate(`/inspecciones/${id}/editar`)}
              className="flex items-center gap-2 text-sm px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg">
              <Edit size={15} /> Editar
            </button>
          )}
          {['programada', 'en_ejecucion'].includes(insp.estado) && (
            <button onClick={() => setShowEjecucion(true)}
              className="flex items-center gap-2 text-sm px-3 py-2 bg-roka-500 hover:bg-roka-600 text-white rounded-lg">
              <ClipboardCheck size={15} /> Ejecutar
            </button>
          )}
          {['ejecutada', 'con_hallazgos', 'en_ejecucion'].includes(insp.estado) && (
            <button onClick={() => setShowHallazgo(true)}
              className="flex items-center gap-2 text-sm px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg">
              <Plus size={15} /> Hallazgo
            </button>
          )}
          {['ejecutada', 'con_hallazgos'].includes(insp.estado) && (
            <button onClick={handleCerrar}
              className="flex items-center gap-2 text-sm px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
              <Lock size={15} /> Cerrar
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Cumplimiento',  value: `${insp.porcentaje_cumplimiento || 0}%`,
            color: (insp.porcentaje_cumplimiento || 0) >= 90 ? 'text-emerald-600' : (insp.porcentaje_cumplimiento || 0) >= 70 ? 'text-amber-600' : 'text-red-500' },
          { label: 'Ítems',         value: insp.items?.length || 0,          color: 'text-gray-700' },
          { label: 'Hallazgos',     value: insp.hallazgos?.length || 0,      color: 'text-orange-600' },
          { label: 'Críticos',      value: insp.total_hallazgos_criticos || 0, color: 'text-red-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Info general */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <Info label="Inspector"         value={insp.inspector ? `${insp.inspector.nombres} ${insp.inspector.apellidos}` : '—'} />
        <Info label="Supervisor"        value={insp.supervisor ? `${insp.supervisor.nombres} ${insp.supervisor.apellidos}` : '—'} />
        <Info label="Fecha planificada" value={insp.planificada_para ? format(new Date(insp.planificada_para), 'dd MMM yyyy', { locale: es }) : '—'} />
        <Info label="Ejecutada"         value={insp.ejecutada_en ? format(new Date(insp.ejecutada_en), "dd MMM yyyy HH:mm", { locale: es }) : 'Pendiente'} />
        <Info label="Puntaje"           value={`${insp.puntaje_obtenido ?? 0} / ${insp.puntaje_total ?? 0}`} />
        <Info label="Requiere firma"    value={insp.requiere_firma ? 'Sí' : 'No'} />
      </div>

      {/* Dashboard cumplimiento por categoría */}
      {insp.items?.some(i => i.resultado) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Dashboard de Cumplimiento</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Resumen global */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Resultado de ítems</p>
              <div className="space-y-2">
                {[
                  { key: 'conforme',    label: 'Conformes',       color: 'bg-emerald-500', text: 'text-emerald-700' },
                  { key: 'no_conforme', label: 'No conformes',    color: 'bg-red-500',     text: 'text-red-700' },
                  { key: 'observacion', label: 'Observaciones',   color: 'bg-amber-500',   text: 'text-amber-700' },
                  { key: 'no_aplica',   label: 'No aplica',       color: 'bg-gray-300',    text: 'text-gray-500' },
                ].map(({ key, label, color, text }) => {
                  const val = resumenItems[key] || 0
                  const total = insp.items?.length || 1
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-28">{label}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full`} style={{ width: `${(val / total) * 100}%` }} />
                      </div>
                      <span className={`text-xs font-semibold w-6 text-right ${text}`}>{val}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            {/* Por categoría */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Cumplimiento por categoría</p>
              <CumplimientoPorCategoria items={insp.items} />
            </div>
          </div>
        </div>
      )}

      {/* Ítems de inspección */}
      {insp.items?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-800">Ítems de Inspección ({insp.items.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {insp.items.map(item => (
              <div key={item.id} className="px-5 py-3 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{item.descripcion}</p>
                  {item.categoria && <p className="text-xs text-gray-400 mt-0.5">{item.categoria}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.es_critico && <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">CRÍTICO</span>}
                  {item.resultado ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      item.resultado === 'conforme'    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : item.resultado === 'no_conforme' ? 'bg-red-50 text-red-700 border-red-200'
                      : item.resultado === 'observacion' ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                    }`}>
                      {item.resultado === 'conforme' ? 'Conforme' : item.resultado === 'no_conforme' ? 'No Conforme' : item.resultado === 'observacion' ? 'Observación' : 'No Aplica'}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">Pendiente</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hallazgos */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">
            Hallazgos {insp.hallazgos?.length > 0 && `(${insp.hallazgos.length})`}
          </h2>
          {['en_ejecucion', 'ejecutada', 'con_hallazgos'].includes(insp.estado) && (
            <button onClick={() => setShowHallazgo(true)}
              className="flex items-center gap-1.5 text-xs text-roka-600 hover:text-roka-700 border border-roka-200 bg-roka-50 hover:bg-roka-100 px-3 py-1.5 rounded-lg transition-colors">
              <Plus size={13} /> Agregar hallazgo
            </button>
          )}
        </div>
        {!insp.hallazgos?.length ? (
          <div className="text-center py-10 text-gray-400 text-sm">Sin hallazgos registrados</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['N°', 'Descripción', 'Tipo', 'Criticidad', 'Responsable', 'Fecha límite', 'Estado', 'Foto'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {insp.hallazgos.map(h => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{h.numero_hallazgo}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs">{h.descripcion}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{h.tipo?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${CRITICIDAD[h.criticidad]?.color || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {CRITICIDAD[h.criticidad]?.label || h.criticidad}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {h.responsable ? `${h.responsable.nombres} ${h.responsable.apellidos}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {h.fecha_limite_correccion ? format(new Date(h.fecha_limite_correccion), 'dd/MM/yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className={h.estado === 'subsanado' || h.estado === 'verificado' ? 'text-emerald-600' : 'text-amber-600'}>
                      {h.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(h.foto_url || h.evidencia_antes_path) ? (
                      <img
                        src={h.foto_url || `/storage/${h.evidencia_antes_path}`}
                        alt="evidencia"
                        className="w-10 h-10 rounded object-cover border border-gray-200 cursor-pointer"
                        onClick={() => window.open(h.foto_url || `/storage/${h.evidencia_antes_path}`, '_blank')}
                      />
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showEjecucion && (
        <ModalEjecucion
          insp={insp}
          onClose={() => setShowEjecucion(false)}
          onEjecutado={() => { setShowEjecucion(false); cargar() }}
        />
      )}
      {showHallazgo && (
        <ModalHallazgo
          inspeccionId={insp.id}
          personal={personal}
          onClose={() => setShowHallazgo(false)}
          onCreado={handleHallazgoCreado}
        />
      )}
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-gray-800 font-medium text-sm">{value}</p>
    </div>
  )
}
