import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, GitCompare } from 'lucide-react'
import api from '../../services/api'

const NIVEL_CFG = {
  incompatible: { label:'Incompatible',  cls:'bg-red-100 text-red-700 border-red-300',     cell:'bg-red-100 text-red-700' },
  precaucion:   { label:'Precaución',    cls:'bg-amber-100 text-amber-700 border-amber-300', cell:'bg-amber-100 text-amber-700' },
  compatible:   { label:'Compatible',    cls:'bg-emerald-100 text-emerald-700 border-emerald-300', cell:'bg-emerald-100 text-emerald-700' },
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
