import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Download, Upload, FileSpreadsheet, CheckCircle,
  XCircle, AlertTriangle, Loader2, ChevronRight, Info,
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

// ── Columnas de la plantilla ──────────────────────────────────────
const COLUMNAS = [
  { key: 'nombres',                   label: 'NOMBRES',                    required: true,  ejemplo: 'Carlos Alberto',       tipo: 'Texto' },
  { key: 'apellidos',                 label: 'APELLIDOS',                  required: true,  ejemplo: 'Puma Ccari',           tipo: 'Texto' },
  { key: 'dni',                       label: 'DNI',                        required: true,  ejemplo: '45678901',             tipo: '8 dígitos' },
  { key: 'dni_vencimiento',           label: 'DNI_VENCIMIENTO',            required: false, ejemplo: '31/12/2027',           tipo: 'dd/mm/yyyy' },
  { key: 'fecha_nacimiento',          label: 'FECHA_NACIMIENTO',           required: false, ejemplo: '15/03/1990',           tipo: 'dd/mm/yyyy' },
  { key: 'genero',                    label: 'GENERO',                     required: false, ejemplo: 'M',                    tipo: 'M | F | otro' },
  { key: 'telefono',                  label: 'TELEFONO',                   required: false, ejemplo: '951234567',            tipo: 'Texto' },
  { key: 'email',                     label: 'EMAIL',                      required: false, ejemplo: 'cpuma@empresa.com',    tipo: 'Email' },
  { key: 'direccion',                 label: 'DIRECCION',                  required: false, ejemplo: 'Av. Los Pinos 234',    tipo: 'Texto' },
  { key: 'area',                      label: 'AREA',                       required: false, ejemplo: 'Producción',           tipo: 'Nombre del área (debe existir)' },
  { key: 'cargo',                     label: 'CARGO',                      required: false, ejemplo: 'Operario de planta',   tipo: 'Nombre del cargo (debe existir)' },
  { key: 'fecha_ingreso',             label: 'FECHA_INGRESO',              required: false, ejemplo: '01/01/2024',           tipo: 'dd/mm/yyyy' },
  { key: 'tipo_contrato',             label: 'TIPO_CONTRATO',              required: false, ejemplo: 'indefinido',           tipo: 'indefinido | plazo_fijo | por_obra | part_time | honorarios | practicante' },
  { key: 'estado',                    label: 'ESTADO',                     required: false, ejemplo: 'activo',               tipo: 'activo | inactivo | vacaciones | licencia' },
  { key: 'grupo_sanguineo',           label: 'GRUPO_SANGUINEO',            required: false, ejemplo: 'O+',                   tipo: 'A+ | A- | B+ | B- | AB+ | AB- | O+ | O-' },
  { key: 'licencia_conducir',         label: 'LICENCIA_CONDUCIR',          required: false, ejemplo: 'Q12345678',            tipo: 'Número de licencia' },
  { key: 'licencia_categoria',        label: 'LICENCIA_CATEGORIA',         required: false, ejemplo: 'B-I',                  tipo: 'A-I | B-I | C-I | etc.' },
  { key: 'licencia_vencimiento',      label: 'LICENCIA_VENCIMIENTO',       required: false, ejemplo: '30/06/2027',           tipo: 'dd/mm/yyyy' },
  { key: 'contacto_emergencia',       label: 'CONTACTO_EMERGENCIA',        required: false, ejemplo: 'María Ccari',          tipo: 'Nombre del contacto' },
  { key: 'contacto_emergencia_tel',   label: 'CONTACTO_EMERGENCIA_TEL',    required: false, ejemplo: '987654321',            tipo: 'Teléfono del contacto' },
]

// ── Helpers ───────────────────────────────────────────────────────
function parseFecha(v) {
  if (!v) return null
  const s = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
  if (!isNaN(Number(v))) {
    const d = new Date(Math.round((Number(v) - 25569) * 86400 * 1000))
    return d.toISOString().split('T')[0]
  }
  return null
}

