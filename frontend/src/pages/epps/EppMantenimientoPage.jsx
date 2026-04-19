import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, Wrench, AlertTriangle, CalendarClock, PackageX, CheckCircle2, Clock } from 'lucide-react'
import api from '../../services/api'
import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const TIPOS    = { mantenimiento: 'Mantenimiento', inspeccion: 'Inspección', retiro: 'Retiro', baja: 'Baja' }
const RESULTADOS = { conforme: 'Conforme', no_conforme: 'No Conforme', requiere_accion: 'Requiere Acción' }
const RES_COLOR = {
  conforme:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  no_conforme:     'bg-red-50 text-red-700 border-red-200',
  requiere_accion: 'bg-amber-50 text-amber-700 border-amber-200',
}

const EMPTY = {
  inventario_id: '', tipo: 'inspeccion', tipo_inspeccion: '',
  fecha: new Date().toISOString().split('T')[0],
  proxima_fecha: '', responsable: '', resultado: 'conforme', observaciones: '',
}

function estadoProxima(proxima_fecha) {
  if (!proxima_fecha) return null
  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const px  = new Date(proxima_fecha + 'T00:00:00')
  const diff = differenceInDays(px, hoy)
  if (diff < 0)  return { label: 'Vencido',  cls: 'bg-red-50 text-red-600 border-red-200' }
  if (diff <= 7) return { label: 'Próximo',  cls: 'bg-amber-50 text-amber-600 border-amber-200' }
  return           { label: 'Al día',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
}

export default function EppMantenimientoPage() {
  const navigate           = useNavigate()
  const [data, setData]    = useState(null)
  const [epps, setEpps]    = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]  = useState(false)
  const [form, setForm]    = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [vista, setVista]  = useState('plan') // plan | historial

  useEffect(() => { cargar() }, [])
  useEffect(() => {
    api.get('/epps', { params: { per_page: 200 } })
      .then(({ data }) => setEpps(data.data || []))
      .catch(() => {})
  }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/epps/mantenimiento')
      setData(data)
    } catch { toast.error('Error al cargar') }
    finally { setLoading(false) }
  }

  const guardar = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/epps/mantenimiento', form)
      toast.success('Registro guardado')
      setModal(false); setForm(EMPTY); cargar()
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const registros = data?.registros || []
  const stats     = data?.stats || {}
  const alertas   = data?.alertas || []

  // Plan de inspecciones: solo registros con proxima_fecha
  const plan = registros.filter(r => r.proxima_fecha)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mantenimiento e Inspección</h1>
          <p className="text-gray-500 text-sm mt-1">Control de vida útil, inspecciones periódicas y baja de EPPs</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => navigate('/epps')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <ArrowLeft size={14} /> EPPs
          </button>
          <button onClick={() => { setForm(EMPTY); setModal(true) }}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Programar inspección
          </button>
        </div>
      </div>

      {/* Alerta EPPs vencidos */}
      {alertas.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">
            <strong>{alertas.length} EPP{alertas.length > 1 ? 's' : ''} con mantenimiento vencido</strong>
            {' — '}Acción requerida:{' '}
            {alertas.map(a => a.codigo_interno || a.nombre).join(', ')}
          </p>
        </div>
      )}

      {/* KPIs */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Inspecciones este mes', value: stats.insp_mes ?? 0,    icon: Wrench,       color: 'text-roka-600',   bg: 'bg-roka-50'   },
            { label: 'EPPs dados de baja',    value: stats.dados_baja ?? 0,  icon: PackageX,     color: 'text-red-600',    bg: 'bg-red-50'    },
            { label: 'Próx. vencimientos (7 días)', value: stats.prox_venc ?? 0, icon: CalendarClock, color: stats.prox_venc > 0 ? 'text-amber-600' : 'text-emerald-600', bg: stats.prox_venc > 0 ? 'bg-amber-50' : 'bg-emerald-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} className={color} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500 leading-tight">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[{ key: 'plan', label: 'Plan de inspecciones' }, { key: 'historial', label: 'Historial' }].map(t => (
          <button key={t.key} onClick={() => setVista(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              vista === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Plan de inspecciones */}
      {vista === 'plan' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Código EPP', 'Descripción', 'Tipo inspección', 'Última inspección', 'Próxima', 'Inspector', 'Estado'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Cargando...</td></tr>
              ) : plan.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                  <CalendarClock size={32} className="mx-auto mb-2 text-gray-300" />
                  <p>No hay inspecciones programadas. Usa "+ Programar inspección" y define la próxima fecha.</p>
                </td></tr>
              ) : plan.map(r => {
                const est = estadoProxima(r.proxima_fecha)
                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-roka-600">{r.epp_codigo || '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{r.epp_nombre}</td>
                    <td className="px-4 py-3 text-gray-600">{r.tipo_inspeccion || TIPOS[r.tipo] || r.tipo}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.fecha ? format(new Date(r.fecha + 'T00:00:00'), 'dd/MM/yyyy', { locale: es }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-medium">
                      {r.proxima_fecha ? format(new Date(r.proxima_fecha + 'T00:00:00'), 'dd/MM/yyyy', { locale: es }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.responsable || '—'}</td>
                    <td className="px-4 py-3">
                      {est ? (
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${est.cls}`}>{est.label}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Historial completo */}
      {vista === 'historial' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['EPP', 'Tipo', 'Descripción', 'Fecha', 'Próxima', 'Responsable', 'Resultado', 'Obs.'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Cargando...</td></tr>
              ) : registros.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                  <Wrench size={32} className="mx-auto mb-2 text-gray-300" />
                  <p>No hay registros de mantenimiento</p>
                </td></tr>
              ) : registros.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{r.epp_nombre}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {TIPOS[r.tipo] || r.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.tipo_inspeccion || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {r.fecha ? format(new Date(r.fecha + 'T00:00:00'), 'dd MMM yyyy', { locale: es }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {r.proxima_fecha ? format(new Date(r.proxima_fecha + 'T00:00:00'), 'dd MMM yyyy', { locale: es }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.responsable || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full border ${RES_COLOR[r.resultado] || RES_COLOR.conforme}`}>
                      {RESULTADOS[r.resultado] || r.resultado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[140px] truncate">{r.observaciones || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">Programar inspección / mantenimiento</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={guardar} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">EPP *</label>
                <select required value={form.inventario_id} onChange={e => setForm({...form, inventario_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
                  <option value="">Seleccionar EPP...</option>
                  {epps.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.codigo_interno ? `${e.codigo_interno} — ` : ''}{e.nombre}{e.talla ? ` (${e.talla})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select required value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
                    {Object.entries(TIPOS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción tipo</label>
                  <input value={form.tipo_inspeccion} onChange={e => setForm({...form, tipo_inspeccion: e.target.value})}
                    placeholder="Ej: Revisión mensual"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha realizada *</label>
                  <input type="date" required value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Próxima inspección</label>
                  <input type="date" value={form.proxima_fecha} onChange={e => setForm({...form, proxima_fecha: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inspector / Responsable</label>
                  <input value={form.responsable} onChange={e => setForm({...form, responsable: e.target.value})}
                    placeholder="Nombre del inspector"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resultado</label>
                  <select value={form.resultado} onChange={e => setForm({...form, resultado: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
                    {Object.entries(RESULTADOS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})}
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-roka-500 hover:bg-roka-600 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
