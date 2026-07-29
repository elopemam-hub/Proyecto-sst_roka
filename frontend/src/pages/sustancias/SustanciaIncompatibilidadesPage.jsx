import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, GitCompare, ShieldAlert, MapPin,
  CheckCircle2, AlertTriangle, RefreshCw,
} from 'lucide-react'
import api from '../../services/api'

const NIVEL_CFG = {
  incompatible: { label:'Incompatible',  cls:'bg-red-100 text-red-700 border-red-300',     cell:'bg-red-100 text-red-700' },
  precaucion:   { label:'Precaución',    cls:'bg-amber-100 text-amber-700 border-amber-300', cell:'bg-amber-100 text-amber-700' },
  compatible:   { label:'Compatible',    cls:'bg-emerald-100 text-emerald-700 border-emerald-300', cell:'bg-emerald-100 text-emerald-700' },
}

const GHS_LABEL = {
  GHS01:'Explosivo', GHS02:'Inflamable', GHS03:'Comburente', GHS04:'Gas a presión',
  GHS05:'Corrosivo', GHS06:'Tóxico', GHS07:'Irritante', GHS08:'Peligro salud', GHS09:'Peligro ambiental',
}

/**
 * Verificación de almacenamiento: cruza qué sustancias comparten ubicación
 * física contra la matriz declarada y las reglas de segregación GHS.
 * Es lo que convierte la matriz en un control real y no en una tabla muerta.
 */
