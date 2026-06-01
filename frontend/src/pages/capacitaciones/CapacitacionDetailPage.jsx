import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Edit, Play, UserCheck, UserX, Plus, Trash2, Save,
  Clock, Users, BookOpen, CheckCircle, XCircle,
  ClipboardList, Award, Loader2, X,
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const TIPO_COLOR = {
  induccion: 'bg-blue-50 text-blue-700 border-blue-200',
  especifica: 'bg-purple-50 text-purple-700 border-purple-200',
  general: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sensibilizacion: 'bg-amber-50 text-amber-700 border-amber-200',
}
const TIPO_LABEL = { induccion:'Inducción', especifica:'Específica', general:'General', sensibilizacion:'Sensibilización' }
const MODALIDAD_LABEL = { presencial:'Presencial', virtual:'Virtual', mixto:'Mixto' }
const ESTADO_COLOR = {
  programada: 'bg-blue-50 text-blue-700 border-blue-200',
  ejecutada:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelada:  'bg-red-50 text-red-700 border-red-200',
  reprogramada:'bg-amber-50 text-amber-700 border-amber-200',
}
const ESTADO_LABEL = { programada:'Programada', ejecutada:'Ejecutada', cancelada:'Cancelada', reprogramada:'Reprogramada' }

function ModalAsistentes({ capacitacionId, areaId, onClose, onGuardado }) {
  const [personal, setPersonal] = useState([])
  const [search, setSearch]     = useState('')
  const [selec, setSelec]       = useState([])
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    api.get('/personal', { params: { per_page: 200, area_id: areaId || undefined } })
      .then(r => setPersonal(r.data.data || r.data)).catch(() => {})
  }, [])

  const filtrados = personal.filter(p =>
    !search || `${p.nombres} ${p.apellidos} ${p.dni}`.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 20)

  const toggle = (p) => setSelec(prev =>
    prev.find(s => s.personal_id === p.id)
      ? prev.filter(s => s.personal_id !== p.id)
      : [...prev, { personal_id: p.id, asistio: true }]
  )
  const addTodos = () => {
    const nuevos = personal.filter(p => !selec.find(s => s.personal_id === p.id))
      .map(p => ({ personal_id: p.id, asistio: true }))
    setSelec(prev => [...prev, ...nuevos])
    toast.success(`${nuevos.length} trabajadores seleccionados`)
  }
  const guardar = async () => {
    if (!selec.length) { toast.error('Selecciona al menos un trabajador'); return }
    setSaving(true)
    try {
      await api.post(`/capacitaciones/${capacitacionId}/asistencia`, { asistentes: selec })
      toast.success(`${selec.length} asistentes registrados`)
      onGuardado()
    } catch (err) { toast.error(err.response?.data?.message || 'Error')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Agregar Asistentes</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="px-5 py-3 border-b border-gray-100 space-y-2">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o DNI..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{selec.length} seleccionados</span>
            <button onClick={addTodos} className="text-roka-600 hover:text-roka-700 font-medium">+ Agregar todos</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 px-2">
          {filtrados.map(p => {
            const esSel = !!selec.find(s => s.personal_id === p.id)
            return (
              <label key={p.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 rounded-lg ${esSel ? 'bg-roka-50' : ''}`}>
                <input type="checkbox" checked={esSel} onChange={() => toggle(p)} className="w-4 h-4 rounded border-gray-300 text-roka-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{p.nombres} {p.apellidos}</p>
                  <p className="text-xs text-gray-400">{p.dni}</p>
                </div>
              </label>
            )
          })}
          {filtrados.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">Sin resultados</p>}
        </div>
        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
          <button onClick={guardar} disabled={saving || !selec.length}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar ({selec.length})
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalEvaluacion({ capacitacionId, evaluacionExistente, onClose, onGuardado }) {
  const [form, setForm] = useState({
    titulo: evaluacionExistente?.titulo || 'Evaluación de la capacitación',
    nota_minima_aprobacion: evaluacionExistente?.nota_minima_aprobacion || 14,
    activa: evaluacionExistente?.activa ?? true,
    preguntas: evaluacionExistente?.preguntas || [
      { pregunta: '', opciones: ['', '', '', ''], respuesta_correcta: 0 }
    ],
  })
  const [saving, setSaving] = useState(false)

  const addPregunta = () => setForm(f => ({
    ...f, preguntas: [...f.preguntas, { pregunta: '', opciones: ['', '', '', ''], respuesta_correcta: 0 }]
  }))
  const removePregunta = (i) => setForm(f => ({ ...f, preguntas: f.preguntas.filter((_, idx) => idx !== i) }))
  const setPregunta = (i, val) => setForm(f => {
    const ps = [...f.preguntas]; ps[i] = { ...ps[i], ...val }; return { ...f, preguntas: ps }
  })
  const setOpcion = (pi, oi, val) => setForm(f => {
    const ps = [...f.preguntas]
    const ops = [...ps[pi].opciones]; ops[oi] = val
    ps[pi] = { ...ps[pi], opciones: ops }
    return { ...f, preguntas: ps }
  })

  const guardar = async () => {
    const invalidas = form.preguntas.filter(p => !p.pregunta.trim())
    if (invalidas.length) { toast.error('Completa todas las preguntas'); return }
    setSaving(true)
    try {
      await api.post(`/capacitaciones/${capacitacionId}/evaluacion`, form)
      toast.success('Evaluación guardada')
      onGuardado()
    } catch (err) { toast.error(err.response?.data?.message || 'Error')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Configurar Evaluación</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Título</label>
              <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nota mínima aprobación (0-20)</label>
              <input type="number" min={0} max={20} step={0.5} value={form.nota_minima_aprobacion}
                onChange={e => setForm(f => ({ ...f, nota_minima_aprobacion: parseFloat(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={form.activa} onChange={e => setForm(f => ({ ...f, activa: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300" />
                Evaluación activa
              </label>
            </div>
          </div>
          <div className="space-y-4">
            {form.preguntas.map((p, pi) => (
              <div key={pi} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Pregunta {pi + 1}</span>
                  {form.preguntas.length > 1 && (
                    <button onClick={() => removePregunta(pi)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={13} /></button>
                  )}
                </div>
                <input value={p.pregunta} onChange={e => setPregunta(pi, { pregunta: e.target.value })}
                  placeholder="Escribe la pregunta..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-roka-500" />
                <div className="grid grid-cols-2 gap-2">
                  {p.opciones.map((op, oi) => (
                    <label key={oi} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer transition-colors ${p.respuesta_correcta === oi ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                      <input type="radio" name={`c-${pi}`} checked={p.respuesta_correcta === oi}
                        onChange={() => setPregunta(pi, { respuesta_correcta: oi })} className="text-emerald-500" />
                      <input value={op} onChange={e => setOpcion(pi, oi, e.target.value)}
                        placeholder={`Opción ${oi + 1}`}
                        className="flex-1 text-sm bg-transparent focus:outline-none min-w-0" />
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400">Marca el círculo de la respuesta correcta</p>
              </div>
            ))}
          </div>
          <button onClick={addPregunta}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-roka-400 text-gray-500 hover:text-roka-600 rounded-xl py-3 text-sm transition-colors">
            <Plus size={14} /> Agregar pregunta
          </button>
        </div>
        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
          <button onClick={guardar} disabled={saving}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar evaluación
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CapacitacionDetailPage() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const [cap, setCap]           = useState(null)
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('info')
  const [showAs, setShowAs]     = useState(false)
  const [showEval, setShowEval] = useState(false)
  const [editNotas, setEdit]    = useState(false)
  const [notas, setNotas]       = useState({})
  const [saving, setSaving]     = useState(false)

  useEffect(() => { cargar() }, [id])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/capacitaciones/${id}`)
      setCap(data)
      const init = {}
      data.asistentes?.forEach(a => { init[a.id] = { asistio: a.asistio, nota: a.nota_evaluacion ?? '' } })
      setNotas(init)
    } catch { toast.error('Error al cargar capacitación') } finally { setLoading(false) }
  }

  const ejecutar = async () => {
    if (!confirm('¿Marcar como ejecutada?')) return
    try { await api.post(`/capacitaciones/${id}/ejecutar`); toast.success('Ejecutada'); cargar()
    } catch (err) { toast.error(err.response?.data?.message || 'Error') }
  }

  const guardarNotas = async () => {
    setSaving(true)
    try {
      const asistentes = cap.asistentes.map(a => {
        const n = notas[a.id]
        const nota = n?.nota !== '' && n?.nota != null ? parseFloat(n.nota) : null
        return {
          personal_id: a.personal_id,
          asistio: n?.asistio ?? a.asistio,
          nota_evaluacion: nota,
          aprobado: nota != null ? nota >= 14 : null,
        }
      })
      await api.post(`/capacitaciones/${id}/asistencia`, { asistentes })
      toast.success('Guardado'); setEdit(false); cargar()
    } catch (err) { toast.error(err.response?.data?.message || 'Error')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!cap) return <div className="text-center text-gray-400 py-16">Capacitación no encontrada</div>

  const pctAsist = cap.asistentes?.length > 0
    ? Math.round(cap.asistentes.filter(a => a.asistio).length / cap.asistentes.length * 100) : null
  const aprobados = cap.asistentes?.filter(a => a.aprobado).length || 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/capacitaciones')} className="btn-back"><ArrowLeft size={20} /></button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{cap.titulo}</h1>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${ESTADO_COLOR[cap.estado]}`}>{ESTADO_LABEL[cap.estado]}</span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${TIPO_COLOR[cap.tipo]}`}>{TIPO_LABEL[cap.tipo]}</span>
            </div>
            {cap.tema && <p className="text-sm text-gray-500 mt-0.5">{cap.tema}</p>}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {cap.estado === 'programada' && (
            <button onClick={ejecutar}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-medium">
              <Play size={14} /> Ejecutar
            </button>
          )}
          <button onClick={() => navigate(`/capacitaciones/${id}/editar`)}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <Edit size={14} /> Editar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Participantes', value: cap.asistentes?.length || 0, color:'text-gray-700', icon: Users },
          { label:'Asistencia', value: pctAsist != null ? `${pctAsist}%` : '—', color: pctAsist >= 80 ? 'text-emerald-600' : 'text-amber-600', icon: UserCheck },
          { label:'Aprobados', value: aprobados, color:'text-emerald-600', icon: Award },
          { label:'Horas', value:`${cap.duracion_horas}h`, color:'text-purple-600', icon: Clock },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 flex items-center gap-3">
            <Icon size={16} className={`${color} flex-shrink-0`} />
            <div><p className={`text-lg font-bold ${color}`}>{value}</p><p className="text-[10px] text-gray-500">{label}</p></div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key:'info', label:'Información', icon: ClipboardList },
          { key:'asistencia', label:`Asistencia (${cap.asistentes?.length || 0})`, icon: Users },
          { key:'evaluacion', label:'Evaluación', icon: BookOpen },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-roka-500 text-roka-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Información */}
      {tab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Detalles</h3>
            {[
              { label:'Fecha programada', value: cap.fecha_programada ? format(new Date(cap.fecha_programada), 'd MMMM yyyy', { locale: es }) : '—' },
              { label:'Fecha ejecutada', value: cap.fecha_ejecutada ? format(new Date(cap.fecha_ejecutada), 'd MMMM yyyy', { locale: es }) : 'Pendiente', green: !!cap.fecha_ejecutada },
              { label:'Duración', value:`${cap.duracion_horas} horas` },
              { label:'Modalidad', value: MODALIDAD_LABEL[cap.modalidad] || cap.modalidad },
              { label:'Máx. participantes', value: cap.max_participantes || '—' },
            ].map(({ label, value, green }) => (
              <div key={label} className="flex items-start justify-between gap-3">
                <span className="text-xs text-gray-400">{label}</span>
                <span className={`text-sm font-medium text-right ${green ? 'text-emerald-600' : 'text-gray-800'}`}>{value}</span>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Logística</h3>
            {[
              { label:'Expositor', value: cap.expositor || '—', sub: cap.expositor_cargo },
              { label:'Lugar', value: cap.lugar || '—' },
              { label:'Área', value: cap.area?.nombre || 'Todas las áreas' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="flex items-start justify-between gap-3">
                <span className="text-xs text-gray-400">{label}</span>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-800">{value}</p>
                  {sub && <p className="text-xs text-gray-400">{sub}</p>}
                </div>
              </div>
            ))}
            {cap.observaciones && (
              <div>
                <span className="text-xs text-gray-400">Observaciones</span>
                <p className="text-sm text-gray-700 mt-1">{cap.observaciones}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Asistencia */}
      {tab === 'asistencia' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{cap.asistentes?.length || 0} participantes</p>
            <div className="flex gap-2">
              {editNotas ? (
                <>
                  <button onClick={() => setEdit(false)} className="px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">Cancelar</button>
                  <button onClick={guardarNotas} disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-roka-500 hover:bg-roka-600 text-white rounded-lg disabled:opacity-50">
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Guardar
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setEdit(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">
                    <Edit size={13} /> Editar notas
                  </button>
                  <button onClick={() => setShowAs(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-roka-500 hover:bg-roka-600 text-white rounded-lg">
                    <Plus size={13} /> Agregar
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {!cap.asistentes?.length ? (
              <div className="text-center py-12 text-gray-400">
                <Users size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm mb-3">Sin asistentes registrados</p>
                <button onClick={() => setShowAs(true)} className="text-roka-500 hover:text-roka-600 text-sm font-medium flex items-center gap-1 mx-auto">
                  <Plus size={14} /> Agregar asistentes
                </button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Trabajador','DNI','Asistió','Nota','Estado'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cap.asistentes.map(a => {
                    const n = notas[a.id] || { asistio: a.asistio, nota: a.nota_evaluacion ?? '' }
                    return (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{a.personal?.nombres} {a.personal?.apellidos}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs font-mono">{a.personal?.dni}</td>
                        <td className="px-4 py-3">
                          {editNotas ? (
                            <button onClick={() => setNotas(p => ({ ...p, [a.id]: { ...n, asistio: !n.asistio } }))}
                              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${n.asistio ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                              {n.asistio ? <UserCheck size={13} /> : <UserX size={13} />}{n.asistio ? 'Sí' : 'No'}
                            </button>
                          ) : (
                            <span className={`flex items-center gap-1 text-xs font-medium ${a.asistio ? 'text-emerald-600' : 'text-red-500'}`}>
                              {a.asistio ? <UserCheck size={13} /> : <UserX size={13} />}{a.asistio ? 'Sí' : 'No'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editNotas ? (
                            <input type="number" min={0} max={20} step={0.5} value={n.nota}
                              onChange={e => setNotas(p => ({ ...p, [a.id]: { ...n, nota: e.target.value } }))}
                              className="w-16 border border-gray-300 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-roka-500" />
                          ) : (
                            <span className="text-sm font-medium text-gray-700">{a.nota_evaluacion ?? '—'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {a.aprobado === true ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full w-fit">
                              <CheckCircle size={11} /> Aprobado
                            </span>
                          ) : a.aprobado === false ? (
                            <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full w-fit">
                              <XCircle size={11} /> Desaprobado
                            </span>
                          ) : <span className="text-xs text-gray-300">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab: Evaluación */}
      {tab === 'evaluacion' && (
        <div className="space-y-4">
          {!cap.evaluacion ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
              <BookOpen size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-600 font-medium mb-1">Sin evaluación configurada</p>
              <p className="text-sm text-gray-400 mb-4">Crea un cuestionario para que los participantes lo respondan</p>
              <button onClick={() => setShowEval(true)}
                className="inline-flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                <Plus size={14} /> Crear evaluación
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">{cap.evaluacion.titulo}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {cap.evaluacion.preguntas?.length || 0} preguntas · Nota mínima: {cap.evaluacion.nota_minima_aprobacion}/20
                      {' · '}{cap.evaluacion.activa ? <span className="text-emerald-600">Activa</span> : <span className="text-gray-400">Inactiva</span>}
                    </p>
                  </div>
                  <button onClick={() => setShowEval(true)}
                    className="flex items-center gap-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-xs">
                    <Edit size={12} /> Editar
                  </button>
                </div>
                {cap.evaluacion.preguntas?.map((p, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-3 mb-2 bg-gray-50">
                    <p className="text-sm font-medium text-gray-800 mb-2">{i + 1}. {p.pregunta}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {p.opciones?.map((op, oi) => (
                        <span key={oi} className={`text-xs px-2 py-1 rounded ${oi === p.respuesta_correcta ? 'bg-emerald-50 text-emerald-700 font-medium border border-emerald-200' : 'text-gray-500 bg-white border border-gray-200'}`}>
                          {oi === p.respuesta_correcta && '✓ '}{op}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {cap.evaluacion.respuestas?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-800">Resultados ({cap.evaluacion.respuestas.length})</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>{['Trabajador','Puntaje','Estado','Completado'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {cap.evaluacion.respuestas.map(r => (
                        <tr key={r.id}>
                          <td className="px-4 py-3 font-medium text-gray-800">{r.personal?.nombres} {r.personal?.apellidos}</td>
                          <td className="px-4 py-3"><span className={`font-bold ${r.puntaje >= cap.evaluacion.nota_minima_aprobacion ? 'text-emerald-600' : 'text-red-500'}`}>{r.puntaje}/20</span></td>
                          <td className="px-4 py-3">
                            {r.aprobado
                              ? <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Aprobado</span>
                              : <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Desaprobado</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {r.completado_en ? format(new Date(r.completado_en), 'dd/MM/yyyy HH:mm') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showAs && <ModalAsistentes capacitacionId={id} areaId={cap.area_id} onClose={() => setShowAs(false)} onGuardado={() => { setShowAs(false); cargar() }} />}
      {showEval && <ModalEvaluacion capacitacionId={id} evaluacionExistente={cap.evaluacion} onClose={() => setShowEval(false)} onGuardado={() => { setShowEval(false); cargar() }} />}
    </div>
  )
}
