import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, AlertTriangle, ShieldCheck, CheckCircle } from 'lucide-react'
import api from '../../services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const RESULTADO = {
  apto:                  { label:'APTO',     cls:'text-emerald-600 border-emerald-400', bg:'bg-emerald-50', icon: CheckCircle },
  apto_con_restricciones:{ label:'APTO CON RESTRICCIONES', cls:'text-amber-600 border-amber-400', bg:'bg-amber-50', icon: ShieldCheck },
  no_apto:               { label:'NO APTO',  cls:'text-red-600 border-red-400', bg:'bg-red-50', icon: AlertTriangle },
}
const TIPO_LABEL = {
  pre_ocupacional:'Pre-ocupacional', periodico:'Periódico',
  retiro:'Retiro', por_cambio_ocupacional:'Cambio de puesto',
}

export default function CertificadoAptitudPage() {
  const navigate = useNavigate()
  const { personalId } = useParams()
  const printRef = useRef(null)
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => { cargar() }, [personalId])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data: d } = await api.get(`/salud/certificado/${personalId}`)
      setData(d)
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el certificado')
    } finally { setLoading(false) }
  }

  const imprimir = () => window.print()

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" /></div>
  if (error)   return (
    <div className="text-center py-16">
      <AlertTriangle size={32} className="mx-auto mb-3 text-amber-400" />
      <p className="text-gray-700 font-medium">{error}</p>
      <button onClick={() => navigate(-1)} className="mt-4 btn-back"><ArrowLeft size={14} /> Volver</button>
    </div>
  )

  const { personal, empresa, emo, restricciones } = data || {}
  const r = RESULTADO[emo?.resultado] || RESULTADO.apto
  const RIcon = r.icon

  return (
    <div className="space-y-4">
      {/* Controles (no se imprimen) */}
      <div className="flex items-center justify-between print:hidden">
        <button onClick={() => navigate(-1)} className="btn-back"><ArrowLeft size={14} /> Volver</button>
        <button onClick={imprimir}
          className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Printer size={15} /> Imprimir certificado
        </button>
      </div>

      {/* Certificado imprimible */}
      <div ref={printRef} className="bg-white border-2 border-gray-300 rounded-xl max-w-2xl mx-auto p-8 print:border-0 print:rounded-none print:shadow-none print:max-w-none">

        {/* Encabezado */}
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
          <p className="text-xs font-semibold text-gray-500 tracking-widest uppercase">República del Perú</p>
          <h1 className="text-xl font-black text-gray-900 mt-1">CERTIFICADO DE APTITUD MÉDICO OCUPACIONAL</h1>
          <p className="text-xs text-gray-500 mt-1">Ley N° 29783 · DS 005-2012-TR · RM 312-2011-MINSA</p>
          {empresa && (
            <p className="text-sm font-semibold text-gray-700 mt-2">
              {empresa.razon_social || empresa.nombre}
              {empresa.ruc && <span className="text-gray-400 font-normal"> · RUC {empresa.ruc}</span>}
            </p>
          )}
        </div>

        {/* Resultado — destacado */}
        {emo && (
          <div className={`flex items-center justify-center gap-3 p-5 rounded-xl border-2 mb-6 ${r.cls} ${r.bg}`}>
            <RIcon size={28} />
            <div className="text-center">
              <p className="text-3xl font-black tracking-wider">{r.label}</p>
              <p className="text-sm font-medium mt-0.5 opacity-75">Resultado del examen médico ocupacional</p>
            </div>
          </div>
        )}

        {/* Datos del trabajador */}
        <div className="mb-5">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 border-b border-gray-200 pb-1">Datos del Trabajador</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label:'Apellidos y Nombres', value:`${personal?.apellidos}, ${personal?.nombres}`, full: true },
              { label:'DNI',        value: personal?.dni },
              { label:'Cargo',      value: personal?.cargo?.nombre || '—' },
              { label:'Área',       value: personal?.area?.nombre || '—' },
              { label:'Sede',       value: personal?.sede?.nombre || '—' },
              { label:'Tipo contrato', value: personal?.tipo_contrato || '—' },
            ].map(({ label, value, full }) => (
              <div key={label} className={full ? 'col-span-2' : ''}>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="font-semibold text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Datos del examen */}
        {emo && (
          <div className="mb-5">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 border-b border-gray-200 pb-1">Datos del Examen</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label:'Tipo de examen',   value: TIPO_LABEL[emo.tipo] || emo.tipo },
                { label:'Fecha de examen',  value: emo.fecha_examen ? format(new Date(emo.fecha_examen), "d 'de' MMMM 'de' yyyy", { locale: es }) : '—' },
                { label:'Vigencia hasta',   value: emo.fecha_vencimiento ? format(new Date(emo.fecha_vencimiento), "d 'de' MMMM 'de' yyyy", { locale: es }) : 'Sin fecha de vencimiento' },
                { label:'Días restantes',   value: emo.dias_para_vencer != null ? (emo.dias_para_vencer >= 0 ? `${emo.dias_para_vencer} días` : 'VENCIDO') : '—' },
                { label:'Médico evaluador', value: emo.medico || '—' },
                { label:'Centro médico',    value: emo.clinica || '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="font-semibold text-gray-800">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Restricciones */}
        {restricciones?.length > 0 && (
          <div className="mb-5">
            <h2 className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-3 border-b border-amber-200 pb-1">Restricciones Médicas</h2>
            <div className="space-y-2">
              {restricciones.map((r, i) => (
                <div key={r.id || i} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <span className="text-amber-600 text-xs font-bold mt-0.5">{i + 1}.</span>
                  <div>
                    <p className="text-sm text-gray-800">{r.descripcion}</p>
                    {r.tipo_restriccion && <p className="text-xs text-gray-500">{r.tipo_restriccion}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Indicadores biométricos */}
        {emo && (emo.peso || emo.presion_sistolica || emo.glucosa || emo.hemoglobina) && (
          <div className="mb-5">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 border-b border-gray-200 pb-1">Indicadores Biométricos</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label:'Peso/Talla', value: emo.peso && emo.talla ? `${emo.peso}kg / ${emo.talla}m` : null },
                { label:'IMC', value: emo.imc_calculado ? `${emo.imc_calculado} (${emo.interpretacion_imc})` : null },
                { label:'Presión arterial', value: emo.presion_sistolica ? `${emo.presion_sistolica}/${emo.presion_diastolica} mmHg` : null },
                { label:'Glucosa', value: emo.glucosa ? `${emo.glucosa} mg/dL` : null },
                { label:'Hemoglobina', value: emo.hemoglobina ? `${emo.hemoglobina} g/dL` : null },
                { label:'Frec. cardíaca', value: emo.frecuencia_cardiaca ? `${emo.frecuencia_cardiaca} lpm` : null },
              ].filter(i => i.value).map(({ label, value }) => (
                <div key={label} className="border border-gray-200 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-semibold text-gray-700">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Firmas */}
        <div className="mt-8 pt-4 border-t border-gray-200 grid grid-cols-2 gap-8 text-center text-xs text-gray-500">
          <div>
            <div className="h-12 border-b border-gray-400 mb-2" />
            <p className="font-semibold text-gray-700">{emo?.medico || 'Médico ocupacional'}</p>
            <p>Médico Evaluador</p>
          </div>
          <div>
            <div className="h-12 border-b border-gray-400 mb-2" />
            <p className="font-semibold text-gray-700">Responsable SST</p>
            <p>Seguridad y Salud en el Trabajo</p>
          </div>
        </div>

        {/* Pie */}
        <div className="mt-6 pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
          <p>Generado: {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
          <p>Documento válido sólo con sello y firma del médico evaluador · Ley 29783</p>
        </div>
      </div>
    </div>
  )
}
