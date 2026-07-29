import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Download, Upload, FileSpreadsheet, CheckCircle,
  XCircle, AlertTriangle, Loader2, Info, Trash2, CalendarClock, History,
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

// ── Modos de importación ──────────────────────────────────────────
// La agenda son exámenes futuros sin resultado; el historial son exámenes ya
// practicados, que es lo que alimenta el cronograma y las alertas.
const COL_DNI     = { key: 'dni',    label: 'DNI',    required: true,  ejemplo: '43584429',         tipo: '7-8 dígitos · debe existir en Gestión Humana' }
const COL_NOMBRE  = { key: 'nombre', label: 'NOMBRE', required: false, ejemplo: 'APAZA PINTO LALO', tipo: 'Informativo · el trabajador se identifica por el DNI. Si no coincide, se avisa' }
const COL_TIPO    = { key: 'tipo',   label: 'TIPO',   required: true,  ejemplo: 'periodico',        tipo: 'pre_ocupacional | periodico | retiro | por_cambio_ocupacional' }
const COL_CLINICA = { key: 'clinica', label: 'CLINICA', required: false, ejemplo: 'Clínica San Pablo', tipo: 'Texto' }
const COL_MEDICO  = { key: 'medico',  label: 'MEDICO',  required: false, ejemplo: 'Dr. Juan Pérez',    tipo: 'Texto' }
const COL_OBS     = { key: 'observaciones', label: 'OBSERVACIONES', required: false, ejemplo: '', tipo: 'Texto' }

const MODOS = {
  citas: {
    titulo: 'Agenda de citas',
    descripcion: 'Exámenes programados a futuro, todavía sin resultado.',
    endpoint: '/salud/citas/importar',
    archivo: 'plantilla_agenda_emo.xlsx',
    hoja: 'CITAS',
    campoFecha: 'fecha_cita',
    icono: CalendarClock,
    columnas: [
      COL_DNI, COL_NOMBRE, COL_TIPO,
      { key: 'fecha_cita', label: 'FECHA_CITA', required: true,  ejemplo: '15/03/2027', tipo: 'dd/mm/yyyy · fecha en que se atenderá al trabajador' },
      { key: 'hora',       label: 'HORA',       required: false, ejemplo: '08:30',      tipo: 'HH:MM (24h)' },
      COL_CLINICA, COL_MEDICO, COL_OBS,
    ],
  },
  historial: {
    titulo: 'Exámenes ya realizados',
    descripcion: 'Historial con resultado. Alimenta el cronograma médico y las alertas de vencimiento.',
    endpoint: '/salud/emo/importar',
    archivo: 'plantilla_historial_emo.xlsx',
    hoja: 'EMO',
    campoFecha: 'fecha_examen',
    icono: History,
    columnas: [
      COL_DNI, COL_NOMBRE, COL_TIPO,
      { key: 'fecha_examen',      label: 'FECHA_EXAMEN',      required: true,  ejemplo: '15/03/2026', tipo: 'dd/mm/yyyy' },
      { key: 'fecha_vencimiento', label: 'FECHA_VENCIMIENTO', required: false, ejemplo: '15/03/2027', tipo: 'dd/mm/yyyy · si se deja vacío se calcula 1 año después' },
      COL_CLINICA, COL_MEDICO,
      { key: 'resultado',     label: 'RESULTADO',     required: false, ejemplo: 'apto', tipo: 'apto | apto_con_restricciones | no_apto' },
      { key: 'restricciones', label: 'RESTRICCIONES', required: false, ejemplo: '',     tipo: 'Texto · obligatorio si el resultado es apto_con_restricciones' },
      COL_OBS,
    ],
  },
}

const TIPOS      = ['pre_ocupacional', 'periodico', 'retiro', 'por_cambio_ocupacional']
const RESULTADOS = ['apto', 'apto_con_restricciones', 'no_apto']

// ── Helpers ───────────────────────────────────────────────────────
const sinTildes = (v) => String(v || '').trim().toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')

