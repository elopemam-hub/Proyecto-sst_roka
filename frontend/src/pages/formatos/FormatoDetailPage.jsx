import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Edit, CheckCircle, XCircle, Printer, ExternalLink } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const ESTADOS_CONFIG = {
  borrador: { cls: 'bg-slate-700 text-slate-300', label: 'Borrador' },
  vigente:  { cls: 'bg-green-900/50 text-green-400', label: 'Vigente' },
  anulado:  { cls: 'bg-red-900/50 text-red-400',   label: 'Anulado' },
}

const ORIGEN_RUTAS = {
  accidente:              '/accidentes',
  inspeccion:             '/inspecciones',
  auditoria:              '/auditorias',
  capacitacion_simulacro: '/capacitaciones',
  estadisticas:           null,
}

export default function FormatoDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [formato, setFormato] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accionando, setAccionando] = useState(false)

  useEffect(() => { cargar() }, [id])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/formatos/${id}`)
      setFormato(data)
    } catch {
      toast.error('Registro no encontrado')
      navigate('/formatos')
    } finally {
      setLoading(false)
    }
  }

  const handleAprobar = async () => {
    if (!confirm('¿Aprobar este registro? Cambiará a estado Vigente.')) return
    setAccionando(true)
    try {
      const { data } = await api.post(`/formatos/${id}/aprobar`)
      setFormato(data)
      toast.success('Registro aprobado y marcado como vigente')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al aprobar')
    } finally {
      setAccionando(false)
    }
  }

  const handleAnular = async () => {
    if (!confirm('¿Anular este registro? Esta acción no se puede deshacer.')) return
    setAccionando(true)
    try {
      const { data } = await api.post(`/formatos/${id}/anular`)
      setFormato(data)
      toast.success('Registro anulado')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al anular')
    } finally {
      setAccionando(false)
    }
  }

  const handleImprimir = () => window.print()

  if (loading) return <div className="p-12 text-center text-slate-400">Cargando...</div>
  if (!formato) return null

  const estadoCfg = ESTADOS_CONFIG[formato.estado] || {}
  const origenRuta = formato.origen_tipo ? ORIGEN_RUTAS[formato.origen_tipo] : null
  const datos = formato.datos_json

  return (
    <div className="max-w-4xl mx-auto space-y-6 print:text-black print:bg-white">
      {/* Header */}
      <div className="flex items-start justify-between print:hidden">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/formatos')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">{formato.correlativo}</h1>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${estadoCfg.cls}`}>
                {estadoCfg.label}
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-0.5">{formato.tipo_label}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleImprimir} className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-700 rounded-lg text-sm">
            <Printer size={15} /> Imprimir
          </button>
          {formato.estado === 'borrador' && (
            <>
              <button
                onClick={() => navigate(`/formatos/${id}/editar`)}
                className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-700 rounded-lg text-sm"
              >
                <Edit size={15} /> Editar
              </button>
              <button
                onClick={handleAprobar}
                disabled={accionando}
                className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <CheckCircle size={15} /> Aprobar
              </button>
            </>
          )}
          {formato.estado === 'vigente' && (
            <button
              onClick={handleAnular}
              disabled={accionando}
              className="flex items-center gap-2 px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              <XCircle size={15} /> Anular
            </button>
          )}
        </div>
      </div>

      {/* Título impresión */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold">{formato.tipo_label}</h1>
        <p className="text-sm mt-1">Correlativo: {formato.correlativo} | Estado: {formato.estado} | Periodo: {formato.periodo_anio}{formato.periodo_mes ? `/${String(formato.periodo_mes).padStart(2,'0')}` : ''}</p>
      </div>

      {/* Metadata */}
      <div className="bg-slate-800 rounded-lg p-5 print:border print:border-gray-300 print:bg-white">
        <h2 className="text-sm font-semibold text-slate-300 mb-4 print:text-gray-700">Información del Registro</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-slate-500 text-xs">Correlativo</div>
            <div className="text-white font-mono print:text-gray-900">{formato.correlativo}</div>
          </div>
          <div>
            <div className="text-slate-500 text-xs">Periodo</div>
            <div className="text-white print:text-gray-900">
              {formato.periodo_anio}{formato.periodo_mes ? `/${String(formato.periodo_mes).padStart(2,'0')}` : ''}
            </div>
          </div>
          <div>
            <div className="text-slate-500 text-xs">Estado</div>
            <div className="text-white print:text-gray-900 capitalize">{formato.estado}</div>
          </div>
          <div>
            <div className="text-slate-500 text-xs">Creado por</div>
            <div className="text-white print:text-gray-900">{formato.creado_por?.nombres} {formato.creado_por?.apellidos}</div>
          </div>
        </div>
        {formato.titulo && (
          <div className="mt-4">
            <div className="text-slate-500 text-xs">Título</div>
            <div className="text-white print:text-gray-900">{formato.titulo}</div>
          </div>
        )}
        {formato.observaciones && (
          <div className="mt-4">
            <div className="text-slate-500 text-xs">Observaciones</div>
            <div className="text-slate-300 print:text-gray-700">{formato.observaciones}</div>
          </div>
        )}
        {origenRuta && formato.origen_tipo && (
          <div className="mt-4 print:hidden">
            <div className="text-slate-500 text-xs mb-1">Generado desde</div>
            <Link
              to={origenRuta}
              className="inline-flex items-center gap-1 text-roka-400 hover:text-roka-300 text-sm"
            >
              <ExternalLink size={13} />
              Ver módulo de origen ({formato.origen_tipo})
            </Link>
          </div>
        )}
      </div>

      {/* Datos del registro */}
      {datos && (
        <div className="bg-slate-800 rounded-lg p-5 print:border print:border-gray-300 print:bg-white">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 print:text-gray-700">Datos del Registro</h2>
          <DatosRegistro tipo={formato.tipo_registro} datos={datos} />
        </div>
      )}
    </div>
  )
}

