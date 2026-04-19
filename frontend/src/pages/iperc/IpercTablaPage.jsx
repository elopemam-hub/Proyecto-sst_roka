import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, FileSpreadsheet, Printer, ChevronDown } from 'lucide-react'
import api from '../../services/api'

// ── Colores de clasificación ────────────────────────────────────────────────
const CLASIF = {
  trivial:     { bg: '#10b981', light: '#d1fae5', text: '#065f46', label: 'Trivial' },
  tolerable:   { bg: '#84cc16', light: '#ecfccb', text: '#365314', label: 'Tolerable' },
  moderado:    { bg: '#f59e0b', light: '#fef3c7', text: '#78350f', label: 'Moderado' },
  importante:  { bg: '#f97316', light: '#ffedd5', text: '#7c2d12', label: 'Importante' },
  intolerable: { bg: '#ef4444', light: '#fee2e2', text: '#7f1d1d', label: 'Intolerable' },
}

function clasificar(ip, is_) {
  const nr = ip * is_
  if (nr <= 4)  return 'trivial'
  if (nr <= 8)  return 'tolerable'
  if (nr <= 16) return 'moderado'
  if (nr <= 24) return 'importante'
  return 'intolerable'
}

const CTRL_LABEL = {
  eliminacion:    'Eliminación',
  sustitucion:    'Sustitución',
  ingenieria:     'Ingeniería',
  administrativo: 'Administrativo',
  epp:            'EPP',
}

// ── Estilos de cabeceras ────────────────────────────────────────────────────
const TH_BASE = 'border border-gray-400 text-white text-center font-bold px-1 py-1 text-[10px] leading-tight'
const TD_BASE = 'border border-gray-300 text-[10px] text-gray-800 align-middle'

// Paleta de colores del header
const COL_BLUE   = '#4472c4'
const COL_RED    = '#c00000'
const COL_ORANGE = '#e26b0a'
const COL_PEACH  = '#f4b183'
const COL_GREEN  = '#375623'
const COL_NAVY   = '#17375e'

