import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Download, Upload, FileSpreadsheet,
  CheckCircle2, XCircle, AlertTriangle, Loader2,
  FlaskConical, Users, ChevronRight, X,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import api from '../../services/api'

// ── Plantillas ──────────────────────────────────────────────────────────────

const TEMPLATE_SUSTANCIAS = {
  headers: [
    'nombre*','nombre_quimico','cas_number','numero_onu','formula_quimica',
    'estado_fisico*','nivel_riesgo*','pictogramas_ghs','cantidad_stock',
    'unidad_medida*','stock_minimo','stock_maximo','area_uso','proveedor',
    'ubicacion_almacenamiento','requiere_epp','incompatibilidades',
    'medidas_control','procedimiento_derrame','hds_disponible','hds_actualizado',
    'nfpa_salud','nfpa_inflamabilidad','nfpa_inestabilidad','nfpa_especial',
    'limite_tlv_twa','limite_stel','limite_idlh','observaciones',
  ],
  ejemplo: [
    'Ácido Clorhídrico','Ácido Muriático','7647-01-0','UN1789','HCl',
    'liquido','alto','GHS05,GHS07',10,'L',5,50,'Taller Mecánico','Quimicos SAC',
    'Almacén químicos - Estante A','Guantes de nitrilo,Lentes de seguridad,Mascarilla N95',
    'No mezclar con bases (NaOH)',
    'Usar en área ventilada. Evitar inhalación de vapores.',
    'Neutralizar con bicarbonato. Lavar con agua abundante.','SI','SI',
    3,1,0,'','3 ppm (techo)','','10 ppm','Mantener HDS en el área',
  ],
  instrucciones: [
    { col: 'nombre*',         desc: 'Nombre común del producto (REQUERIDO)' },
    { col: 'estado_fisico*',  desc: 'solido | liquido | gas | aerosol | polvo' },
    { col: 'nivel_riesgo*',   desc: 'bajo | medio | alto | muy_alto' },
    { col: 'unidad_medida*',  desc: 'kg | g | L | mL | m3 | unidad' },
    { col: 'pictogramas_ghs', desc: 'Separados por coma: GHS01,GHS02,...,GHS09' },
    { col: 'requiere_epp',    desc: 'EPP separados por coma' },
    { col: 'hds_disponible',  desc: 'SI / NO' },
    { col: 'nfpa_salud',      desc: 'Número 0-4' },
  ],
}

const TEMPLATE_CAPACITACIONES = {
  headers: [
    'nombre_trabajador*','cargo','sustancia*',
    'fecha_capacitacion*','fecha_vencimiento',
    'tipo_capacitacion','autorizado','observaciones',
  ],
  ejemplo: [
    'Juan Pérez López','Técnico de mantenimiento','Ácido Clorhídrico',
    '2024-01-15','2025-01-15',
    'Manejo seguro de sustancias peligrosas','SI','Capacitación presencial 4 horas',
  ],
  instrucciones: [
    { col: 'nombre_trabajador*', desc: 'Nombre completo (REQUERIDO)' },
    { col: 'sustancia*',         desc: 'Nombre EXACTO de la sustancia (REQUERIDO)' },
    { col: 'fecha_capacitacion*',desc: 'Formato: YYYY-MM-DD (REQUERIDO)' },
    { col: 'fecha_vencimiento',  desc: 'Formato: YYYY-MM-DD (opcional)' },
    { col: 'autorizado',         desc: 'SI / NO' },
  ],
}

