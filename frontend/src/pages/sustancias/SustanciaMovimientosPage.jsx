import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Plus, TrendingUp, TrendingDown, Package,
  AlertTriangle, CheckCircle2, RotateCcw, Filter, X,
} from 'lucide-react'
import api from '../../services/api'

const TIPO_CFG = {
  entrada: { label: 'Entrada',  icon: TrendingUp,   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',  dot: 'bg-emerald-500', sign: '+' },
  salida:  { label: 'Salida',   icon: TrendingDown, cls: 'bg-red-50 text-red-700 border-red-200',             dot: 'bg-red-500',     sign: '−' },
  ajuste:  { label: 'Ajuste',   icon: RotateCcw,    cls: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500',    sign: '=' },
}

const MOTIVOS_ENTRADA = [
  'Compra a proveedor', 'Recepción de transferencia', 'Devolución de área',
  'Donación / regalo', 'Inventario inicial', 'Otro',
]
const MOTIVOS_SALIDA = [
  'Uso en operaciones', 'Uso en mantenimiento', 'Uso en limpieza',
  'Eliminación / disposición final', 'Derrame / pérdida accidental',
  'Vencimiento', 'Transferencia a otra área', 'Otro',
]

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500 bg-white'

function GaugeStock({ actual, minimo, maximo, unidad }) {
  if (!actual && actual !== 0) return null
  const max  = maximo || Math.max(actual * 2, 10)
  const pct  = Math.min(100, (actual / max) * 100)
  const bajo = minimo && actual <= minimo
  const color = bajo ? 'bg-red-500' : actual > max * 0.8 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-gray-500">
        <span>Stock actual</span>
        {minimo && <span className={bajo ? 'text-red-600 font-semibold' : 'text-gray-400'}>mín: {minimo} {unidad}</span>}
        {maximo && <span className="text-gray-400">máx: {maximo} {unidad}</span>}
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
        <div className={`h-3 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {minimo && (
        <div className="relative" style={{ paddingLeft: `${Math.min(100,(minimo/max)*100)}%` }}>
          <div className="absolute left-0 top-0 w-0.5 h-3 bg-amber-400 -mt-3" title={`Mínimo: ${minimo}`} />
        </div>
      )}
      <p className={`text-2xl font-black ${bajo ? 'text-red-600' : 'text-gray-900'}`}>
        {actual} <span className="text-sm font-normal text-gray-500">{unidad}</span>
      </p>
      {bajo && (
        <p className="text-xs font-semibold text-red-600 flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">
          <AlertTriangle size={12}/> ¡Stock bajo el mínimo! Solicitar reposición
        </p>
      )}
    </div>
  )
}

export default function SustanciaMovimientosPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [info, setInfo]         = useState(null)
  const [movs, setMovs]         = useState([])
  const [meta, setMeta]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [pagina, setPagina]     = useState(1)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [alerta, setAlerta]     = useState(null)

  const HOY = new Date().toISOString().substring(0, 10)
  const [form, setForm] = useState({
    tipo: 'entrada', cantidad: '', unidad_medida: 'L',
    motivo: '', referencia: '', fecha: HOY, observaciones: '',
  })

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/sustancias/${id}/movimientos`, {
        params: { per_page: 30, page: pagina }
      })
      setInfo(data)
      setMovs(data.movimientos?.data || [])
      setMeta(data.movimientos)
      // Sincronizar unidad con la sustancia
      if (data.unidad_medida) setForm(p => ({ ...p, unidad_medida: data.unidad_medida }))
    } catch { } finally { setLoading(false) }
  }, [id, pagina])

  useEffect(() => { cargar() }, [cargar])

  const guardar = async () => {
    if (!form.cantidad || !form.motivo) return
    setSaving(true); setAlerta(null)
    try {
      const { data } = await api.post(`/sustancias/${id}/movimientos`, form)
      setAlerta(data)
      setShowForm(false)
      setForm(p => ({ ...p, cantidad: '', motivo: '', referencia: '', observaciones: '' }))
      cargar()
    } catch (e) { alert(e.response?.data?.message || 'Error al registrar') }
    finally { setSaving(false) }
  }

  const movsFiltrados = filtroTipo ? movs.filter(m => m.tipo === filtroTipo) : movs

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/sustancias/${id}`)} className="btn-back">
            <ArrowLeft size={14}/> Volver
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package size={20} className="text-purple-600"/> Movimientos de Stock
            </h1>
            <p className="text-gray-400 text-xs mt-0.5">Entradas, salidas y ajustes de inventario</p>
          </div>
        </div>
        <button onClick={() => { setShowForm(true); setAlerta(null) }}
          className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={15}/> Registrar movimiento
        </button>
      </div>

      {/* Alerta de stock bajo */}
      {alerta?.alerta_stock && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <AlertTriangle size={20} className="text-red-600 flex-shrink-0"/>
          <div>
            <p className="text-sm font-bold text-red-700">⚠ Alerta de reposición</p>
            <p className="text-xs text-red-600">{alerta.mensaje_alerta}</p>
          </div>
        </div>
      )}
      {alerta && !alerta.alerta_stock && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600"/><span className="text-sm text-emerald-700">Movimiento registrado. Stock actual: <strong>{alerta.stock_actual} {info?.unidad_medida}</strong></span>
          <button onClick={() => setAlerta(null)} className="ml-auto text-gray-400 hover:text-gray-600"><X size={13}/></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Columna izquierda: gauge + stats */}
        <div className="space-y-4">
          {/* Gauge de stock */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Nivel de inventario</h3>
            {info && (
              <GaugeStock
                actual={parseFloat(info.stock_actual) || 0}
                minimo={info.stock_minimo ? parseFloat(info.stock_minimo) : null}
                maximo={info.stock_maximo ? parseFloat(info.stock_maximo) : null}
                unidad={info.unidad_medida}
              />
            )}
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <TrendingUp size={18} className="text-emerald-600 mx-auto mb-1"/>
              <p className="text-xl font-black text-emerald-700">{info?.total_entradas || 0}</p>
              <p className="text-[10px] text-emerald-600 font-medium uppercase">Total entradas</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <TrendingDown size={18} className="text-red-500 mx-auto mb-1"/>
              <p className="text-xl font-black text-red-600">{info?.total_salidas || 0}</p>
              <p className="text-[10px] text-red-500 font-medium uppercase">Total salidas</p>
            </div>
          </div>
        </div>

        {/* Columna derecha: formulario + historial */}
        <div className="lg:col-span-2 space-y-4">
          {/* Formulario de movimiento */}
          {showForm && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Registrar movimiento</h3>

              {/* Tipo */}
              <div className="flex gap-2">
                {Object.entries(TIPO_CFG).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setForm(p => ({ ...p, tipo: k }))}
                    className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                      form.tipo === k ? `${v.cls} border-current` : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-400'
                    }`}>
                    <v.icon size={18}/>
                    {v.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Cantidad */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Cantidad *</label>
                  <div className="flex gap-2">
                    <input type="number" min={0.01} step="0.01" value={form.cantidad}
                      onChange={e => setForm(p => ({ ...p, cantidad: e.target.value }))}
                      className={inp} placeholder="0.00" />
                    <select value={form.unidad_medida} onChange={e => setForm(p => ({ ...p, unidad_medida: e.target.value }))}
                      className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
                      {['kg','g','L','mL','m3','unidad'].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                {/* Fecha */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Fecha *</label>
                  <input type="date" value={form.fecha}
                    onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                    className={inp} />
                </div>

                {/* Motivo */}
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Motivo *</label>
                  <select value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))}
                    className={inp}>
                    <option value="">Seleccionar motivo...</option>
                    {(form.tipo === 'entrada' ? MOTIVOS_ENTRADA : form.tipo === 'salida' ? MOTIVOS_SALIDA : ['Corrección de inventario', 'Conteo físico', 'Otro']).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Referencia */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Referencia <span className="text-gray-300">(N° factura, OC, OT)</span></label>
                  <input value={form.referencia} onChange={e => setForm(p => ({ ...p, referencia: e.target.value }))}
                    className={inp} placeholder="Ej: FAC-2024-001" />
                </div>

                {/* Observaciones */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Observaciones</label>
                  <input value={form.observaciones} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))}
                    className={inp} />
                </div>
              </div>

              {/* Vista previa del nuevo stock */}
              {form.cantidad && info?.stock_actual !== undefined && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 flex items-center gap-2">
                  <span>Stock resultante:</span>
                  <span className="font-bold text-gray-900">
                    {form.tipo === 'ajuste'
                      ? `${form.cantidad} ${form.unidad_medida}`
                      : form.tipo === 'entrada'
                        ? `${(parseFloat(info.stock_actual || 0) + parseFloat(form.cantidad || 0)).toFixed(2)} ${form.unidad_medida}`
                        : `${Math.max(0, parseFloat(info.stock_actual || 0) - parseFloat(form.cantidad || 0)).toFixed(2)} ${form.unidad_medida}`
                    }
                  </span>
                  {info.stock_minimo && form.tipo !== 'entrada' && form.tipo !== 'ajuste' &&
                   (parseFloat(info.stock_actual || 0) - parseFloat(form.cantidad || 0)) <= parseFloat(info.stock_minimo) && (
                    <span className="text-red-600 font-semibold flex items-center gap-1"><AlertTriangle size={11}/> Quedará bajo el mínimo</span>
                  )}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button onClick={guardar} disabled={saving || !form.cantidad || !form.motivo}
                  className={`px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 ${TIPO_CFG[form.tipo]?.dot.replace('bg-','bg-').replace('-500','').includes('emerald') ? 'bg-emerald-600 hover:bg-emerald-700' : form.tipo === 'salida' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {saving ? 'Registrando...' : `Registrar ${TIPO_CFG[form.tipo]?.label}`}
                </button>
              </div>
            </div>
          )}

          {/* Historial */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700">Historial de movimientos</h3>
              <div className="flex gap-1">
                {['', 'entrada', 'salida', 'ajuste'].map(t => (
                  <button key={t} onClick={() => setFiltroTipo(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      filtroTipo === t ? 'bg-roka-500 text-white' : 'text-gray-500 hover:bg-gray-100'
                    }`}>
                    {t === '' ? 'Todos' : TIPO_CFG[t]?.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="py-10 flex justify-center"><div className="w-6 h-6 border-2 border-roka-500 border-t-transparent rounded-full animate-spin"/></div>
            ) : movsFiltrados.length === 0 ? (
              <p className="text-center py-10 text-gray-400 text-sm">Sin movimientos registrados</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {movsFiltrados.map(m => {
                  const cfg = TIPO_CFG[m.tipo]
                  return (
                    <div key={m.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`}/>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.cls}`}>
                            {cfg.sign} {m.cantidad} {m.unidad_medida}
                          </span>
                          <span className="text-xs font-medium text-gray-700">{m.motivo}</span>
                          {m.referencia && <span className="text-xs font-mono text-gray-400">{m.referencia}</span>}
                        </div>
                        {m.observaciones && <p className="text-xs text-gray-400 mt-0.5">{m.observaciones}</p>}
                        {m.stock_resultante !== null && m.stock_resultante !== undefined && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Stock resultante: <span className="font-semibold text-gray-600">{m.stock_resultante} {m.unidad_medida}</span>
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-500">{new Date(m.fecha).toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' })}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Paginación */}
            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500">Total: {meta.total} movimientos</p>
                <div className="flex gap-1">
                  <button disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}
                    className="px-3 py-1 text-xs border rounded-lg disabled:opacity-40 hover:bg-white">←</button>
                  <span className="px-3 py-1 text-xs bg-roka-50 text-roka-700 border border-roka-200 rounded-lg font-medium">{pagina}/{meta.last_page}</span>
                  <button disabled={pagina >= meta.last_page} onClick={() => setPagina(p => p + 1)}
                    className="px-3 py-1 text-xs border rounded-lg disabled:opacity-40 hover:bg-white">→</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