export default function IpercTablaPage() {
  const navigate  = useNavigate()
  const [matrices, setMatrices]   = useState([])
  const [selected, setSelected]   = useState('')
  const [iperc,    setIperc]      = useState(null)
  const [loading,  setLoading]    = useState(false)
  const [loadingList, setLoadingList] = useState(true)

  // Cargar lista de matrices
  useEffect(() => {
    api.get('/iperc', { params: { per_page: 100 } })
      .then(({ data }) => setMatrices(data.data || data))
      .catch(() => {})
      .finally(() => setLoadingList(false))
  }, [])

  // Cargar detalle cuando se selecciona una matriz
  useEffect(() => {
    if (!selected) { setIperc(null); return }
    setLoading(true)
    api.get(`/iperc/${selected}`)
      .then(({ data }) => setIperc(data))
      .catch(() => setIperc(null))
      .finally(() => setLoading(false))
  }, [selected])

  const handlePrint = () => window.print()

  // Aplanar datos para la tabla: una fila por peligro
  const filas = []
  if (iperc?.procesos) {
    iperc.procesos.forEach(proc => {
      const peligros = proc.peligros || []
      if (peligros.length === 0) {
        filas.push({ proc, pel: null, procRowspan: 1, isProcFirst: true })
      } else {
        peligros.forEach((pel, pIdx) => {
          filas.push({
            proc,
            pel,
            procRowspan: pIdx === 0 ? peligros.length : 0,
            isProcFirst: pIdx === 0,
          })
        })
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate('/iperc')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-200 hover:text-white bg-slate-600/80 hover:bg-slate-600 px-2.5 py-1.5 rounded-lg border border-slate-600/50 transition-colors mb-3"
          >
            <ChevronLeft size={13} /> Volver al módulo IPERC
          </button>
          <h1 className="text-2xl font-bold text-white">Tabla IPERC</h1>
          <p className="text-slate-400 text-sm mt-1">Formato oficial RM 050-2013-TR · Ley 29783</p>
        </div>
        {iperc && (
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg border border-slate-600 transition-colors print:hidden"
          >
            <Printer size={14} /> Imprimir
          </button>
        )}
      </div>

      {/* ── Selector de matriz ── */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 print:hidden">
        <label className="block text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">
          Seleccionar Matriz IPERC
        </label>
        <div className="relative max-w-xl">
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="input w-full appearance-none pr-9"
          >
            <option value="">— Seleccione una matriz —</option>
            {matrices.map(m => (
              <option key={m.id} value={m.id}>
                [{m.codigo}] {m.titulo} · {m.area?.nombre}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        {loadingList && <p className="text-xs text-slate-500 mt-2">Cargando matrices...</p>}
      </div>

      {/* ── Estado vacío ── */}
      {!selected && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-16 text-center">
          <FileSpreadsheet size={48} className="mx-auto mb-3 text-slate-600" />
          <p className="text-slate-400 text-sm">Seleccione una matriz IPERC para visualizar la tabla</p>
        </div>
      )}

      {/* ── Cargando ── */}
      {loading && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
          <div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Cargando matriz...</p>
        </div>
      )}

      {/* ── Tabla IPERC ── */}
      {iperc && !loading && (
        <div className="bg-white rounded-xl border border-slate-700 overflow-hidden shadow-lg print:shadow-none print:border-0">
          {/* Encabezado del documento */}
          <div className="bg-white p-4 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Registro de evaluación de riesgos — RM 050-2013-TR</p>
                <h2 className="text-base font-bold text-gray-800 mt-1">{iperc.titulo}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{iperc.area?.nombre} · {iperc.sede?.nombre}</p>
              </div>
              <div className="text-right text-xs text-gray-500 space-y-0.5">
                <p><span className="font-semibold text-gray-700">Código:</span> {iperc.codigo}</p>
                <p><span className="font-semibold text-gray-700">Versión:</span> {iperc.version}</p>
                <p><span className="font-semibold text-gray-700">Elaborado:</span> {iperc.elaborador?.nombre}</p>
                <p><span className="font-semibold text-gray-700">Fecha:</span> {iperc.fecha_elaboracion}</p>
                <p>
                  <span className="font-semibold text-gray-700">Estado: </span>
                  <span className="capitalize">{iperc.estado?.replace('_', ' ')}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table
              className="w-full border-collapse"
              style={{ fontSize: '10px', minWidth: '1100px' }}
            >
              <thead>
                {/* ── Fila 1: grupos ── */}
                <tr>
                  {/* Actividad / Tarea / Puesto */}
                  <th
                    colSpan={3}
                    className={TH_BASE}
                    style={{ background: COL_BLUE, width: '15%' }}
                  />
                  {/* Peligro / Riesgo */}
                  <th
                    colSpan={2}
                    className={TH_BASE}
                    style={{ background: COL_RED, width: '13%' }}
                  />
                  {/* PROBABILIDAD */}
                  <th
                    colSpan={5}
                    className={TH_BASE + ' text-sm'}
                    style={{ background: COL_ORANGE, width: '22%' }}
                  >
                    PROBABILIDAD
                  </th>
                  {/* IS */}
                  <th
                    rowSpan={2}
                    className={TH_BASE}
                    style={{ background: COL_PEACH, color: '#5b2d00', width: '5%', writingMode: 'vertical-rl', transform: 'rotate(180deg)', padding: '6px 2px' }}
                  >
                    Índice de Severidad
                  </th>
                  {/* NR */}
                  <th
                    rowSpan={2}
                    className={TH_BASE}
                    style={{ background: COL_PEACH, color: '#5b2d00', width: '5%', writingMode: 'vertical-rl', transform: 'rotate(180deg)', padding: '6px 2px' }}
                  >
                    Riesgo = Prob × Sev
                  </th>
                  {/* Nivel */}
                  <th
                    rowSpan={2}
                    className={TH_BASE}
                    style={{ background: COL_GREEN, width: '6%', writingMode: 'vertical-rl', transform: 'rotate(180deg)', padding: '6px 2px' }}
                  >
                    Nivel de Riesgo
                  </th>
                  {/* Controles */}
                  <th
                    colSpan={2}
                    className={TH_BASE}
                    style={{ background: COL_NAVY, width: '14%' }}
                  />
                </tr>

                {/* ── Fila 2: columnas individuales ── */}
                <tr>
                  {/* Blue cols */}
                  {[
                    ['Actividad', '5%'],
                    ['Tarea', '5%'],
                    ['Puesto de Trabajo', '5%'],
                  ].map(([label, w]) => (
                    <th
                      key={label}
                      className={TH_BASE}
                      style={{
                        background: COL_BLUE,
                        width: w,
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        padding: '6px 2px',
                      }}
                    >
                      {label}
                    </th>
                  ))}
                  {/* Red cols */}
                  {[
                    ['Peligro', '7%'],
                    ['Riesgo', '6%'],
                  ].map(([label, w]) => (
                    <th
                      key={label}
                      className={TH_BASE}
                      style={{
                        background: COL_RED,
                        width: w,
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        padding: '6px 2px',
                      }}
                    >
                      {label}
                    </th>
                  ))}
                  {/* Orange cols — Probabilidad */}
                  {[
                    ['Personas Expuestas (A)', '4%'],
                    ['Procedimiento (B)',       '4%'],
                    ['Capacitación (C)',        '4%'],
                    ['Exposición al Riesgo (D)','4%'],
                    ['Índice de Prob. (A+B+C+D)','4%'],
                  ].map(([label, w]) => (
                    <th
                      key={label}
                      className={TH_BASE}
                      style={{
                        background: COL_ORANGE,
                        width: w,
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        padding: '6px 2px',
                      }}
                    >
                      {label}
                    </th>
                  ))}
                  {/* Navy cols — Controles */}
                  {[
                    ['Jerarquía de Controles', '6%'],
                    ['Medidas de Control',     '8%'],
                  ].map(([label, w]) => (
                    <th
                      key={label}
                      className={TH_BASE}
                      style={{
                        background: COL_NAVY,
                        width: w,
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        padding: '6px 2px',
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filas.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="text-center py-8 text-gray-400 text-xs border border-gray-300">
                      Esta matriz no tiene procesos o peligros registrados
                    </td>
                  </tr>
                ) : (
                  filas.map((fila, rowIdx) => {
                    const { proc, pel, procRowspan } = fila
                    if (!pel) return (
                      <tr key={`empty-${rowIdx}`}>
                        <td colSpan={2} className={`${TD_BASE} px-2 py-2 font-medium`}>{proc.proceso}</td>
                        <td className={`${TD_BASE} px-2 py-2`}>{proc.actividad}</td>
                        <td colSpan={11} className={`${TD_BASE} text-center text-gray-400 italic`}>Sin peligros registrados</td>
                      </tr>
                    )

                    const ip = (pel.prob_personas_expuestas || 0)
                             + (pel.prob_procedimientos    || 0)
                             + (pel.prob_capacitacion      || 0)
                             + (pel.prob_exposicion        || 0)
                    const is_ = pel.indice_severidad || 0
                    const nr  = ip * is_
                    const clave = nr > 0 ? clasificar(ip, is_) : null
                    const col   = clave ? CLASIF[clave] : null

                    // Controles del peligro
                    const ctrl = pel.controles || []
                    const jerarquias = [...new Set(ctrl.map(c => CTRL_LABEL[c.tipo_control] || c.tipo_control))].join(', ')
                    const medidas    = ctrl.map(c => c.descripcion).filter(Boolean).join(' / ')

                    return (
                      <tr
                        key={`row-${rowIdx}`}
                        className="hover:bg-blue-50/30"
                        style={{ minHeight: '32px' }}
                      >
                        {/* Proceso + Actividad + Tarea — rowspan si es primera fila del proceso */}
                        {procRowspan > 0 && (
                          <>
                            <td
                              rowSpan={procRowspan}
                              className={`${TD_BASE} px-2 py-2 font-semibold text-gray-700`}
                              style={{ background: '#dae3f3', verticalAlign: 'middle', textAlign: 'center' }}
                            >
                              {proc.proceso}
                            </td>
                            <td
                              rowSpan={procRowspan}
                              className={`${TD_BASE} px-2 py-2 text-gray-600`}
                              style={{ background: '#dae3f3', verticalAlign: 'middle', textAlign: 'center' }}
                            >
                              {proc.actividad || '—'}
                            </td>
                            <td
                              rowSpan={procRowspan}
                              className={`${TD_BASE} px-2 py-2 text-gray-600`}
                              style={{ background: '#dae3f3', verticalAlign: 'middle', textAlign: 'center' }}
                            >
                              {proc.tarea || '—'}
                            </td>
                          </>
                        )}

                        {/* Peligro */}
                        <td className={`${TD_BASE} px-2 py-1.5`} style={{ background: '#fce4d6' }}>
                          <div className="font-medium text-gray-700">{pel.descripcion_peligro}</div>
                          <div className="text-gray-400 capitalize text-[9px] mt-0.5">{pel.tipo_peligro?.replace('_', ' ')}</div>
                        </td>

                        {/* Riesgo */}
                        <td className={`${TD_BASE} px-2 py-1.5`} style={{ background: '#fce4d6' }}>
                          {pel.riesgo}
                        </td>

                        {/* A, B, C, D */}
                        {[
                          pel.prob_personas_expuestas,
                          pel.prob_procedimientos,
                          pel.prob_capacitacion,
                          pel.prob_exposicion,
                        ].map((val, i) => (
                          <td
                            key={i}
                            className={`${TD_BASE} text-center font-bold`}
                            style={{ background: '#fce9d8', color: COL_ORANGE }}
                          >
                            {val ?? '—'}
                          </td>
                        ))}

                        {/* IP = A+B+C+D */}
                        <td
                          className={`${TD_BASE} text-center font-bold text-sm`}
                          style={{ background: '#f4b183', color: '#7c2d12' }}
                        >
                          {ip > 0 ? ip : '—'}
                        </td>

                        {/* IS */}
                        <td
                          className={`${TD_BASE} text-center font-bold`}
                          style={{ background: '#fce4d6', color: '#7c2d12' }}
                        >
                          {is_ > 0 ? is_ : '—'}
                        </td>

                        {/* NR = IP × IS */}
                        <td
                          className={`${TD_BASE} text-center font-bold text-sm`}
                          style={{
                            background: col ? col.light : '#f9fafb',
                            color: col ? col.text : '#6b7280',
                          }}
                        >
                          {nr > 0 ? nr : '—'}
                        </td>

                        {/* Nivel de Riesgo */}
                        <td
                          className={`${TD_BASE} text-center font-bold`}
                          style={{
                            background: col ? col.bg : '#e5e7eb',
                            color: 'white',
                          }}
                        >
                          {col ? col.label : '—'}
                        </td>

                        {/* Jerarquía de controles */}
                        <td
                          className={`${TD_BASE} px-2 py-1.5 text-center`}
                          style={{ background: '#dae3f3' }}
                        >
                          {jerarquias || '—'}
                        </td>

                        {/* Medidas de control */}
                        <td
                          className={`${TD_BASE} px-2 py-1.5`}
                          style={{ background: '#dae3f3' }}
                        >
                          {medidas || '—'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Leyenda de colores */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 print:break-inside-avoid">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Leyenda — Nivel de Riesgo (NR = IP × IS)</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(CLASIF).map(([k, c]) => (
                <div
                  key={k}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-semibold"
                  style={{ background: c.bg, color: 'white' }}
                >
                  {c.label} ({k === 'trivial' ? '1–4' : k === 'tolerable' ? '5–8' : k === 'moderado' ? '9–16' : k === 'importante' ? '17–24' : '25–36'})
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-400 mt-2">
              IP = Personas expuestas (A) + Procedimientos (B) + Capacitación (C) + Exposición al riesgo (D) · IS = Índice de Severidad (1–4) · NR = IP × IS
            </p>
          </div>

          {/* Firmas */}
          {iperc.firmas?.length > 0 && (
            <div className="p-4 border-t border-gray-200 bg-white print:break-inside-avoid">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Firmas digitales</p>
              <div className="flex flex-wrap gap-6">
                {iperc.firmas.map(f => (
                  <div key={f.id} className="text-center">
                    <div className="w-32 border-b border-gray-400 mb-1 pb-6">
                      <p className="text-[9px] text-gray-400 italic">{f.hash_firma?.substring(0, 16)}...</p>
                    </div>
                    <p className="text-[10px] font-semibold text-gray-700">{f.firmante_nombre}</p>
                    <p className="text-[9px] text-gray-400 capitalize">{f.firmante_rol?.replace('_', ' ')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CSS de impresión */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          .bg-white, .bg-white * { visibility: visible; }
          .bg-white { position: fixed; top: 0; left: 0; width: 100%; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
        }
      `}</style>
    </div>
  )
}
