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
  { key: 'titulo',           label: 'TITULO',            required: true,  ejemplo: 'Uso correcto de EPPs',      tipo: 'Texto' },
  { key: 'tema',             label: 'TEMA',              required: false, ejemplo: 'Seguridad personal',         tipo: 'Texto' },
  { key: 'bloque',           label: 'BLOQUE',            required: false, ejemplo: 'Bloque I - Inducción SST',   tipo: 'Texto (agrupador de capacitaciones)' },
  { key: 'tipo',             label: 'TIPO',              required: true,  ejemplo: 'general',                    tipo: 'induccion | especifica | general | sensibilizacion' },
  { key: 'modalidad',        label: 'MODALIDAD',         required: true,  ejemplo: 'presencial',                 tipo: 'presencial | virtual | mixto' },
  { key: 'fecha_programada', label: 'FECHA_PROGRAMADA',  required: true,  ejemplo: '15/06/2026',                 tipo: 'dd/mm/yyyy' },
  { key: 'duracion_horas',   label: 'DURACION_HORAS',    required: true,  ejemplo: '2',                          tipo: 'Número decimal (ej: 1.5)' },
  { key: 'expositor',        label: 'EXPOSITOR',         required: false, ejemplo: 'Dr. Carlos Ramos',           tipo: 'Texto' },
  { key: 'expositor_cargo',  label: 'EXPOSITOR_CARGO',   required: false, ejemplo: 'Médico Ocupacional',         tipo: 'Texto' },
  { key: 'lugar',            label: 'LUGAR',             required: false, ejemplo: 'Sala de capacitaciones',     tipo: 'Texto' },
  { key: 'max_participantes',label: 'MAX_PARTICIPANTES', required: false, ejemplo: '20',                         tipo: 'Número entero' },
  { key: 'observaciones',    label: 'OBSERVACIONES',     required: false, ejemplo: 'Asistencia obligatoria',     tipo: 'Texto libre' },
]

const TIPOS_VALIDOS     = ['induccion','especifica','general','sensibilizacion']
const MODALIDADES_VALID = ['presencial','virtual','mixto']

// ── Normalización flexible de tipos y modalidades ─────────────────
function normalizarTipo(valor) {
  if (!valor) return 'general'
  const v = String(valor).trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // quitar tildes

  // Coincidencia exacta primero
  if (TIPOS_VALIDOS.includes(v)) return v

  // Mapeo por palabras clave (contiene)
  if (v.includes('induccion') || v.includes('inductiv') || v.includes('inicio') || v.includes('ingreso')) return 'induccion'
  if (v.includes('sensibili') || v.includes('concienci') || v.includes('concientiz')) return 'sensibilizacion'
  if (v.includes('especif') || v.includes('tecnic') || v.includes('taller') || v.includes('especiali')) return 'especifica'
  if (v.includes('mantener') || v.includes('mejorar') || v.includes('mejora') || v.includes('gestion')) return 'general'

  // Mapeo de valores comunes
  const mapa = {
    'fundamentales': 'general', 'basico': 'general', 'basica': 'general',
    'formacion': 'general', 'obligatoria': 'general', 'reglamento': 'general',
    'prevencion': 'sensibilizacion', 'cultura': 'sensibilizacion',
  }
  for (const [clave, resultado] of Object.entries(mapa)) {
    if (v.includes(clave)) return resultado
  }

  // Fallback: si no se reconoce, usar 'general' (no bloquear la importación)
  return 'general'
}

function normalizarModalidad(valor) {
  if (!valor) return 'presencial'
  const v = String(valor).trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')

  if (MODALIDADES_VALID.includes(v)) return v
  if (v.includes('virtual') || v.includes('online') || v.includes('remot') || v.includes('distancia') || v.includes('video')) return 'virtual'
  if (v.includes('mixto') || v.includes('hibrid') || v.includes('blend') || v.includes('semipresencial')) return 'mixto'
  if (v.includes('presencial') || v.includes('presencia') || v.includes('persona')) return 'presencial'

  // Fallback: presencial
  return 'presencial'
}

// ── Parsear fecha dd/mm/yyyy o yyyy-mm-dd ──────────────────────────
function parseFecha(valor) {
  if (!valor) return null
  const s = String(valor).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
  // Excel date serial number
  if (!isNaN(Number(valor))) {
    const d = new Date(Math.round((Number(valor) - 25569) * 86400 * 1000))
    return d.toISOString().split('T')[0]
  }
  return null
}

