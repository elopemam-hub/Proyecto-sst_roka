import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Printer, ArrowLeft, Loader2, Upload, Info } from 'lucide-react'
import api from '../../services/api'

const TIPOS = [
  { key: 'induccion',    label: 'Inducción' },
  { key: 'capacitacion', label: 'Capacitación' },
  { key: 'entrenamiento',label: 'Entrenamiento' },
  { key: 'simulacro',    label: 'Simulacro-Emergencia' },
  { key: 'otro',         label: 'Otros' },
]

const fmtFecha = (val) => {
  if (!val) return ''
  try { return new Date(val).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return val }
}

// Celda etiqueta (no editable, fondo gris)
const LB = ({ children, colSpan, rowSpan, center, style = {} }) => (
  <td colSpan={colSpan} rowSpan={rowSpan} style={{
    border: '1px solid #000', padding: '3px 6px',
    fontSize: '9px', fontWeight: 'bold',
    backgroundColor: '#c8c8c8', textAlign: center ? 'center' : 'left',
    verticalAlign: 'middle', lineHeight: 1.3, ...style,
  }}>
    {children}
  </td>
)

// Celda de sección header (gris más oscuro, centrado)
const SH = ({ children, colSpan }) => (
  <td colSpan={colSpan} style={{
    border: '1px solid #000', padding: '4px 6px',
    fontSize: '10px', fontWeight: 'bold', backgroundColor: '#b0b0b0',
    textAlign: 'center', verticalAlign: 'middle',
  }}>
    {children}
  </td>
)

// Celda editable
const ED = ({ children, colSpan, rowSpan, center, bold, style = {}, className = '' }) => (
  <td colSpan={colSpan} rowSpan={rowSpan}
    contentEditable suppressContentEditableWarning
    className={`editable-cell ${className}`}
    style={{
      border: '1px solid #000', padding: '4px 6px',
      fontSize: '10px', fontWeight: bold ? 'bold' : 'normal',
      textAlign: center ? 'center' : 'left',
      verticalAlign: 'middle', outline: 'none',
      lineHeight: 1.4, cursor: 'text', ...style,
    }}
  >
    {children}
  </td>
)

const FILAS = 22

export default function FormatoCapacitacionImpresionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const logoRef = useRef(null)

  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [logoSrc, setLogoSrc]     = useState(null)
  const [tipoMarcado, setTipo]    = useState('capacitacion')

  useEffect(() => {
    api.get(`/capacitaciones/${id}/formato-rm050`)
      .then(r => {
        setData(r.data)
        setTipo(r.data.capacitacion.tipo || 'capacitacion')
        if (r.data.empresa.logo_url) setLogoSrc(r.data.empresa.logo_url)
      })
      .catch(() => setError('No se pudo cargar la capacitación'))
      .finally(() => setLoading(false))
  }, [id])

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setLogoSrc(ev.target.result)
    reader.readAsDataURL(file)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-slate-400">
      <Loader2 size={24} className="animate-spin" /> Cargando formato...
    </div>
  )
  if (error) return <div className="p-8 text-center text-red-400">{error}</div>

  const { capacitacion: cap, empresa } = data
  const asistentes = cap.asistentes || []

  const filas = Array.from({ length: Math.max(FILAS, asistentes.length + 3) }, (_, i) => {
    const a = asistentes[i]
    return {
      num: i + 1,
      dni: a?.personal?.dni || '',
      nombre: a ? `${a.personal?.apellidos || ''} ${a.personal?.nombres ? ', ' + a.personal.nombres : ''}`.trim().replace(/^,\s*/, '') : '',
      cargo: a?.personal?.cargo?.nombre || '',
      area: a?.personal?.area?.nombre || '',
      obs: a?.observaciones || '',
    }
  })

  const ROW_H = '28px'

  return (
    <>
      {/* ── BARRA SUPERIOR (solo pantalla) ────────────────────────── */}
      <div className="no-print flex items-center gap-3 mb-5 flex-wrap">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
          <ArrowLeft size={16} /> Volver
        </button>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-800 px-3 py-1.5 rounded-lg">
          <Info size={13} className="text-blue-400" />
          Haz clic en cualquier celda para editar antes de imprimir
        </div>
        <div className="flex-1" />
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-lg"
        >
          <Printer size={15} /> Imprimir / Guardar PDF
        </button>
      </div>

      {/* ── FORMULARIO RM-050 ─────────────────────────────────────── */}
      <div id="formato-rm050" style={{
        fontFamily: 'Arial, sans-serif',
        maxWidth: '794px',
        margin: '0 auto',
        backgroundColor: '#fff',
        color: '#000',
        padding: '6px',
      }}>

        {/* ENCABEZADO */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '90px' }} />
            <col />
            <col style={{ width: '120px' }} />
          </colgroup>
          <tbody>
            <tr>
              {/* Logo (clickeable para cambiar) */}
              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', verticalAlign: 'middle', cursor: 'pointer' }}
                onClick={() => logoRef.current?.click()}
                title="Clic para cambiar logo"
              >
                {logoSrc
                  ? <img src={logoSrc} alt="logo" style={{ maxHeight: '45px', maxWidth: '80px', objectFit: 'contain' }} />
                  : <div style={{ fontSize: '9px', color: '#888', border: '1px dashed #ccc', padding: '8px 4px' }}>
                      <Upload size={14} style={{ margin: '0 auto 2px' }} /><br />Logo
                    </div>
                }
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </td>
              {/* Título */}
              <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '11.5px', verticalAlign: 'middle', letterSpacing: '0.2px' }}>
                REGISTRO DE INDUCCIÓN, CAPACITACIÓN, ENTRENAMIENTO Y SIMULACROS DE EMERGENCIA
              </td>
              {/* Código */}
              <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '10px', fontWeight: 'bold', verticalAlign: 'middle' }}>
                RM 050-2013-TR
              </td>
            </tr>
          </tbody>
        </table>

        {/* DATOS DEL EMPLEADOR */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '28%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '27%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '13%' }} />
          </colgroup>
          <tbody>
            <tr><SH colSpan={5}>DATOS DEL EMPLEADOR:</SH></tr>
            <tr>
              <LB center>Razón Social</LB>
              <LB center>RUC</LB>
              <LB center>Domicilio</LB>
              <LB center>Actividad Económica</LB>
              <LB center>Nº Trabajadores</LB>
            </tr>
            <tr style={{ height: ROW_H }}>
              <ED bold>{empresa.razon_social}</ED>
              <ED center>{empresa.ruc}</ED>
              <ED>{empresa.direccion}</ED>
              <ED center>{empresa.actividad}</ED>
              <ED center bold>{empresa.nro_trabajadores}</ED>
            </tr>
          </tbody>
        </table>

        {/* DATOS DEL CENTRO DE TRABAJO */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '22%' }} />
            <col style={{ width: '32%' }} />
            <col style={{ width: '28%' }} />
            <col style={{ width: '18%' }} />
          </colgroup>
          <tbody>
            <tr><SH colSpan={4}>DATOS DEL CENTRO DE TRABAJO:</SH></tr>
            <tr>
              <LB center>Centro de trabajo:</LB>
              <LB center>Domicilio:</LB>
              <LB center>Responsable centro de trabajo:</LB>
              <LB center>Nº Trabajadores</LB>
            </tr>
            <tr style={{ height: ROW_H }}>
              <ED>{cap.area?.nombre || ''}</ED>
              <ED>{empresa.direccion}</ED>
              <ED bold>{empresa.representante}</ED>
              <ED center bold>{empresa.nro_trabajadores}</ED>
            </tr>
          </tbody>
        </table>

        {/* MARCAR (X) */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <tbody>
            <tr><SH colSpan={5}>MARCAR (X)</SH></tr>
            <tr>
              {TIPOS.map(t => (
                <td key={t.key} style={{
                  border: '1px solid #000', padding: '3px 4px',
                  fontSize: '10px', fontWeight: 'bold',
                  textAlign: 'center', verticalAlign: 'middle', width: '20%',
                  backgroundColor: tipoMarcado === t.key ? '#FFF59D' : '#e8e8e8',
                  cursor: 'pointer',
                }} onClick={() => setTipo(t.key)}>
                  {t.label}
                </td>
              ))}
            </tr>
            <tr>
              {TIPOS.map(t => (
                <td key={t.key} style={{
                  border: '1px solid #000', padding: '3px',
                  textAlign: 'center', verticalAlign: 'middle', height: '22px',
                  fontSize: '14px', fontWeight: 'bold',
                  backgroundColor: tipoMarcado === t.key ? '#FFFDE7' : '#fff',
                  cursor: 'pointer',
                }} onClick={() => setTipo(t.key)}>
                  {tipoMarcado === t.key ? 'X' : ''}
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        {/* TEMA / HORARIOS / CAPACITADOR */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '115px' }} />
            <col />
            <col style={{ width: '60px' }} />
            <col style={{ width: '130px' }} />
          </colgroup>
          <tbody>
            <tr><SH colSpan={4}>TEMA / HORARIOS / CAPACITADOR</SH></tr>
            <tr style={{ height: ROW_H }}>
              <LB>Tema:</LB>
              <ED bold style={{ fontSize: '11px' }} colSpan={2}>{cap.titulo}</ED>
              <td style={{ border: '1px solid #000', padding: '3px 6px', fontSize: '9px', verticalAlign: 'middle' }}>
                <span style={{ fontWeight: 'bold' }}>Fecha: </span>
                <span contentEditable suppressContentEditableWarning style={{ outline: 'none', fontWeight: 'bold' }}>
                  {fmtFecha(cap.fecha_ejecutada || cap.fecha_programada)}
                </span>
              </td>
            </tr>
            <tr style={{ height: ROW_H }}>
              <LB>Nombre del Capacitador:</LB>
              <ED bold colSpan={2}>{cap.expositor || ''}</ED>
              <LB>Firma:</LB>
            </tr>
            {/* Fila Horas: tabla anidada para 5 celdas dentro de 4 columnas */}
            <tr>
              <td colSpan={4} style={{ padding: 0, border: 'none' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '115px' }} />
                    <col />
                    <col style={{ width: '115px' }} />
                    <col />
                    <col style={{ width: '140px' }} />
                  </colgroup>
                  <tbody>
                    <tr style={{ height: ROW_H }}>
                      <LB>Hora de Inicio:</LB>
                      <ED className="editable-cell"></ED>
                      <LB>Hora de Término:</LB>
                      <ED className="editable-cell"></ED>
                      <td style={{ border: '1px solid #000', padding: '3px 6px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '9px', fontWeight: 'bold', flexShrink: 0, lineHeight: 1.3 }}>Total H/H<br />Capacitación</span>
                          <span style={{ fontSize: '12px', fontWeight: 'bold' }}
                            contentEditable suppressContentEditableWarning style={{ outline: 'none', fontSize: '12px', fontWeight: 'bold' }}>
                            {cap.duracion_horas ?? ''}
                          </span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ASISTENTES */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '28px' }} />
            <col style={{ width: '70px' }} />
            <col style={{ width: '195px' }} />
            <col style={{ width: '110px' }} />
            <col style={{ width: '88px' }} />
            <col style={{ width: '110px' }} />
            <col style={{ width: '85px' }} />
          </colgroup>
          <tbody>
            <tr><SH colSpan={7}>ASISTENTES</SH></tr>
            <tr>
              <LB center style={{ fontSize: '9px' }}>N°</LB>
              <LB center style={{ fontSize: '9px' }}>DNI</LB>
              <LB center style={{ fontSize: '9px' }}>APELLIDOS y NOMBRES</LB>
              <LB center style={{ fontSize: '9px' }}>CARGO</LB>
              <LB center style={{ fontSize: '9px' }}>ÁREA</LB>
              <LB center style={{ fontSize: '9px' }}>FIRMA</LB>
              <LB center style={{ fontSize: '9px' }}>OBSERVACIONES</LB>
            </tr>
            {filas.map((f) => (
              <tr key={f.num} style={{ height: '26px' }}>
                <td style={{ border: '1px solid #000', padding: '2px 3px', textAlign: 'center', fontSize: '10px', fontWeight: 'bold', verticalAlign: 'middle', backgroundColor: '#f0f0f0' }}>
                  {f.num}
                </td>
                <ED center>{f.dni}</ED>
                <ED bold>{f.nombre}</ED>
                <ED style={{ fontSize: '9px' }}>{f.cargo}</ED>
                <ED style={{ fontSize: '9px' }}>{f.area}</ED>
                <ED></ED>
                <ED style={{ fontSize: '9px' }}>{f.obs}</ED>
              </tr>
            ))}
          </tbody>
        </table>

        {/* RESPONSABLE DEL REGISTRO */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '140px' }} />
            <col />
            <col style={{ width: '130px' }} />
          </colgroup>
          <tbody>
            <tr><SH colSpan={3}>RESPONSABLE DEL REGISTRO</SH></tr>
            <tr style={{ height: ROW_H }}>
              <LB>Nombres y Apellidos :</LB>
              <ED bold>{empresa.representante || ''}</ED>
              <LB>Firma</LB>
            </tr>
            <tr style={{ height: ROW_H }}>
              <LB>Cargo:</LB>
              <ED></ED>
              <td style={{ border: '1px solid #000', padding: '3px 6px', fontSize: '9px', verticalAlign: 'middle' }}>
                <span style={{ fontWeight: 'bold' }}>Fecha: </span>
                <span contentEditable suppressContentEditableWarning style={{ outline: 'none' }}>
                  {fmtFecha(cap.fecha_ejecutada || cap.fecha_programada)}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* PIE */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '100px' }} />
            <col />
          </colgroup>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: '3px 6px', fontSize: '9px', fontWeight: 'bold', verticalAlign: 'middle' }}>
                A600-010-04
              </td>
              <td style={{ border: '1px solid #000', padding: '3px 6px', fontSize: '9px', fontStyle: 'italic', textAlign: 'center', verticalAlign: 'middle' }}>
                * La firma de este acta es conformidad y acuerdo, será sancionado el personal que no ejecute lo Capacitado.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* CSS global */}
      <style>{`
        .editable-cell:hover {
          background-color: #f0f7ff !important;
          box-shadow: inset 0 0 0 1px #3b82f6;
        }
        .editable-cell:focus {
          background-color: #eff6ff !important;
          box-shadow: inset 0 0 0 2px #2563eb;
        }
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          .no-print { display: none !important; }
          body > * { visibility: hidden; }
          #formato-rm050, #formato-rm050 * { visibility: visible; }
          #formato-rm050 {
            position: fixed;
            top: 0; left: 0;
            width: 100%;
            padding: 0; margin: 0;
            max-width: 100%;
            background: white;
          }
          .editable-cell:hover,
          .editable-cell:focus {
            background-color: transparent !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </>
  )
}