function normalizarGenero(v) {
  const s = String(v || '').trim().toLowerCase()
  if (['m','masculino','male','hombre'].includes(s)) return 'M'
  if (['f','femenino','female','mujer'].includes(s))  return 'F'
  if (s) return 'otro'
  return ''
}

function normalizarContrato(v) {
  const s = String(v || '').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
  const map = {
    indefinido:'indefinido', 'plazo fijo':'plazo_fijo', plazo_fijo:'plazo_fijo',
    'por obra':'por_obra', por_obra:'por_obra', 'part time':'part_time',
    part_time:'part_time', honorarios:'honorarios', practicante:'practicante',
  }
  return map[s] || 'indefinido'
}

function normalizarEstado(v) {
  const s = String(v || '').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
  if (['activo','active','trabajando'].includes(s))     return 'activo'
  if (['inactivo','inactive','cesado'].includes(s))     return 'inactivo'
  if (['vacaciones','vacation'].includes(s))            return 'vacaciones'
  if (['licencia','license','permiso'].includes(s))     return 'licencia'
  return 'activo'
}

function validarFila(fila) {
  const errores = []
  if (!fila.nombres?.trim())  errores.push('Nombres requerido')
  if (!fila.apellidos?.trim())errores.push('Apellidos requerido')
  if (!fila.dni?.trim())      errores.push('DNI requerido')
  else if (!/^\d{7,8}$/.test(fila.dni.trim())) errores.push(`DNI inválido: "${fila.dni}" (debe tener 7-8 dígitos)`)
  return errores
}

// ── Descargar plantilla ───────────────────────────────────────────
async function descargarPlantilla() {
  try {
    const XLSX = await import('xlsx')
    const wb   = XLSX.utils.book_new()
    const headers = COLUMNAS.map(c => c.label)
    const ejemplo = COLUMNAS.map(c => c.ejemplo)
    const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo])
    ws['!cols'] = COLUMNAS.map(c => ({ wch: Math.max(c.label.length, c.ejemplo.length) + 4 }))
    XLSX.utils.book_append_sheet(wb, ws, 'Personal')

    const instrucciones = [
      ['INSTRUCCIONES DE USO'],[''],
      ['1. Llena la hoja "Personal" con los datos de cada trabajador.'],
      ['2. NO modifiques los encabezados de la primera fila.'],
      ['3. La fila 2 es de ejemplo — puedes borrarla o sobreescribirla.'],
      ['4. Campos OBLIGATORIOS: NOMBRES, APELLIDOS, DNI'],
      [''],
      ['CAMPOS Y VALORES PERMITIDOS:'],
      ...COLUMNAS.map(c => [c.label, c.tipo]),
      [''],
      ['NOTAS IMPORTANTES:'],
      ['AREA y CARGO', 'Deben coincidir exactamente con los nombres registrados en el sistema.'],
      ['DNI', 'Debe tener 7 u 8 dígitos numéricos, sin puntos ni guiones.'],
      ['FECHAS', 'Usar formato dd/mm/yyyy  (ej: 15/03/1990)'],
    ]
    const wsI = XLSX.utils.aoa_to_sheet(instrucciones)
    wsI['!cols'] = [{ wch: 28 }, { wch: 60 }]
    XLSX.utils.book_append_sheet(wb, wsI, 'Instrucciones')
    XLSX.writeFile(wb, 'plantilla_personal.xlsx')
    toast.success('Plantilla descargada')
  } catch { toast.error('Error al generar plantilla') }
}