// ── Validar una fila — solo errores que impiden importar ──────────
function validarFila(fila) {
  const errores = []
  if (!fila.titulo?.trim())
    errores.push('Título requerido')
  if (!parseFecha(fila.fecha_programada))
    errores.push(`Fecha inválida: "${fila.fecha_programada}" — usar dd/mm/yyyy`)
  if (!fila.duracion_horas || isNaN(parseFloat(fila.duracion_horas)))
    errores.push('Duración inválida (debe ser número)')
  // Tipo y modalidad: ya tienen fallback, no bloquean
  return errores
}

// ── Generar Excel con SheetJS ─────────────────────────────────────
async function descargarPlantilla() {
  try {
    const XLSX = await import('xlsx')
    const wb   = XLSX.utils.book_new()

    // Hoja de datos
    const headers = COLUMNAS.map(c => c.label)
    const ejemplo = COLUMNAS.map(c => c.ejemplo)
    const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo])

    // Ancho de columnas
    ws['!cols'] = COLUMNAS.map(c => ({ wch: Math.max(c.label.length, c.ejemplo.length) + 4 }))

    XLSX.utils.book_append_sheet(wb, ws, 'Capacitaciones')

    // Hoja de instrucciones
    const instrucciones = [
      ['INSTRUCCIONES DE USO'],
      [''],
      ['1. Llena la hoja "Capacitaciones" con los datos de cada capacitación.'],
      ['2. NO modifiques los encabezados de la primera fila.'],
      ['3. La fila 2 es de ejemplo, puedes borrarla o sobreescribirla.'],
      ['4. Campos obligatorios: TITULO, TIPO, MODALIDAD, FECHA_PROGRAMADA, DURACION_HORAS'],
      [''],
      ['COLUMNAS DISPONIBLES:'],
      ['TITULO',            'Nombre de la capacitación (obligatorio)'],
      ['TEMA',              'Tema específico tratado (opcional)'],
      ['BLOQUE',            'Agrupador de capacitaciones — ej: "Bloque I", "Módulo SST" (opcional)'],
      ['TIPO',              'induccion | especifica | general | sensibilizacion'],
      ['MODALIDAD',         'presencial | virtual | mixto'],
      ['FECHA_PROGRAMADA',  'Formato dd/mm/yyyy  (ej: 15/06/2026)'],
      ['DURACION_HORAS',    'Número decimal  (ej: 2 o 1.5)'],
      ['EXPOSITOR',         'Nombre del expositor/facilitador (opcional)'],
      ['EXPOSITOR_CARGO',   'Cargo del expositor (opcional)'],
      ['LUGAR',             'Lugar de la capacitación (opcional)'],
      ['MAX_PARTICIPANTES', 'Número máximo de participantes (opcional)'],
      ['OBSERVACIONES',     'Notas adicionales (opcional)'],
    ]
    const wsInstr = XLSX.utils.aoa_to_sheet(instrucciones)
    wsInstr['!cols'] = [{ wch: 55 }, { wch: 50 }]
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones')

    XLSX.writeFile(wb, 'plantilla_capacitaciones.xlsx')
    toast.success('Plantilla descargada')
  } catch {
    toast.error('Error al generar la plantilla')
  }
}