const TEMPLATE_EXPOSICIONES = {
  headers: [
    'nombre_trabajador*','cargo','sustancia*','frecuencia*',
    'duracion_horas','via_exposicion','resultado_evaluacion',
    'fecha_evaluacion','medidas_control',
  ],
  ejemplo: [
    'María García','Operaria de limpieza','Cloro',
    'diaria',2,'inhalación','sin_medicion',
    '2024-03-10','Ventilación forzada. Tiempo de exposición máximo 2h',
  ],
  instrucciones: [
    { col: 'nombre_trabajador*', desc: 'Nombre completo (REQUERIDO)' },
    { col: 'sustancia*',         desc: 'Nombre EXACTO de la sustancia (REQUERIDO)' },
    { col: 'frecuencia*',        desc: 'ocasional | diaria | semanal | mensual' },
    { col: 'resultado_evaluacion',desc: 'normal | sobre_limite | sin_medicion' },
    { col: 'fecha_evaluacion',   desc: 'Formato: YYYY-MM-DD' },
  ],
}

function descargarPlantilla(template, nombreArchivo) {
  const ws = XLSX.utils.aoa_to_sheet([
    template.headers,
    template.ejemplo,
  ])
  // Estilo cabecera (ancho de columnas)
  ws['!cols'] = template.headers.map(() => ({ wch: 25 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')

  // Hoja de instrucciones
  const wsInst = XLSX.utils.aoa_to_sheet([
    ['CAMPO', 'DESCRIPCIÓN / VALORES VÁLIDOS'],
    ...template.instrucciones.map(i => [i.col, i.desc]),
    [],
    ['NOTA', 'Los campos marcados con * son OBLIGATORIOS'],
    ['NOTA', 'La primera fila es el encabezado y no debe modificarse'],
    ['NOTA', 'La segunda fila es un ejemplo que puede eliminar'],
  ])
  wsInst['!cols'] = [{ wch: 30 }, { wch: 60 }]
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instrucciones')

  XLSX.writeFile(wb, nombreArchivo)
}

function parsearExcel(file, headers) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb  = XLSX.read(e.target.result, { type: 'binary', cellDates: true })
        const ws  = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        if (raw.length < 2) return reject('El archivo está vacío o solo tiene encabezados.')

        const encabezado = raw[0].map(h => String(h).toLowerCase().replace('*','').trim())
        const filas = raw.slice(1)
          .filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined))
          .map(row => {
            const obj = {}
            encabezado.forEach((h, i) => {
              const val = row[i]
              // Fechas Excel
              if (val instanceof Date) {
                obj[h] = val.toISOString().substring(0, 10)
              } else {
                obj[h] = val !== undefined && val !== null ? String(val).trim() : ''
              }
            })
            return obj
          })

        resolve(filas)
      } catch(e) { reject('Error al leer el archivo: ' + e.message) }
    }
    reader.onerror = () => reject('Error al leer el archivo.')
    reader.readAsBinaryString(file)
  })
}

// ── Componente de zona de carga ─────────────────────────────────────────────
function ZonaCarga({ onFile, archivo }) {
  const ref = useRef()
  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
      className={`flex flex-col items-center gap-2 border-2 border-dashed rounded-xl px-6 py-8 cursor-pointer transition-colors ${
        archivo ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 hover:border-roka-400 hover:bg-roka-50 bg-gray-50'
      }`}>
      <input ref={ref} type="file" accept=".xlsx,.xls,.csv" className="hidden"
        onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]); e.target.value = '' }} />
      {archivo ? (
        <>
          <FileSpreadsheet size={28} className="text-emerald-600"/>
          <p className="text-sm font-semibold text-emerald-700">{archivo.name}</p>
          <p className="text-xs text-emerald-500">Click para cambiar archivo</p>
        </>
      ) : (
        <>
          <Upload size={28} className="text-gray-400"/>
          <p className="text-sm font-medium text-gray-600">
            <span className="text-roka-600 font-semibold">Haz clic</span> o arrastra el archivo Excel aquí
          </p>
          <p className="text-xs text-gray-400">.xlsx · .xls · .csv</p>
        </>
      )}
    </div>
  )
}

