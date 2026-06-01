import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Save, FlaskConical, Upload, FileText, Download } from 'lucide-react'
import api from '../../services/api'
import NfpaDiamond from '../../components/NfpaDiamond'

const GHS_OPCIONES = [
  { key: 'GHS01', label: 'GHS01 — Explosivo',          emoji: '💥' },
  { key: 'GHS02', label: 'GHS02 — Inflamable',         emoji: '🔥' },
  { key: 'GHS03', label: 'GHS03 — Comburente/Oxidante',emoji: '⭕' },
  { key: 'GHS04', label: 'GHS04 — Gas a presión',      emoji: '🔵' },
  { key: 'GHS05', label: 'GHS05 — Corrosivo',          emoji: '⚗️' },
  { key: 'GHS06', label: 'GHS06 — Tóxico agudo',       emoji: '☠️' },
  { key: 'GHS07', label: 'GHS07 — Nocivo/Irritante',   emoji: '⚠️' },
  { key: 'GHS08', label: 'GHS08 — Peligro para salud', emoji: '🫁' },
  { key: 'GHS09', label: 'GHS09 — Peligroso para MA',  emoji: '🌿' },
]

const EPP_OPCIONES = [
  'Guantes de nitrilo','Guantes de neopreno','Guantes anticorte','Guantes dieléctricos',
  'Lentes de seguridad','Careta facial','Mascarilla N95','Respirador vapores orgánicos',
  'Respirador P100 (polvo)','Mandil/delantal','Traje Tyvek','Botas de goma',
  'Calzado antiestático','Casco de seguridad',
]

const INICIAL = {
  nombre: '', nombre_quimico: '', cas_number: '', numero_onu: '',
  formula_quimica: '', estado_fisico: 'liquido', pictogramas_ghs: [],
  nivel_riesgo: 'medio', area_uso: '', cantidad_stock: '', unidad_medida: 'L',
  ubicacion_almacenamiento: '', proveedor: '', requiere_epp: [],
  incompatibilidades: '', medidas_control: '', procedimiento_derrame: '',
  hds_disponible: false, hds_actualizado: false,
  hds_fecha_emision: '', hds_fecha_vencimiento: '', hds_path: '',
  stock_minimo: '', stock_maximo: '',
  nfpa_salud: 0, nfpa_inflamabilidad: 0, nfpa_inestabilidad: 0, nfpa_especial: '',
  limite_tlv_twa: '', limite_stel: '', limite_idlh: '',
  observaciones: '', activo: true,
}

// Selector NFPA nivel 0-4
function NfpaSelector({ label, color, value, onChange }) {
  return (
    <div className="text-center">
      <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
      <div className="flex gap-1 justify-center">
        {[0,1,2,3,4].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={`w-8 h-8 rounded-lg text-sm font-bold transition-all border-2 ${
              value === n ? `${color} text-white border-transparent shadow-sm` : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-400'
            }`}>{n}</button>
        ))}
      </div>
    </div>
  )
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-roka-500 bg-white'
const ta  = inp + ' resize-none'

