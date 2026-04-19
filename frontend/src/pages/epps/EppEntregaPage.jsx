import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, AlertTriangle, Search, X, CheckCircle2, User } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const MOTIVOS = [
  { value: 'ingreso',    label: 'Ingreso a la empresa' },
  { value: 'reposicion', label: 'Reposición por desgaste' },
  { value: 'deterioro',  label: 'Deterioro / daño' },
  { value: 'talla',      label: 'Cambio de talla' },
  { value: 'perdida',    label: 'Pérdida' },
]

export default function EppEntregaPage() {
  const navigate = useNavigate()
  const dropdownRef = useRef(null)

  const [form, setForm] = useState({
    personal_id: '', inventario_id: '', cantidad: 1,
    fecha_entrega: new Date().toISOString().split('T')[0],
    fecha_vencimiento: '', motivo_entrega: 'ingreso', observaciones: '',
  })

  const [busqueda, setBusqueda]             = useState('')
  const [resultados, setResultados]         = useState([])
  const [buscando, setBuscando]             = useState(false)
  const [personalSel, setPersonalSel]       = useState(null)
  const [mostrarDrop, setMostrarDrop]       = useState(false)

  const [eppList, setEppList]         = useState([])
  const [eppSel, setEppSel]           = useState(null)
  const [saving, setSaving]           = useState(false)

  // Cargar EPPs al montar
  useEffect(() => {
    api.get('/epps', { params: { per_page: 200 } })
      .then(({ data }) => setEppList(data.data || data))
      .catch(() => {})
  }, [])

  // Buscar personal con debounce
  useEffect(() => {
    if (busqueda.length < 2) { setResultados([]); setMostrarDrop(false); return }
    const t = setTimeout(async () => {
      setBuscando(true)
      try {
        const { data } = await api.get('/personal', { params: { search: busqueda, per_page: 10 } })
        const lista = data.data || data || []
        setResultados(lista)
        setMostrarDrop(lista.length > 0)
      } catch { setResultados([]) }
      finally { setBuscando(false) }
    }, 350)
    return () => clearTimeout(t)
  }, [busqueda])

  // Cerrar dropdown al click fuera
  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setMostrarDrop(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const elegirPersonal = (p) => {
    setPersonalSel(p)
    setForm(f => ({ ...f, personal_id: p.id }))
    setBusqueda(`${p.nombres} ${p.apellidos} — ${p.dni || ''}`)
    setMostrarDrop(false)
    setResultados([])
  }

  const limpiarPersonal = () => {
    setPersonalSel(null)
    setForm(f => ({ ...f, personal_id: '' }))
    setBusqueda('')
    setResultados([])
  }

  const elegirEpp = (id) => {
    const epp = eppList.find(e => String(e.id) === String(id))
    setEppSel(epp || null)
    setForm(f => ({ ...f, inventario_id: id }))
  }

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const stockInsuficiente = eppSel && Number(form.cantidad) > eppSel.stock_disponible

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.personal_id) { toast.error('Debes seleccionar un trabajador de la lista'); return }
    if (!form.inventario_id) { toast.error('Debes seleccionar un EPP'); return }
    if (stockInsuficiente) { toast.error('Stock insuficiente'); return }
    setSaving(true)
    try {
      await api.post('/epps/entregas', {
        ...form,
        cantidad: Number(form.cantidad),
        fecha_vencimiento: form.fecha_vencimiento || null,
        observaciones: form.observaciones || null,
      })
      toast.success('Entrega registrada correctamente')
      navigate('/epps/inventario')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar entrega')
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Registrar Entrega de EPP</h1>
          <p className="text-sm text-gray-500">Registro de dotación · Ley 29783 Art. 61</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── TRABAJADOR ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Trabajador</h2>

          {personalSel ? (
            /* Trabajador seleccionado */
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{personalSel.nombres} {personalSel.apellidos}</p>
                <p className="text-xs text-gray-500">DNI: {personalSel.dni || '—'} · {personalSel.cargo?.nombre || personalSel.cargo || 'Sin cargo'}</p>
              </div>
              <button type="button" onClick={limpiarPersonal}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                <X size={16} />
              </button>
            </div>
          ) : (
            /* Búsqueda */
            <div ref={dropdownRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Buscar personal <span className="text-red-500">*</span>
              </label>
              <div className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 transition-colors ${mostrarDrop || busqueda ? 'border-roka-400 ring-2 ring-roka-100' : 'border-gray-300'}`}>
                {buscando
                  ? <div className="w-4 h-4 border-2 border-roka-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  : <Search size={16} className="text-gray-400 flex-shrink-0" />
                }
                <input
                  autoFocus
                  type="text"
                  value={busqueda}
                  onChange={e => { setBusqueda(e.target.value); setPersonalSel(null); setForm(f => ({ ...f, personal_id: '' })) }}
                  placeholder="Escribe nombre o DNI del trabajador..."
                  className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
                />
                {busqueda && (
                  <button type="button" onClick={() => { setBusqueda(''); setResultados([]) }}>
                    <X size={14} className="text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>

              {/* Dropdown resultados */}
              {mostrarDrop && resultados.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {resultados.map(p => (
                    <button type="button" key={p.id}
                      onMouseDown={e => { e.preventDefault(); elegirPersonal(p) }}
                      className="w-full text-left px-4 py-3 hover:bg-roka-50 transition-colors border-b border-gray-50 last:border-0">
                      <span className="text-sm font-medium text-gray-800">{p.nombres} {p.apellidos}</span>
                      <span className="text-xs text-gray-500 ml-2 font-mono">{p.dni}</span>
                      {p.cargo?.nombre && <span className="text-xs text-gray-400 ml-2">· {p.cargo.nombre}</span>}
                    </button>
                  ))}
                </div>
              )}

              {busqueda.length >= 2 && !buscando && resultados.length === 0 && (
                <p className="mt-2 text-xs text-gray-400">No se encontraron trabajadores con "{busqueda}"</p>
              )}
              {busqueda.length < 2 && (
                <p className="mt-1.5 text-xs text-gray-400">Escribe al menos 2 caracteres para buscar</p>
              )}
            </div>
          )}
        </div>

        {/* ── EPP ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Equipo de Protección</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              EPP <span className="text-red-500">*</span>
            </label>
            <select value={form.inventario_id} onChange={e => elegirEpp(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-roka-400 focus:border-roka-400">
              <option value="">— Seleccionar EPP —</option>
              {eppList.map(e => (
                <option key={e.id} value={e.id}>
                  {e.nombre}{e.talla ? ` (${e.talla})` : ''} — Stock: {e.stock_disponible} {e.unidad}
                </option>
              ))}
            </select>
            {eppSel && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500">Disponible:</span>
                <span className={`text-xs font-semibold ${eppSel.stock_disponible <= eppSel.stock_minimo ? 'text-red-500' : 'text-emerald-600'}`}>
                  {eppSel.stock_disponible} {eppSel.unidad}
                </span>
                {eppSel.categoria && <span className="text-xs text-gray-400">· {eppSel.categoria.nombre}</span>}
              </div>
            )}
          </div>

          {stockInsuficiente && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">
                Stock insuficiente. Disponible: <strong>{eppSel?.stock_disponible}</strong>, solicitado: <strong>{form.cantidad}</strong>
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Cantidad <span className="text-red-500">*</span></label>
              <input type="number" min={1} value={form.cantidad} onChange={e => set('cantidad', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-roka-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo <span className="text-red-500">*</span></label>
              <select value={form.motivo_entrega} onChange={e => set('motivo_entrega', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-roka-400">
                {MOTIVOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha entrega <span className="text-red-500">*</span></label>
              <input type="date" value={form.fecha_entrega} onChange={e => set('fecha_entrega', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-roka-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha vencimiento</label>
              <input type="date" value={form.fecha_vencimiento} onChange={e => set('fecha_vencimiento', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-roka-400" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Observaciones</label>
              <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)}
                rows={2} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-roka-400" />
            </div>
          </div>
        </div>

        {/* Resumen antes de guardar */}
        {personalSel && eppSel && !stockInsuficiente && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
            <p className="text-sm text-emerald-700">
              Se entregará <strong>{form.cantidad} {eppSel.unidad}</strong> de <strong>{eppSel.nombre}</strong> a <strong>{personalSel.nombres} {personalSel.apellidos}</strong>
            </p>
          </div>
        )}

        {/* Acciones */}
        <div className="flex justify-end gap-3 pb-4">
          <button type="button" onClick={() => navigate(-1)}
            className="px-5 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving || stockInsuficiente}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <Save size={16} />
            {saving ? 'Registrando...' : 'Registrar Entrega'}
          </button>
        </div>
      </form>
    </div>
  )
}
