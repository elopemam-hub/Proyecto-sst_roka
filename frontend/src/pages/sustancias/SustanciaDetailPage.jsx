import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Pencil, FlaskConical, ShieldCheck, ShieldX,
  Layers, Plus, Trash2, Download, Printer, TrendingUp, TrendingDown,
  Users, GraduationCap, AlertTriangle,
} from 'lucide-react'
import api from '../../services/api'
import NfpaDiamond, { NfpaLeyenda } from '../../components/NfpaDiamond'

const GHS_INFO = {
  GHS01:{label:'Explosivo',emoji:'💥'},GHS02:{label:'Inflamable',emoji:'🔥'},
  GHS03:{label:'Comburente',emoji:'⭕'},GHS04:{label:'Gas a presión',emoji:'🔵'},
  GHS05:{label:'Corrosivo',emoji:'⚗️'},GHS06:{label:'Tóxico agudo',emoji:'☠️'},
  GHS07:{label:'Nocivo/Irritante',emoji:'⚠️'},GHS08:{label:'Peligro salud',emoji:'🫁'},
  GHS09:{label:'Peligroso MA',emoji:'🌿'},
}
const RIESGO_CFG = {
  muy_alto:{label:'Muy alto',cls:'bg-red-100 text-red-700 border-red-300'},
  alto:    {label:'Alto',    cls:'bg-orange-100 text-orange-700 border-orange-300'},
  medio:   {label:'Medio',  cls:'bg-amber-100 text-amber-700 border-amber-300'},
  bajo:    {label:'Bajo',   cls:'bg-emerald-100 text-emerald-700 border-emerald-300'},
}
const ESTADO_FISICO = {liquido:'💧 Líquido',solido:'🧱 Sólido',gas:'💨 Gas',aerosol:'🌫️ Aerosol',polvo:'🌪️ Polvo'}
const NFPA_COLOR   = { salud:'bg-blue-600', inflamabilidad:'bg-red-600', inestabilidad:'bg-yellow-500', especial:'bg-white border-2 border-gray-300 text-gray-800' }

function Campo({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div>
      <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-800">{value}</dd>
    </div>
  )
}

// Rombo NFPA visual
function RomboNFPA({ salud, inflamabilidad, inestabilidad, especial }) {
  const Box = ({ color, value, label }) => (
    <div className={`${color} text-white text-center rounded p-2 flex flex-col items-center justify-center min-w-[56px]`}>
      <span className="text-2xl font-black">{value}</span>
      <span className="text-[9px] opacity-80 uppercase">{label}</span>
    </div>
  )
  if (!salud && !inflamabilidad && !inestabilidad && !especial) return null
  return (
    <div className="space-y-1">
      <Box color="bg-blue-600"   value={salud}         label="Salud" />
      <div className="flex gap-1">
        <Box color="bg-red-600"    value={inflamabilidad} label="Inflamab." />
        <Box color="bg-yellow-500" value={inestabilidad}  label="Inestab." />
      </div>
      {especial && <Box color="bg-gray-100 border border-gray-300 text-gray-800" value={especial} label="Especial" />}
    </div>
  )
}