export default function SustanciaFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm]         = useState(INICIAL)
  const [saving, setSaving]     = useState(false)
  const [errors, setErrors]     = useState({})
  const [hdsFile, setHdsFile]   = useState(null)
  const [uploadingHds, setUploadingHds] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (id) api.get(`/sustancias/${id}`).then(({ data }) => {
      setForm({
        ...INICIAL,
        ...data,
        pictogramas_ghs:       data.pictogramas_ghs || [],
        requiere_epp:          data.requiere_epp    || [],
        cantidad_stock:        data.cantidad_stock  ?? '',
        stock_minimo:          data.stock_minimo ?? '',
        stock_maximo:          data.stock_maximo ?? '',
        nfpa_salud:            data.nfpa_salud   ?? 0,
        nfpa_inflamabilidad:   data.nfpa_inflamabilidad ?? 0,
        nfpa_inestabilidad:    data.nfpa_inestabilidad  ?? 0,
        nfpa_especial:         data.nfpa_especial || '',
        hds_fecha_emision:     data.hds_fecha_emision?.substring(0,10) || '',
        hds_fecha_vencimiento: data.hds_fecha_vencimiento?.substring(0,10) || '',
        limite_tlv_twa:        data.limite_tlv_twa || '',
        limite_stel:           data.limite_stel    || '',
        limite_idlh:           data.limite_idlh    || '',
      })
    }).catch(() => {})
  }, [id])

  const subirHds = async () => {
    if (!hdsFile || !id) return
    setUploadingHds(true)
    try {
      const fd = new FormData(); fd.append('hds', hdsFile)
      const { data } = await api.post(`/sustancias/${id}/hds`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setForm(p => ({ ...p, hds_path: data.hds_path, hds_disponible: true }))
      setHdsFile(null)
      alert('HDS subida correctamente.')
    } catch { alert('Error al subir HDS.') } finally { setUploadingHds(false) }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const toggleArr = (key, val) => setForm(p => ({
    ...p,
    [key]: p[key].includes(val) ? p[key].filter(x => x !== val) : [...p[key], val],
  }))

  const guardar = async () => {
    setSaving(true); setErrors({})
    try {
      const payload = { ...form, cantidad_stock: form.cantidad_stock === '' ? null : form.cantidad_stock }
      let sustanciaId = id
      if (id) {
        await api.put(`/sustancias/${id}`, payload)
      } else {
        const { data } = await api.post('/sustancias', payload)
        sustanciaId = data.id
      }
      // Si hay archivo HDS seleccionado, subirlo automáticamente
      if (hdsFile && sustanciaId) {
        const fd = new FormData()
        fd.append('hds', hdsFile)
        await api.post(`/sustancias/${sustanciaId}/hds`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }
      navigate('/sustancias')
    } catch (e) {
      if (e.response?.data?.errors) setErrors(e.response.data.errors)
      else alert(e.response?.data?.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const err = k => errors[k] ? <p className="text-xs text-red-500 mt-1">{errors[k][0]}</p> : null

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/sustancias')} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical size={22} className="text-purple-600" />
            {id ? 'Editar sustancia' : 'Nueva sustancia peligrosa'}
          </h1>
          <p className="text-gray-500 text-sm">Clasificación GHS/SGA · NTP 399.015 · NTP-ISO 11014</p>
        </div>
      </div>

      {/* Identificación */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Identificación</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre común *</label>
            <input value={form.nombre} onChange={e => f('nombre', e.target.value)} className={inp} placeholder="Ej: Hidróxido de sodio (soda cáustica)" />
            {err('nombre')}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre químico / IUPAC</label>
            <input value={form.nombre_quimico} onChange={e => f('nombre_quimico', e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fórmula química</label>
            <input value={form.formula_quimica} onChange={e => f('formula_quimica', e.target.value)} className={inp} placeholder="Ej: NaOH" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">N° CAS</label>
            <input value={form.cas_number} onChange={e => f('cas_number', e.target.value)} className={inp} placeholder="Ej: 1310-73-2" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">N° ONU (transporte)</label>
            <input value={form.numero_onu} onChange={e => f('numero_onu', e.target.value)} className={inp} placeholder="Ej: UN1824" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Estado físico *</label>
            <select value={form.estado_fisico} onChange={e => f('estado_fisico', e.target.value)} className={inp}>
              <option value="liquido">💧 Líquido</option>
              <option value="solido">🧱 Sólido</option>
              <option value="gas">💨 Gas</option>
              <option value="aerosol">🌫️ Aerosol</option>
              <option value="polvo">🌪️ Polvo</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nivel de riesgo *</label>
            <select value={form.nivel_riesgo} onChange={e => f('nivel_riesgo', e.target.value)} className={inp}>
              <option value="bajo">🟢 Bajo</option>
              <option value="medio">🟡 Medio</option>
              <option value="alto">🟠 Alto</option>
              <option value="muy_alto">🔴 Muy alto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pictogramas GHS */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Pictogramas GHS/SGA · NTP 399.015</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {GHS_OPCIONES.map(({ key, label, emoji }) => {
            const sel = form.pictogramas_ghs.includes(key)
            return (
              <button key={key} type="button" onClick={() => toggleArr('pictogramas_ghs', key)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs transition-all ${
                  sel ? 'border-purple-500 bg-purple-50 text-purple-700 font-semibold' : 'border-gray-200 hover:border-gray-300 text-gray-500'
                }`}>
                <span className="text-2xl">{emoji}</span>
                <span className="text-center leading-tight">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Inventario */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Inventario y ubicación</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Stock actual</label>
              <input type="number" min={0} step="0.01" value={form.cantidad_stock}
                onChange={e => f('cantidad_stock', e.target.value)} className={inp} placeholder="0" />
            </div>
            <div className="w-24">
              <label className="block text-xs font-medium text-gray-500 mb-1">Unidad</label>
              <select value={form.unidad_medida} onChange={e => f('unidad_medida', e.target.value)} className={inp}>
                {['kg','g','L','mL','m3','unidad'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ubicación de almacenamiento</label>
            <input value={form.ubicacion_almacenamiento} onChange={e => f('ubicacion_almacenamiento', e.target.value)}
              className={inp} placeholder="Ej: Almacén de productos químicos - Estante A" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Área(s) de uso</label>
            <input value={form.area_uso} onChange={e => f('area_uso', e.target.value)}
              className={inp} placeholder="Ej: Taller Mecánico, Almacén de Limpieza" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Stock mínimo <span className="text-amber-500 font-medium">⚠ Alerta de reposición</span>
            </label>
            <div className="flex gap-2">
              <input type="number" min={0} step="0.01" value={form.stock_minimo}
                onChange={e => f('stock_minimo', e.target.value)}
                className={inp} placeholder="Ej: 5" />
              <span className="flex items-center text-xs text-gray-500 whitespace-nowrap">{form.unidad_medida || 'unid.'}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Se genera alerta cuando el stock actual ≤ este valor</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Stock máximo <span className="text-gray-400">(capacidad del almacén)</span>
            </label>
            <div className="flex gap-2">
              <input type="number" min={0} step="0.01" value={form.stock_maximo}
                onChange={e => f('stock_maximo', e.target.value)}
                className={inp} placeholder="Ej: 100" />
              <span className="flex items-center text-xs text-gray-500 whitespace-nowrap">{form.unidad_medida || 'unid.'}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Proveedor</label>
            <input value={form.proveedor} onChange={e => f('proveedor', e.target.value)} className={inp} />
          </div>
        </div>
      </div>

      {/* EPP Requerido */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">EPP requerido para manipulación · Ley 29783 Art. 37</h2>
        <div className="flex flex-wrap gap-2">
          {EPP_OPCIONES.map(epp => {
            const sel = (form.requiere_epp || []).includes(epp)
            return (
              <button key={epp} type="button" onClick={() => toggleArr('requiere_epp', epp)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  sel ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400'
                }`}>
                {epp}
              </button>
            )
          })}
        </div>
      </div>

      {/* Medidas de seguridad */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Medidas de seguridad · NTP-ISO 11014</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Incompatibilidades (no almacenar con...)</label>
            <textarea rows={2} value={form.incompatibilidades} onChange={e => f('incompatibilidades', e.target.value)}
              className={ta} placeholder="Ej: No almacenar con ácidos, materiales combustibles..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Medidas de control y manejo seguro</label>
            <textarea rows={3} value={form.medidas_control} onChange={e => f('medidas_control', e.target.value)}
              className={ta} placeholder="Ej: Usar en área ventilada, evitar contacto con piel y ojos..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Procedimiento ante derrame / exposición accidental</label>
            <textarea rows={3} value={form.procedimiento_derrame} onChange={e => f('procedimiento_derrame', e.target.value)}
              className={ta} placeholder="Ej: En caso de derrame: contener con arena seca, usar kit antiderrame..." />
          </div>
        </div>
      </div>

      {/* NFPA 704 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Rombo NFPA 704 · Identificación de peligros en almacenamiento</h2>
        <p className="text-xs text-gray-400">Selecciona 0 (mínimo) a 4 (máximo peligro) para cada cuadrante del rombo.</p>
        <div className="flex flex-wrap gap-8 items-start">
          {/* Selectores */}
          <div className="flex flex-wrap gap-5 items-start">
            <NfpaSelector label="🔵 Salud"           color="bg-blue-600"   value={form.nfpa_salud}          onChange={v => f('nfpa_salud', v)} />
            <NfpaSelector label="🔴 Inflamabilidad"   color="bg-red-600"    value={form.nfpa_inflamabilidad}  onChange={v => f('nfpa_inflamabilidad', v)} />
            <NfpaSelector label="🟡 Inestabilidad"    color="bg-yellow-500" value={form.nfpa_inestabilidad}   onChange={v => f('nfpa_inestabilidad', v)} />
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">⬜ Especial</p>
              <input value={form.nfpa_especial} onChange={e => f('nfpa_especial', e.target.value)}
                placeholder="OX, W, COR..." maxLength={10}
                className="w-24 border border-gray-300 rounded-lg px-2 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-roka-500" />
              <p className="text-[10px] text-gray-400 mt-1 text-center">OX, W, COR, RA...</p>
            </div>
          </div>

          {/* Previsualización del rombo en tiempo real */}
          {(form.nfpa_salud || form.nfpa_inflamabilidad || form.nfpa_inestabilidad || form.nfpa_especial) ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Vista previa</p>
              <NfpaDiamond
                salud={form.nfpa_salud}
                inflamabilidad={form.nfpa_inflamabilidad}
                inestabilidad={form.nfpa_inestabilidad}
                especial={form.nfpa_especial || ''}
                size={120}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
              <p className="text-xs text-gray-300 text-center">Selecciona valores para ver el rombo</p>
            </div>
          )}
        </div>
      </div>

      {/* Límites de exposición laboral */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Límites de exposición laboral · D.S. 015-2005-SA</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">TLV-TWA <span className="text-gray-300">(8h/día)</span></label>
            <input value={form.limite_tlv_twa} onChange={e => f('limite_tlv_twa', e.target.value)} className={inp} placeholder="Ej: 0.5 ppm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">STEL <span className="text-gray-300">(15 min)</span></label>
            <input value={form.limite_stel} onChange={e => f('limite_stel', e.target.value)} className={inp} placeholder="Ej: 1 ppm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">IDLH <span className="text-gray-300">(peligro inmediato)</span></label>
            <input value={form.limite_idlh} onChange={e => f('limite_idlh', e.target.value)} className={inp} placeholder="Ej: 10 ppm" />
          </div>
        </div>
      </div>

      {/* HDS y Estado */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">HDS / Hoja de Datos de Seguridad · NTP-ISO 11014</h2>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.hds_disponible} onChange={e => f('hds_disponible', e.target.checked)} className="w-4 h-4 rounded" />
            <span className="text-sm text-gray-700">HDS disponible en el área de uso</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.hds_actualizado} onChange={e => f('hds_actualizado', e.target.checked)} className="w-4 h-4 rounded" />
            <span className="text-sm text-gray-700">HDS actualizada (no mayor a 5 años)</span>
          </label>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de emisión HDS</label>
            <input type="date" value={form.hds_fecha_emision} onChange={e => f('hds_fecha_emision', e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de vencimiento HDS</label>
            <input type="date" value={form.hds_fecha_vencimiento} onChange={e => f('hds_fecha_vencimiento', e.target.value)} className={inp} />
          </div>
        </div>

        {/* Adjuntar HDS en PDF — disponible en crear y editar */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Adjuntar HDS / Ficha de Datos de Seguridad (PDF, máx. 10 MB)
          </label>

          {/* Archivo ya adjunto */}
          {form.hds_path && id && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-2">
              <FileText size={14} className="flex-shrink-0" />
              <span className="flex-1 text-xs font-medium">HDS adjunta actualmente</span>
              <button
                type="button"
                onClick={() => api.get(`/sustancias/${id}/hds/download`, { responseType: 'blob' })
                  .then(r => {
                    const u = URL.createObjectURL(r.data)
                    const a = document.createElement('a')
                    a.href = u; a.download = `HDS_${form.nombre}.pdf`; a.click()
                  })}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                <Download size={12} /> Descargar
              </button>
            </div>
          )}

          {/* Zona de arrastre / selección */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && f.type === 'application/pdf') setHdsFile(f) }}
            className={`relative flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl px-6 py-5 cursor-pointer transition-colors ${
              hdsFile ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 hover:border-roka-400 hover:bg-roka-50 bg-gray-50'
            }`}>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={e => setHdsFile(e.target.files[0] || null)}
            />
            {hdsFile ? (
              <>
                <FileText size={22} className="text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-700">{hdsFile.name}</p>
                <p className="text-xs text-emerald-500">{(hdsFile.size / 1024 / 1024).toFixed(2)} MB · Click para cambiar</p>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setHdsFile(null) }}
                  className="absolute top-2 right-2 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-1.5 py-0.5">
                  ✕ Quitar
                </button>
              </>
            ) : (
              <>
                <Upload size={22} className="text-gray-400" />
                <p className="text-sm font-medium text-gray-600">
                  <span className="text-roka-600 font-semibold">Haz clic</span> o arrastra el PDF aquí
                </p>
                <p className="text-xs text-gray-400">Solo archivos PDF · máx. 10 MB</p>
                {!id && <p className="text-xs text-blue-500 font-medium">El archivo se subirá automáticamente al guardar</p>}
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.activo} onChange={e => f('activo', e.target.checked)} className="w-4 h-4 rounded" />
            <span className="text-sm text-gray-700">Sustancia activa (en uso)</span>
          </label>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Observaciones adicionales</label>
          <textarea rows={2} value={form.observaciones} onChange={e => f('observaciones', e.target.value)}
            className={ta} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pb-6">
        <button onClick={() => navigate('/sustancias')}
          className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
          Cancelar
        </button>
        <button onClick={guardar} disabled={saving || !form.nombre}
          className="flex items-center gap-2 px-4 py-2 bg-roka-500 hover:bg-roka-600 text-white rounded-lg text-sm font-medium disabled:opacity-40">
          <Save size={15} />
          {saving
            ? (hdsFile ? 'Guardando y subiendo HDS...' : 'Guardando...')
            : id ? 'Actualizar' : 'Registrar sustancia'}
          {hdsFile && !saving && <span className="ml-1 text-xs opacity-80">+ HDS</span>}
        </button>
      </div>
    </div>
  )
}
