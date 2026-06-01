import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, Scale, ChevronDown, Loader2, Briefcase, AlertTriangle } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import LeyReferenciaModal from '../../components/salud/LeyReferenciaModal'

// ── Estilos base ──────────────────────────────────────────────────
const inp   = 'w-full bg-slate-700 border border-slate-500 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500 placeholder-slate-400'
const inpRO = 'w-full bg-slate-800 border border-slate-600 text-slate-400 rounded-lg px-3 py-2 text-sm cursor-not-allowed'
const lbl   = 'block text-[11px] text-slate-300 mb-1'

// ── Edad calculada ────────────────────────────────────────────────
function calcularEdad(fecha) {
  if (!fecha) return ''
  const hoy = new Date(), nac = new Date(fecha)
  let e = hoy.getFullYear() - nac.getFullYear()
  if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) e--
  return `${e} años`
}

// ── TABS ──────────────────────────────────────────────────────────
const TABS = ['Datos personales', 'Historia laboral', 'Antecedentes']

// ── Tab 1: Datos personales ───────────────────────────────────────
function TabDatosPersonales({ personal, ficha, setPersonal, setFicha, onNext, onGuardar, saving }) {
  const set  = (k, v) => setPersonal(p => ({ ...p, [k]: v }))
  const setF = (k, v) => setFicha(f => ({ ...f, [k]: v }))

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-600 p-5 space-y-4">
      <p className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
        <span className="text-slate-500">👤</span> Datos personales del trabajador
      </p>

      {/* Apellidos y nombres + DNI */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className={lbl}>Apellidos y nombres</label>
          <input value={`${personal.apellidos || ''}, ${personal.nombres || ''}`}
            onChange={e => {
              const [ap, ...nm] = e.target.value.split(',')
              set('apellidos', ap.trim())
              set('nombres', nm.join(',').trim())
            }}
            placeholder="Apellidos, Nombres"
            className={inp} />
        </div>
        <div>
          <label className={lbl}>DNI</label>
          <input value={personal.dni || ''} readOnly className={inpRO} />
        </div>
      </div>

      {/* Fecha nac + Edad + Sexo + Estado civil */}
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className={lbl}>Fecha de nacimiento</label>
          <input type="date" value={personal.fecha_nacimiento || ''}
            onChange={e => set('fecha_nacimiento', e.target.value)}
            className={inp} />
        </div>
        <div>
          <label className={lbl}>Edad</label>
          <input value={calcularEdad(personal.fecha_nacimiento)} readOnly
            className={inpRO} />
        </div>
        <div>
          <label className={lbl}>Sexo</label>
          <select value={personal.genero || ''} onChange={e => set('genero', e.target.value)}
            className={inp + ' cursor-pointer bg-slate-700'}>
            <option value="">--</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Estado civil</label>
          <select value={ficha.estado_civil || ''} onChange={e => setF('estado_civil', e.target.value)}
            className={inp + ' cursor-pointer bg-slate-700'}>
            <option value="">--</option>
            <option value="soltero">Soltero</option>
            <option value="casado">Casado</option>
            <option value="conviviente">Conviviente</option>
            <option value="divorciado">Divorciado</option>
            <option value="viudo">Viudo</option>
          </select>
        </div>
      </div>

      {/* Dirección + Teléfono */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className={lbl}>Dirección</label>
          <input value={personal.direccion || ''} onChange={e => set('direccion', e.target.value)}
            placeholder="Dirección completa" className={inp} />
        </div>
        <div>
          <label className={lbl}>Teléfono</label>
          <input value={personal.telefono || ''} onChange={e => set('telefono', e.target.value)}
            placeholder="999 999 999" className={inp} />
        </div>
      </div>

      {/* Empresa + Área/Puesto */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Empresa</label>
          <input value={personal.empresa?.razon_social || personal.empresa?.nombre || '—'}
            readOnly className={inpRO} />
        </div>
        <div>
          <label className={lbl}>Área / Puesto</label>
          <input value={`${personal.area?.nombre || ''} / ${personal.cargo?.nombre || ''}`}
            readOnly className={inpRO} />
        </div>
      </div>

      {/* Fecha ingreso + Tipo contrato + Turno */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={lbl}>Fecha de ingreso</label>
          <input type="date" value={personal.fecha_ingreso || ''}
            readOnly className={inpRO} />
        </div>
        <div>
          <label className={lbl}>Tipo de contrato</label>
          <select value={personal.tipo_contrato || ''} onChange={e => set('tipo_contrato', e.target.value)}
            className={inp + ' cursor-pointer bg-slate-700'}>
            <option value="">--</option>
            {['Indefinido','Plazo fijo','Por obra','Part time','Honorarios','Practicante'].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={lbl}>Turno</label>
          <select value={ficha.turno || 'diurno'} onChange={e => setF('turno', e.target.value)}
            className={inp + ' cursor-pointer bg-slate-700'}>
            <option value="diurno">Diurno</option>
            <option value="nocturno">Nocturno</option>
            <option value="rotativo">Rotativo</option>
          </select>
        </div>
      </div>

      {/* Botones */}
      <div className="flex items-center gap-3 pt-2">
        <button type="button" onClick={onGuardar} disabled={saving}
          className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Guardar ficha ↗
        </button>
        <button type="button" onClick={() => window.history.back()}
          className="px-4 py-2 border border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-sm">
          Cancelar
        </button>
      </div>
      <div className="flex justify-center pt-1">
        <button type="button" onClick={onNext}
          className="w-8 h-8 bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
          <ChevronDown size={16} />
        </button>
      </div>
    </div>
  )
}

// ── Tab 2: Historia laboral ───────────────────────────────────────
const EXPOSICIONES = [
  ['Ruido industrial',      'Polvo / partículas'],
  ['Químicos / solventes',  'Radiaciones no ionizantes'],
  ['Esfuerzo físico intenso','Posturas forzadas'],
  ['Vibraciones',           'Temperatura extrema'],
]

function TabHistoriaLaboral({ ficha, setFicha, onNext, onGuardar, saving }) {
  const exp = ficha.exposiciones_laborales || []
  const toggle = (v) => setFicha(f => {
    const arr = f.exposiciones_laborales || []
    return { ...f, exposiciones_laborales: arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v] }
  })

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-600 p-5 space-y-4">
      <p className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
        <Briefcase size={13} className="text-slate-500" /> Exposición a riesgos ocupacionales
      </p>

      <div className="space-y-2">
        {EXPOSICIONES.map(([izq, der]) => (
          <div key={izq} className="grid grid-cols-2 gap-3">
            {[izq, der].map(item => (
              <label key={item}
                className="flex items-center gap-2.5 bg-slate-700 border border-slate-500 hover:border-slate-300 rounded-lg px-3 py-2.5 cursor-pointer transition-colors">
                <input type="checkbox" checked={exp.includes(item)} onChange={() => toggle(item)}
                  className="w-4 h-4 rounded border-slate-600 text-roka-500 bg-[#0f1420] accent-roka-500 flex-shrink-0" />
                <span className="text-sm text-white">{item}</span>
              </label>
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="button" onClick={onGuardar} disabled={saving}
          className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Guardar ficha ↗
        </button>
        <button type="button" onClick={() => window.history.back()}
          className="px-4 py-2 border border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-sm">
          Cancelar
        </button>
      </div>
      <div className="flex justify-center pt-1">
        <button type="button" onClick={onNext}
          className="w-8 h-8 bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
          <ChevronDown size={16} />
        </button>
      </div>
    </div>
  )
}

// ── Tab 3: Antecedentes ───────────────────────────────────────────
function TabAntecedentes({ ficha, setFicha, onGuardar, saving }) {
  const setF = (k, v) => setFicha(f => ({ ...f, [k]: v }))

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-600 p-5 space-y-4">
      <p className="text-sm font-semibold text-white">Antecedentes médicos</p>

      {/* Campos de texto simples */}
      {[
        { key: 'enfermedades_cronicas',  label: 'Enfermedades crónicas',   placeholder: 'Ej: hipertensión, diabetes...', multi: false },
        { key: 'cirugias',               label: 'Cirugías previas',          placeholder: 'Ej: apendicectomía 2018...',   multi: false },
        { key: 'alergias',               label: 'Alergias',                  placeholder: 'Ej: penicilina, látex...',     multi: false },
        { key: 'medicamentos_actuales',  label: 'Medicación actual',         placeholder: 'Medicamentos que toma actualmente...', multi: true },
      ].map(({ key, label, placeholder, multi }) => (
        <div key={key}>
          <label className={lbl}>{label}</label>
          {multi ? (
            <textarea value={ficha[key] || ''} onChange={e => setF(key, e.target.value)}
              rows={3} placeholder={placeholder}
              className={inp + ' resize-none'} />
          ) : (
            <input value={ficha[key] || ''} onChange={e => setF(key, e.target.value)}
              placeholder={placeholder} className={inp} />
          )}
        </div>
      ))}

      {/* Accidentes de trabajo */}
      <div>
        <p className={lbl}>¿Ha tenido accidentes de trabajo?</p>
        <div className="flex items-center gap-5 mt-1">
          {['si', 'no'].map(v => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                (ficha.accidente_trabajo || 'no') === v
                  ? 'border-roka-500 bg-roka-500'
                  : 'border-slate-500 bg-transparent'
              }`}
                onClick={() => setF('accidente_trabajo', v)}>
                {(ficha.accidente_trabajo || 'no') === v && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
              <span className="text-sm text-white">{v === 'si' ? 'Sí' : 'No'}</span>
            </label>
          ))}
        </div>
        {ficha.accidente_trabajo === 'si' && (
          <input value={ficha.accidentes_previos || ''} onChange={e => setF('accidentes_previos', e.target.value)}
            placeholder="Describe brevemente el accidente..." className={inp + ' mt-2'} />
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="button" onClick={onGuardar} disabled={saving}
          className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Guardar ficha ↗
        </button>
        <button type="button" onClick={() => window.history.back()}
          className="px-4 py-2 border border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-sm">
          Cancelar
        </button>
      </div>
      <div className="flex justify-center pt-1">
        <div className="w-8 h-8 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-600">
          <ChevronDown size={16} />
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────
export default function FichaMedicaFormPage() {
  const navigate  = useNavigate()
  const [searchParams] = useSearchParams()
  const personalIdParam = searchParams.get('personal_id') // admin mode
  const [tab, setTab]         = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [showLey, setShowLey] = useState(false)
  const [personal, setPersonal] = useState({})
  const [ficha, setFicha]     = useState({ accidente_trabajo: 'no' })

  useEffect(() => { cargar() }, [])

  const [sinVinculo, setSinVinculo] = useState(false)

  const cargar = async () => {
    setLoading(true)
    try {
      const params = personalIdParam ? { personal_id: personalIdParam } : {}
      const { data } = await api.get('/salud/ficha-medica', { params })
      setPersonal(data.personal || {})
      const f = data.ficha || {}
      setFicha({ accidente_trabajo: 'no', ...f })
    } catch (err) {
      if (err.response?.status === 422) {
        setSinVinculo(true)
      } else {
        toast.error('Error al cargar ficha médica')
      }
    } finally { setLoading(false) }
  }

  const guardar = async () => {
    setSaving(true)
    try {
      const payload = personalIdParam
        ? { ...personal, ...ficha, personal_id: personalIdParam }
        : { ...personal, ...ficha }
      await api.put('/salud/ficha-medica', payload)
      toast.success('Ficha médica guardada')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const irSiguiente = () => setTab(t => Math.min(t + 1, TABS.length - 1))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (sinVinculo) return (
    <div className="max-w-lg mx-auto mt-16 text-center space-y-5">
      <div className="w-16 h-16 bg-amber-100 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto">
        <AlertTriangle size={28} className="text-amber-500" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">Usuario sin trabajador vinculado</h2>
        <p className="text-gray-500 text-sm mt-2">
          Tu cuenta de usuario no está vinculada a ningún trabajador del sistema.<br />
          La ficha médica requiere esta vinculación para funcionar.
        </p>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left text-sm text-blue-700 space-y-1">
        <p className="font-semibold">¿Cómo solucionar esto?</p>
        <p>Un administrador debe ir a <strong>Configuración → Usuarios</strong>, editar tu usuario y seleccionar el trabajador correspondiente en el campo <strong>"Trabajador vinculado"</strong>.</p>
      </div>
      <div className="flex gap-3 justify-center">
        <button onClick={() => navigate('/salud')}
          className="px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg text-sm">
          ← Volver
        </button>
        <button onClick={() => navigate('/configuracion/usuarios')}
          className="px-4 py-2 bg-roka-500 hover:bg-roka-600 text-white rounded-lg text-sm font-medium">
          Ir a Usuarios
        </button>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(personalIdParam ? '/salud/fichas-medicas' : '/salud/mi-panel')} className="btn-back">
            <ArrowLeft size={14} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">
              {personalIdParam ? `Ficha médica — ${personal.nombres || ''} ${personal.apellidos || ''}` : 'Mi ficha médica'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {personalIdParam ? `DNI: ${personal.dni || '—'} · ${personal.area?.nombre || ''}` : 'Datos clínicos del trabajador · Confidencial'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowLey(true)}
            className="flex items-center gap-1.5 border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 px-3 py-1.5 rounded-lg text-sm transition-colors">
            <Scale size={13} /> Consultar Ley ↗
          </button>
          <button onClick={() => navigate('/salud/nuevo')}
            className="flex items-center gap-1.5 bg-roka-500 hover:bg-roka-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
            + Nuevo examen
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-600">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${i === tab
              ? 'border-roka-500 text-roka-400'
              : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === 0 && (
        <TabDatosPersonales
          personal={personal} ficha={ficha}
          setPersonal={setPersonal} setFicha={setFicha}
          onNext={irSiguiente} onGuardar={guardar} saving={saving}
        />
      )}
      {tab === 1 && (
        <TabHistoriaLaboral
          ficha={ficha} setFicha={setFicha}
          onNext={irSiguiente} onGuardar={guardar} saving={saving}
        />
      )}
      {tab === 2 && (
        <TabAntecedentes
          ficha={ficha} setFicha={setFicha}
          onGuardar={guardar} saving={saving}
        />
      )}

      {showLey && <LeyReferenciaModal onClose={() => setShowLey(false)} />}
    </div>
  )
}