function parseFecha(v) {
  if (v === null || v === undefined || v === '') return ''
  const s = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  if (!isNaN(Number(v))) {
    const d = new Date(Math.round((Number(v) - 25569) * 86400 * 1000))
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }
  return null   // null = venía algo, pero no es una fecha válida
}

function parseHora(v) {
  if (v === null || v === undefined || v === '') return ''
  const s = String(v).trim()
  const m = s.match(/^(\d{1,2}):(\d{2})/)
  if (m) {
    const h = Number(m[1]), i = Number(m[2])
    if (h <= 23 && i <= 59) return `${String(h).padStart(2, '0')}:${m[2]}`
  }
  // Fracción de día de Excel (0.354166 = 08:30)
  const n = Number(v)
  if (!isNaN(n) && n > 0 && n < 1) {
    const mins = Math.round(n * 24 * 60)
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
  }
  return null
}

function normalizarTipo(v) {
  const s = sinTildes(v).replace(/\s+/g, '_')
  if (!s) return 'periodico'
  const map = {
    pre_ocupacional: 'pre_ocupacional', preocupacional: 'pre_ocupacional', ingreso: 'pre_ocupacional',
    periodico: 'periodico', anual: 'periodico',
    retiro: 'retiro', salida: 'retiro', cese: 'retiro',
    por_cambio_ocupacional: 'por_cambio_ocupacional', cambio_ocupacional: 'por_cambio_ocupacional',
  }
  return map[s] || s
}

function normalizarResultado(v) {
  const s = sinTildes(v).replace(/\s+/g, '_')
  if (!s) return 'apto'
  const map = {
    apto: 'apto',
    apto_con_restricciones: 'apto_con_restricciones', apto_con_restriccion: 'apto_con_restricciones',
    restricciones: 'apto_con_restricciones',
    no_apto: 'no_apto', inapto: 'no_apto',
  }
  return map[s] || s
}

// Compara nombres tolerando el orden y los nombres parciales:
// "APAZA PINTO LALO" y "LALO APAZA" se consideran la misma persona.
function nombreCoincide(escrito, sistema) {
  const tokens = (v) => sinTildes(v).split(/\s+/).filter(t => t.length > 2)
  const a = tokens(escrito), b = tokens(sistema)
  if (!a.length || !b.length) return true
  const [corto, largo] = a.length <= b.length ? [a, b] : [b, a]
  return corto.every(t => largo.includes(t))
}

function validarFila(f, modo) {
  const errores = []
  if (!f.dni) errores.push('DNI requerido')
  else if (!/^\d{7,8}$/.test(f.dni)) errores.push(`DNI inválido: "${f.dni}"`)

  if (!TIPOS.includes(f._tipo)) errores.push(`Tipo inválido: "${f.tipo}"`)

  const campoFecha = MODOS[modo].campoFecha
  const etiqueta   = modo === 'citas' ? 'Fecha de cita' : 'Fecha de examen'
  if (!f[campoFecha]) errores.push(`${etiqueta} requerida`)
  else if (f._fecha === null) errores.push(`${etiqueta} inválida: "${f[campoFecha]}"`)

  if (modo === 'citas') {
    if (f.hora && f._hora === null) errores.push(`Hora inválida: "${f.hora}" (usar HH:MM)`)
  } else {
    if (!RESULTADOS.includes(f._resultado)) errores.push(`Resultado inválido: "${f.resultado}"`)
    if (f.fecha_vencimiento && f._fecha_vencimiento === null) {
      errores.push(`Fecha de vencimiento inválida: "${f.fecha_vencimiento}"`)
    }
    if (f._fecha && f._fecha_vencimiento && f._fecha_vencimiento <= f._fecha) {
      errores.push('El vencimiento debe ser posterior al examen')
    }
  }
  return errores
}

