import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Plus, AlertTriangle, CheckCircle2, Clock, FileSearch, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const ESTADOS = {
  programada:  { label: 'Programada',  color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  en_proceso:  { label: 'En proceso',  color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  completada:  { label: 'Completada',  color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cancelada:   { label: 'Cancelada',   color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const TIPO_HALLAZGO = {
  no_conformidad_mayor: { label: 'NC Mayor',              color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
  no_conformidad_menor: { label: 'NC Menor',              color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icon: AlertTriangle },
  observacion:          { label: 'Observación',           color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: FileSearch },
  oportunidad_mejora:   { label: 'Oportunidad de Mejora', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: CheckCircle2 },
}

const ESTADO_HALLAZGO = {
  abierto:    { label: 'Abierto',    color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  en_proceso: { label: 'En proceso', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  cerrado:    { label: 'Cerrado',    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  vencido:    { label: 'Vencido',    color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const RESULTADO_SEG = {
  conforme:     { label: 'Conforme',     color: 'text-emerald-400' },
  no_conforme:  { label: 'No conforme',  color: 'text-red-400' },
  parcial:      { label: 'Parcial',      color: 'text-amber-400' },
}

export default function AuditoriaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [aud, setAud] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showHallazgo, setShowHallazgo] = useState(false)
  const [showSeguimiento, setShowSeguimiento] = useState(null) // hallazgo id
  const [expandedHallazgo, setExpandedHallazgo] = useState(null)
  const [personal, setPersonal] = useState([])
  const [saving, setSaving] = useState(false)

  const [hallazgoForm, setHallazgoForm] = useState({
    tipo_hallazgo: 'observacion', clausula_norma: '',
    descripcion: '', evidencia: '', accion_correctiva: '',
    responsable_id: '', fecha_limite: '',
  })

  const [seguimientoForm, setSeguimientoForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '', evidencia_cierre: '',
    verificado_por: '', resultado: '',
  })

  useEffect(() => { cargar() }, [id])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/auditorias/${id}`)
      setAud(data)
    } catch { toast.error('Error al cargar') } finally { setLoading(false) }
  }

  const cargarPersonal = async () => {
    if (personal.length > 0) return
    try {
      const { data } = await api.get('/personal', { params: { per_page: 100 } })
      setPersonal(data.data || data)
    } catch { /* silent */ }
  }

  const guardarHallazgo = async () => {
    setSaving(true)
    try {
      await api.post(`/auditorias/${id}/hallazgos`, {
        ...hallazgoForm,
        responsable_id: hallazgoForm.responsable_id || null,
        fecha_limite: hallazgoForm.fecha_limite || null,
      })
      toast.success('Hallazgo registrado')
      setShowHallazgo(false)
      setHallazgoForm({
        tipo_hallazgo: 'observacion', clausula_norma: '',
        descripcion: '', evidencia: '', accion_correctiva: '',
        responsable_id: '', fecha_limite: '',
      })
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error')
    } finally { setSaving(false) }
  }

  const guardarSeguimiento = async () => {
    setSaving(true)
    try {
      await api.post(`/auditorias/hallazgos/${showSeguimiento}/seguimiento`, seguimientoForm)
      toast.success('Seguimiento registrado')
      setShowSeguimiento(null)
      setSeguimientoForm({
        fecha: new Date().toISOString().split('T')[0],
        descripcion: '', evidencia_cierre: '',
        verificado_por: '', resultado: '',
      })
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!aud) return <div className="text-slate-500 text-center py-12">No encontrado</div>

  const inputClass = 'w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-roka-500/50 outline-none'

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/auditorias')}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Auditoría {aud.tipo === 'interna' ? 'Interna' : 'Externa'}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-xs font-medium px-2 py-1 rounded-full border ${ESTADOS[aud.estado]?.color}`}>
                {ESTADOS[aud.estado]?.label}
              </span>
              {aud.norma_referencia && <span className="text-xs text-slate-500">{aud.norma_referencia}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowHallazgo(true); cargarPersonal() }}
            className="flex items-center gap-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-500/20 transition-colors">
            <Plus size={16} /> Hallazgo
          </button>
          <button onClick={() => navigate(`/auditorias/${id}/editar`)}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            <Edit size={16} /> Editar
          </button>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-3">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Detalles</h3>
          <div className="space-y-2 text-sm">
            <div><span className="text-xs text-slate-500">Auditor líder</span><p className="text-slate-200 font-medium">{aud.auditor_lider}</p></div>
            {aud.equipo_auditor?.length > 0 && (
              <div>
                <span className="text-xs text-slate-500">Equipo auditor</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {aud.equipo_auditor.map((m, i) => (
                    <span key={i} className="text-xs bg-slate-900 text-slate-300 px-2 py-1 rounded-full border border-slate-700">{m}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-slate-500">Fecha programada</span>
                <p className="text-slate-200">{format(new Date(aud.fecha_programada), 'dd/MM/yyyy')}</p>
              </div>
              {aud.fecha_ejecutada && <div>
                <span className="text-xs text-slate-500">Fecha ejecutada</span>
                <p className="text-emerald-400">{format(new Date(aud.fecha_ejecutada), 'dd/MM/yyyy')}</p>
              </div>}
            </div>
            {aud.area && <div><span className="text-xs text-slate-500">Área</span><p className="text-slate-200">{aud.area.nombre}</p></div>}
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-3">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Alcance y Objetivo</h3>
          {aud.alcance && <div><span className="text-xs text-slate-500">Alcance</span><p className="text-slate-300 text-sm">{aud.alcance}</p></div>}
          {aud.objetivo && <div><span className="text-xs text-slate-500">Objetivo</span><p className="text-slate-300 text-sm">{aud.objetivo}</p></div>}
          {aud.conclusion && (
            <div className="pt-2 border-t border-slate-700">
              <span className="text-xs text-slate-500">Conclusión</span>
              <p className="text-slate-200 text-sm">{aud.conclusion}</p>
            </div>
          )}
          <div>
            <span className="text-xs text-slate-500">Hallazgos</span>
            <p className="text-2xl font-bold text-white">{aud.hallazgos?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Hallazgos */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <AlertTriangle size={16} className="text-orange-400" />
          Hallazgos ({aud.hallazgos?.length || 0})
        </h3>

        {(!aud.hallazgos || aud.hallazgos.length === 0) ? (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
            <FileSearch size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No hay hallazgos registrados</p>
            <p className="text-slate-500 text-sm mt-1">Use el botón "Hallazgo" para agregar uno</p>
          </div>
        ) : aud.hallazgos.map(h => {
          const tipo = TIPO_HALLAZGO[h.tipo_hallazgo] || {}
          const TipoIcon = tipo.icon || FileSearch
          const isExpanded = expandedHallazgo === h.id

          return (
            <div key={h.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              {/* Encabezado del hallazgo */}
              <button onClick={() => setExpandedHallazgo(isExpanded ? null : h.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-700/30 transition-colors">
                <div className="flex items-center gap-3">
                  <TipoIcon size={18} className={tipo.color?.split(' ')[1]} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${tipo.color}`}>{tipo.label}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ESTADO_HALLAZGO[h.estado]?.color}`}>
                        {ESTADO_HALLAZGO[h.estado]?.label}
                      </span>
                      {h.esta_vencido && <span className="text-xs text-red-400 font-medium">⚠ VENCIDO</span>}
                    </div>
                    <p className="text-sm text-slate-200 mt-1 line-clamp-1">{h.descripcion}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {h.fecha_limite && (
                    <span className={`text-xs ${h.esta_vencido ? 'text-red-400' : h.dias_restantes <= 7 ? 'text-amber-400' : 'text-slate-500'}`}>
                      {format(new Date(h.fecha_limite), 'dd/MM/yyyy')}
                    </span>
                  )}
                  {isExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                </div>
              </button>

              {/* Contenido expandido */}
              {isExpanded && (
                <div className="border-t border-slate-700 p-4 space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-slate-500">Descripción</span>
                      <p className="text-slate-300 whitespace-pre-wrap">{h.descripcion}</p>
                    </div>
                    {h.evidencia && <div>
                      <span className="text-xs text-slate-500">Evidencia</span>
                      <p className="text-slate-300">{h.evidencia}</p>
                    </div>}
                    {h.clausula_norma && <div>
                      <span className="text-xs text-slate-500">Cláusula</span>
                      <p className="text-slate-200 font-mono">{h.clausula_norma}</p>
                    </div>}
                    {h.accion_correctiva && <div>
                      <span className="text-xs text-slate-500">Acción correctiva</span>
                      <p className="text-slate-300">{h.accion_correctiva}</p>
                    </div>}
                    {h.responsable && <div>
                      <span className="text-xs text-slate-500">Responsable</span>
                      <p className="text-slate-200">{h.responsable.nombres} {h.responsable.apellidos}</p>
                    </div>}
                  </div>

                  {/* Timeline de seguimientos */}
                  {h.seguimientos?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-slate-400 uppercase mb-2">Seguimiento</h4>
                      <div className="relative pl-4 border-l-2 border-slate-700 space-y-4">
                        {h.seguimientos.map(s => (
                          <div key={s.id} className="relative">
                            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-700 border-2 border-slate-600" />
                            <div className="bg-slate-900 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-slate-500">{format(new Date(s.fecha), 'dd/MM/yyyy')}</span>
                                {s.resultado && (
                                  <span className={`text-xs font-medium ${RESULTADO_SEG[s.resultado]?.color}`}>
                                    {RESULTADO_SEG[s.resultado]?.label}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-300">{s.descripcion}</p>
                              {s.verificado_por && <p className="text-xs text-slate-500 mt-1">Verificado por: {s.verificado_por}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botón agregar seguimiento */}
                  {h.estado !== 'cerrado' && (
                    <button onClick={() => setShowSeguimiento(h.id)}
                      className="flex items-center gap-2 text-xs text-roka-400 hover:text-roka-300 transition-colors">
                      <Plus size={14} /> Agregar seguimiento
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal Nuevo Hallazgo */}
      {showHallazgo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-lg space-y-4 animate-slide-up max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white">Nuevo Hallazgo</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tipo de hallazgo *</label>
              <select value={hallazgoForm.tipo_hallazgo}
                onChange={e => setHallazgoForm(p => ({ ...p, tipo_hallazgo: e.target.value }))} className={inputClass}>
                <option value="no_conformidad_mayor">No Conformidad Mayor</option>
                <option value="no_conformidad_menor">No Conformidad Menor</option>
                <option value="observacion">Observación</option>
                <option value="oportunidad_mejora">Oportunidad de Mejora</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Cláusula de norma</label>
              <input type="text" value={hallazgoForm.clausula_norma}
                onChange={e => setHallazgoForm(p => ({ ...p, clausula_norma: e.target.value }))}
                placeholder="Ej: Art. 35, 4.6.1" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Descripción *</label>
              <textarea rows={3} value={hallazgoForm.descripcion}
                onChange={e => setHallazgoForm(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Descripción detallada del hallazgo..." className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Evidencia</label>
              <textarea rows={2} value={hallazgoForm.evidencia}
                onChange={e => setHallazgoForm(p => ({ ...p, evidencia: e.target.value }))}
                placeholder="Evidencia encontrada..." className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Acción correctiva propuesta</label>
              <textarea rows={2} value={hallazgoForm.accion_correctiva}
                onChange={e => setHallazgoForm(p => ({ ...p, accion_correctiva: e.target.value }))}
                className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Responsable</label>
                <select value={hallazgoForm.responsable_id}
                  onChange={e => setHallazgoForm(p => ({ ...p, responsable_id: e.target.value }))} className={inputClass}>
                  <option value="">Sin asignar</option>
                  {personal.map(p => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Fecha límite</label>
                <input type="date" value={hallazgoForm.fecha_limite}
                  onChange={e => setHallazgoForm(p => ({ ...p, fecha_limite: e.target.value }))} className={inputClass} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowHallazgo(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancelar</button>
              <button onClick={guardarHallazgo} disabled={saving || !hallazgoForm.descripcion}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                <Plus size={16} /> {saving ? 'Guardando...' : 'Registrar Hallazgo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Seguimiento */}
      {showSeguimiento && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-lg space-y-4 animate-slide-up">
            <h3 className="text-lg font-bold text-white">Registrar Seguimiento</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Fecha *</label>
                <input type="date" value={seguimientoForm.fecha}
                  onChange={e => setSeguimientoForm(p => ({ ...p, fecha: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Resultado</label>
                <select value={seguimientoForm.resultado}
                  onChange={e => setSeguimientoForm(p => ({ ...p, resultado: e.target.value }))} className={inputClass}>
                  <option value="">Sin resultado</option>
                  <option value="conforme">✅ Conforme</option>
                  <option value="no_conforme">❌ No conforme</option>
                  <option value="parcial">⚠ Parcial</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Descripción *</label>
              <textarea rows={3} value={seguimientoForm.descripcion}
                onChange={e => setSeguimientoForm(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Descripción del avance o verificación..." className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Evidencia de cierre</label>
              <textarea rows={2} value={seguimientoForm.evidencia_cierre}
                onChange={e => setSeguimientoForm(p => ({ ...p, evidencia_cierre: e.target.value }))}
                className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Verificado por</label>
              <input type="text" value={seguimientoForm.verificado_por}
                onChange={e => setSeguimientoForm(p => ({ ...p, verificado_por: e.target.value }))}
                placeholder="Nombre del verificador" className={inputClass} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowSeguimiento(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancelar</button>
              <button onClick={guardarSeguimiento} disabled={saving || !seguimientoForm.descripcion}
                className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                <Plus size={16} /> {saving ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
