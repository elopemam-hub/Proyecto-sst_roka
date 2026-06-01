import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Download, Upload, FileSpreadsheet, CheckCircle,
  XCircle, AlertTriangle, Loader2, ChevronRight, Info, BookOpen,
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

// ── Columnas de la plantilla ──────────────────────────────────────
const COLUMNAS = [
  { key: 'texto',          label: 'PREGUNTA',        required: true,  ejemplo: '¿El nivel de combustible es suficiente?', tipo: 'Texto de la pregunta' },
  { key: 'tipo_respuesta', label: 'TIPO_RESPUESTA',  required: true,  ejemplo: 'conf_nc_obs',  tipo: 'conf_nc_obs | si_no_na | texto | numero | fecha' },
  { key: 'es_obligatoria', label: 'OBLIGATORIA',     required: false, ejemplo: 'Si',           tipo: 'Si | No' },
  { key: 'permite_foto',   label: 'PERMITE_FOTO',    required: false, ejemplo: 'Si',           tipo: 'Si | No' },
  { key: 'permite_nota',   label: 'PERMITE_NOTA',    required: false, ejemplo: 'Si',           tipo: 'Si | No' },
  { key: 'ayuda',          label: 'AYUDA',           required: false, ejemplo: 'Revisar visor lateral del tanque', tipo: 'Texto de ayuda (opcional)' },
  { key: 'valor_limite',   label: 'VALOR_LIMITE',    required: false, ejemplo: '< 80°C',       tipo: 'Valor límite de referencia (opcional)' },
  { key: 'orden',          label: 'ORDEN',           required: false, ejemplo: '1',            tipo: 'Número entero (posición en el checklist)' },
]

const TIPOS_VALIDOS = ['conf_nc_obs','si_no_na','texto','numero','fecha']
const TIPO_LABEL    = { conf_nc_obs:'C/NC/Obs', si_no_na:'S/N/NA', texto:'Texto', numero:'Número', fecha:'Fecha' }

// ── Helpers ───────────────────────────────────────────────────────
function normalizarTipoRespuesta(v) {
  const s = String(v || '').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
  if (TIPOS_VALIDOS.includes(s)) return s
  if (s.includes('conf') || s.includes('nc') || s.includes('obs') || s.includes('c/nc')) return 'conf_nc_obs'
  if (s.includes('si') || s.includes('no') || s.includes('s/n')) return 'si_no_na'
  if (s.includes('text') || s.includes('libre')) return 'texto'
  if (s.includes('num') || s.includes('valor')) return 'numero'
  if (s.includes('fech') || s.includes('date')) return 'fecha'
  return 'conf_nc_obs'
}

function normalizarBool(v, defVal = true) {
  if (v === null || v === undefined || String(v).trim() === '') return defVal
  const s = String(v).trim().toLowerCase()
  return ['si','sí','yes','true','1','x'].includes(s)
}

function validarFila(fila) {
  const errores = []
  if (!fila.texto?.trim()) errores.push('Pregunta requerida')
  return errores
}

