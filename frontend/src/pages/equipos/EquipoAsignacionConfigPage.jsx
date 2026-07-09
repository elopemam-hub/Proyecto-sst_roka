import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Settings2, Plus, Trash2, RefreshCw, AlertCircle,
  ArrowLeft, Calendar, BarChart3, CheckCircle2, Clock,
  XCircle, Zap, ChevronRight, Pencil,
} from 'lucide-react'
import api from '../../services/api'
import { format, addDays } from 'date-fns'

const DIAS_SEMANA = [
  { value: 1, label: 'L' },
  { value: 2, label: 'M' },
  { value: 3, label: 'X' },
  { value: 4, label: 'J' },
  { value: 5, label: 'V' },
  { value: 6, label: 'S' },
  { value: 7, label: 'D' },
]

const TURNO_OPTS = [
  { value: 'mañana',      label: 'Mañana' },
  { value: 'tarde',       label: 'Tarde' },
  { value: 'noche',       label: 'Noche' },
  { value: 'dia_completo',label: 'Día completo' },
]

// ──────────────────────────────────────────────────────────────────
// Tab: Dashboard (KPIs de hoy)
// ──────────────────────────────────────────────────────────────────
function TabDashboard({ onIrGenerar }) {
  const [dash, setDash]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [tick, setTick]           = useState(0)
  const [generando, setGenerando] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get('/equipo-asignaciones/dashboard')
      .then(r => setDash(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tick])

  // Genera asignaciones para los días de la semana actual que faltan
  const generarSemana = async () => {
    const hoy   = new Date()
    const lunes = new Date(hoy)
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))  // ISO lunes
    const domingo = new Date(lunes)
    domingo.setDate(lunes.getDate() + 6)

    const fmt = d => d.toISOString().split('T')[0]

    // Obtener todos los usuarios activos
    setGenerando(true)
    try {
      const usRes = await api.get('/usuarios', { params: { activo: 1, per_page: 100 } })
      const usuarios = (usRes.data.data || usRes.data).map(u => u.id)
      if (usuarios.length === 0) { alert('No hay usuarios activos.'); return }

      const res = await api.post('/equipo-asignaciones/generar-desde-reglas', {
        fecha_inicio: fmt(lunes),
        fecha_fin:    fmt(domingo),
        usuario_ids:  usuarios,
      })
      alert(res.data.message || 'Asignaciones generadas.')
      setTick(t => t + 1)
    } catch (err) {
      alert(err?.response?.data?.message || 'Error al generar.')
    } finally { setGenerando(false) }
  }

  if (loading) return <div className="text-center py-16 text-gray-400"><RefreshCw size={24} className="animate-spin mx-auto mb-2" />Cargando…</div>
  if (!dash)   return null

  const hoy = dash.hoy

  // Detectar días sin asignaciones esta semana
  const diasVacios = (dash.tendencia_semana || []).filter(d => d.total === 0)

  return (
    <div className="space-y-6">
      {/* Aviso si hay días sin asignaciones */}
      {diasVacios.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{diasVacios.map(d => d.dia.toUpperCase()).join(', ')}</span>
              {' '}no tiene{diasVacios.length > 1 ? 'n' : ''} asignaciones generadas esta semana.
            </p>
          </div>
          <button
            onClick={generarSemana}
            disabled={generando}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors"
          >
            <Zap size={13} />
            {generando ? 'Generando…' : 'Generar semana'}
          </button>
        </div>
      )}

      {/* Header con botón actualizar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Resumen del día y tendencia semanal</p>
        <button
          onClick={() => setTick(t => t + 1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-300 px-3 py-1.5 rounded-lg transition-colors"
        >
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {/* KPIs hoy */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total hoy',    value: hoy.total,      color: 'text-gray-800' },
          { label: 'Completados',  value: hoy.completado,  color: 'text-emerald-600' },
          { label: 'Pendientes',   value: hoy.pendiente,   color: 'text-amber-600' },
          { label: 'Cumplimiento', value: hoy.porcentaje != null ? `${hoy.porcentaje}%` : '—', color: hoy.porcentaje >= 80 ? 'text-emerald-600' : 'text-amber-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Cumplimiento por área */}
      {Object.keys(dash.por_area).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Cumplimiento por área — hoy</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Área', 'Total', 'Completado', 'Pendiente', '%'].map(h => (
                    <th key={h} className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(dash.por_area).map(([area, datos]) => {
                  const pct = datos.total > 0 ? Math.round((datos.completado / datos.total) * 100) : 0
                  return (
                    <tr key={area} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-sm font-medium text-gray-700">{area}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">{datos.total}</td>
                      <td className="px-4 py-2.5 text-sm text-emerald-600 font-medium">{datos.completado}</td>
                      <td className="px-4 py-2.5 text-sm text-amber-600">{datos.pendiente}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: pct === 100 ? '#10b981' : pct > 50 ? '#3b82f6' : '#f59e0b' }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tendencia semanal */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Tendencia semanal</h3>
        <div className="flex items-end gap-2">
          {dash.tendencia_semana.map(d => {
            const pct = d.total > 0 ? Math.round((d.completado / d.total) * 100) : 0
            const color = pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-blue-500' : d.total === 0 ? 'bg-gray-200' : 'bg-amber-400'
            return (
              <div key={d.fecha} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-gray-700">{d.total > 0 ? `${pct}%` : ''}</span>
                <div className="w-full flex flex-col justify-end" style={{ height: 80 }}>
                  <div className={`w-full rounded-t-md transition-all ${color}`} style={{ height: d.total > 0 ? `${Math.max(pct, 8)}%` : '8%' }} />
                </div>
                <span className="text-[10px] text-gray-500 font-medium uppercase">{d.dia}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Cumplimiento por usuario */}
      {dash.por_usuario.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Por usuario — hoy</h3>
          </div>
          {dash.por_usuario.map((u, i) => {
            const pct = u.total > 0 ? Math.round((u.completado / u.total) * 100) : 0
            return (
              <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 last:border-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                  {u.usuario?.nombre?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{u.usuario?.nombre}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">{u.completado}/{u.total}</span>
                  </div>
                </div>
                <span className={`text-sm font-bold ${pct === 100 ? 'text-emerald-600' : 'text-gray-600'}`}>{pct}%</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Tab: Reglas
// ──────────────────────────────────────────────────────────────────
function TabReglas() {
  const [reglas, setReglas]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [areas, setAreas]         = useState([])
  const [equipos, setEquipos]     = useState([])
  const [tipos, setTipos]         = useState([])
  const FORM_BLANK = { area_id: '', equipo_id: '', tipo_id: '', turno: 'dia_completo', dias_semana: [1,2,3,4,5], activo: true, observaciones: '' }
  const [form, setForm] = useState(FORM_BLANK)
  const [saving, setSaving] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [r, a, e, t] = await Promise.all([
        api.get('/equipo-asignaciones/reglas'),
        api.get('/areas', { params: { per_page: 100 } }),
        api.get('/equipos', { params: { per_page: 200 } }),
        api.get('/equipos-tipos'),
      ])
      setReglas(r.data)
      setAreas(a.data.data || a.data)
      setEquipos(e.data.data || e.data)
      setTipos(t.data.data || t.data)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const toggleDia = (dia) => {
    setForm(f => ({
      ...f,
      dias_semana: f.dias_semana.includes(dia)
        ? f.dias_semana.filter(d => d !== dia)
        : [...f.dias_semana, dia].sort(),
    }))
  }

  const abrirNuevo = () => {
    setEditingId(null)
    setForm(FORM_BLANK)
    setShowForm(true)
  }

  const abrirEditar = (r) => {
    setEditingId(r.id)
    setForm({
      area_id:      r.area?.id    ? String(r.area.id)    : '',
      equipo_id:    r.equipo?.id  ? String(r.equipo.id)  : '',
      tipo_id:      r.tipo?.id    ? String(r.tipo.id)    : '',
      turno:        r.turno         || 'dia_completo',
      dias_semana:  r.dias_semana   || [1,2,3,4,5],
      activo:       r.activo        ?? true,
      observaciones: r.observaciones || '',
    })
    setShowForm(true)
  }

  const cerrarForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(FORM_BLANK)
  }

  const handleGuardar = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      area_id:   form.area_id   || undefined,
      equipo_id: form.equipo_id || undefined,
      tipo_id:   form.tipo_id   || undefined,
    }
    try {
      if (editingId) {
        await api.put(`/equipo-asignaciones/reglas/${editingId}`, payload)
      } else {
        await api.post('/equipo-asignaciones/reglas', payload)
      }

      // Generar automáticamente asignaciones para la semana actual
      try {
        const hoy    = new Date()
        const lunes  = new Date(hoy)
        lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))
        const domingo = new Date(lunes)
        domingo.setDate(lunes.getDate() + 6)
        const fmt = d => d.toISOString().split('T')[0]
        const usRes = await api.get('/usuarios', { params: { activo: 1, per_page: 100 } })
        const usuarioIds = (usRes.data.data || usRes.data).map(u => u.id)
        if (usuarioIds.length > 0) {
          const genRes = await api.post('/equipo-asignaciones/generar-desde-reglas', {
            fecha_inicio: fmt(lunes),
            fecha_fin:    fmt(domingo),
            usuario_ids:  usuarioIds,
          })
          if (genRes.data.insertadas > 0) {
            alert(`Regla guardada. ${genRes.data.insertadas} asignación(es) nueva(s) generadas para esta semana.`)
          }
        }
      } catch (_) { /* generación silenciosa — la regla ya fue guardada */ }

      cerrarForm()
      cargar()
    } catch (err) {
      alert(err?.response?.data?.message || 'Error al guardar.')
    } finally { setSaving(false) }
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar esta regla?')) return
    try {
      await api.delete(`/equipo-asignaciones/reglas/${id}`)
      cargar()
    } catch { alert('No se pudo eliminar.') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Define qué equipos se inspeccionan, en qué turno y días</p>
        <button
          onClick={abrirNuevo}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors"
        >
          <Plus size={15} />
          Nueva regla
        </button>
      </div>

      {/* Formulario inline */}
      {showForm && (
        <form onSubmit={handleGuardar} className={`border rounded-xl p-4 mb-4 space-y-3 ${editingId ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
          <h4 className={`font-semibold text-sm ${editingId ? 'text-amber-800' : 'text-blue-800'}`}>
            {editingId ? '✏️ Editar regla de asignación' : 'Nueva regla de asignación'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Área (opcional)</label>
              <select className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.area_id} onChange={e => setForm(f => ({...f, area_id: e.target.value}))}>
                <option value="">Todas las áreas</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Equipo específico</label>
              <select className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.equipo_id} onChange={e => setForm(f => ({...f, equipo_id: e.target.value}))}>
                <option value="">Todos los equipos</option>
                {equipos.map(e => <option key={e.id} value={e.id}>{e.nombre} ({e.codigo})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de equipo</label>
              <select className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.tipo_id} onChange={e => setForm(f => ({...f, tipo_id: e.target.value}))}>
                <option value="">Todos los tipos</option>
                {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Turno *</label>
              <select className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.turno} onChange={e => setForm(f => ({...f, turno: e.target.value}))}>
                {TURNO_OPTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Días de la semana *</label>
              <div className="flex gap-1">
                {DIAS_SEMANA.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDia(d.value)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                      form.dias_semana.includes(d.value)
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-500 border border-gray-200 hover:border-blue-400'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
            <input
              type="text"
              maxLength={300}
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descripción de la regla…"
              value={form.observaciones}
              onChange={e => setForm(f => ({...f, observaciones: e.target.value}))}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={cerrarForm}
              className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving || form.dias_semana.length === 0}
              className={`flex-1 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Guardar regla'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400"><RefreshCw size={24} className="animate-spin mx-auto mb-2" /></div>
      ) : reglas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Settings2 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-500">Sin reglas configuradas</p>
          <p className="text-sm">Crea reglas para generar asignaciones automáticas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reglas.map(r => (
            <div key={r.id} className={`bg-white border rounded-xl p-4 flex items-start gap-3 ${r.activo ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {r.equipo && <span className="text-sm font-semibold text-gray-800">{r.equipo.nombre}</span>}
                  {r.area   && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{r.area.nombre}</span>}
                  {r.tipo   && <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">{r.tipo.nombre}</span>}
                  {!r.equipo && !r.area && !r.tipo && <span className="text-sm text-gray-500">Todos los equipos</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="font-medium text-gray-700 capitalize">{r.turno.replace('_', ' ')}</span>
                  <span>·</span>
                  <span>{DIAS_SEMANA.filter(d => r.dias_semana?.includes(d.value)).map(d => d.label).join(' ')}</span>
                  {r.observaciones && <><span>·</span><span className="italic">{r.observaciones}</span></>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${r.activo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                  {r.activo ? 'Activa' : 'Inactiva'}
                </span>
                <button onClick={() => abrirEditar(r)}
                  title="Editar regla"
                  className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                  <Pencil size={15} />
                </button>
                <button onClick={() => handleEliminar(r.id)}
                  title="Eliminar regla"
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Tab: Generar asignaciones masivas
// ──────────────────────────────────────────────────────────────────
function TabGenerar() {
  const [form, setForm] = useState({
    fecha_inicio: format(new Date(), 'yyyy-MM-dd'),
    fecha_fin:    format(addDays(new Date(), 6), 'yyyy-MM-dd'),
    usuario_ids:  [],
  })
  const [usuarios, setUsuarios]   = useState([])
  const [loading, setLoading]     = useState(false)
  const [limpiando, setLimpiando] = useState(false)
  const [resultado, setResultado] = useState(null)

  useEffect(() => {
    api.get('/usuarios', { params: { activo: 1, per_page: 100 } })
      .then(r => setUsuarios(r.data.data || r.data))
      .catch(() => {})
  }, [])

  const toggleUsuario = (id) => {
    setForm(f => ({
      ...f,
      usuario_ids: f.usuario_ids.includes(id)
        ? f.usuario_ids.filter(x => x !== id)
        : [...f.usuario_ids, id],
    }))
  }

  const diasRango = form.fecha_inicio && form.fecha_fin
    ? Math.round((new Date(form.fecha_fin) - new Date(form.fecha_inicio)) / 86400000)
    : 0

  const handleGenerar = async (e) => {
    e.preventDefault()
    if (form.usuario_ids.length === 0) { alert('Selecciona al menos un usuario.'); return }
    if (diasRango > 31) {
      alert(`El período seleccionado es de ${diasRango} días.\nEl límite para generar es 31 días.\nReduce el rango o usa tramos de 1 mes.`)
      return
    }
    setLoading(true)
    setResultado(null)
    try {
      const res = await api.post('/equipo-asignaciones/generar-desde-reglas', {
        fecha_inicio: form.fecha_inicio,
        fecha_fin:    form.fecha_fin,
        usuario_ids:  form.usuario_ids,
      })
      setResultado({ tipo: 'generar', ...res.data })
    } catch (err) {
      alert(err?.response?.data?.message || 'Error al generar asignaciones.')
    } finally { setLoading(false) }
  }

  const handleLimpiar = async () => {
    if (!confirm(
      `¿Eliminar TODAS las asignaciones PENDIENTES del ${form.fecha_inicio} al ${form.fecha_fin}?\n\n` +
      'Solo se eliminan las pendientes (no afecta completadas/iniciadas).\nEsta acción no se puede deshacer.'
    )) return
    setLimpiando(true)
    setResultado(null)
    try {
      const res = await api.post('/equipo-asignaciones/limpiar-periodo', {
        fecha_inicio: form.fecha_inicio,
        fecha_fin:    form.fecha_fin,
      })
      setResultado({ tipo: 'limpiar', ...res.data })
    } catch (err) {
      alert(err?.response?.data?.message || 'Error al limpiar el período.')
    } finally { setLimpiando(false) }
  }

  return (
    <div className="max-w-xl">
      <p className="text-sm text-gray-500 mb-4">
        Genera asignaciones automáticas para un período basándose en las reglas activas.
        Los equipos se distribuirán en rotación entre los usuarios seleccionados.
        <span className="text-amber-600 font-medium"> Máximo 31 días por generación.</span>
      </p>

      {diasRango > 31 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
          <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            El rango seleccionado es de <strong>{diasRango} días</strong>.
            Para <strong>Revertir</strong> puedes usar el rango completo.
            Para <strong>Generar</strong>, divide en tramos de máximo 31 días.
          </p>
        </div>
      )}

      <form onSubmit={handleGenerar} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha inicio *</label>
            <input type="date" required
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.fecha_inicio}
              onChange={e => setForm(f => ({...f, fecha_inicio: e.target.value}))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha fin *</label>
            <input type="date" required
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.fecha_fin}
              onChange={e => setForm(f => ({...f, fecha_fin: e.target.value}))}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Usuarios disponibles * <span className="text-gray-400 font-normal">({form.usuario_ids.length} seleccionados)</span>
          </label>
          <div className="border border-gray-200 rounded-xl overflow-y-auto max-h-52 bg-white">
            {usuarios.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Cargando usuarios…</p>
            ) : usuarios.map(u => (
              <label key={u.id}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
                <input
                  type="checkbox"
                  checked={form.usuario_ids.includes(u.id)}
                  onChange={() => toggleUsuario(u.id)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">{u.nombre}</p>
                  <p className="text-xs text-gray-400 capitalize">{u.rol?.replace('_', ' ')}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || form.usuario_ids.length === 0}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Zap size={16} />
            {loading ? 'Generando…' : 'Generar asignaciones'}
          </button>
          <button
            type="button"
            onClick={handleLimpiar}
            disabled={limpiando || loading}
            title="Eliminar todas las asignaciones PENDIENTES del período seleccionado"
            className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Trash2 size={15} />
            {limpiando ? 'Limpiando…' : 'Revertir'}
          </button>
        </div>
      </form>

      {resultado && (
        <div className={`mt-4 p-4 rounded-xl border ${
          resultado.tipo === 'limpiar'
            ? 'bg-red-50 border-red-200'
            : resultado.insertadas > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'
        }`}>
          <p className={`text-sm font-semibold ${
            resultado.tipo === 'limpiar'
              ? 'text-red-700'
              : resultado.insertadas > 0 ? 'text-emerald-700' : 'text-gray-600'
          }`}>
            {resultado.message}
          </p>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Página principal — Administrador
// ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'reglas',    label: 'Reglas',    icon: Settings2 },
  { id: 'generar',   label: 'Generar',   icon: Zap },
]

export default function EquipoAsignacionConfigPage() {
  const navigate  = useNavigate()
  const [tab, setTab] = useState('dashboard')
  const TabIcon = TABS.find(t => t.id === tab)?.icon || BarChart3

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Settings2 size={20} className="text-blue-600" />
              Configuración de asignaciones
            </h1>
            <p className="text-xs text-gray-400">Administrador · Reglas y generación masiva</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 border-t border-gray-100">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={15} />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'dashboard' && <TabDashboard />}
        {tab === 'reglas'    && <TabReglas />}
        {tab === 'generar'   && <TabGenerar />}
      </div>
    </div>
  )
}
