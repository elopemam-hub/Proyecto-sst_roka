import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const TIPOS_CONTRATO = [
  { value: 'indefinido',    label: 'Indefinido' },
  { value: 'plazo_fijo',    label: 'Plazo fijo' },
  { value: 'por_obra',      label: 'Por obra' },
  { value: 'practicas',     label: 'Prácticas' },
  { value: 'locacion',      label: 'Locación de servicios' },
]

const ESTADOS = [
  { value: 'activo',      label: 'Activo' },
  { value: 'inactivo',    label: 'Inactivo' },
  { value: 'vacaciones',  label: 'Vacaciones' },
  { value: 'licencia',    label: 'Licencia' },
]

export default function PersonalFormPage() {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const esEdicion = Boolean(id)

  const [form, setForm] = useState({
    nombres: '', apellidos: '', dni: '', dni_vencimiento: '', fecha_nacimiento: '', genero: '',
    telefono: '', licencia_conducir: '', licencia_categoria: '', licencia_vencimiento: '', email: '', direccion: '',
    area_id: '', cargo_id: '', cargo: '',
    fecha_ingreso: new Date().toLocaleDateString('en-CA'),
    tipo_contrato: 'indefinido', estado: 'activo',
  })
  const [areas, setAreas]     = useState([])
  const [cargos, setCargos]   = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const [rAreas, rCargos] = await Promise.all([
          api.get('/areas'),
          api.get('/cargos'),
        ])
        setAreas(rAreas.data.data || rAreas.data)
        setCargos(rCargos.data || [])

        if (esEdicion) {
          const { data } = await api.get(`/personal/${id}`)
          setForm({
            nombres:        data.nombres || '',
            apellidos:      data.apellidos || '',
            dni:            data.dni || '',
            fecha_nacimiento: data.fecha_nacimiento || '',
            dni_vencimiento:  data.dni_vencimiento || '',
            genero:           data.genero || '',
            telefono:           data.telefono || '',
            licencia_conducir:   data.licencia_conducir || '',
            licencia_categoria:  data.licencia_categoria || '',
            licencia_vencimiento:data.licencia_vencimiento || '',
            email:              data.email || '',
            direccion:      data.direccion || '',
            area_id:        data.area_id || '',
            cargo_id:       data.cargo_id || '',
            cargo:          '',
            fecha_ingreso:  data.fecha_ingreso || '',
            tipo_contrato:  data.tipo_contrato || 'indefinido',
            estado:         data.estado || 'activo',
          })
        }
      } catch { toast.error('Error al cargar datos') } finally { setLoading(false) }
    }
    init()
  }, [id])

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombres.trim() || !form.apellidos.trim() || !form.dni.trim()) {
      toast.error('Nombres, apellidos y DNI son obligatorios')
      return
    }
    if (form.dni.length !== 8) {
      toast.error('El DNI debe tener exactamente 8 dígitos')
      return
    }

    const payload = { ...form }
    // Si se seleccionó cargo del listado, no enviar texto libre
    if (payload.cargo_id) delete payload.cargo
    // Si se escribió cargo libre sin seleccionar del listado, limpiar cargo_id
    if (!payload.cargo_id && payload.cargo) delete payload.cargo_id

    setSaving(true)
    try {
      if (esEdicion) {
        await api.put(`/personal/${id}`, payload)
        toast.success('Personal actualizado')
        navigate(`/personal/${id}`)
      } else {
        const { data } = await api.post('/personal', payload)
        toast.success('Personal registrado correctamente')
        navigate(`/personal/${data.id}`)
      }
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors) {
        const first = Object.values(errors)[0]
        toast.error(Array.isArray(first) ? first[0] : first)
      } else {
        toast.error(err.response?.data?.message || 'Error al guardar')
      }
    } finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-back">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">{esEdicion ? 'Editar Personal' : 'Nuevo Personal'}</h1>
          <p className="text-sm text-slate-400">Registro de trabajador · Ley 29783</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos Personales */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Datos Personales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nombres <span className="text-red-400">*</span></label>
              <input type="text" value={form.nombres} onChange={e => set('nombres', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Apellidos <span className="text-red-400">*</span></label>
              <input type="text" value={form.apellidos} onChange={e => set('apellidos', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">DNI <span className="text-red-400">*</span></label>
              <input type="text" value={form.dni} onChange={e => set('dni', e.target.value)}
                maxLength={8} placeholder="12345678"
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-roka-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Vencimiento del DNI</label>
              <input type="date" value={form.dni_vencimiento || ''} onChange={e => set('dni_vencimiento', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
              {form.dni_vencimiento && (() => {
                const dias = Math.ceil((new Date(form.dni_vencimiento) - new Date()) / 86400000)
                if (dias < 0)   return <p className="text-xs text-red-400 mt-1">⚠ DNI vencido hace {Math.abs(dias)} días</p>
                if (dias <= 30) return <p className="text-xs text-amber-400 mt-1">⚠ Vence en {dias} días</p>
                return null
              })()}
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fecha de nacimiento</label>
              <input type="date" value={form.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Género</label>
              <select value={form.genero} onChange={e => set('genero', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
                <option value="">Seleccionar...</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Celular / Teléfono</label>
              <input type="text" value={form.telefono} onChange={e => set('telefono', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Dirección</label>
              <input type="text" value={form.direccion} onChange={e => set('direccion', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
            </div>
            {/* Licencia de conducir */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">N° Licencia de conducir</label>
              <input type="text" value={form.licencia_conducir || ''} onChange={e => set('licencia_conducir', e.target.value)}
                placeholder="Ej: Q12345678"
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fecha de vencimiento</label>
              <input type="date" value={form.licencia_vencimiento || ''} onChange={e => set('licencia_vencimiento', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
              {/* Alerta si vence en menos de 30 días o ya venció */}
              {form.licencia_vencimiento && (() => {
                const dias = Math.ceil((new Date(form.licencia_vencimiento) - new Date()) / 86400000)
                if (dias < 0)  return <p className="text-xs text-red-400 mt-1">⚠ Licencia vencida hace {Math.abs(dias)} días</p>
                if (dias <= 30) return <p className="text-xs text-amber-400 mt-1">⚠ Vence en {dias} días</p>
                return null
              })()}
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Categoría de licencia</label>
              <select value={form.licencia_categoria || ''} onChange={e => set('licencia_categoria', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
                <option value="">Sin licencia</option>
                <optgroup label="Vehículos menores">
                  <option value="A-I">A-I · Motocicletas</option>
                  <option value="A-IIa">A-IIa · Mototaxis</option>
                  <option value="A-IIb">A-IIb · Trimotos</option>
                </optgroup>
                <optgroup label="Vehículos ligeros">
                  <option value="B-I">B-I · Automóviles / camionetas</option>
                  <option value="B-IIa">B-IIa · Taxis</option>
                  <option value="B-IIb">B-IIb · Bus menor escolar</option>
                  <option value="B-IIc">B-IIc · Transporte particular</option>
                </optgroup>
                <optgroup label="Vehículos pesados">
                  <option value="C-I">C-I · Camión ligero</option>
                  <option value="C-IIa">C-IIa · Camión</option>
                  <option value="C-IIb">C-IIb · Tracto camión</option>
                  <option value="C-IIIa">C-IIIa · Bus / Ómnibus</option>
                  <option value="C-IIIb">C-IIIb · Ómnibus articulado</option>
                  <option value="C-IIIc">C-IIIc · Transporte escolar</option>
                </optgroup>
              </select>
            </div>
          </div>
        </div>

        {/* Datos Laborales */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Datos Laborales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Área</label>
              <select value={form.area_id} onChange={e => set('area_id', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
                <option value="">Sin área asignada</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Cargo</label>
              {cargos.length > 0 ? (
                <select value={form.cargo_id} onChange={e => set('cargo_id', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
                  <option value="">Sin cargo asignado</option>
                  {cargos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              ) : (
                <input type="text" value={form.cargo} onChange={e => set('cargo', e.target.value)}
                  placeholder="Ej: Operario, Supervisor..."
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
              )}
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fecha de ingreso</label>
              <input type="date" value={form.fecha_ingreso} onChange={e => set('fecha_ingreso', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tipo de contrato</label>
              <select value={form.tipo_contrato} onChange={e => set('tipo_contrato', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
                {TIPOS_CONTRATO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Estado</label>
              <select value={form.estado} onChange={e => set('estado', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
                {ESTADOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium">
            <Save size={16} />
            {saving ? 'Guardando...' : (esEdicion ? 'Actualizar' : 'Registrar Personal')}
          </button>
        </div>
      </form>
    </div>
  )
}