// ── Descargar plantilla ───────────────────────────────────────────
async function descargarPlantilla(modo, trabajadores = []) {
  const cfg = MODOS[modo]
  try {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    const headers = cfg.columnas.map(c => c.label)
    const filas = trabajadores.length
      ? trabajadores.map(t => cfg.columnas.map(c => {
          if (c.key === 'dni')    return t.dni || ''
          if (c.key === 'nombre') return t.nombre
          if (c.key === 'tipo')   return 'periodico'
          return ''
        }))
      : [cfg.columnas.map(c => c.ejemplo)]

    const ws = XLSX.utils.aoa_to_sheet([headers, ...filas])
    ws['!cols'] = cfg.columnas.map(c => ({ wch: Math.max(c.label.length, String(c.ejemplo).length) + 4 }))
    XLSX.utils.book_append_sheet(wb, ws, cfg.hoja)

    const instrucciones = [
      [modo === 'citas'
        ? 'AGENDA DE CITAS DE EXÁMENES MÉDICOS OCUPACIONALES'
        : 'HISTORIAL DE EXÁMENES MÉDICOS OCUPACIONALES (EMO)'], [''],
      [cfg.descripcion], [''],
      [`1. Llena la hoja "${cfg.hoja}": una fila por examen y trabajador.`],
      ['2. NO modifiques los encabezados de la primera fila.'],
      trabajadores.length
        ? ['3. Las filas ya traen el DNI y el NOMBRE de cada trabajador activo: completa el resto.']
        : ['3. La fila 2 es de ejemplo — bórrala o sobreescríbela.'],
      [`4. Campos OBLIGATORIOS: ${cfg.columnas.filter(c => c.required).map(c => c.label).join(', ')}`],
      [''],
      ['CAMPOS Y VALORES PERMITIDOS:'],
      ...cfg.columnas.map(c => [c.label, c.tipo]),
      [''],
      ['NOTAS IMPORTANTES:'],
      ['DNI', 'Debe existir en Gestión Humana. Las filas cuyo DNI no exista se rechazan.'],
      ['NOMBRE', 'Es solo de apoyo para saber a quién corresponde cada fila. El trabajador se'],
      ['', 'identifica por el DNI; si el nombre no cuadra con el del sistema, se avisa al validar.'],
      ['FECHAS', 'Formato dd/mm/yyyy (ej: 15/03/2027).'],
      ...(modo === 'citas'
        ? [
            ['HORA', 'Opcional, formato 24h (ej: 08:30).'],
            ['DUPLICADOS', 'Un mismo trabajador, tipo y fecha de cita no se carga dos veces.'],
            ['RESULTADO', 'No se registra aquí: la cita aún no se ha realizado. El resultado se'],
            ['', 'carga después desde la agenda, al marcar la cita como realizada.'],
          ]
        : [
            ['FECHA_VENCIMIENTO', 'Si se deja vacía se asume un año después del examen.'],
            ['DUPLICADOS', 'Un mismo trabajador, tipo y fecha de examen no se carga dos veces.'],
          ]),
      ['', 'Con "Actualizar existentes" se sobreescribe ese registro en lugar de omitirlo.'],
    ]
    const wsI = XLSX.utils.aoa_to_sheet(instrucciones)
    wsI['!cols'] = [{ wch: 24 }, { wch: 74 }]
    XLSX.utils.book_append_sheet(wb, wsI, 'Instrucciones')

    XLSX.writeFile(wb, cfg.archivo)
    toast.success('Plantilla descargada')
  } catch {
    toast.error('Error al generar la plantilla')
  }
}