export default function SustanciaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [s, setS]             = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('info')
  // Movimientos
  const [movs, setMovs]         = useState([])
  const [showMovForm, setShowMovForm] = useState(false)
  const [mov, setMov]           = useState({ tipo:'entrada', cantidad:'', unidad_medida:'L', motivo:'', referencia:'', fecha: new Date().toISOString().substring(0,10) })
  // Exposiciones
  const [exps, setExps]         = useState([])
  const [showExpForm, setShowExpForm] = useState(false)
  const [exp, setExp]           = useState({ nombre_trabajador:'', cargo:'', frecuencia:'ocasional', duracion_horas:'', via_exposicion:'', resultado_evaluacion:'sin_medicion', fecha_evaluacion:'' })
  // Capacitaciones
  const [caps, setCaps]         = useState([])
  const [showCapForm, setShowCapForm] = useState(false)
  const [cap, setCap]           = useState({ nombre_trabajador:'', fecha_capacitacion:'', fecha_vencimiento:'', tipo_capacitacion:'Manejo seguro de sustancias peligrosas', autorizado:true })

  useEffect(() => {
    cargar()
  }, [id])

  const cargar = () => {
    setLoading(true)
    api.get(`/sustancias/${id}`)
      .then(({ data }) => { setS(data) })
      .catch(() => navigate('/sustancias'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (tab === 'movimientos') api.get(`/sustancias/${id}/movimientos`).then(({data}) => setMovs(data.movimientos?.data || data.data || [])).catch(()=>{})
    if (tab === 'exposicion')  api.get(`/sustancias/${id}/exposiciones`).then(({data}) => setExps(data)).catch(()=>{})
    if (tab === 'capacitacion') api.get(`/sustancias/${id}/capacitaciones`).then(({data}) => setCaps(data)).catch(()=>{})
  }, [tab, id])

  const guardarMov = async () => {
    try { await api.post(`/sustancias/${id}/movimientos`, mov); setShowMovForm(false); setMov({tipo:'entrada',cantidad:'',unidad_medida:'L',motivo:'',referencia:'',fecha:new Date().toISOString().substring(0,10)}); api.get(`/sustancias/${id}/movimientos`).then(({data})=>setMovs(data.movimientos?.data||data.data||[])); cargar() }
    catch(e){ alert(e.response?.data?.message||'Error') }
  }
  const guardarExp = async () => {
    try { await api.post(`/sustancias/${id}/exposiciones`, exp); setShowExpForm(false); api.get(`/sustancias/${id}/exposiciones`).then(({data})=>setExps(data)) }
    catch(e){ alert(e.response?.data?.message||'Error') }
  }
  const guardarCap = async () => {
    try { await api.post(`/sustancias/${id}/capacitaciones`, cap); setShowCapForm(false); api.get(`/sustancias/${id}/capacitaciones`).then(({data})=>setCaps(data)) }
    catch(e){ alert(e.response?.data?.message||'Error') }
  }
  const eliminarExp = async (eid) => { if(!window.confirm('¿Eliminar?')) return; await api.delete(`/sustancias/${id}/exposiciones/${eid}`); setExps(exps.filter(e=>e.id!==eid)) }
  const eliminarCap = async (cid) => { if(!window.confirm('¿Eliminar?')) return; await api.delete(`/sustancias/${id}/capacitaciones/${cid}`); setCaps(caps.filter(c=>c.id!==cid)) }

  const imprimirEtiqueta = () => navigate(`/sustancias/${id}/etiqueta`)

  if (loading) return <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!s) return null

  const riesgo = RIESGO_CFG[s.nivel_riesgo]
  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500'
  const tabs = [
    { key:'info',         label:'Información',   icon:'📋' },
    { key:'movimientos',  label:'Stock',         icon:'📦' },
    { key:'exposicion',   label:'Exposición',    icon:'👷' },
    { key:'capacitacion', label:'Capacitaciones',icon:'🎓' },
  ]

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('/sustancias')} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg mt-1"><ArrowLeft size={18}/></button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{s.nombre}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${riesgo?.cls}`}>{riesgo?.label}</span>
              {!s.activo && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border">Inactiva</span>}
            </div>
            {s.nombre_quimico && <p className="text-gray-500 text-sm mt-0.5">{s.nombre_quimico}</p>}
            <p className="text-gray-400 text-xs mt-1">{ESTADO_FISICO[s.estado_fisico]} {s.formula_quimica && `· ${s.formula_quimica}`}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => navigate(`/sustancias/${id}/movimientos`)}
            className="flex items-center gap-1.5 border border-emerald-300 text-emerald-700 hover:bg-emerald-50 px-3 py-2 rounded-lg text-sm font-medium">
            <TrendingUp size={14}/> Stock
          </button>
          <button onClick={imprimirEtiqueta}
            className="flex items-center gap-1.5 border border-purple-300 text-purple-700 hover:bg-purple-50 px-3 py-2 rounded-lg text-sm font-medium">
            <Printer size={14}/> Etiqueta GHS
          </button>
          <button onClick={() => navigate(`/sustancias/${id}/editar`)}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <Pencil size={14}/> Editar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                tab === t.key ? 'border-roka-500 text-roka-600 bg-roka-50' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* ── TAB: INFORMACIÓN ── */}
          {tab === 'info' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-5">

                {/* Pictogramas GHS */}
                {s.pictogramas_ghs?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Layers size={12}/> Pictogramas GHS/SGA</h3>
                    <div className="flex flex-wrap gap-3">
                      {s.pictogramas_ghs.map(g => (
                        <div key={g} className="flex flex-col items-center gap-1 p-3 bg-gray-50 rounded-xl border border-gray-200 min-w-[72px]">
                          <span className="text-3xl">{GHS_INFO[g]?.emoji}</span>
                          <span className="text-[10px] font-mono text-gray-500">{g}</span>
                          <span className="text-[10px] font-medium text-gray-700 text-center">{GHS_INFO[g]?.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Identificación */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Identificación</h3>
                  <dl className="grid grid-cols-2 gap-3">
                    <Campo label="N° CAS"             value={s.cas_number} />
                    <Campo label="N° ONU (transporte)" value={s.numero_onu} />
                    <Campo label="Proveedor"           value={s.proveedor} />
                    <Campo label="Stock actual"        value={s.cantidad_stock ? `${s.cantidad_stock} ${s.unidad_medida}` : null} />
                    <Campo label="Área de uso"         value={s.area_uso} />
                    <Campo label="Almacenamiento"      value={s.ubicacion_almacenamiento} />
                  </dl>
                </div>

                {/* Límites de exposición */}
                {(s.limite_tlv_twa || s.limite_stel || s.limite_idlh) && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Límites de exposición · D.S. 015-2005-SA</h3>
                    <div className="flex gap-3 flex-wrap">
                      {s.limite_tlv_twa && <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-center"><p className="text-xs text-blue-500 font-medium">TLV-TWA</p><p className="text-sm font-bold text-blue-800">{s.limite_tlv_twa}</p></div>}
                      {s.limite_stel    && <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center"><p className="text-xs text-amber-500 font-medium">STEL</p><p className="text-sm font-bold text-amber-800">{s.limite_stel}</p></div>}
                      {s.limite_idlh    && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center"><p className="text-xs text-red-500 font-medium">IDLH</p><p className="text-sm font-bold text-red-800">{s.limite_idlh}</p></div>}
                    </div>
                  </div>
                )}

                {/* EPP */}
                {s.requiere_epp?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">EPP requerido</h3>
                    <div className="flex flex-wrap gap-1.5">{s.requiere_epp.map(e => <span key={e} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">{e}</span>)}</div>
                  </div>
                )}

                {/* Medidas */}
                {(s.incompatibilidades||s.medidas_control||s.procedimiento_derrame) && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Medidas de seguridad</h3>
                    {s.incompatibilidades   && <div><p className="text-xs text-gray-400 mb-1">Incompatibilidades</p><p className="text-sm bg-red-50 border border-red-100 rounded-lg p-3">{s.incompatibilidades}</p></div>}
                    {s.medidas_control      && <div><p className="text-xs text-gray-400 mb-1">Medidas de control</p><p className="text-sm bg-blue-50 border border-blue-100 rounded-lg p-3 whitespace-pre-line">{s.medidas_control}</p></div>}
                    {s.procedimiento_derrame && <div><p className="text-xs text-gray-400 mb-1">Procedimiento ante derrame</p><p className="text-sm bg-amber-50 border border-amber-100 rounded-lg p-3 whitespace-pre-line">{s.procedimiento_derrame}</p></div>}
                  </div>
                )}
              </div>

              {/* Columna derecha */}
              <div className="space-y-4">
                {/* NFPA 704 — Rombo oficial */}
                {(s.nfpa_salud||s.nfpa_inflamabilidad||s.nfpa_inestabilidad||s.nfpa_especial) && (
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
                      Rombo NFPA 704
                    </h3>
                    <div className="flex flex-col items-center gap-4">
                      <NfpaDiamond
                        salud={s.nfpa_salud          ?? 0}
                        inflamabilidad={s.nfpa_inflamabilidad ?? 0}
                        inestabilidad={s.nfpa_inestabilidad  ?? 0}
                        especial={s.nfpa_especial || ''}
                        size={150}
                      />
                      <NfpaLeyenda
                        salud={s.nfpa_salud}
                        inflamabilidad={s.nfpa_inflamabilidad}
                        inestabilidad={s.nfpa_inestabilidad}
                        especial={s.nfpa_especial}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {/* HDS */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">HDS · NTP-ISO 11014</h3>
                  <div className={`flex items-center gap-2 p-2.5 rounded-lg text-sm font-medium ${s.hds_disponible ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                    {s.hds_disponible ? <ShieldCheck size={15}/> : <ShieldX size={15}/>}
                    {s.hds_disponible ? 'HDS disponible' : 'Sin HDS'}
                  </div>
                  <div className={`flex items-center gap-2 p-2.5 rounded-lg text-sm font-medium ${s.hds_actualizado ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {s.hds_actualizado ? <ShieldCheck size={15}/> : <ShieldX size={15}/>}
                    {s.hds_actualizado ? 'HDS vigente' : 'HDS desactualizada'}
                  </div>
                  {s.hds_fecha_vencimiento && (
                    <p className={`text-xs px-2 py-1 rounded-lg font-medium ${new Date(s.hds_fecha_vencimiento) < new Date() ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'}`}>
                      Vence: {new Date(s.hds_fecha_vencimiento).toLocaleDateString('es-PE')}
                      {new Date(s.hds_fecha_vencimiento) < new Date() && ' — VENCIDA'}
                    </p>
                  )}
                  {s.hds_path && (
                    <button onClick={() => api.get(`/sustancias/${id}/hds/download`,{responseType:'blob'}).then(r=>{const u=URL.createObjectURL(r.data);const a=document.createElement('a');a.href=u;a.download=`HDS_${s.nombre}.pdf`;a.click()})}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                      <Download size={12}/> Descargar HDS
                    </button>
                  )}
                </div>

                {/* Nivel riesgo */}
                <div className={`rounded-xl border-2 p-4 ${riesgo?.cls}`}>
                  <div className="flex items-center gap-2 mb-1"><FlaskConical size={16}/><span className="text-xs font-semibold uppercase tracking-widest">Riesgo</span></div>
                  <p className="text-2xl font-black">{riesgo?.label}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: MOVIMIENTOS ── */}
          {tab === 'movimientos' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Stock actual: <span className="text-lg font-black text-gray-900">{s.cantidad_stock ?? 0} {s.unidad_medida}</span></p>
                </div>
                <button onClick={() => setShowMovForm(!showMovForm)}
                  className="flex items-center gap-1.5 bg-roka-500 hover:bg-roka-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                  <Plus size={13}/> Registrar movimiento
                </button>
              </div>
              {showMovForm && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500 mb-1 block">Tipo *</label>
                    <select value={mov.tipo} onChange={e=>setMov(p=>({...p,tipo:e.target.value}))} className={inp}>
                      <option value="entrada">📦 Entrada (compra/recepción)</option>
                      <option value="salida">📤 Salida (uso/eliminación)</option>
                      <option value="ajuste">⚖️ Ajuste de inventario</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1"><label className="text-xs text-gray-500 mb-1 block">Cantidad *</label><input type="number" min={0} step="0.01" value={mov.cantidad} onChange={e=>setMov(p=>({...p,cantidad:e.target.value}))} className={inp}/></div>
                    <div className="w-20"><label className="text-xs text-gray-500 mb-1 block">Unidad</label><select value={mov.unidad_medida} onChange={e=>setMov(p=>({...p,unidad_medida:e.target.value}))} className={inp}>{['kg','g','L','mL','m3','unidad'].map(u=><option key={u}>{u}</option>)}</select></div>
                  </div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Motivo</label><input value={mov.motivo} onChange={e=>setMov(p=>({...p,motivo:e.target.value}))} className={inp} placeholder="Compra, uso en producción..."/></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Referencia</label><input value={mov.referencia} onChange={e=>setMov(p=>({...p,referencia:e.target.value}))} className={inp} placeholder="N° factura, OC..."/></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Fecha *</label><input type="date" value={mov.fecha} onChange={e=>setMov(p=>({...p,fecha:e.target.value}))} className={inp}/></div>
                  <div className="flex items-end gap-2">
                    <button onClick={guardarMov} className="flex-1 bg-roka-500 text-white rounded-lg py-2 text-xs font-medium">Guardar</button>
                    <button onClick={()=>setShowMovForm(false)} className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-500">Cancelar</button>
                  </div>
                </div>
              )}
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>{['Fecha','Tipo','Cantidad','Motivo','Referencia'].map(h=><th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {movs.length===0?<tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">Sin movimientos registrados</td></tr>:movs.map(m=>(
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-600 text-xs">{new Date(m.fecha).toLocaleDateString('es-PE')}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${m.tipo==='entrada'?'bg-emerald-50 text-emerald-700 border-emerald-200':m.tipo==='salida'?'bg-red-50 text-red-700 border-red-200':'bg-blue-50 text-blue-700 border-blue-200'}`}>
                            {m.tipo==='entrada'?'📦 Entrada':m.tipo==='salida'?'📤 Salida':'⚖️ Ajuste'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-gray-800">{m.cantidad} {m.unidad_medida}</td>
                        <td className="px-4 py-2.5 text-gray-600">{m.motivo||'—'}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{m.referencia||'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TAB: EXPOSICIÓN ── */}
          {tab === 'exposicion' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">Trabajadores expuestos a esta sustancia · D.S. 015-2005-SA</p>
                <button onClick={()=>setShowExpForm(!showExpForm)} className="flex items-center gap-1.5 bg-roka-500 hover:bg-roka-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium"><Plus size={13}/> Registrar exposición</button>
              </div>
              {showExpForm && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-2 gap-3">
                  <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block">Nombre del trabajador *</label><input value={exp.nombre_trabajador} onChange={e=>setExp(p=>({...p,nombre_trabajador:e.target.value}))} className={inp}/></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Cargo</label><input value={exp.cargo} onChange={e=>setExp(p=>({...p,cargo:e.target.value}))} className={inp}/></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Frecuencia</label><select value={exp.frecuencia} onChange={e=>setExp(p=>({...p,frecuencia:e.target.value}))} className={inp}><option value="ocasional">Ocasional</option><option value="diaria">Diaria</option><option value="semanal">Semanal</option><option value="mensual">Mensual</option></select></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Vía de exposición</label><input value={exp.via_exposicion} onChange={e=>setExp(p=>({...p,via_exposicion:e.target.value}))} className={inp} placeholder="inhalación, dérmica..."/></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Resultado evaluación</label><select value={exp.resultado_evaluacion} onChange={e=>setExp(p=>({...p,resultado_evaluacion:e.target.value}))} className={inp}><option value="sin_medicion">Sin medición</option><option value="normal">Normal (bajo límite)</option><option value="sobre_limite">Sobre el límite</option></select></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Fecha evaluación</label><input type="date" value={exp.fecha_evaluacion} onChange={e=>setExp(p=>({...p,fecha_evaluacion:e.target.value}))} className={inp}/></div>
                  <div className="flex items-end gap-2">
                    <button onClick={guardarExp} className="flex-1 bg-roka-500 text-white rounded-lg py-2 text-xs font-medium">Guardar</button>
                    <button onClick={()=>setShowExpForm(false)} className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-500">Cancelar</button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {exps.length===0?<p className="text-center py-8 text-gray-400 text-sm">Sin registros de exposición</p>:exps.map(e=>(
                  <div key={e.id} className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                    <Users size={16} className="text-gray-400 flex-shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{e.nombre_trabajador}</p>
                      <p className="text-xs text-gray-500">{e.cargo} · {e.frecuencia}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${e.resultado_evaluacion==='normal'?'bg-emerald-50 text-emerald-700 border-emerald-200':e.resultado_evaluacion==='sobre_limite'?'bg-red-50 text-red-700 border-red-200':'bg-gray-100 text-gray-500 border-gray-200'}`}>
                      {e.resultado_evaluacion==='normal'?'✓ Normal':e.resultado_evaluacion==='sobre_limite'?'⚠ Sobre límite':'Sin medición'}
                    </span>
                    <button onClick={()=>eliminarExp(e.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={13}/></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB: CAPACITACIONES ── */}
          {tab === 'capacitacion' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">Personal capacitado y autorizado · Ley 29783 Art. 35</p>
                <button onClick={()=>setShowCapForm(!showCapForm)} className="flex items-center gap-1.5 bg-roka-500 hover:bg-roka-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium"><Plus size={13}/> Registrar</button>
              </div>
              {showCapForm && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-2 gap-3">
                  <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block">Nombre del trabajador *</label><input value={cap.nombre_trabajador} onChange={e=>setCap(p=>({...p,nombre_trabajador:e.target.value}))} className={inp}/></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Tipo de capacitación</label><input value={cap.tipo_capacitacion} onChange={e=>setCap(p=>({...p,tipo_capacitacion:e.target.value}))} className={inp}/></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Fecha capacitación *</label><input type="date" value={cap.fecha_capacitacion} onChange={e=>setCap(p=>({...p,fecha_capacitacion:e.target.value}))} className={inp}/></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Fecha vencimiento</label><input type="date" value={cap.fecha_vencimiento} onChange={e=>setCap(p=>({...p,fecha_vencimiento:e.target.value}))} className={inp}/></div>
                  <div className="flex items-end gap-2">
                    <button onClick={guardarCap} className="flex-1 bg-roka-500 text-white rounded-lg py-2 text-xs font-medium">Guardar</button>
                    <button onClick={()=>setShowCapForm(false)} className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-500">Cancelar</button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {caps.length===0?<p className="text-center py-8 text-gray-400 text-sm">Sin capacitaciones registradas</p>:caps.map(c=>{
                  const vencida = c.fecha_vencimiento && new Date(c.fecha_vencimiento) < new Date()
                  return (
                    <div key={c.id} className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                      <GraduationCap size={16} className="text-gray-400 flex-shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{c.nombre_trabajador}</p>
                        <p className="text-xs text-gray-500">{c.tipo_capacitacion} · {new Date(c.fecha_capacitacion).toLocaleDateString('es-PE')}</p>
                      </div>
                      {c.fecha_vencimiento && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${vencida?'bg-red-50 text-red-700 border-red-200':'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                          {vencida?'⚠ Vencida':'✓ Vigente'} {new Date(c.fecha_vencimiento).toLocaleDateString('es-PE')}
                        </span>
                      )}
                      <button onClick={()=>eliminarCap(c.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={13}/></button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