function DatosRegistro({ tipo, datos }) {
  if (!datos) return <p className="text-slate-400 text-sm">Sin datos registrados.</p>

  if (datos.requiere_llenado_manual) {
    return (
      <div className="text-amber-400 text-sm">
        Este tipo de registro requiere llenado manual. Edita el registro para completar los datos.
      </div>
    )
  }

  // Registros con listado de accidentes/incidentes
  if (datos.registros && Array.isArray(datos.registros)) {
    return (
      <div className="space-y-3">
        <div className="flex gap-4 text-sm text-slate-400">
          <span>Total: <strong className="text-white">{datos.total}</strong></span>
          {datos.generado_en && <span>Generado: {new Date(datos.generado_en).toLocaleString('es-PE')}</span>}
        </div>
        {datos.registros.length === 0 ? (
          <p className="text-slate-400 text-sm">No hay registros para el periodo seleccionado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 print:bg-gray-100">
                  {Object.keys(datos.registros[0]).map(k => (
                    <th key={k} className="px-3 py-2 text-left text-slate-400 print:text-gray-600 border border-slate-700 print:border-gray-300 capitalize">
                      {k.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.registros.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-700/50 print:hover:bg-transparent">
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="px-3 py-2 text-slate-300 print:text-gray-800 border border-slate-700 print:border-gray-300">
                        {v ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // reg_09: capacitaciones + simulacros
  if (datos.capacitaciones && datos.simulacros) {
    return (
      <div className="space-y-5">
        <Seccion titulo="Capacitaciones" datos={datos.capacitaciones} />
        <Seccion titulo="Simulacros" datos={datos.simulacros} campo="ejecutados" />
      </div>
    )
  }

  // reg_10: estadísticas
  if (datos.indicadores) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCaja label="Accidentes totales" valor={datos.accidentes?.total} />
          <KpiCaja label="Mortales" valor={datos.accidentes?.mortales} color="text-red-400" />
          <KpiCaja label="Días perdidos" valor={datos.accidentes?.dias_perdidos} />
          <KpiCaja label="IF" valor={datos.indicadores?.IF} suffix="×10⁶ HHT" />
          <KpiCaja label="IG" valor={datos.indicadores?.IG} suffix="×10⁶ HHT" />
          <KpiCaja label="ISAL" valor={datos.indicadores?.ISAL} />
          <KpiCaja label="TA" valor={datos.indicadores?.TA} />
        </div>
        <p className="text-xs text-slate-500">{datos.nota_hht}</p>
      </div>
    )
  }

  // Fallback: JSON crudo
  return (
    <pre className="text-xs text-slate-400 bg-slate-900 p-4 rounded overflow-auto max-h-96">
      {JSON.stringify(datos, null, 2)}
    </pre>
  )
}

function Seccion({ titulo, datos, campo = 'ejecutadas' }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-300 mb-2 print:text-gray-700">{titulo}</h3>
      <div className="flex gap-4 text-sm text-slate-400 mb-2">
        <span>Total: <strong className="text-white">{datos.total}</strong></span>
        <span>{campo.charAt(0).toUpperCase() + campo.slice(1)}: <strong className="text-green-400">{datos[campo]}</strong></span>
      </div>
      {datos.registros?.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 print:bg-gray-100">
                {Object.keys(datos.registros[0]).map(k => (
                  <th key={k} className="px-3 py-2 text-left text-slate-400 border border-slate-700 capitalize">
                    {k.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datos.registros.map((row, i) => (
                <tr key={i} className="hover:bg-slate-700/50">
                  {Object.values(row).map((v, j) => (
                    <td key={j} className="px-3 py-2 text-slate-300 border border-slate-700">{v ?? '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function KpiCaja({ label, valor, color = 'text-white', suffix = '' }) {
  return (
    <div className="bg-slate-900 print:bg-gray-100 rounded p-3">
      <div className={`text-xl font-bold ${color}`}>{valor ?? 0} <span className="text-xs text-slate-500">{suffix}</span></div>
      <div className="text-xs text-slate-500 print:text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}