// ── Página ────────────────────────────────────────────────────────
export default function SaludImportPage() {
  const navigate = useNavigate()
  const fileRef  = useRef(null)

  const [modo, setModo]             = useState('citas')
  const [filas, setFilas]           = useState([])
  const [nombreArchivo, setNombre]  = useState('')
  const [modoDuplicados, setModoDup] = useState('insertar')
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado]   = useState(null)
  const [trabajadores, setTrabajadores] = useState([])

  const cfg = MODOS[modo]

  // Personal activo: prellena la plantilla y contrasta el NOMBRE escrito
  useEffect(() => {
    api.get('/personal', { params: { estado: 'activo', per_page: 1000 } })
      .then(({ data }) => {
        const lista = (data.data || data || []).map(p => ({
          dni: String(p.dni || '').trim(),
          nombre: `${p.apellidos || ''} ${p.nombres || ''}`.trim(),
        })).filter(p => p.dni)
        setTrabajadores(lista)
      })
      .catch(() => setTrabajadores([]))
  }, [])

  const personalPorDni = Object.fromEntries(trabajadores.map(t => [t.dni, t.nombre]))

  const validas   = filas.filter(f => f._valida)
  const invalidas = filas.filter(f => !f._valida)
  const conAvisos = filas.filter(f => f._valida && f._avisos?.length)

  const limpiar = () => {
    setFilas([]); setResultado(null); setNombre('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const cambiarModo = (nuevo) => {
    setModo(nuevo)
    limpiar()   // las columnas cambian: lo leído ya no sirve
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setNombre(file.name)
    setResultado(null)
    try {
      const XLSX = await import('xlsx')
      const buf  = await file.arrayBuffer()
      const wb   = XLSX.read(buf, { type: 'array', cellDates: false })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const raw  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

      if (raw.length < 2) { toast.error('El archivo no tiene datos'); return }

      const headerRow = raw[0].map(h => String(h).trim().toUpperCase())
      const faltantes = cfg.columnas.filter(c => c.required && !headerRow.includes(c.label))
      if (faltantes.length) {
        toast.error(`Faltan columnas obligatorias: ${faltantes.map(c => c.label).join(', ')}`)
        return
      }

      const colIdx = {}
      cfg.columnas.forEach(c => {
        const i = headerRow.indexOf(c.label)
        if (i >= 0) colIdx[c.key] = i
      })

      const parsed = []
      for (let i = 1; i < raw.length; i++) {
        const row = raw[i]
        if (row.every(v => String(v).trim() === '')) continue

        const f = {}
        cfg.columnas.forEach(c => {
          f[c.key] = String(colIdx[c.key] !== undefined ? row[colIdx[c.key]] ?? '' : '').trim()
        })

        f._tipo  = normalizarTipo(f.tipo)
        f._fecha = f[cfg.campoFecha] ? parseFecha(f[cfg.campoFecha]) : ''
        f._fila  = i + 1

        if (modo === 'citas') {
          f._hora = f.hora ? parseHora(f.hora) : ''
        } else {
          f._resultado         = normalizarResultado(f.resultado)
          f._fecha_vencimiento = f.fecha_vencimiento ? parseFecha(f.fecha_vencimiento) : ''
        }

        // Contraste con Gestión Humana. Si la lista no cargó, no se marca nada
        // para no rechazar filas correctas por un fallo de red.
        f._nombre_sistema = personalPorDni[f.dni] || ''
        f._avisos = []
        const errs = validarFila(f, modo)

        if (trabajadores.length && f.dni && /^\d{7,8}$/.test(f.dni) && !f._nombre_sistema) {
          errs.push(`El DNI ${f.dni} no está en Gestión Humana`)
        }
        if (f.nombre && f._nombre_sistema && !nombreCoincide(f.nombre, f._nombre_sistema)) {
          f._avisos.push(`El nombre no coincide con "${f._nombre_sistema}"`)
        }

        f._valida  = errs.length === 0
        f._errores = errs
        parsed.push(f)
      }

      setFilas(parsed)
      toast.success(`${parsed.length} fila(s) leída(s)`)
    } catch {
      toast.error('No se pudo leer el archivo')
    }
    e.target.value = ''
  }

  const importar = async () => {
    if (!validas.length) { toast.error('No hay filas válidas para importar'); return }
    setImportando(true)
    try {
      const registros = validas.map(f => {
        const base = {
          _fila:   f._fila,
          dni:     f.dni,
          tipo:    f._tipo,
          clinica: f.clinica,
          medico:  f.medico,
          observaciones: f.observaciones,
        }
        return modo === 'citas'
          ? { ...base, fecha_cita: f._fecha, hora: f._hora || '' }
          : {
              ...base,
              fecha_examen:      f._fecha,
              fecha_vencimiento: f._fecha_vencimiento || '',
              resultado:         f._resultado,
              restricciones:     f.restricciones,
            }
      })

      const { data } = await api.post(cfg.endpoint, { registros, modo: modoDuplicados })
      setResultado(data)

      if (data.insertados || data.actualizados) {
        toast.success(`${data.insertados} creados · ${data.actualizados} actualizados`)
      } else {
        toast.error('No se cargó ningún registro')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al importar')
    } finally {
      setImportando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/salud')} className="btn-back">
          <ArrowLeft size={14} /> Salud / EMO
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importar desde Excel</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Carga masiva de exámenes médicos ocupacionales
          </p>
        </div>
      </div>

      {/* Qué se va a importar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(MODOS).map(([key, m]) => {
          const Icono = m.icono
          const activo = modo === key
          return (
            <button key={key} onClick={() => cambiarModo(key)}
              className={`text-left border rounded-xl p-4 transition-colors ${
                activo ? 'border-roka-500 bg-roka-50 ring-1 ring-roka-500' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <Icono size={16} className={activo ? 'text-roka-600' : 'text-gray-400'} />
                <span className={`font-semibold text-sm ${activo ? 'text-roka-700' : 'text-gray-700'}`}>{m.titulo}</span>
              </div>
              <p className="text-xs text-gray-500">{m.descripcion}</p>
            </button>
          )
        })}
      </div>

      {/* Paso 1: plantilla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-roka-50 text-roka-600 flex items-center justify-center font-bold text-sm shrink-0">1</div>
            <div>
              <h2 className="font-semibold text-gray-800">Descarga la plantilla</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Columnas de «{cfg.titulo}», con una hoja de instrucciones.
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => descargarPlantilla(modo, trabajadores)}
              disabled={!trabajadores.length}
              title="Una fila por trabajador activo, con DNI y nombre ya puestos"
              className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Download size={15} /> Con mis trabajadores ({trabajadores.length})
            </button>
            <button onClick={() => descargarPlantilla(modo)}
              className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium">
              <Download size={15} /> Plantilla vacía
            </button>
          </div>
        </div>
      </div>

      {/* Paso 2: archivo */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-roka-50 text-roka-600 flex items-center justify-center font-bold text-sm shrink-0">2</div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-800">Sube el archivo llenado</h2>
            <p className="text-sm text-gray-500 mt-0.5">Se validan las filas antes de guardar nada.</p>
          </div>
        </div>

        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />

        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Upload size={15} /> Seleccionar archivo
          </button>
          {nombreArchivo && (
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <FileSpreadsheet size={15} className="text-emerald-600" /> {nombreArchivo}
              <button onClick={limpiar} title="Quitar archivo" className="text-gray-400 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </span>
          )}
        </div>

        {filas.length > 0 && (
          <div className="flex items-center gap-4 flex-wrap pt-1">
            <span className="flex items-center gap-1.5 text-sm text-emerald-700">
              <CheckCircle size={15} /> {validas.length} válida{validas.length !== 1 ? 's' : ''}
            </span>
            {invalidas.length > 0 && (
              <span className="flex items-center gap-1.5 text-sm text-red-600">
                <XCircle size={15} /> {invalidas.length} con error
              </span>
            )}
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer ml-auto">
              <input type="checkbox" checked={modoDuplicados === 'upsert'}
                onChange={e => setModoDup(e.target.checked ? 'upsert' : 'insertar')}
                className="w-4 h-4 rounded" />
              Actualizar los que ya existan
            </label>
          </div>
        )}
      </div>

      {/* Filas con error */}
      {invalidas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-semibold text-red-800 text-sm flex items-center gap-2 mb-2">
            <AlertTriangle size={15} /> {invalidas.length} fila(s) no se importarán
          </h3>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {invalidas.map(f => (
              <p key={f._fila} className="text-xs text-red-700">
                <span className="font-mono font-semibold">Fila {f._fila}</span>
                {f.dni && <span className="text-red-500"> · DNI {f.dni}</span>}
                {' — '}{f._errores.join(' · ')}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Nombres que no cuadran (no bloquean: manda el DNI) */}
      {conAvisos.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-semibold text-amber-800 text-sm flex items-center gap-2 mb-2">
            <AlertTriangle size={15} /> {conAvisos.length} fila(s) con el nombre distinto al del sistema
          </h3>
          <p className="text-xs text-amber-700 mb-2">
            Se importarán igual: el trabajador se identifica por el DNI. Revísalas por si alguna fila
            quedó desalineada al copiar y pegar.
          </p>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {conAvisos.map(f => (
              <p key={f._fila} className="text-xs text-amber-800">
                <span className="font-mono font-semibold">Fila {f._fila}</span>
                <span className="text-amber-600"> · DNI {f.dni}</span>
                {' — Excel: '}<span className="font-medium">"{f.nombre}"</span>
                {' · Sistema: '}<span className="font-medium">"{f._nombre_sistema}"</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Vista previa */}
      {validas.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Vista previa</h3>
            <span className="text-xs text-gray-400">
              {validas.length > 20 ? `Mostrando 20 de ${validas.length}` : `${validas.length} registro(s)`}
            </span>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {['Fila', 'DNI', 'Trabajador', 'Tipo',
                    modo === 'citas' ? 'Fecha cita' : 'Examen',
                    modo === 'citas' ? 'Hora' : 'Vence',
                    'Clínica',
                    ...(modo === 'citas' ? [] : ['Resultado']),
                  ].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {validas.slice(0, 20).map(f => (
                  <tr key={f._fila} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400 font-mono">{f._fila}</td>
                    <td className="px-3 py-2 font-mono text-gray-700">{f.dni}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {f._nombre_sistema || <span className="text-gray-400">—</span>}
                      {f._avisos.length > 0 && (
                        <span title={f._avisos.join(' · ')} className="ml-1 text-amber-600">
                          <AlertTriangle size={12} className="inline -mt-0.5" />
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{f._tipo.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2 text-gray-600">{f._fecha}</td>
                    <td className="px-3 py-2 text-gray-500">
                      {modo === 'citas'
                        ? (f._hora || <span className="text-gray-400">—</span>)
                        : (f._fecha_vencimiento || <span className="text-amber-600" title="Se calculará un año después">+1 año</span>)}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{f.clinica || '—'}</td>
                    {modo !== 'citas' && (
                      <td className="px-3 py-2 text-gray-600">{f._resultado.replace(/_/g, ' ')}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
            <button onClick={importar} disabled={importando}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold">
              {importando ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {importando ? 'Importando…' : `Importar ${validas.length} registro(s)`}
            </button>
          </div>
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Info size={16} className="text-roka-500" /> Resultado de la importación
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Procesadas',   valor: resultado.total,                 color: 'text-gray-800' },
              { label: 'Creados',      valor: resultado.insertados,            color: 'text-emerald-600' },
              { label: 'Actualizados', valor: resultado.actualizados,          color: 'text-blue-600' },
              { label: 'Rechazados',   valor: resultado.errores?.length || 0,  color: (resultado.errores?.length || 0) > 0 ? 'text-red-600' : 'text-gray-400' },
            ].map(k => (
              <div key={k.label} className="border border-gray-200 rounded-lg p-3 text-center">
                <p className={`text-2xl font-bold ${k.color}`}>{k.valor}</p>
                <p className="text-xs text-gray-500">{k.label}</p>
              </div>
            ))}
          </div>

          {resultado.errores?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
              {resultado.errores.map((e, i) => (
                <p key={i} className="text-xs text-red-700">
                  <span className="font-mono font-semibold">Fila {e.fila}</span>
                  {e.dni && <span className="text-red-500"> · DNI {e.dni}</span>}
                  {' — '}{e.error}
                </p>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={limpiar}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              Importar otro archivo
            </button>
            <button onClick={() => navigate(modo === 'citas' ? '/salud/citas' : '/salud/cronograma')}
              className="px-4 py-2 text-sm font-medium text-white bg-roka-500 hover:bg-roka-600 rounded-lg">
              {modo === 'citas' ? 'Ver agenda de citas' : 'Ver cronograma médico'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
