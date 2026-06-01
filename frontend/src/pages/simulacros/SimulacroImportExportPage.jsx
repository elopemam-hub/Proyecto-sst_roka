import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Download, Upload, FileSpreadsheet, CheckCircle,
  XCircle, AlertTriangle, Loader2, ChevronRight, Info, Trash2,
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

// ── Columnas de la plantilla ───────────────────────────────────────
const COLUMNAS = [
  { key: 'nombre',           label: 'NOMBRE',           required: true,  ejemplo: 'Simulacro de Incendio - Almacén',     tipo: 'Texto' },
  { key: 'tipo',             label: 'TIPO',             required: true,  ejemplo: 'incendio',                            tipo: 'sismo | incendio | derrame | evacuacion | primeros_auxilios | violencia' },
  { key: 'fecha_programada', label: 'FECHA_PROGRAMADA', required: true,  ejemplo: '15/06/2026',                          tipo: 'dd/mm/yyyy' },
  { key: 'hora_inicio',      label: 'HORA_INICIO',      required: false, ejemplo: '09:00',                               tipo: 'HH:mm (ej: 09:00)' },
  { key: 'hora_fin',         label: 'HORA_FIN',         required: false, ejemplo: '09:45',                               tipo: 'HH:mm (ej: 09:45)' },
  { key: 'lugar',            label: 'LUGAR',            required: false, ejemplo: 'Patio principal',                     tipo: 'Texto' },
  { key: 'descripcion',      label: 'DESCRIPCION',      required: false, ejemplo: 'Simulacro de evacuación por incendio', tipo: 'Texto libre' },
  { key: 'observaciones',    label: 'OBSERVACIONES',    required: false, ejemplo: 'Participación obligatoria',           tipo: 'Texto libre' },
]

const TIPOS_VALIDOS = ['sismo','incendio','derrame','evacuacion','primeros_auxilios','violencia']
const TIPO_LABEL = { sismo:'Sismo', incendio:'Incendio', derrame:'Derrame', evacuacion:'Evacuación', primeros_auxilios:'Primeros auxilios', violencia:'Violencia' }

// ── Parsear fecha dd/mm/yyyy ──────────────────────────────────────
function parseFecha(valor) {
  if (!valor) return null
  const s = String(valor).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
  if (!isNaN(Number(valor))) {
    const d = new Date(Math.round((Number(valor) - 25569) * 86400 * 1000))
    return d.toISOString().split('T')[0]
  }
  return null
}

// ── Normalizar tipo ───────────────────────────────────────────────
function normalizarTipo(valor) {
  if (!valor) return 'violencia'
  const v = String(valor).trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (TIPOS_VALIDOS.includes(v)) return v
  if (v.includes('sismo') || v.includes('terremoto') || v.includes('sismic')) return 'sismo'
  if (v.includes('incendio') || v.includes('fuego') || v.includes('fire')) return 'incendio'
  if (v.includes('derrame') || v.includes('quimico') || v.includes('sustancia')) return 'derrame'
  if (v.includes('evacuacion') || v.includes('evacua') || v.includes('salida')) return 'evacuacion'
  if (v.includes('primero') || v.includes('auxilios') || v.includes('medico') || v.includes('salud')) return 'primeros_auxilios'
  if (v.includes('violencia') || v.includes('asalto') || v.includes('seguridad')) return 'violencia'
  return 'violencia'
}

// ── Normalizar hora HH:mm ─────────────────────────────────────────
function normalizarHora(valor) {
  if (!valor) return null
  const s = String(valor).trim()
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [h, m] = s.split(':')
    return `${h.padStart(2,'0')}:${m}`
  }
  return null
}

// ── Validar fila ──────────────────────────────────────────────────
function validarFila(fila) {
  const errores = []
  if (!fila.nombre?.trim())               errores.push('Nombre requerido')
  if (!parseFecha(fila.fecha_programada)) errores.push(`Fecha inválida: "${fila.fecha_programada}" — usar dd/mm/yyyy`)
  return errores
}