// ── Exportar ──────────────────────────────────────────────────────
async function exportarPersonal(lista) {
  try {
    const XLSX = await import('xlsx')
    const wb   = XLSX.utils.book_new()
    const rows = lista.map(p => ({
      'NOMBRES':               p.nombres || '',
      'APELLIDOS':             p.apellidos || '',
      'DNI':                   p.dni || '',
      'DNI_VENCIMIENTO':       p.dni_vencimiento || '',
      'FECHA_NACIMIENTO':      p.fecha_nacimiento || '',
      'GENERO':                p.genero || '',
      'TELEFONO':              p.telefono || '',
      'EMAIL':                 p.email || '',
      'DIRECCION':             p.direccion || '',
      'AREA':                  p.area?.nombre || '',
      'CARGO':                 p.cargo?.nombre || '',
      'FECHA_INGRESO':         p.fecha_ingreso || '',
      'TIPO_CONTRATO':         p.tipo_contrato || '',
      'ESTADO':                p.estado || '',
      'GRUPO_SANGUINEO':       p.grupo_sanguineo || '',
      'LICENCIA_CONDUCIR':     p.licencia_conducir || '',
      'LICENCIA_CATEGORIA':    p.licencia_categoria || '',
      'LICENCIA_VENCIMIENTO':  p.licencia_vencimiento || '',
      'CONTACTO_EMERGENCIA':   p.contacto_emergencia_nombre || '',
      'CONTACTO_EMERGENCIA_TEL': p.contacto_emergencia_telefono || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 20 }))
    XLSX.utils.book_append_sheet(wb, ws, 'Personal')
    XLSX.writeFile(wb, `personal_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success(`${rows.length} trabajadores exportados`)
  } catch { toast.error('Error al exportar') }
}

// ── Página principal ──────────────────────────────────────────────
export default function PersonalImportExportPage() {
  const navigate  = useNavigate()
  const fileRef   = useRef(null)
  const [areas, setAreas]             = useState([])
  const [cargos, setCargos]           = useState([])
  const [filas, setFilas]             = useState([])
  const [errores, setErrores]         = useState([])
  const [importando, setImp]          = useState(false)
  const [resultado, setResult]        = useState(null)
  const [cargando, setCargando]       = useState(false)
  const [nombreArchivo, setNombre]    = useState('')

  useEffect(() => {
    Promise.all([api.get('/areas'), api.get('/cargos')])
      .then(([ra, rc]) => { setAreas(ra.data.data || ra.data); setCargos(rc.data || []) })
      .catch(() => {})
  }, [])

  const limpiar = () => {
    setFilas([]); setErrores([]); setResult(null); setNombre('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const cargarParaExportar = async () => {
    setCargando(true)
    try {
      const { data } = await api.get('/personal', { params: { per_page: 500 } })
      await exportarPersonal(data.data || data)
    } catch { toast.error('Error al cargar personal') } finally { setCargando(false) }
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setNombre(file.name)
    try {
      const XLSX   = await import('xlsx')
      const buf    = await file.arrayBuffer()
      const wb     = XLSX.read(buf, { type: 'array', cellDates: false })
      const ws     = wb.Sheets[wb.SheetNames[0]]
      const raw    = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      if (raw.length < 2) { toast.error('Archivo sin datos'); return }

      const headerRow = raw[0].map(h => String(h).trim().toUpperCase())
      const colIdx = {}
      COLUMNAS.forEach(c => { const i = headerRow.indexOf(c.label); if (i >= 0) colIdx[c.key] = i })

      const filasParsed = [], erroresParsed = []
      for (let i = 1; i < raw.length; i++) {
        const row = raw[i]
        if (row.every(v => String(v).trim() === '')) continue
        const fila = {}
        COLUMNAS.forEach(c => {
          fila[c.key] = String(colIdx[c.key] !== undefined ? row[colIdx[c.key]] : '').trim()
        })
        const errs = validarFila(fila)
        if (errs.length) erroresParsed.push({ fila: i+1, msgs: errs })

        // Buscar area_id y cargo_id
        const areaObj  = areas.find(a => a.nombre?.toLowerCase() === fila.area?.toLowerCase())
        const cargoObj = cargos.find(c => c.nombre?.toLowerCase() === fila.cargo?.toLowerCase())
        const adv = []
        if (fila.area && !areaObj)   adv.push(`Área "${fila.area}" no encontrada`)
        if (fila.cargo && !cargoObj) adv.push(`Cargo "${fila.cargo}" no encontrado`)

        filasParsed.push({
          ...fila,
          _fila: i+1, _valida: errs.length === 0,
          _advertencias: adv,
          _area_id:  areaObj?.id  || null,
          _cargo_id: cargoObj?.id || null,
        })
      }
      setFilas(filasParsed); setErrores(erroresParsed); setResult(null)
      toast.success(`${filasParsed.length} filas leídas`)
    } catch { toast.error('Error al leer el archivo') }
    e.target.value = ''
  }

  const importar = async () => {
    const validas = filas.filter(f => f._valida)
    if (!validas.length) { toast.error('No hay filas válidas'); return }
    setImp(true)
    let ok = 0; const fallidos = []
    for (const f of validas) {
      try {
        await api.post('/personal', {
          nombres:                     f.nombres,
          apellidos:                   f.apellidos,
          dni:                         f.dni,
          dni_vencimiento:             parseFecha(f.dni_vencimiento),
          fecha_nacimiento:            parseFecha(f.fecha_nacimiento),
          genero:                      normalizarGenero(f.genero) || null,
          telefono:                    f.telefono || null,
          email:                       f.email || null,
          direccion:                   f.direccion || null,
          area_id:                     f._area_id || null,
          cargo_id:                    f._cargo_id || null,
          fecha_ingreso:               parseFecha(f.fecha_ingreso),
          tipo_contrato:               f.tipo_contrato ? normalizarContrato(f.tipo_contrato) : 'indefinido',
          estado:                      f.estado ? normalizarEstado(f.estado) : 'activo',
          grupo_sanguineo:             f.grupo_sanguineo || null,
          licencia_conducir:           f.licencia_conducir || null,
          licencia_categoria:          f.licencia_categoria || null,
          licencia_vencimiento:        parseFecha(f.licencia_vencimiento),
          contacto_emergencia_nombre:  f.contacto_emergencia || null,
          contacto_emergencia_telefono:f.contacto_emergencia_tel || null,
        })
        ok++
      } catch (err) { fallidos.push({ fila: f._fila, error: err.response?.data?.message || 'Error' }) }
    }
    setResult({ ok, fallidos }); setImp(false)
    if (ok)          toast.success(`${ok} trabajadores importados`)
    if (fallidos.length) toast.error(`${fallidos.length} filas fallaron`)
  }

  const filasValidas   = filas.filter(f => f._valida)
  const filasInvalidas = filas.filter(f => !f._valida)
  const filasConAdv    = filas.filter(f => f._valida && f._advertencias?.length > 0)

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500'

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/personal')} className="btn-back">
            <ArrowLeft size={14} /> Personal
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Importar / Exportar Personal</h1>
            <p className="text-gray-500 text-sm mt-0.5">Gestión masiva de trabajadores vía Excel</p>
          </div>
        </div>
      </div>

      {/* Tarjetas de acción */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* 1. Plantilla */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <FileSpreadsheet size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Plantilla Excel</h3>
            <p className="text-xs text-gray-500 mt-1">Descarga la plantilla con todos los campos y las instrucciones de llenado.</p>
          </div>
          <button onClick={descargarPlantilla}
            className="w-full flex items-center justify-center gap-2 border border-blue-300 text-blue-600 hover:bg-blue-50 py-2.5 rounded-lg text-sm font-medium transition-colors">
            <Download size={14} /> Descargar plantilla
          </button>
        </div>

        {/* 2. Importar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
            <Upload size={20} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Importar desde Excel</h3>
            <p className="text-xs text-gray-500 mt-1">Carga un archivo Excel con el formato de la plantilla para registrar múltiples trabajadores.</p>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          {nombreArchivo ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <FileSpreadsheet size={13} className="text-emerald-600 flex-shrink-0" />
                <span className="text-xs text-emerald-700 font-medium flex-1 truncate">{nombreArchivo}</span>
                <button onClick={limpiar} className="text-emerald-400 hover:text-red-500"><XCircle size={13} /></button>
              </div>
              <button onClick={() => { limpiar(); setTimeout(() => fileRef.current?.click(), 50) }}
                className="w-full flex items-center justify-center gap-2 border border-emerald-300 text-emerald-600 hover:bg-emerald-50 py-2 rounded-lg text-xs font-medium">
                <Upload size={12} /> Cargar otro archivo
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border border-emerald-300 text-emerald-600 hover:bg-emerald-50 py-2.5 rounded-lg text-sm font-medium transition-colors">
              <Upload size={14} /> Seleccionar archivo
            </button>
          )}
        </div>

        {/* 3. Exportar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
            <Download size={20} className="text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Exportar datos</h3>
            <p className="text-xs text-gray-500 mt-1">Exporta todo el personal registrado a un archivo Excel con todos sus datos.</p>
          </div>
          <button onClick={cargarParaExportar} disabled={cargando}
            className="w-full flex items-center justify-center gap-2 border border-purple-300 text-purple-600 hover:bg-purple-50 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            {cargando ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Exportar personal
          </button>
        </div>
      </div>

      {/* Referencia de columnas */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
          <Info size={15} className="text-blue-500" />
          <h2 className="font-semibold text-gray-800">Estructura de la plantilla — {COLUMNAS.length} columnas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Columna','Req.','Ejemplo','Valores permitidos'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {COLUMNAS.map(c => (
                <tr key={c.key} className={`hover:bg-gray-50 ${c.required ? 'bg-blue-50/30' : ''}`}>
                  <td className="px-4 py-2 font-mono font-semibold text-gray-800">{c.label}</td>
                  <td className="px-4 py-2">{c.required ? <span className="text-red-600 font-bold">Sí</span> : <span className="text-gray-400">No</span>}</td>
                  <td className="px-4 py-2 text-gray-600 italic">{c.ejemplo}</td>
                  <td className="px-4 py-2 text-gray-500">{c.tipo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview */}
      {filas.length > 0 && !resultado && (
        <div className="space-y-4">
          {/* Barra de estado */}
          <div className="flex items-center gap-3 flex-wrap bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            {nombreArchivo && (
              <div className="flex items-center gap-2 text-xs text-gray-500 border-r border-gray-200 pr-3">
                <FileSpreadsheet size={13} className="text-roka-500" />
                <span className="font-medium truncate max-w-[160px]">{nombreArchivo}</span>
              </div>
            )}
            <span className="flex items-center gap-1.5 text-sm"><CheckCircle size={13} className="text-emerald-500" /><span className="font-semibold text-emerald-700">{filasValidas.length} válidas</span></span>
            {filasConAdv.length > 0 && <span className="flex items-center gap-1.5 text-sm"><AlertTriangle size={13} className="text-amber-500" /><span className="font-semibold text-amber-600">{filasConAdv.length} con advertencias</span></span>}
            {filasInvalidas.length > 0 && <span className="flex items-center gap-1.5 text-sm"><XCircle size={13} className="text-red-500" /><span className="font-semibold text-red-600">{filasInvalidas.length} con errores</span></span>}
            <div className="ml-auto flex gap-2">
              <button onClick={limpiar} className="flex items-center gap-1.5 border border-red-200 text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg text-xs font-medium">
                <XCircle size={12} /> Borrar carga
              </button>
              <button onClick={() => { limpiar(); setTimeout(() => fileRef.current?.click(), 50) }}
                className="flex items-center gap-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-xs font-medium">
                <Upload size={12} /> Cargar otra plantilla
              </button>
              <button onClick={importar} disabled={importando || !filasValidas.length}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
                {importando ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {importando ? 'Importando...' : `Importar ${filasValidas.length} trabajadores`}
              </button>
            </div>
          </div>

          {/* Errores */}
          {errores.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1.5">
              <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
                <AlertTriangle size={14} /> Errores — estas filas no se importarán
              </p>
              {errores.map((e, i) => (
                <p key={i} className="text-xs text-red-600">
                  <span className="font-mono font-bold">Fila {e.fila}:</span> {e.msgs.join(' · ')}
                </p>
              ))}
            </div>
          )}

          {/* Advertencias (área/cargo no encontrados) */}
          {filasConAdv.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5">
              <p className="text-sm font-semibold text-amber-700 flex items-center gap-2">
                <AlertTriangle size={14} /> Advertencias — se importarán pero sin área/cargo asignado
              </p>
              {filasConAdv.slice(0, 5).map((f, i) => (
                <p key={i} className="text-xs text-amber-600">
                  <span className="font-mono font-bold">Fila {f._fila} ({f.nombres}):</span> {f._advertencias.join(' · ')}
                </p>
              ))}
              {filasConAdv.length > 5 && <p className="text-xs text-amber-500">...y {filasConAdv.length - 5} más</p>}
            </div>
          )}

          {/* Tabla preview */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
              <p className="text-sm font-medium text-gray-700">Vista previa — {filas.length} filas leídas</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Fila','OK','Nombres','Apellidos','DNI','Área','Cargo','F. Ingreso','Contrato','Estado','Licencia'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-gray-500 uppercase font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filas.map((f, i) => (
                    <tr key={i} className={`${!f._valida ? 'bg-red-50/40' : f._advertencias?.length ? 'bg-amber-50/30' : 'hover:bg-gray-50'}`}>
                      <td className="px-3 py-2 font-mono text-gray-400">{f._fila}</td>
                      <td className="px-3 py-2">
                        {!f._valida
                          ? <XCircle size={13} className="text-red-400" />
                          : f._advertencias?.length
                          ? <AlertTriangle size={13} className="text-amber-400" title={f._advertencias.join(', ')} />
                          : <CheckCircle size={13} className="text-emerald-500" />}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-800">{f.nombres || '—'}</td>
                      <td className="px-3 py-2 text-gray-700">{f.apellidos || '—'}</td>
                      <td className="px-3 py-2 font-mono text-gray-500">{f.dni || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={f._area_id ? 'text-emerald-600' : 'text-amber-500'}>{f.area || '—'}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={f._cargo_id ? 'text-emerald-600' : 'text-amber-500'}>{f.cargo || '—'}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-500">{f.fecha_ingreso || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{f.tipo_contrato || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{f.estado || '—'}</td>
                      <td className="px-3 py-2 text-gray-500 font-mono">{f.licencia_conducir || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className={`rounded-xl border p-6 text-center space-y-3 ${resultado.fallidos.length === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${resultado.fallidos.length === 0 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            {resultado.fallidos.length === 0
              ? <CheckCircle size={28} className="text-emerald-600" />
              : <AlertTriangle size={28} className="text-amber-600" />}
          </div>
          <h3 className={`text-lg font-bold ${resultado.fallidos.length === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
            {resultado.ok > 0 ? `${resultado.ok} trabajadores importados exitosamente` : 'Importación con errores'}
          </h3>
          {resultado.fallidos.length > 0 && (
            <div className="text-xs text-amber-700 space-y-1 text-left max-w-md mx-auto">
              {resultado.fallidos.map((f, i) => (
                <p key={i}><span className="font-mono font-bold">Fila {f.fila}:</span> {f.error}</p>
              ))}
            </div>
          )}
          <div className="flex gap-3 justify-center pt-2">
            <button onClick={() => { setFilas([]); setResult(null) }}
              className="px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg text-sm">
              Importar otro archivo
            </button>
            <button onClick={() => navigate('/personal')}
              className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Ver personal <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