function VerificacionAlmacenamiento() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const cargar = () => {
    setLoading(true); setError(null)
    api.get('/sustancias/incompatibilidades/almacenamiento')
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.message || 'No se pudo verificar el almacenamiento'))
      .finally(() => setLoading(false))
  }

  useEffect(cargar, [])

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-400 text-sm">
        Verificando almacenamiento…
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-center gap-2">
        <AlertTriangle size={16} /> {error}
      </div>
    )
  }

  const r = data.resumen
  const sinConflictos = data.conflictos.length === 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 flex-wrap">
        <div>
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <ShieldAlert size={17} className="text-red-500" /> Verificación de almacenamiento
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Sustancias que comparten ubicación física y no deberían estar juntas
          </p>
        </div>
        <button onClick={cargar}
          className="flex items-center gap-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-xs">
          <RefreshCw size={13} /> Revisar
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-4 bg-gray-50 border-b border-gray-200">
        {[
          { label:'Incompatibles', valor:r.incompatibles, color: r.incompatibles > 0 ? 'text-red-600' : 'text-gray-400' },
          { label:'Precaución',    valor:r.precaucion,    color: r.precaucion > 0 ? 'text-amber-600' : 'text-gray-400' },
          { label:'Ubicaciones revisadas', valor:r.ubicaciones, color:'text-gray-700' },
          { label:'Sin ubicación', valor:r.sin_ubicacion, color: r.sin_ubicacion > 0 ? 'text-amber-600' : 'text-gray-400' },
        ].map(k => (
          <div key={k.label} className="text-center">
            <p className={`text-2xl font-bold ${k.color}`}>{k.valor}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {sinConflictos ? (
        <div className="px-5 py-10 text-center">
          <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-500" />
          <p className="text-gray-700 font-medium">Sin conflictos de almacenamiento</p>
          <p className="text-sm text-gray-400 mt-1">
            Ninguna de las {r.sustancias_ubicadas} sustancias ubicadas comparte estante con una incompatible.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {data.conflictos.map((c, i) => {
            const cfg = NIVEL_CFG[c.nivel] || NIVEL_CFG.precaucion
            return (
              <li key={i} className="px-5 py-3.5 hover:bg-gray-50">
                <div className="flex items-start gap-3 flex-wrap">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.cls} shrink-0`}>
                    {cfg.label}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1 shrink-0">
                    <MapPin size={12} /> {c.ubicacion}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${
                    c.origen === 'matriz'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    {c.origen === 'matriz' ? 'Matriz declarada' : 'Regla clase GHS'}
                  </span>
                </div>

                <p className="text-sm text-gray-800 font-medium mt-1.5">
                  {c.sustancia_a.nombre} <span className="text-gray-400 font-normal">+</span> {c.sustancia_b.nombre}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{c.motivo}</p>

                {c.clases && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    {c.clases.map(k => GHS_LABEL[k] || k).join(' + ')}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <p className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500">
        Las reglas por clase GHS son criterios estándar de segregación y sirven como red de seguridad
        cuando la matriz está incompleta. <strong>No sustituyen a la HDS</strong> de cada producto:
        confirma siempre la incompatibilidad concreta en su ficha de seguridad.
      </p>
    </div>
  )
}

export default function SustanciaIncompatibilidadesPage() {
  const navigate = useNavigate()
  const [incompat, setIncompat]   = useState([])
  const [sustancias, setSustancias] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState({ sustancia_a_id:'', sustancia_b_id:'', nivel:'incompatible', descripcion:'' })
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/sustancias/incompatibilidades'),
      api.get('/sustancias', { params: { per_page: 200 } }),
    ]).then(([{ data: inc }, { data: sus }]) => {
      setIncompat(inc)
      setSustancias(sus.data || sus)
    }).finally(() => setLoading(false))
  }, [])

  const guardar = async () => {
    if (!form.sustancia_a_id || !form.sustancia_b_id) return
    setSaving(true)
    try {
      const { data } = await api.post('/sustancias/incompatibilidades', form)
      setIncompat(p => [...p.filter(i => i.id !== data.id), data])
      setForm({ sustancia_a_id:'', sustancia_b_id:'', nivel:'incompatible', descripcion:'' })
      setShowForm(false)
    } catch(e) { alert(e.response?.data?.message||'Error') }
    finally { setSaving(false) }
  }

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar esta relación?')) return
    await api.delete(`/sustancias/incompatibilidades/${id}`)
    setIncompat(p => p.filter(i => i.id !== id))
  }

  // Construir matriz
  const parIds = sustancias.filter(s => incompat.some(i => i.sustancia_a_id === s.id || i.sustancia_b_id === s.id)).slice(0, 15)
  const getRelacion = (aId, bId) => incompat.find(i => (i.sustancia_a_id===aId&&i.sustancia_b_id===bId)||(i.sustancia_a_id===bId&&i.sustancia_b_id===aId))

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/sustancias')} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft size={18}/></button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><GitCompare size={22} className="text-purple-600"/> Matriz de Incompatibilidades</h1>
            <p className="text-gray-500 text-sm mt-0.5">Compatibilidad entre sustancias almacenadas · NTP 900.058 / NFPA 30</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={15}/> Agregar relación
        </button>
      </div>

      {/* La verificación va primero: es el hallazgo accionable, la matriz es la referencia */}
      <VerificacionAlmacenamiento />

      {/* Formulario */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-2 gap-4 shadow-sm">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Sustancia A *</label>
            <select value={form.sustancia_a_id} onChange={e=>setForm(p=>({...p,sustancia_a_id:e.target.value}))} className={inp}>
              <option value="">Seleccionar...</option>
              {sustancias.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Sustancia B *</label>
            <select value={form.sustancia_b_id} onChange={e=>setForm(p=>({...p,sustancia_b_id:e.target.value}))} className={inp}>
              <option value="">Seleccionar...</option>
              {sustancias.filter(s=>s.id!=form.sustancia_a_id).map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Nivel *</label>
            <select value={form.nivel} onChange={e=>setForm(p=>({...p,nivel:e.target.value}))} className={inp}>
              <option value="incompatible">🔴 Incompatible — NO almacenar juntas</option>
              <option value="precaucion">🟡 Precaución — Almacenar con medidas</option>
              <option value="compatible">🟢 Compatible — Pueden coexistir</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Descripción / Motivo</label>
            <input value={form.descripcion} onChange={e=>setForm(p=>({...p,descripcion:e.target.value}))} className={inp} placeholder="Ej: Reacción violenta con desprendimiento de gas..."/>
          </div>
          <div className="col-span-2 flex gap-2 justify-end">
            <button onClick={()=>setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={guardar} disabled={saving||!form.sustancia_a_id||!form.sustancia_b_id}
              className="px-4 py-2 bg-roka-500 text-white rounded-lg text-sm font-medium disabled:opacity-40">
              {saving?'Guardando...':'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de relaciones */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">Relaciones registradas ({incompat.length})</h3>
        </div>
        {loading ? <div className="py-10 flex justify-center"><div className="w-6 h-6 border-2 border-roka-500 border-t-transparent rounded-full animate-spin"/></div>
        : incompat.length === 0 ? <p className="text-center py-10 text-gray-400 text-sm">No hay relaciones registradas</p>
        : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Sustancia A','Sustancia B','Nivel','Descripción',''].map(h=><th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {incompat.map(i => {
                const cfg = NIVEL_CFG[i.nivel]
                return (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{i.sustancia_a?.nombre||'—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{i.sustancia_b?.nombre||'—'}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.cls}`}>{cfg.label}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{i.descripcion||'—'}</td>
                    <td className="px-4 py-3"><button onClick={()=>eliminar(i.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={13}/></button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Matriz visual */}
      {parIds.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">Matriz visual (primeras {parIds.length} sustancias con relaciones)</h3>
          </div>
          <div className="overflow-x-auto p-4">
            <table className="text-xs border-collapse">
              <thead>
                <tr>
                  <th className="w-32" />
                  {parIds.map(s => <th key={s.id} className="p-1 text-center"><div className="writing-vertical text-gray-600 font-medium truncate max-w-[80px] text-[10px]" style={{writingMode:'vertical-rl',transform:'rotate(180deg)',height:80}}>{s.nombre}</div></th>)}
                </tr>
              </thead>
              <tbody>
                {parIds.map(a => (
                  <tr key={a.id}>
                    <td className="pr-2 text-[10px] font-medium text-gray-600 text-right max-w-[120px] truncate">{a.nombre}</td>
                    {parIds.map(b => {
                      if (a.id === b.id) return <td key={b.id} className="w-8 h-8 bg-gray-200 border border-white text-center text-lg">—</td>
                      const rel = getRelacion(a.id, b.id)
                      const cfg = rel ? NIVEL_CFG[rel.nivel] : null
                      return (
                        <td key={b.id} title={rel ? `${a.nombre} + ${b.nombre}: ${cfg?.label}` : 'Sin relación'}
                          className={`w-8 h-8 border border-white text-center text-base cursor-default transition-colors ${rel ? cfg?.cell : 'bg-gray-50 hover:bg-gray-100'}`}>
                          {rel ? (rel.nivel==='incompatible'?'🔴':rel.nivel==='precaucion'?'🟡':'🟢') : <span className="text-gray-200">·</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span>🔴 Incompatible — NO almacenar juntas</span>
              <span>🟡 Precaución — Almacenar con medidas de seguridad</span>
              <span>🟢 Compatible</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
