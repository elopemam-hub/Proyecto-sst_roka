import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

const ESTADOS = {
  borrador:     'Borrador',
  aprobado:     'Aprobado',
  en_ejecucion: 'En ejecución',
  cerrado:      'Cerrado',
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre']

/**
 * Datos de encabezado del programa. Las actividades no se cargan aquí: se
 * trabajan sobre la matriz, que es donde el formato PASST tiene sentido.
 */
export default function ProgramaFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const anioActual = new Date().getFullYear()
  const anios = Array.from({ length: 5 }, (_, i) => anioActual - 1 + i)

  const [form, setForm] = useState({
    anio: anioActual,
    nombre: `Programa Anual de Seguridad y Salud en el Trabajo ${anioActual}`,
    codigo: 'PASST-01',
    version: `${anioActual}-01`,
    mes_inicio: 1,
    objetivo_general: '',
    presupuesto: '',
    estado: 'borrador',
  })
  const [generarPlantilla, setGenerarPlantilla] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => { if (id) cargar() }, [id])

  const cargar = async () => {
    try {
      const { data } = await api.get(`/programa/${id}`)
      const p = data.programa
      setForm({
        anio: p.anio,
        nombre: p.nombre || '',
        codigo: p.codigo || '',
        version: p.version || '',
        mes_inicio: p.mes_inicio || 1,
        objetivo_general: p.objetivo_general || '',
        presupuesto: p.presupuesto ?? '',
        estado: p.estado || 'borrador',
      })
    } catch {
      toast.error('No se pudo cargar el programa')
    }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const guardar = async () => {
    setErrors({})
    setSaving(true)
    try {
      const payload = { ...form, presupuesto: form.presupuesto === '' ? null : form.presupuesto }

      if (id) {
        await api.put(`/programa/${id}`, payload)
        toast.success('Programa actualizado')
        navigate(`/programa/${id}`)
      } else {
        const { data } = await api.post('/programa', { ...payload, generar_plantilla: generarPlantilla })
        toast.success('Programa creado')
        navigate(`/programa/${data.programa.id}`)
      }
    } catch (err) {
      const detalle = err.response?.data?.errors
      if (detalle) {
        setErrors(detalle)
        toast.error(Object.values(detalle)[0][0])
      } else {
        toast.error('No se pudo guardar el programa')
      }
    } finally {
      setSaving(false)
    }
  }

  const inputClass = (k) =>
    `w-full border ${errors[k] ? 'border-red-400' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-roka-500`

  const Error = ({ campo }) => errors[campo]
    ? <p className="text-xs text-red-500 mt-1">{errors[campo][0]}</p>
    : null

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/programa')} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {id ? 'Editar encabezado del programa' : 'Nuevo Programa Anual de SST'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Las actividades se cargan en la matriz del programa
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Datos generales</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Año *</label>
            <select value={form.anio} onChange={e => f('anio', parseInt(e.target.value))} className={inputClass('anio')}>
              {anios.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <Error campo="anio" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
            <select value={form.estado} onChange={e => f('estado', e.target.value)} className={inputClass('estado')}>
              {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre del programa *</label>
            <input value={form.nombre} onChange={e => f('nombre', e.target.value)} className={inputClass('nombre')} />
            <Error campo="nombre" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Código del formato</label>
            <input value={form.codigo} onChange={e => f('codigo', e.target.value)}
              className={inputClass('codigo')} placeholder="PASST-01" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Versión</label>
            <input value={form.version} onChange={e => f('version', e.target.value)}
              className={inputClass('version')} placeholder={`${anioActual}-01`} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Mes de inicio</label>
            <select value={form.mes_inicio} onChange={e => f('mes_inicio', parseInt(e.target.value))} className={inputClass('mes_inicio')}>
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <p className="text-[10px] text-gray-400 mt-1">La matriz muestra los meses desde aquí hasta diciembre</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Presupuesto (S/)</label>
            <input type="number" min="0" step="0.01" value={form.presupuesto}
              onChange={e => f('presupuesto', e.target.value)} className={inputClass('presupuesto')} placeholder="0.00" />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Objetivo general</label>
            <textarea rows={2} value={form.objetivo_general} onChange={e => f('objetivo_general', e.target.value)}
              className={`${inputClass('objetivo_general')} resize-none`} />
          </div>
        </div>

        {!id && (
          <label className="flex items-start gap-2 mt-5 p-3 bg-roka-50 border border-roka-100 rounded-lg cursor-pointer">
            <input type="checkbox" checked={generarPlantilla}
              onChange={e => setGenerarPlantilla(e.target.checked)} className="mt-0.5 accent-roka-500" />
            <span className="text-xs text-gray-600">
              <span className="font-medium text-gray-800 block">Generar la estructura base RM 050-2013-TR</span>
              Crea las 11 secciones del SGSST con sus actividades, metas, evidencias y responsables
              sugeridos. Todo es editable después.
            </span>
          </label>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={() => navigate('/programa')}
          className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
          Cancelar
        </button>
        <button onClick={guardar} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-roka-500 hover:bg-roka-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
          <Save size={15} /> {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
