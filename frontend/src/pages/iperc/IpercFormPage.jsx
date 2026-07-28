import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Plus, Trash2, Save, ArrowLeft, AlertTriangle,
  Shield, HardHat, ChevronDown, ChevronUp, Info
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

// Tipos de peligro disponibles
const TIPOS_PELIGRO = [
  { value: 'fisico',           label: 'Físico',           desc: 'Ruido, vibración, temperatura, radiación' },
  { value: 'quimico',          label: 'Químico',          desc: 'Gases, vapores, polvos, líquidos' },
  { value: 'biologico',        label: 'Biológico',        desc: 'Virus, bacterias, hongos' },
  { value: 'ergonomico',       label: 'Ergonómico',       desc: 'Posturas, cargas, movimientos repetitivos' },
  { value: 'psicosocial',      label: 'Psicosocial',      desc: 'Estrés, fatiga, acoso laboral' },
  { value: 'mecanico',         label: 'Mecánico',         desc: 'Atrapamiento, corte, golpe' },
  { value: 'electrico',        label: 'Eléctrico',        desc: 'Contacto directo o indirecto' },
  { value: 'locativo',         label: 'Locativo',         desc: 'Caída, tropiezo, desorden' },
  { value: 'fenomeno_natural', label: 'Fenómeno natural', desc: 'Sismo, inundación, etc.' },
]

const TIPOS_CONTROL = [
  { value: 'eliminacion',     label: 'Eliminación',       prioridad: 1 },
  { value: 'sustitucion',     label: 'Sustitución',       prioridad: 2 },
  { value: 'ingenieria',      label: 'Ingeniería',        prioridad: 3 },
  { value: 'administrativo',  label: 'Administrativo',    prioridad: 4 },
  { value: 'epp',             label: 'EPP',               prioridad: 5 },
]

/**
 * Calcular clasificación visual de un peligro según IP × IS
 */
function clasificarRiesgo(ip, is) {
  const nivel = ip * is
  if (nivel <= 4)  return { nombre: 'trivial',     color: '#10b981', label: 'Trivial' }
  if (nivel <= 8)  return { nombre: 'tolerable',   color: '#84cc16', label: 'Tolerable' }
  if (nivel <= 16) return { nombre: 'moderado',    color: '#f59e0b', label: 'Moderado' }
  if (nivel <= 24) return { nombre: 'importante',  color: '#f97316', label: 'Importante' }
  return                  { nombre: 'intolerable', color: '#ef4444', label: 'Intolerable' }
}