// ── Descargar plantilla Excel ─────────────────────────────────────
async function descargarPlantilla() {
  try {
    const XLSX = await import('xlsx')
    const wb   = XLSX.utils.book_new()
    const headers = COLUMNAS.map(c => c.label)
    const ejemplo = COLUMNAS.map(c => c.ejemplo)
    const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo])
    ws['!cols'] = COLUMNAS.map(c => ({ wch: Math.max(c.label.length, c.ejemplo.length) + 4 }))
    XLSX.utils.book_append_sheet(wb, ws, 'Simulacros')

    const instrucciones = [
      ['INSTRUCCIONES DE USO'],
      [''],
      ['1. Llena la hoja "Simulacros" con los datos de cada simulacro.'],
      ['2. NO modifiques los encabezados de la primera fila.'],
      ['3. La fila 2 es de ejemplo, puedes borrarla o sobreescribirla.'],
      ['4. Campos obligatorios: NOMBRE, TIPO, FECHA_PROGRAMADA'],
      [''],
      ['COLUMNAS DISPONIBLES:'],
      ['NOMBRE',           'Nombre del simulacro (obligatorio)'],
      ['TIPO',             'sismo | incendio | derrame | evacuacion | primeros_auxilios | violencia'],
      ['FECHA_PROGRAMADA', 'Formato dd/mm/yyyy  (ej: 15/06/2026)'],
      ['HORA_INICIO',      'Hora de inicio  (ej: 09:00)'],
      ['HORA_FIN',         'Hora de fin  (ej: 09:45)'],
      ['LUGAR',            'Lugar donde se realizará el simulacro'],
      ['DESCRIPCION',      'Descripción del simulacro (opcional)'],
      ['OBSERVACIONES',    'Observaciones adicionales (opcional)'],
      [''],
      ['TIPOS PERMITIDOS:'],
      ['sismo',            'Simulacro de sismo/terremoto'],
      ['incendio',         'Simulacro de incendio'],
      ['derrame',          'Simulacro de derrame de sustancias'],
      ['evacuacion',       'Simulacro de evacuación general'],
      ['primeros_auxilios','Simulacro de primeros auxilios'],
      ['violencia',        'Simulacro de violencia / seguridad'],
    ]
    const wsI = XLSX.utils.aoa_to_sheet(instrucciones)
    wsI['!cols'] = [{ wch: 25 }, { wch: 55 }]
    XLSX.utils.book_append_sheet(wb, wsI, 'Instrucciones')
    XLSX.writeFile(wb, 'plantilla_simulacros.xlsx')
    toast.success('Plantilla descargada')
  } catch { toast.error('Error al generar plantilla') }
}