// ── Tabla de vista previa ───────────────────────────────────────────────────
function TablaPrevia({ filas, headers, maxRows = 5 }) {
  if (!filas || filas.length === 0) return null
  const visibles = filas.slice(0, maxRows)
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-gray-500 font-medium">#</th>
            {headers.slice(0,6).map(h => (
              <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium whitespace-nowrap">
                {h.replace('*','')}
              </th>
            ))}
            {headers.length > 6 && <th className="px-3 py-2 text-gray-400">+{headers.length-6} más</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {visibles.map((f, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-400">{i+1}</td>
              {headers.slice(0,6).map(h => (
                <td key={h} className="px-3 py-2 text-gray-700 max-w-[150px] truncate" title={f[h.replace('*','').trim()]}>
                  {f[h.replace('*','').trim()] || <span className="text-gray-300">—</span>}
                </td>
              ))}
              {headers.length > 6 && <td className="px-3 py-2 text-gray-400">...</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {filas.length > maxRows && (
        <p className="text-center text-xs text-gray-400 py-2 border-t border-gray-100">
          Mostrando {maxRows} de {filas.length} filas
        </p>
      )}
    </div>
  )
}

// ── Página principal ────────────────────────────────────────────────────────
export default function SustanciaImportPage() {
  const navigate = useNavigate()
  const [tab, setTab]             = useState('sustancias')
  const [subTab, setSubTab]       = useState('capacitacion') // para trabajadores
  const [archivo, setArchivo]     = useState(null)
  const [filas, setFilas]         = useState([])
  const [parseError, setParseError] = useState('')
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado]   = useState(null)

  const reset = () => { setArchivo(null); setFilas([]); setParseError(''); setResultado(null) }

  const handleArchivo = async (file) => {
    setArchivo(file); setParseError(''); setFilas([]); setResultado(null)
    const template = tab === 'sustancias' ? TEMPLATE_SUSTANCIAS
      : subTab === 'capacitacion' ? TEMPLATE_CAPACITACIONES : TEMPLATE_EXPOSICIONES
    try {
      const rows = await parsearExcel(file, template.headers)
      if (rows.length === 0) { setParseError('No se encontraron datos en el archivo.'); return }
      setFilas(rows)
    } catch(e) { setParseError(typeof e === 'string' ? e : 'Error al procesar el archivo.') }
  }

  const importar = async () => {
    if (filas.length === 0) return
    setImportando(true); setResultado(null)
    try {
      let res
      if (tab === 'sustancias') {
        const { data } = await api.post('/sustancias/importar/sustancias', { filas })
        res = data
      } else {
        const { data } = await api.post('/sustancias/importar/trabajadores', { tipo: subTab, filas })
        res = data
      }
      setResultado(res)
      if (res.importados > 0) setFilas([]) // limpiar solo si hubo éxito
    } catch(e) { setParseError(e.response?.data?.message || 'Error al importar.') }
    finally { setImportando(false) }
  }

  const template = tab === 'sustancias' ? TEMPLATE_SUSTANCIAS
    : subTab === 'capacitacion' ? TEMPLATE_CAPACITACIONES : TEMPLATE_EXPOSICIONES

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/sustancias')} className="btn-back">
          <ArrowLeft size={14}/> Sustancias
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet size={22} className="text-purple-600"/> Importar desde Excel
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Carga masiva de sustancias y registro de trabajadores</p>
        </div>
      </div>

      {/* Tabs principales */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          {[
            { key:'sustancias',   label:'Sustancias Peligrosas', icon: FlaskConical },
            { key:'trabajadores', label:'Lista de Trabajadores',  icon: Users },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); reset() }}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-roka-500 text-roka-600 bg-roka-50' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <t.icon size={16}/> {t.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-5">
          {/* Sub-tabs para trabajadores */}
          {tab === 'trabajadores' && (
            <div className="flex gap-2">
              {[
                { key:'capacitacion', label:'Capacitaciones' },
                { key:'exposicion',   label:'Exposiciones laborales' },
              ].map(s => (
                <button key={s.key} onClick={() => { setSubTab(s.key); reset() }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    subTab === s.key ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Paso 1: Descargar plantilla */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">1</span>
                  Descarga la plantilla Excel
                </h3>
                <p className="text-xs text-blue-600 mt-1">
                  Completa la plantilla con tus datos. La primera fila son los encabezados — no los modifiques.
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {template.instrucciones.slice(0, 4).map(i => (
                    <span key={i.col} className="text-[10px] bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                      <strong>{i.col}</strong>: {i.desc}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  const name = tab === 'sustancias'
                    ? 'plantilla_sustancias_peligrosas.xlsx'
                    : subTab === 'capacitacion'
                      ? 'plantilla_capacitaciones_sustancias.xlsx'
                      : 'plantilla_exposiciones_sustancias.xlsx'
                  descargarPlantilla(template, name)
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0">
                <Download size={15}/> Descargar plantilla
              </button>
            </div>
          </div>

          {/* Paso 2: Subir archivo */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <span className="w-5 h-5 bg-gray-700 text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
              Sube el archivo completado
            </h3>
            <ZonaCarga onFile={handleArchivo} archivo={archivo} />
            {parseError && (
              <p className="mt-2 text-xs text-red-600 flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <XCircle size={12}/> {parseError}
              </p>
            )}
          </div>

          {/* Paso 3: Vista previa */}
          {filas.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-5 h-5 bg-gray-700 text-white rounded-full text-xs flex items-center justify-center font-bold">3</span>
                  Vista previa — {filas.length} fila{filas.length !== 1 ? 's' : ''} detectada{filas.length !== 1 ? 's' : ''}
                </h3>
                <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                  <X size={12}/> Limpiar
                </button>
              </div>
              <TablaPrevia filas={filas} headers={template.headers} maxRows={6} />

              {/* Botón importar */}
              <button onClick={importar} disabled={importando}
                className="w-full flex items-center justify-center gap-2 bg-roka-500 hover:bg-roka-600 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors">
                {importando ? <><Loader2 size={16} className="animate-spin"/> Importando...</> : <><Upload size={16}/> Importar {filas.length} registro{filas.length !== 1 ? 's' : ''}</>}
              </button>
            </div>
          )}

          {/* Resultado */}
          {resultado && (
            <div className={`rounded-xl border p-5 space-y-3 ${resultado.importados > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center gap-3">
                {resultado.importados > 0
                  ? <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0"/>
                  : <AlertTriangle size={20} className="text-amber-600 flex-shrink-0"/>}
                <div>
                  <p className={`text-sm font-bold ${resultado.importados > 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {resultado.importados > 0
                      ? `✓ ${resultado.importados} de ${resultado.total} registros importados correctamente`
                      : `Sin importaciones exitosas — ${resultado.errores.length} error${resultado.errores.length !== 1 ? 'es' : ''}`}
                  </p>
                  {resultado.errores.length > 0 && (
                    <p className="text-xs text-amber-700 mt-0.5">{resultado.errores.length} fila{resultado.errores.length !== 1 ? 's' : ''} con errores</p>
                  )}
                </div>
                {resultado.importados > 0 && (
                  <button onClick={() => navigate('/sustancias')}
                    className="ml-auto flex items-center gap-1 text-xs text-emerald-700 font-medium border border-emerald-300 hover:bg-emerald-100 px-3 py-1.5 rounded-lg">
                    Ver lista <ChevronRight size={12}/>
                  </button>
                )}
              </div>

              {/* Errores detallados */}
              {resultado.errores.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-amber-200">
                  <table className="w-full text-xs">
                    <thead className="bg-amber-100">
                      <tr>
                        <th className="text-left px-3 py-2 text-amber-700 font-medium">Fila Excel</th>
                        <th className="text-left px-3 py-2 text-amber-700 font-medium">Registro</th>
                        <th className="text-left px-3 py-2 text-amber-700 font-medium">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100 bg-white">
                      {resultado.errores.map((e, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-mono text-amber-800">{e.fila}</td>
                          <td className="px-3 py-2 text-gray-700">{e.nombre}</td>
                          <td className="px-3 py-2 text-red-600">{e.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