// ── Exportar capacitaciones actuales ─────────────────────────────
async function exportarCapacitaciones(capacitaciones) {
  try {
    const XLSX = await import('xlsx')
    const wb   = XLSX.utils.book_new()

    const rows = capacitaciones.map(c => ({
      'TITULO':            c.titulo || '',
      'TEMA':              c.tema || '',
      'BLOQUE':            c.bloque || '',
      'TIPO':              c.tipo || '',
      'MODALIDAD':         c.modalidad || '',
      'FECHA_PROGRAMADA':  c.fecha_programada || '',
      'FECHA_EJECUTADA':   c.fecha_ejecutada || '',
      'DURACION_HORAS':    c.duracion_horas || '',
      'EXPOSITOR':         c.expositor || '',
      'EXPOSITOR_CARGO':   c.expositor_cargo || '',
      'LUGAR':             c.lugar || '',
      'ESTADO':            c.estado || '',
      'MAX_PARTICIPANTES': c.max_participantes || '',
      'ASISTENCIA_%':      c.porcentaje_asistencia ?? '',
      'OBSERVACIONES':     c.observaciones || '',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 20 }))
    XLSX.utils.book_append_sheet(wb, ws, 'Capacitaciones')
    XLSX.writeFile(wb, `capacitaciones_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success(`${rows.length} capacitaciones exportadas`)
  } catch {
    toast.error('Error al exportar')
  }
}

// ── Componente principal ──────────────────────────────────────────
export default function CapacitacionImportExportPage() {
  const navigate  = useNavigate()
  const fileRef   = useRef(null)
  const [filas, setFilas]       = useState([])
  const [errores, setErrores]   = useState([])
  const [importando, setImp]    = useState(false)
  const [resultado, setResult]  = useState(null)
  const [cargando, setCargando] = useState(false)
  const [capActuales, setCap]   = useState([])
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [borrando, setBorrando]           = useState(false)
  const [confirmBorrar, setConfirmBorrar] = useState(false)

  const limpiarArchivo = () => {
    setFilas([])
    setErrores([])
    setResult(null)
    setNombreArchivo('')
    setConfirmBorrar(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  // Borrar TODAS las capacitaciones de la empresa
  const borrarTodaLaCarga = async () => {
    setBorrando(true)
    try {
      // Obtener todos los IDs y borrar uno a uno
      const { data } = await api.get('/capacitaciones', { params: { per_page: 500 } })
      const lista = data.data || data
      let ok = 0
      for (const cap of lista) {
        try { await api.delete(`/capacitaciones/${cap.id}`); ok++ } catch { /* continuar */ }
      }
      limpiarArchivo()
      toast.success(`${ok} capacitaciones eliminadas correctamente`)
    } catch {
      toast.error('Error al eliminar capacitaciones')
    } finally { setBorrando(false) }
  }

  // Cargar capacitaciones actuales para exportar
  const cargarParaExportar = async () => {
    setCargando(true)
    try {
      const { data } = await api.get('/capacitaciones', { params: { per_page: 500 } })
      const lista = data.data || data
      await exportarCapacitaciones(lista)
    } catch { toast.error('Error al cargar capacitaciones') } finally { setCargando(false) }
  }

  // Leer archivo Excel
  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setNombreArchivo(file.name)
    try {
      const XLSX  = await import('xlsx')
      const buf   = await file.arrayBuffer()
      const wb    = XLSX.read(buf, { type: 'array', cellDates: false })
      const wsName= wb.SheetNames[0]
      const ws    = wb.Sheets[wsName]
      const raw   = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

      if (raw.length < 2) { toast.error('El archivo no tiene datos'); return }

      const headerRow = raw[0].map(h => String(h).trim().toUpperCase())
      const colIdx    = {}
      COLUMNAS.forEach(c => {
        const i = headerRow.indexOf(c.label)
        if (i >= 0) colIdx[c.key] = i
      })

      const filasParsed = []
      const erroresParsed = []

      for (let i = 1; i < raw.length; i++) {
        const row  = raw[i]
        const esVacia = row.every(v => String(v).trim() === '')
        if (esVacia) continue

        const fila = {}
        COLUMNAS.forEach(c => {
          const val = colIdx[c.key] !== undefined ? row[colIdx[c.key]] : ''
          fila[c.key] = String(val ?? '').trim()
        })

        const errs = validarFila(fila)
        if (errs.length) erroresParsed.push({ fila: i + 1, msgs: errs })
        // Advertencias cuando tipo/modalidad se normalizan automáticamente
        const advertencias = []
        const tipoNorm = normalizarTipo(fila.tipo)
        const modNorm  = normalizarModalidad(fila.modalidad)
        const tipoOrig = String(fila.tipo || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        const modOrig  = String(fila.modalidad || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        if (fila.tipo && !TIPOS_VALIDOS.includes(tipoOrig))      advertencias.push(`Tipo "${fila.tipo}" → "${tipoNorm}"`)
        if (fila.modalidad && !MODALIDADES_VALID.includes(modOrig)) advertencias.push(`Modalidad "${fila.modalidad}" → "${modNorm}"`)

        filasParsed.push({ ...fila, _fila: i + 1, _valida: errs.length === 0, _advertencias: advertencias })
      }

      setFilas(filasParsed)
      setErrores(erroresParsed)
      setResult(null)
      if (filasParsed.length === 0) toast.error('Sin filas de datos')
      else toast.success(`${filasParsed.length} filas leídas`)
    } catch (err) {
      toast.error('Error al leer el archivo Excel')
    }
    e.target.value = ''
  }

  // Importar filas válidas
  const importar = async () => {
    const validas = filas.filter(f => f._valida)
    if (!validas.length) { toast.error('No hay filas válidas para importar'); return }
    setImp(true)
    let ok = 0, fallidos = []
    for (const fila of validas) {
      try {
        await api.post('/capacitaciones', {
          titulo:            fila.titulo,
          tema:              fila.tema || null,
          bloque:            fila.bloque || null,
          tipo:              normalizarTipo(fila.tipo),
          modalidad:         normalizarModalidad(fila.modalidad),
          fecha_programada:  parseFecha(fila.fecha_programada),
          duracion_horas:    parseFloat(fila.duracion_horas),
          expositor:         fila.expositor || null,
          expositor_cargo:   fila.expositor_cargo || null,
          lugar:             fila.lugar || null,
          max_participantes: fila.max_participantes ? parseInt(fila.max_participantes) : null,
          observaciones:     fila.observaciones || null,
        })
        ok++
      } catch (err) {
        fallidos.push({ fila: fila._fila, error: err.response?.data?.message || 'Error' })
      }
    }
    setResult({ ok, fallidos })
    setImp(false)
    if (ok > 0) toast.success(`${ok} capacitaciones importadas`)
    if (fallidos.length) toast.error(`${fallidos.length} filas fallaron`)
  }

  const filasValidas   = filas.filter(f => f._valida)
  const filasInvalidas = filas.filter(f => !f._valida)

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/capacitaciones')} className="btn-back">
            <ArrowLeft size={14} /> Capacitaciones
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Importar / Exportar</h1>
            <p className="text-gray-500 text-sm mt-0.5">Gestión masiva de capacitaciones vía Excel</p>
          </div>
        </div>
      </div>

      {/* Tarjetas de acción */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Descargar plantilla */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <FileSpreadsheet size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Plantilla Excel</h3>
            <p className="text-xs text-gray-500 mt-1">
              Descarga la plantilla con el formato correcto y las instrucciones de llenado.
            </p>
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
            <p className="text-xs text-gray-500 mt-1">
              Carga un archivo Excel con el formato de la plantilla para crear múltiples capacitaciones.
            </p>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          {nombreArchivo ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <FileSpreadsheet size={14} className="text-emerald-600 flex-shrink-0" />
                <span className="text-xs text-emerald-700 font-medium flex-1 truncate">{nombreArchivo}</span>
                <button onClick={limpiarArchivo} title="Quitar archivo"
                  className="text-emerald-400 hover:text-red-500 transition-colors flex-shrink-0">
                  <XCircle size={14} />
                </button>
              </div>
              <button onClick={() => { limpiarArchivo(); setTimeout(() => fileRef.current?.click(), 50) }}
                className="w-full flex items-center justify-center gap-2 border border-emerald-300 text-emerald-600 hover:bg-emerald-50 py-2 rounded-lg text-xs font-medium transition-colors">
                <Upload size={13} /> Cargar otro archivo
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
            <p className="text-xs text-gray-500 mt-1">
              Exporta todas las capacitaciones registradas a un archivo Excel.
            </p>
          </div>
          <button onClick={cargarParaExportar} disabled={cargando}
            className="w-full flex items-center justify-center gap-2 border border-purple-300 text-purple-600 hover:bg-purple-50 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            {cargando ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Exportar capacitaciones
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
              <tr>
                {['Columna','¿Requerido?','Ejemplo','Valores permitidos'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {COLUMNAS.map(c => (
                <tr key={c.key} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono font-semibold text-gray-800">{c.label}</td>
                  <td className="px-4 py-2.5">
                    {c.required
                      ? <span className="text-red-600 font-semibold">Sí</span>
                      : <span className="text-gray-400">No</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 italic">{c.ejemplo}</td>
                  <td className="px-4 py-2.5 text-gray-500">{c.tipo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview de filas importadas */}
      {filas.length > 0 && !resultado && (
        <div className="space-y-4">
          {/* Resumen + acciones */}
          <div className="flex items-center gap-3 flex-wrap bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            {/* Nombre archivo */}
            {nombreArchivo && (
              <div className="flex items-center gap-2 text-xs text-gray-500 border-r border-gray-200 pr-3">
                <FileSpreadsheet size={14} className="text-roka-500" />
                <span className="font-medium truncate max-w-[160px]">{nombreArchivo}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle size={14} className="text-emerald-500" />
              <span className="font-semibold text-emerald-700">{filasValidas.length} filas válidas</span>
            </div>
            {filasInvalidas.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <XCircle size={14} className="text-red-500" />
                <span className="font-semibold text-red-600">{filasInvalidas.length} con errores</span>
              </div>
            )}
            <div className="ml-auto flex gap-2">
              {/* Borrar carga */}
              <button
                onClick={limpiarArchivo}
                className="flex items-center gap-1.5 border border-red-200 text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg text-xs font-medium transition-colors">
                <XCircle size={13} /> Borrar carga
              </button>
              {/* Reemplazar archivo */}
              <button
                onClick={() => { limpiarArchivo(); setTimeout(() => fileRef.current?.click(), 50) }}
                className="flex items-center gap-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-xs font-medium transition-colors">
                <Upload size={13} /> Cargar otra plantilla
              </button>
              <button onClick={importar} disabled={importando || !filasValidas.length}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
                {importando ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {importando ? 'Importando...' : `Importar ${filasValidas.length}`}
              </button>
            </div>
          </div>

          {/* Errores de validación */}
          {errores.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
                <AlertTriangle size={14} /> Errores encontrados — estas filas no se importarán
              </p>
              {errores.map((e, i) => (
                <div key={i} className="text-xs text-red-600">
                  <span className="font-mono font-bold">Fila {e.fila}:</span> {e.msgs.join(' · ')}
                </div>
              ))}
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
                    <th className="px-3 py-2.5 text-left text-gray-500 uppercase font-medium">Fila</th>
                    <th className="px-3 py-2.5 text-left text-gray-500 uppercase font-medium">Estado</th>
                    <th className="px-3 py-2.5 text-left text-gray-500 uppercase font-medium">Título</th>
                    <th className="px-3 py-2.5 text-left text-gray-500 uppercase font-medium">Bloque</th>
                    <th className="px-3 py-2.5 text-left text-gray-500 uppercase font-medium">Tipo</th>
                    <th className="px-3 py-2.5 text-left text-gray-500 uppercase font-medium">Modalidad</th>
                    <th className="px-3 py-2.5 text-left text-gray-500 uppercase font-medium">Fecha</th>
                    <th className="px-3 py-2.5 text-left text-gray-500 uppercase font-medium">Horas</th>
                    <th className="px-3 py-2.5 text-left text-gray-500 uppercase font-medium">Expositor</th>
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
                      <td className="px-3 py-2.5 font-medium text-gray-800 max-w-[180px] truncate">{f.titulo || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-600 max-w-[120px] truncate">{f.bloque || '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-gray-700 font-medium">{normalizarTipo(f.tipo)}</span>
                        {f._advertencias?.some(a => a.startsWith('Tipo')) && (
                          <p className="text-[10px] text-amber-500 truncate max-w-[90px]">{f.tipo}</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-gray-700 font-medium">{normalizarModalidad(f.modalidad)}</span>
                        {f._advertencias?.some(a => a.startsWith('Modal')) && (
                          <p className="text-[10px] text-amber-500">{f.modalidad}</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{f.fecha_programada || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-600">{f.duracion_horas || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-500 max-w-[120px] truncate">{f.expositor || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Resultado de importación */}
      {resultado && (
        <div className={`rounded-xl border p-6 text-center space-y-3 ${resultado.fallidos.length === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${resultado.fallidos.length === 0 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            {resultado.fallidos.length === 0
              ? <CheckCircle size={28} className="text-emerald-600" />
              : <AlertTriangle size={28} className="text-amber-600" />}
          </div>
          <h3 className={`text-lg font-bold ${resultado.fallidos.length === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
            {resultado.ok > 0 ? `${resultado.ok} capacitaciones importadas exitosamente` : 'Importación con errores'}
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
            <button onClick={() => navigate('/capacitaciones/lista')}
              className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Ver capacitaciones <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