// ── Descargar plantilla ───────────────────────────────────────────
async function descargarPlantilla(equipoNombre) {
  try {
    const XLSX = await import('xlsx')
    const wb   = XLSX.utils.book_new()

    const headers  = COLUMNAS.map(c => c.label)
    const ejemplos = [
      ['¿El nivel de combustible es suficiente para la operación?', 'conf_nc_obs', 'Si', 'Si', 'Si', 'Revisar visor lateral', '', '1'],
      ['¿El nivel de aceite de motor está en rango correcto?',      'conf_nc_obs', 'Si', 'Si', 'Si', '',                      '< 80°C', '2'],
      ['¿El sistema de escape está libre de obstrucciones?',        'si_no_na',    'Si', 'Si', 'No', '',                      '', '3'],
      ['Fecha de último mantenimiento',                              'fecha',       'Si', 'No', 'Si', '',                      '', '4'],
    ]
    const ws = XLSX.utils.aoa_to_sheet([headers, ...ejemplos])
    ws['!cols'] = [{ wch: 55 }, { wch: 16 }, { wch: 12 }, { wch: 13 }, { wch: 13 }, { wch: 35 }, { wch: 18 }, { wch: 8 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Preguntas')

    const instrucciones = [
      ['PLANTILLA: BANCO DE PREGUNTAS — ' + (equipoNombre || 'Equipo')],
      [''],
      ['1. Llena la hoja "Preguntas" con cada pregunta del checklist.'],
      ['2. NO modifiques los encabezados de la primera fila.'],
      ['3. Las filas de ejemplo pueden borrarse o sobreescribirse.'],
      ['4. Campo OBLIGATORIO: PREGUNTA'],
      [''],
      ['TIPOS DE RESPUESTA (TIPO_RESPUESTA):'],
      ['conf_nc_obs', 'Conforme / No conforme / Observación — el más usado'],
      ['si_no_na',    'Sí / No / No Aplica'],
      ['texto',       'Respuesta de texto libre'],
      ['numero',      'Valor numérico'],
      ['fecha',       'Selección de fecha'],
      [''],
      ['CAMPOS BOOLEANOS (OBLIGATORIA, PERMITE_FOTO, PERMITE_NOTA):'],
      ['Si', 'Activado'],
      ['No', 'Desactivado'],
      [''],
      ['ORDEN:', 'Número que define la posición de la pregunta en el checklist (1, 2, 3...)'],
      ['AYUDA:', 'Texto de orientación que aparece al inspector al responder'],
      ['VALOR_LIMITE:', 'Referencia técnica opcional (ej: < 80°C, > 90%, etc.)'],
    ]
    const wsI = XLSX.utils.aoa_to_sheet(instrucciones)
    wsI['!cols'] = [{ wch: 20 }, { wch: 60 }]
    XLSX.utils.book_append_sheet(wb, wsI, 'Instrucciones')

    const nombre = equipoNombre
      ? `preguntas_${equipoNombre.replace(/[^a-zA-Z0-9]/g,'_')}.xlsx`
      : 'plantilla_preguntas.xlsx'
    XLSX.writeFile(wb, nombre)
    toast.success('Plantilla descargada')
  } catch { toast.error('Error al generar plantilla') }
}

// ── Exportar preguntas de un equipo ──────────────────────────────
async function exportarPreguntas(equipoId, equipoNombre) {
  try {
    const { data } = await api.get(`/checklist/preguntas/${equipoId}`)
    const XLSX = await import('xlsx')
    const wb   = XLSX.utils.book_new()
    const rows = data.map(p => ({
      'PREGUNTA':       p.texto || '',
      'TIPO_RESPUESTA': p.tipo_respuesta || '',
      'OBLIGATORIA':    p.es_obligatoria ? 'Si' : 'No',
      'PERMITE_FOTO':   p.permite_foto   ? 'Si' : 'No',
      'PERMITE_NOTA':   p.permite_nota   ? 'Si' : 'No',
      'AYUDA':          p.ayuda || '',
      'VALOR_LIMITE':   p.valor_limite || '',
      'ORDEN':          p.orden ?? '',
      'ACTIVA':         p.es_activa ? 'Si' : 'No',
    }))
    if (!rows.length) { toast.error('Este equipo no tiene preguntas'); return }
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch: 55 }, ...Object.keys(rows[0]).slice(1).map(() => ({ wch: 15 }))]
    XLSX.utils.book_append_sheet(wb, ws, 'Preguntas')
    const nombre = `preguntas_${(equipoNombre || 'equipo').replace(/[^a-zA-Z0-9]/g,'_')}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, nombre)
    toast.success(`${rows.length} preguntas exportadas`)
  } catch { toast.error('Error al exportar') }
}

// ── Página principal ──────────────────────────────────────────────
export default function BancoPreguntasImportExportPage() {
  const navigate     = useNavigate()
  const [params]     = useSearchParams()
  const fileRef      = useRef(null)

  const [equipos, setEquipos]         = useState([])
  const [equipoSel, setEquipoSel]     = useState(null)
  const [filas, setFilas]             = useState([])
  const [errores, setErrores]         = useState([])
  const [importando, setImp]          = useState(false)
  const [resultado, setResult]        = useState(null)
  const [cargando, setCargando]       = useState(false)
  const [nombreArchivo, setNombre]    = useState('')
  const [modoImport, setModo]         = useState('agregar') // 'agregar' | 'reemplazar'

  useEffect(() => {
    api.get('/checklist/equipos')
      .then(({ data }) => {
        setEquipos(data)
        const preselId = params.get('equipo_id')
        if (preselId) {
          const eq = data.find(e => String(e.id) === preselId)
          if (eq) setEquipoSel(eq)
        }
      }).catch(() => {})
  }, [])

  const limpiar = () => {
    setFilas([]); setErrores([]); setResult(null); setNombre('')
    if (fileRef.current) fileRef.current.value = ''
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

        const tipoOrig = fila.tipo_respuesta
        const tipoNorm = normalizarTipoRespuesta(fila.tipo_respuesta)
        const adv = []
        if (tipoOrig && !TIPOS_VALIDOS.includes(tipoOrig.toLowerCase()))
          adv.push(`Tipo "${tipoOrig}" → "${tipoNorm}"`)

        filasParsed.push({ ...fila, _fila: i+1, _valida: errs.length === 0, _advertencias: adv, _tipoNorm: tipoNorm })
      }
      setFilas(filasParsed); setErrores(erroresParsed); setResult(null)
      toast.success(`${filasParsed.length} preguntas leídas`)
    } catch { toast.error('Error al leer el archivo') }
    e.target.value = ''
  }

  const importar = async () => {
    if (!equipoSel) { toast.error('Selecciona un equipo primero'); return }
    const validas = filas.filter(f => f._valida)
    if (!validas.length) { toast.error('No hay filas válidas'); return }
    setImp(true)

    try {
      // Si modo reemplazar: eliminar preguntas existentes
      if (modoImport === 'reemplazar') {
        const { data: existentes } = await api.get(`/checklist/preguntas/${equipoSel.id}`)
        for (const p of existentes) {
          try { await api.delete(`/checklist/preguntas/${p.id}`) } catch {}
        }
      }

      let ok = 0; const fallidos = []
      const maxOrden = modoImport === 'reemplazar' ? 0
        : (await api.get(`/checklist/preguntas/${equipoSel.id}`)).data.length

      for (let idx = 0; idx < validas.length; idx++) {
        const f = validas[idx]
        try {
          await api.post('/checklist/preguntas', {
            equipo_id:      equipoSel.id,
            texto:          f.texto,
            tipo_respuesta: f._tipoNorm || normalizarTipoRespuesta(f.tipo_respuesta),
            es_obligatoria: normalizarBool(f.es_obligatoria, true),
            permite_foto:   normalizarBool(f.permite_foto, true),
            permite_nota:   normalizarBool(f.permite_nota, true),
            ayuda:          f.ayuda || null,
            valor_limite:   f.valor_limite || null,
            orden:          f.orden ? parseInt(f.orden) : (maxOrden + idx + 1),
          })
          ok++
        } catch (err) { fallidos.push({ fila: f._fila, error: err.response?.data?.message || 'Error' }) }
      }
      setResult({ ok, fallidos })
      if (ok)          toast.success(`${ok} preguntas importadas`)
      if (fallidos.length) toast.error(`${fallidos.length} filas fallaron`)
    } catch { toast.error('Error en la importación') } finally { setImp(false) }
  }

  const filasValidas   = filas.filter(f => f._valida)
  const filasInvalidas = filas.filter(f => !f._valida)

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/equipos/preguntas')} className="btn-back">
            <ArrowLeft size={14} /> Banco de preguntas
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Importar / Exportar Preguntas</h1>
            <p className="text-gray-500 text-sm mt-0.5">Gestión masiva del banco de preguntas por equipo</p>
          </div>
        </div>
      </div>

      {/* Selector de equipo */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <BookOpen size={16} className="text-roka-500" /> Seleccionar equipo
        </label>
        <select
          value={equipoSel?.id || ''}
          onChange={e => {
            const eq = equipos.find(eq => String(eq.id) === e.target.value)
            setEquipoSel(eq || null)
            limpiar()
          }}
          className="w-full sm:w-96 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">— Seleccionar equipo —</option>
          {equipos.map(eq => (
            <option key={eq.id} value={eq.id}>{eq.codigo} — {eq.nombre}</option>
          ))}
        </select>
        {equipoSel && (
          <p className="text-xs text-gray-400 mt-2">
            Sub-módulo: <span className="font-medium text-gray-600">{equipoSel.submodulo?.nombre || '—'}</span>
          </p>
        )}
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
            <p className="text-xs text-gray-500 mt-1">
              Descarga la plantilla con el formato correcto{equipoSel ? ` para ${equipoSel.nombre}` : ''}.
            </p>
          </div>
          <button onClick={() => descargarPlantilla(equipoSel?.nombre)}
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
            <h3 className="font-semibold text-gray-800">Importar preguntas</h3>
            <p className="text-xs text-gray-500 mt-1">Carga preguntas desde Excel al equipo seleccionado.</p>
          </div>
          {/* Modo */}
          <div className="flex gap-2">
            {[['agregar','Agregar'],['reemplazar','Reemplazar']].map(([v,l]) => (
              <button key={v} onClick={() => setModo(v)}
                className={`flex-1 text-xs py-1.5 rounded-lg border font-medium transition-colors ${modoImport === v ? 'bg-emerald-500 text-white border-emerald-500' : 'text-gray-500 border-gray-300 hover:bg-gray-50'}`}>
                {l}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400">
            {modoImport === 'reemplazar' ? '⚠ Borrará todas las preguntas existentes del equipo antes de importar.' : 'Agregará las preguntas nuevas al final del checklist existente.'}
          </p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          {nombreArchivo ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <FileSpreadsheet size={13} className="text-emerald-600 flex-shrink-0" />
                <span className="text-xs text-emerald-700 font-medium flex-1 truncate">{nombreArchivo}</span>
                <button onClick={limpiar}><XCircle size={13} className="text-emerald-400 hover:text-red-500" /></button>
              </div>
              <button onClick={() => { limpiar(); setTimeout(() => fileRef.current?.click(), 50) }}
                className="w-full flex items-center justify-center gap-2 border border-emerald-300 text-emerald-600 hover:bg-emerald-50 py-2 rounded-lg text-xs font-medium">
                <Upload size={12} /> Cargar otro archivo
              </button>
            </div>
          ) : (
            <button onClick={() => { if (!equipoSel) { toast.error('Selecciona un equipo primero'); return } fileRef.current?.click() }}
              className={`w-full flex items-center justify-center gap-2 border py-2.5 rounded-lg text-sm font-medium transition-colors ${equipoSel ? 'border-emerald-300 text-emerald-600 hover:bg-emerald-50' : 'border-gray-200 text-gray-300 cursor-not-allowed'}`}>
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
            <h3 className="font-semibold text-gray-800">Exportar preguntas</h3>
            <p className="text-xs text-gray-500 mt-1">
              Exporta todas las preguntas del equipo seleccionado a Excel.
            </p>
          </div>
          <button
            onClick={() => { if (!equipoSel) { toast.error('Selecciona un equipo primero'); return } exportarPreguntas(equipoSel.id, equipoSel.nombre) }}
            disabled={cargando || !equipoSel}
            className={`w-full flex items-center justify-center gap-2 border py-2.5 rounded-lg text-sm font-medium transition-colors ${equipoSel ? 'border-purple-300 text-purple-600 hover:bg-purple-50' : 'border-gray-200 text-gray-300 cursor-not-allowed'} disabled:opacity-50`}>
            {cargando ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Exportar preguntas
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
              <tr>{['Columna','Req.','Ejemplo','Valores permitidos'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {COLUMNAS.map(c => (
                <tr key={c.key} className={c.required ? 'bg-blue-50/30' : 'hover:bg-gray-50'}>
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
          <div className="flex items-center gap-3 flex-wrap bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            {nombreArchivo && (
              <div className="flex items-center gap-2 text-xs text-gray-500 border-r border-gray-200 pr-3">
                <FileSpreadsheet size={13} className="text-roka-500" />
                <span className="font-medium truncate max-w-[160px]">{nombreArchivo}</span>
              </div>
            )}
            {equipoSel && (
              <span className="text-xs text-gray-600 border-r border-gray-200 pr-3">
                Equipo: <strong>{equipoSel.nombre}</strong>
              </span>
            )}
            <span className="text-sm flex items-center gap-1.5"><CheckCircle size={13} className="text-emerald-500" /><span className="font-semibold text-emerald-700">{filasValidas.length} válidas</span></span>
            {filasInvalidas.length > 0 && <span className="text-sm flex items-center gap-1.5"><XCircle size={13} className="text-red-500" /><span className="font-semibold text-red-600">{filasInvalidas.length} con errores</span></span>}
            <div className="ml-auto flex gap-2">
              <button onClick={limpiar} className="flex items-center gap-1.5 border border-red-200 text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg text-xs font-medium">
                <XCircle size={12} /> Borrar carga
              </button>
              <button onClick={importar} disabled={importando || !filasValidas.length || !equipoSel}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
                {importando ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {importando ? 'Importando...' : `Importar ${filasValidas.length} preguntas`}
              </button>
            </div>
          </div>

          {errores.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1.5">
              <p className="text-sm font-semibold text-red-700 flex items-center gap-2"><AlertTriangle size={14} /> Errores</p>
              {errores.map((e, i) => <p key={i} className="text-xs text-red-600"><span className="font-mono font-bold">Fila {e.fila}:</span> {e.msgs.join(' · ')}</p>)}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
              <p className="text-sm font-medium text-gray-700">Vista previa — {filas.length} preguntas</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['#','OK','Pregunta','Tipo','Oblig.','Foto','Nota','Ayuda'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-gray-500 uppercase font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filas.map((f, i) => (
                    <tr key={i} className={!f._valida ? 'bg-red-50/40' : f._advertencias?.length ? 'bg-amber-50/30' : 'hover:bg-gray-50'}>
                      <td className="px-3 py-2.5 font-mono text-gray-400">{f._fila}</td>
                      <td className="px-3 py-2.5">
                        {f._valida
                          ? (f._advertencias?.length ? <AlertTriangle size={13} className="text-amber-400" title={f._advertencias.join(', ')} /> : <CheckCircle size={13} className="text-emerald-500" />)
                          : <XCircle size={13} className="text-red-400" />}
                      </td>
                      <td className="px-3 py-2.5 text-gray-800 max-w-[300px]">{f.texto || '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          {TIPO_LABEL[f._tipoNorm] || f._tipoNorm}
                        </span>
                        {f._advertencias?.length > 0 && <p className="text-[10px] text-amber-500">{f.tipo_respuesta}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-center">{normalizarBool(f.es_obligatoria) ? '✓' : '—'}</td>
                      <td className="px-3 py-2.5 text-center">{normalizarBool(f.permite_foto) ? '✓' : '—'}</td>
                      <td className="px-3 py-2.5 text-center">{normalizarBool(f.permite_nota) ? '✓' : '—'}</td>
                      <td className="px-3 py-2.5 text-gray-400 max-w-[150px] truncate">{f.ayuda || '—'}</td>
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
            {resultado.fallidos.length === 0 ? <CheckCircle size={28} className="text-emerald-600" /> : <AlertTriangle size={28} className="text-amber-600" />}
          </div>
          <h3 className={`text-lg font-bold ${resultado.fallidos.length === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
            {resultado.ok > 0 ? `${resultado.ok} preguntas importadas en "${equipoSel?.nombre}"` : 'Importación con errores'}
          </h3>
          {resultado.fallidos.length > 0 && (
            <div className="text-xs text-amber-700 space-y-1 text-left max-w-md mx-auto">
              {resultado.fallidos.map((f, i) => <p key={i}><span className="font-mono font-bold">Fila {f.fila}:</span> {f.error}</p>)}
            </div>
          )}
          <div className="flex gap-3 justify-center pt-2">
            <button onClick={() => { setFilas([]); setResult(null) }} className="px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg text-sm">Importar más</button>
            <button onClick={() => navigate('/equipos/preguntas')} className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Ver banco de preguntas <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