// ── Exportar simulacros actuales ──────────────────────────────────
async function exportarSimulacros(lista) {
  try {
    const XLSX = await import('xlsx')
    const wb   = XLSX.utils.book_new()
    const rows = lista.map(s => ({
      'NOMBRE':           s.nombre || '',
      'TIPO':             s.tipo || '',
      'FECHA_PROGRAMADA': s.fecha_programada || '',
      'FECHA_EJECUTADA':  s.fecha_ejecutada || '',
      'HORA_INICIO':      s.hora_inicio || '',
      'HORA_FIN':         s.hora_fin || '',
      'LUGAR':            s.lugar || '',
      'ESTADO':           s.estado || '',
      'TIEMPO_RESPUESTA': s.tiempo_respuesta_min ?? '',
      'PERSONAS_EVACUADAS': s.personas_evacuadas ?? '',
      'DESCRIPCION':      s.descripcion || '',
      'OBSERVACIONES':    s.observaciones || '',
      'LECCIONES_APRENDIDAS': s.lecciones_aprendidas || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 20 }))
    XLSX.utils.book_append_sheet(wb, ws, 'Simulacros')
    XLSX.writeFile(wb, `simulacros_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success(`${rows.length} simulacros exportados`)
  } catch { toast.error('Error al exportar') }
}

// ── Página principal ──────────────────────────────────────────────
export default function SimulacroImportExportPage() {
  const navigate  = useNavigate()
  const fileRef   = useRef(null)
  const [filas, setFilas]             = useState([])
  const [errores, setErrores]         = useState([])
  const [importando, setImp]          = useState(false)
  const [resultado, setResult]        = useState(null)
  const [cargando, setCargando]       = useState(false)
  const [nombreArchivo, setNombre]    = useState('')
  const [borrando, setBorrando]       = useState(false)
  const [confirmBorrar, setConfirm]   = useState(false)

  const limpiar = () => {
    setFilas([]); setErrores([]); setResult(null); setNombre(''); setConfirm(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const cargarParaExportar = async () => {
    setCargando(true)
    try {
      const { data } = await api.get('/simulacros', { params: { per_page: 500 } })
      await exportarSimulacros(data.data || data)
    } catch { toast.error('Error al cargar simulacros') } finally { setCargando(false) }
  }

  const borrarTodo = async () => {
    setBorrando(true)
    try {
      const { data } = await api.get('/simulacros', { params: { per_page: 500 } })
      const lista = data.data || data
      let ok = 0
      for (const s of lista) {
        try { await api.delete(`/simulacros/${s.id}`); ok++ } catch { }
      }
      limpiar()
      toast.success(`${ok} simulacros eliminados`)
    } catch { toast.error('Error al eliminar')
    } finally { setBorrando(false) }
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setNombre(file.name)
    try {
      const XLSX  = await import('xlsx')
      const buf   = await file.arrayBuffer()
      const wb    = XLSX.read(buf, { type: 'array', cellDates: false })
      const ws    = wb.Sheets[wb.SheetNames[0]]
      const raw   = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
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
        if (errs.length) erroresParsed.push({ fila: i + 1, msgs: errs })

        const tipoOrig = String(fila.tipo || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
        const adv = []
        if (fila.tipo && !TIPOS_VALIDOS.includes(tipoOrig)) adv.push(`Tipo "${fila.tipo}" → "${normalizarTipo(fila.tipo)}"`)

        filasParsed.push({ ...fila, _fila: i+1, _valida: errs.length === 0, _advertencias: adv })
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
        await api.post('/simulacros', {
          nombre:           f.nombre,
          tipo:             normalizarTipo(f.tipo),
          fecha_programada: parseFecha(f.fecha_programada),
          hora_inicio:      normalizarHora(f.hora_inicio),
          hora_fin:         normalizarHora(f.hora_fin),
          lugar:            f.lugar || null,
          descripcion:      f.descripcion || null,
          observaciones:    f.observaciones || null,
        })
        ok++
      } catch (err) { fallidos.push({ fila: f._fila, error: err.response?.data?.message || 'Error' }) }
    }
    setResult({ ok, fallidos }); setImp(false)
    if (ok > 0) toast.success(`${ok} simulacros importados`)
    if (fallidos.length) toast.error(`${fallidos.length} filas fallaron`)
  }

  const filasValidas   = filas.filter(f => f._valida)
  const filasInvalidas = filas.filter(f => !f._valida)

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/simulacros')} className="btn-back">
            <ArrowLeft size={14} /> Dashboard
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Importar / Exportar Simulacros</h1>
            <p className="text-gray-500 text-sm mt-0.5">Gestión masiva de simulacros vía Excel</p>
          </div>
        </div>
      </div>

      {/* Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* 1. Plantilla */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <FileSpreadsheet size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Plantilla Excel</h3>
            <p className="text-xs text-gray-500 mt-1">Descarga la plantilla con el formato correcto e instrucciones.</p>
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
            <h3 className="font-semibold text-gray-800">Importar Excel</h3>
            <p className="text-xs text-gray-500 mt-1">Carga un archivo Excel con el formato de la plantilla.</p>
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
            <p className="text-xs text-gray-500 mt-1">Exporta todos los simulacros registrados a Excel.</p>
          </div>
          <button onClick={cargarParaExportar} disabled={cargando}
            className="w-full flex items-center justify-center gap-2 border border-purple-300 text-purple-600 hover:bg-purple-50 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            {cargando ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Exportar simulacros
          </button>
        </div>

      </div>

      {/* Referencia de columnas */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
          <Info size={15} className="text-blue-500" />
          <h2 className="font-semibold text-gray-800">Estructura de la plantilla</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Columna','¿Requerido?','Ejemplo','Valores permitidos'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {COLUMNAS.map(c => (
                <tr key={c.key} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono font-semibold text-gray-800">{c.label}</td>
                  <td className="px-4 py-2.5">{c.required ? <span className="text-red-600 font-semibold">Sí</span> : <span className="text-gray-400">No</span>}</td>
                  <td className="px-4 py-2.5 text-gray-600 italic">{c.ejemplo}</td>
                  <td className="px-4 py-2.5 text-gray-500">{c.tipo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview */}
      {filas.length > 0 && !resultado && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            {nombreArchivo && (
              <div className="flex items-center gap-2 text-xs text-gray-500 border-r border-gray-200 pr-3">
                <FileSpreadsheet size={13} className="text-roka-500" />
                <span className="font-medium truncate max-w-[160px]">{nombreArchivo}</span>
              </div>
            )}
            <span className="flex items-center gap-1.5 text-sm"><CheckCircle size={13} className="text-emerald-500" /><span className="font-semibold text-emerald-700">{filasValidas.length} válidas</span></span>
            {filasInvalidas.length > 0 && (
              <span className="flex items-center gap-1.5 text-sm"><XCircle size={13} className="text-red-500" /><span className="font-semibold text-red-600">{filasInvalidas.length} con errores</span></span>
            )}
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
                {importando ? 'Importando...' : `Importar ${filasValidas.length}`}
              </button>
            </div>
          </div>

          {errores.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
                <AlertTriangle size={14} /> Errores — estas filas no se importarán
              </p>
              {errores.map((e, i) => (
                <div key={i} className="text-xs text-red-600">
                  <span className="font-mono font-bold">Fila {e.fila}:</span> {e.msgs.join(' · ')}
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
              <p className="text-sm font-medium text-gray-700">Vista previa — {filas.length} filas</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Fila','Estado','Nombre','Tipo','Fecha','Hora inicio','Hora fin','Lugar'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-gray-500 uppercase font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filas.map((f, i) => (
                    <tr key={i} className={f._valida ? 'hover:bg-gray-50' : 'bg-red-50/40'}>
                      <td className="px-3 py-2.5 font-mono text-gray-400">{f._fila}</td>
                      <td className="px-3 py-2.5">
                        {f._valida
                          ? (f._advertencias?.length
                              ? <AlertTriangle size={13} className="text-amber-400" title={f._advertencias.join(', ')} />
                              : <CheckCircle size={13} className="text-emerald-500" />)
                          : <XCircle size={13} className="text-red-400" />}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-gray-800 max-w-[200px] truncate">{f.nombre || '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-gray-700 font-medium">{TIPO_LABEL[normalizarTipo(f.tipo)] || normalizarTipo(f.tipo)}</span>
                        {f._advertencias?.length > 0 && <p className="text-[10px] text-amber-500">{f.tipo}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{f.fecha_programada || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-500">{f.hora_inicio || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-500">{f.hora_fin || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-500 max-w-[120px] truncate">{f.lugar || '—'}</td>
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
            {resultado.ok > 0 ? `${resultado.ok} simulacros importados exitosamente` : 'Importación con errores'}
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
            <button onClick={() => navigate('/simulacros')}
              className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Ver simulacros <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