export default function IpercFormPage() {
  const navigate    = useNavigate()
  const { id }      = useParams()
  const editMode    = !!id

  const [loading,     setLoading]     = useState(false)
  const [loadingInit, setLoadingInit] = useState(editMode)
  const [areas,       setAreas]       = useState([])
  const [codigoLabel, setCodigoLabel] = useState('')

  // Banco de datos IPERC — biblioteca reutilizable para autocompletado
  const [banco, setBanco] = useState({
    proceso: [], actividad: [], tarea: [],
    peligro: [], riesgo: [], consecuencia: [], control: [],
  })

  const [form, setForm] = useState({
    sede_id:           '',
    area_id:           '',
    titulo:            '',
    alcance:           '',
    metodologia:       'IPERC_LINEA_BASE',
    fecha_elaboracion: new Date().toISOString().split('T')[0],
    fecha_vigencia:    '',
    procesos: [],
  })

  useEffect(() => {
    cargarMaestros()
    cargarBanco()
  }, [])

  useEffect(() => {
    if (editMode) cargarIperc()
  }, [id])

  const cargarMaestros = async () => {
    try {
      const areasRes = await api.get('/areas', { params: { per_page: 1000 } })
      setAreas(areasRes.data.data || areasRes.data || [])
    } catch (_) {}
  }

  // Cargar todo el banco activo y agruparlo por tipo (una sola llamada)
  const cargarBanco = async () => {
    try {
      const { data } = await api.get('/iperc-banco', { params: { all: 1, activo: 1 } })
      const items = Array.isArray(data) ? data : (data.data || [])
      const grupos = { proceso: [], actividad: [], tarea: [], peligro: [], riesgo: [], consecuencia: [], control: [] }
      for (const it of items) {
        if (it.activo === false) continue
        if (grupos[it.tipo]) grupos[it.tipo].push(it)
      }
      setBanco(grupos)
    } catch (_) { /* silencioso: el banco es opcional */ }
  }

  // Buscar un ítem del banco por nombre exacto (case-insensitive)
  const buscarBanco = (tipo, valor) => {
    const v = (valor || '').trim().toLowerCase()
    if (!v) return null
    return (banco[tipo] || []).find(i => (i.nombre || '').trim().toLowerCase() === v) || null
  }

  const cargarIperc = async () => {
    setLoadingInit(true)
    try {
      const { data } = await api.get(`/iperc/${id}`)
      setCodigoLabel(data.codigo || '')
      setForm({
        sede_id:           data.sede_id  ? String(data.sede_id)  : '',
        area_id:           data.area_id  ? String(data.area_id)  : '',
        titulo:            data.titulo            ?? '',
        alcance:           data.alcance           ?? '',
        metodologia:       data.metodologia       ?? 'IPERC_LINEA_BASE',
        fecha_elaboracion: data.fecha_elaboracion
          ? String(data.fecha_elaboracion).substring(0, 10)
          : new Date().toISOString().split('T')[0],
        fecha_vigencia: data.fecha_vigencia
          ? String(data.fecha_vigencia).substring(0, 10)
          : '',
        procesos: (data.procesos ?? []).map(proc => ({
          proceso:        proc.proceso        ?? '',
          actividad:      proc.actividad      ?? '',
          tarea:          proc.tarea          ?? '',
          tipo_actividad: proc.tipo_actividad ?? 'rutinaria',
          expandido:      true,
          peligros: (proc.peligros ?? []).map(pel => ({
            tipo_peligro:            pel.tipo_peligro            ?? 'fisico',
            descripcion_peligro:     pel.descripcion_peligro     ?? '',
            riesgo:                  pel.riesgo                  ?? '',
            consecuencia:            pel.consecuencia            ?? '',
            prob_personas_expuestas: pel.prob_personas_expuestas ?? 1,
            prob_procedimientos:     pel.prob_procedimientos     ?? 1,
            prob_capacitacion:       pel.prob_capacitacion       ?? 1,
            prob_exposicion:         pel.prob_exposicion         ?? 1,
            indice_severidad:        pel.indice_severidad        ?? 1,
            ip_residual:             pel.ip_residual != null ? String(pel.ip_residual) : '',
            is_residual:             pel.is_residual != null ? String(pel.is_residual) : '',
            controles: (pel.controles ?? []).map(c => ({
              tipo_control: c.tipo_control ?? 'administrativo',
              descripcion:  c.descripcion  ?? '',
            })),
          })),
        })),
      })
    } catch (err) {
      toast.error('No se pudo cargar el IPERC para editar')
      navigate('/iperc')
    } finally {
      setLoadingInit(false)
    }
  }

  // ── Manejo de procesos ──────────────────────────────────────────

  const agregarProceso = () => {
    setForm({
      ...form,
      procesos: [
        ...form.procesos,
        {
          proceso:        '',
          actividad:      '',
          tarea:          '',
          tipo_actividad: 'rutinaria',
          peligros:       [],
          expandido:      true,
        },
      ],
    })
  }

  const actualizarProceso = (idx, campo, valor) => {
    const procesos = [...form.procesos]
    procesos[idx][campo] = valor
    setForm({ ...form, procesos })
  }

  const eliminarProceso = (idx) => {
    setForm({ ...form, procesos: form.procesos.filter((_, i) => i !== idx) })
  }

  // ── Manejo de peligros ──────────────────────────────────────────

  const agregarPeligro = (procIdx) => {
    const procesos = [...form.procesos]
    procesos[procIdx].peligros.push({
      tipo_peligro:            'fisico',
      descripcion_peligro:     '',
      riesgo:                  '',
      consecuencia:            '',
      prob_personas_expuestas: 1,
      prob_procedimientos:     1,
      prob_capacitacion:       1,
      prob_exposicion:         1,
      indice_severidad:        1,
      ip_residual:             '',
      is_residual:             '',
      controles:               [],
    })
    setForm({ ...form, procesos })
  }

  const actualizarPeligro = (procIdx, pelIdx, campo, valor) => {
    const procesos = [...form.procesos]
    const peligro  = procesos[procIdx].peligros[pelIdx]
    peligro[campo] = valor

    // Smart-fill: al escribir/elegir un peligro del banco, autocompletar su tipo
    if (campo === 'descripcion_peligro') {
      const item = buscarBanco('peligro', valor)
      const tiposValidos = TIPOS_PELIGRO.map(t => t.value)
      if (item?.categoria && tiposValidos.includes(item.categoria)) {
        peligro.tipo_peligro = item.categoria
      }
      // Si el banco trae un riesgo/consecuencia sugerido en la descripción y el campo está vacío
      if (item?.descripcion && !peligro.riesgo) peligro.riesgo = item.descripcion
    }

    setForm({ ...form, procesos })
  }

  const eliminarPeligro = (procIdx, pelIdx) => {
    const procesos = [...form.procesos]
    procesos[procIdx].peligros.splice(pelIdx, 1)
    setForm({ ...form, procesos })
  }

  // ── Manejo de controles ─────────────────────────────────────────

  const agregarControl = (procIdx, pelIdx) => {
    const procesos = [...form.procesos]
    procesos[procIdx].peligros[pelIdx].controles.push({
      tipo_control: 'administrativo',
      descripcion:  '',
    })
    setForm({ ...form, procesos })
  }

  const actualizarControl = (procIdx, pelIdx, ctrlIdx, campo, valor) => {
    const procesos = [...form.procesos]
    const control  = procesos[procIdx].peligros[pelIdx].controles[ctrlIdx]
    control[campo] = valor

    // Smart-fill: al elegir un control del banco, autocompletar su jerarquía
    if (campo === 'descripcion') {
      const item = buscarBanco('control', valor)
      const tiposValidos = TIPOS_CONTROL.map(t => t.value)
      if (item?.tipo_control && tiposValidos.includes(item.tipo_control)) {
        control.tipo_control = item.tipo_control
      }
    }

    setForm({ ...form, procesos })
  }

  // ── Guardar ─────────────────────────────────────────────────────

  const handleGuardar = async () => {
    if (!form.area_id || !form.titulo) {
      toast.error('Complete los campos obligatorios')
      return
    }

    if (form.procesos.length === 0) {
      toast.error('Agregue al menos un proceso con peligros')
      return
    }

    setLoading(true)
    try {
      const area = areas.find(a => a.id === Number(form.area_id))
      const payload = {
        ...form,
        sede_id: area?.sede_id || form.sede_id,
        procesos: form.procesos.map(p => ({
          ...p,
          peligros: p.peligros.map(pel => ({
            ...pel,
            prob_personas_expuestas: Number(pel.prob_personas_expuestas),
            prob_procedimientos:      Number(pel.prob_procedimientos),
            prob_capacitacion:        Number(pel.prob_capacitacion),
            prob_exposicion:          Number(pel.prob_exposicion),
            indice_severidad:         Number(pel.indice_severidad),
            ip_residual:              pel.ip_residual ? Number(pel.ip_residual) : null,
            is_residual:              pel.is_residual ? Number(pel.is_residual) : null,
          })),
        })),
      }

      if (editMode) {
        const { data } = await api.put(`/iperc/${id}`, payload)
        toast.success(`IPERC ${data.codigo} actualizado correctamente`)
        navigate(`/iperc/${data.id}`)
      } else {
        const { data } = await api.post('/iperc', payload)
        toast.success(`IPERC ${data.codigo} creado correctamente`)
        navigate(`/iperc/${data.id}`)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || (editMode ? 'Error al actualizar IPERC' : 'Error al crear IPERC'))
    } finally {
      setLoading(false)
    }
  }

  if (loadingInit) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block w-6 h-6 border-2 border-roka-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-slate-500 text-sm">Cargando IPERC...</p>
        </div>
      </div>
    )
  }

  // Opciones únicas de datalist para un tipo del banco
  const opcionesBanco = (tipo) => {
    const vistos = new Set()
    const out = []
    for (const it of (banco[tipo] || [])) {
      const n = (it.nombre || '').trim()
      if (n && !vistos.has(n.toLowerCase())) { vistos.add(n.toLowerCase()); out.push(it) }
    }
    return out
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">

      {/* ── Datalists del banco (autocompletado global por id) ───────── */}
      <datalist id="iperc-banco-proceso">
        {opcionesBanco('proceso').map(i => <option key={i.id} value={i.nombre} />)}
      </datalist>
      <datalist id="iperc-banco-actividad">
        {opcionesBanco('actividad').map(i => <option key={i.id} value={i.nombre} />)}
      </datalist>
      <datalist id="iperc-banco-peligro">
        {opcionesBanco('peligro').map(i => (
          <option key={i.id} value={i.nombre}>{i.categoria ? `(${i.categoria})` : ''}</option>
        ))}
      </datalist>
      <datalist id="iperc-banco-riesgo">
        {opcionesBanco('riesgo').map(i => <option key={i.id} value={i.nombre} />)}
      </datalist>
      <datalist id="iperc-banco-control">
        {opcionesBanco('control').map(i => (
          <option key={i.id} value={i.nombre}>{i.tipo_control ? i.tipo_control : ''}</option>
        ))}
      </datalist>

      {/* ── Encabezado ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/iperc')}
            className="btn-back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              {editMode ? `Editar IPERC${codigoLabel ? ` — ${codigoLabel}` : ''}` : 'Nuevo IPERC'}
            </h1>
            <p className="text-slate-400 text-sm">Matriz de identificación de peligros y evaluación de riesgos</p>
          </div>
        </div>
      </div>

      {/* ── Datos generales ────────────────────────────────────────── */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Shield size={16} className="text-roka-400" />
          Datos generales
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Área operativa <span className="text-red-400">*</span>
            </label>
            <select
              value={form.area_id}
              onChange={(e) => setForm({ ...form, area_id: e.target.value })}
              className="input"
              required
            >
              <option value="">Seleccione un área</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Metodología <span className="text-red-400">*</span>
            </label>
            <select
              value={form.metodologia}
              onChange={(e) => setForm({ ...form, metodologia: e.target.value })}
              className="input"
            >
              <option value="IPERC_LINEA_BASE">Línea base</option>
              <option value="IPERC_CONTINUO">Continuo</option>
              <option value="IPERC_ESPECIFICO">Específico</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ej: IPERC de operaciones de almacén 2024"
              className="input"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Alcance
            </label>
            <textarea
              value={form.alcance}
              onChange={(e) => setForm({ ...form, alcance: e.target.value })}
              placeholder="Describa el alcance de esta evaluación de riesgos..."
              rows={3}
              className="input resize-y"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Fecha de elaboración
            </label>
            <input
              type="date"
              value={form.fecha_elaboracion}
              onChange={(e) => setForm({ ...form, fecha_elaboracion: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Fecha de próxima revisión
            </label>
            <input
              type="date"
              value={form.fecha_vigencia}
              onChange={(e) => setForm({ ...form, fecha_vigencia: e.target.value })}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* ── Procesos y peligros ────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-200 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" />
            Procesos y peligros
            <span className="text-xs text-slate-500 font-normal">({form.procesos.length})</span>
          </h2>
          <button onClick={agregarProceso} className="btn-secondary flex items-center gap-2">
            <Plus size={14} />
            Agregar proceso
          </button>
        </div>

        {form.procesos.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-500">
            <Info size={24} className="mx-auto mb-2 text-slate-600" />
            Aún no has agregado procesos. Cada IPERC debe tener al menos un proceso con sus peligros.
          </div>
        ) : (
          <div className="space-y-3">
            {form.procesos.map((proc, procIdx) => (
              <ProcesoCard
                key={procIdx}
                proceso={proc}
                idx={procIdx}
                onActualizar={actualizarProceso}
                onEliminar={eliminarProceso}
                onAgregarPeligro={agregarPeligro}
                onActualizarPeligro={actualizarPeligro}
                onEliminarPeligro={eliminarPeligro}
                onAgregarControl={agregarControl}
                onActualizarControl={actualizarControl}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Acciones ───────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pb-4">
        <button onClick={() => navigate('/iperc')} className="btn-secondary" disabled={loading}>
          Cancelar
        </button>
        <button onClick={handleGuardar} className="btn-primary flex items-center gap-2" disabled={loading}>
          <Save size={14} />
          {loading ? 'Guardando...' : editMode ? 'Guardar cambios' : 'Guardar IPERC'}
        </button>
      </div>
    </div>
  )
}

// ─── Componente ProcesoCard ─────────────────────────────────────────

function ProcesoCard({
  proceso, idx,
  onActualizar, onEliminar,
  onAgregarPeligro, onActualizarPeligro, onEliminarPeligro,
  onAgregarControl, onActualizarControl,
}) {
  return (
    <div className="border border-slate-800 rounded-xl bg-slate-900/50">
      {/* Header del proceso */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-800">
        <button
          onClick={() => onActualizar(idx, 'expandido', !proceso.expandido)}
          className="text-slate-400 hover:text-slate-200"
        >
          {proceso.expandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            type="text"
            list="iperc-banco-proceso"
            value={proceso.proceso}
            onChange={(e) => onActualizar(idx, 'proceso', e.target.value)}
            placeholder="Proceso"
            className="input text-sm"
          />
          <input
            type="text"
            list="iperc-banco-actividad"
            value={proceso.actividad}
            onChange={(e) => onActualizar(idx, 'actividad', e.target.value)}
            placeholder="Actividad"
            className="input text-sm"
          />
          <select
            value={proceso.tipo_actividad}
            onChange={(e) => onActualizar(idx, 'tipo_actividad', e.target.value)}
            className="input text-sm"
          >
            <option value="rutinaria">Rutinaria</option>
            <option value="no_rutinaria">No rutinaria</option>
            <option value="emergencia">Emergencia</option>
          </select>
        </div>
        <button
          onClick={() => onEliminar(idx)}
          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Peligros del proceso */}
      {proceso.expandido && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">
              Peligros identificados ({proceso.peligros.length})
            </p>
            <button
              onClick={() => onAgregarPeligro(idx)}
              className="text-xs text-roka-400 hover:text-roka-300 flex items-center gap-1"
            >
              <Plus size={12} />
              Agregar peligro
            </button>
          </div>

          {proceso.peligros.map((pel, pelIdx) => {
            const ip = Number(pel.prob_personas_expuestas) + Number(pel.prob_procedimientos) +
                        Number(pel.prob_capacitacion) + Number(pel.prob_exposicion)
            const clasif = clasificarRiesgo(ip, Number(pel.indice_severidad))

            return (
              <div key={pelIdx} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 space-y-3">
                {/* Línea 1 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <select
                    value={pel.tipo_peligro}
                    onChange={(e) => onActualizarPeligro(idx, pelIdx, 'tipo_peligro', e.target.value)}
                    className="input text-sm"
                  >
                    {TIPOS_PELIGRO.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    list="iperc-banco-peligro"
                    value={pel.descripcion_peligro}
                    onChange={(e) => onActualizarPeligro(idx, pelIdx, 'descripcion_peligro', e.target.value)}
                    placeholder="Descripción del peligro"
                    className="input text-sm"
                  />
                  <input
                    type="text"
                    list="iperc-banco-riesgo"
                    value={pel.riesgo}
                    onChange={(e) => onActualizarPeligro(idx, pelIdx, 'riesgo', e.target.value)}
                    placeholder="Riesgo / consecuencia"
                    className="input text-sm"
                  />
                </div>

                {/* Evaluación de riesgo */}
                <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Evaluación de probabilidad (1=bajo, 4=alto)
                  </p>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[
                      { key: 'prob_personas_expuestas', label: 'Personas' },
                      { key: 'prob_procedimientos',     label: 'Procedim.' },
                      { key: 'prob_capacitacion',       label: 'Capacit.' },
                      { key: 'prob_exposicion',         label: 'Exposición' },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
                        <select
                          value={pel[f.key]}
                          onChange={(e) => onActualizarPeligro(idx, pelIdx, f.key, e.target.value)}
                          className="input text-xs"
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Severidad (1-4)</label>
                      <select
                        value={pel.indice_severidad}
                        onChange={(e) => onActualizarPeligro(idx, pelIdx, 'indice_severidad', e.target.value)}
                        className="input text-xs"
                      >
                        <option value={1}>1 - Sin incapacidad</option>
                        <option value={2}>2 - Incapacidad temporal</option>
                        <option value={3}>3 - Incapacidad permanente</option>
                        <option value={4}>4 - Fatalidad</option>
                      </select>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">IP × IS</p>
                      <p className="text-slate-200 font-bold tabular-nums">
                        {ip} × {pel.indice_severidad} = {ip * Number(pel.indice_severidad)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Clasificación</p>
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset"
                        style={{
                          background: `${clasif.color}20`,
                          color: clasif.color,
                          boxShadow: `inset 0 0 0 1px ${clasif.color}40`,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: clasif.color }} />
                        {clasif.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Controles */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Controles aplicados ({pel.controles.length})
                    </p>
                    <button
                      onClick={() => onAgregarControl(idx, pelIdx)}
                      className="text-xs text-roka-400 hover:text-roka-300 flex items-center gap-1"
                    >
                      <Plus size={10} />
                      Agregar control
                    </button>
                  </div>
                  {pel.controles.map((ctrl, ctrlIdx) => (
                    <div key={ctrlIdx} className="grid grid-cols-3 gap-2 mb-1">
                      <select
                        value={ctrl.tipo_control}
                        onChange={(e) => onActualizarControl(idx, pelIdx, ctrlIdx, 'tipo_control', e.target.value)}
                        className="input text-xs"
                      >
                        {TIPOS_CONTROL.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.prioridad}. {t.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        list="iperc-banco-control"
                        value={ctrl.descripcion}
                        onChange={(e) => onActualizarControl(idx, pelIdx, ctrlIdx, 'descripcion', e.target.value)}
                        placeholder="Descripción del control"
                        className="input text-xs col-span-2"
                      />
                    </div>
                  ))}
                </div>

                {/* Riesgo residual post-controles */}
                <div className="border-t border-slate-700/50 pt-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Riesgo residual (post-controles) — opcional
                  </p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">IP Residual</label>
                      <select
                        value={pel.ip_residual}
                        onChange={(e) => onActualizarPeligro(idx, pelIdx, 'ip_residual', e.target.value)}
                        className="input text-xs w-28"
                      >
                        <option value="">— sin eval.</option>
                        <option value="1">1 – Baja</option>
                        <option value="2">2 – Media</option>
                        <option value="3">3 – Alta</option>
                        <option value="4">4 – Muy alta</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">IS Residual</label>
                      <select
                        value={pel.is_residual}
                        onChange={(e) => onActualizarPeligro(idx, pelIdx, 'is_residual', e.target.value)}
                        className="input text-xs w-36"
                      >
                        <option value="">— sin eval.</option>
                        <option value="1">1 – Sin incapacidad</option>
                        <option value="2">2 – Incap. temporal</option>
                        <option value="3">3 – Incap. permanente</option>
                        <option value="4">4 – Fatalidad</option>
                      </select>
                    </div>
                    {pel.ip_residual && pel.is_residual && (() => {
                      const nivelRes = Number(pel.ip_residual) * Number(pel.is_residual)
                      const clasifRes = clasificarRiesgo(Number(pel.ip_residual), Number(pel.is_residual))
                      return (
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-xs text-slate-400 mb-1">NR Residual</p>
                            <p className="text-slate-200 font-bold tabular-nums">{nivelRes}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Clasificación</p>
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset"
                              style={{
                                background: `${clasifRes.color}20`,
                                color: clasifRes.color,
                                boxShadow: `inset 0 0 0 1px ${clasifRes.color}40`,
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: clasifRes.color }} />
                              {clasifRes.label}
                            </span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => onEliminarPeligro(idx, pelIdx)}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <Trash2 size={10} />
                    Eliminar peligro
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
