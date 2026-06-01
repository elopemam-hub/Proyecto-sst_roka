import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, HeartPulse, FileText, AlertTriangle, Activity,
  User, ChevronRight, ChevronDown,
} from 'lucide-react'
import api from '../../services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const RESULTADO_BADGE = {
  apto:                  'bg-emerald-50 text-emerald-700 border-emerald-200',
  apto_con_restricciones:'bg-amber-50   text-amber-700   border-amber-200',
  no_apto:               'bg-red-50     text-red-700     border-red-200',
}
const RESULTADO_LABEL = { apto:'APTO', apto_con_restricciones:'APTO C/R', no_apto:'NO APTO' }
const TIPO_LABEL = {
  pre_ocupacional:'Pre-ocupacional', periodico:'Periódico anual',
  retiro:'Retiro', por_cambio_ocupacional:'Cambio de puesto',
}
const ATENCION_TIPO = {
  primeros_auxilios:'Primeros Auxilios', consulta:'Consulta', emergencia:'Emergencia', seguimiento:'Seguimiento',
}

function EmoCard({ emo }) {
  const [abierto, setAbierto] = useState(false)
  const b = RESULTADO_BADGE[emo.resultado] || RESULTADO_BADGE.apto

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setAbierto(!abierto)}
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-white hover:bg-gray-50 transition-colors text-left">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${b}`}>
          {RESULTADO_LABEL[emo.resultado]}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">{TIPO_LABEL[emo.tipo] || emo.tipo}</p>
          <p className="text-xs text-gray-400">
            {emo.fecha_examen ? format(new Date(emo.fecha_examen), 'd MMMM yyyy', { locale: es }) : '—'}
            {emo.clinica ? ` · ${emo.clinica}` : ''}
          </p>
        </div>
        {emo.fecha_vencimiento && (
          <span className={`text-xs flex-shrink-0 ${emo.esta_vencida ? 'text-red-500' : 'text-gray-400'}`}>
            Vence: {format(new Date(emo.fecha_vencimiento), 'd MMM yyyy', { locale: es })}
          </span>
        )}
        <ChevronDown size={14} className={`text-gray-400 transition-transform flex-shrink-0 ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {[
              { label:'Médico',    value: emo.medico || '—' },
              { label:'Clínica',   value: emo.clinica || '—' },
              { label:'Vencimiento',value: emo.fecha_vencimiento ? format(new Date(emo.fecha_vencimiento), 'd MMM yyyy', { locale: es }) : '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="font-medium text-gray-700">{value}</p>
              </div>
            ))}
          </div>
          {/* Indicadores biométricos */}
          {(emo.peso || emo.presion_sistolica || emo.glucosa || emo.hemoglobina) && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Indicadores biométricos</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label:'Peso', value: emo.peso ? `${emo.peso} kg` : null },
                  { label:'Talla', value: emo.talla ? `${emo.talla} m` : null },
                  { label:'IMC', value: emo.imc_calculado ? `${emo.imc_calculado} (${emo.interpretacion_imc || ''})` : null },
                  { label:'Presión', value: emo.presion_sistolica ? `${emo.presion_sistolica}/${emo.presion_diastolica} mmHg` : null },
                  { label:'Glucosa', value: emo.glucosa ? `${emo.glucosa} mg/dL` : null },
                  { label:'Hemoglobina', value: emo.hemoglobina ? `${emo.hemoglobina} g/dL` : null },
                  { label:'F. cardíaca', value: emo.frecuencia_cardiaca ? `${emo.frecuencia_cardiaca} lpm` : null },
                  { label:'Agudeza OD/OI', value: emo.agudeza_od ? `${emo.agudeza_od} / ${emo.agudeza_oi || '—'}` : null },
                ].filter(i => i.value).map(({ label, value }) => (
                  <div key={label} className="bg-white rounded-lg border border-gray-200 px-3 py-2">
                    <p className="text-[10px] text-gray-400">{label}</p>
                    <p className="text-xs font-semibold text-gray-700 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {emo.restricciones && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Restricciones</p>
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{emo.restricciones}</p>
            </div>
          )}
          {emo.observaciones && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Observaciones</p>
              <p className="text-sm text-gray-600">{emo.observaciones}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function MiFichaMedicaPage() {
  const navigate = useNavigate()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const [tab, setTab]       = useState('emos')

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data: d } = await api.get('/salud/mi-ficha')
      setData(d)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar ficha médica')
    } finally { setLoading(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" /></div>
  if (error)   return (
    <div className="max-w-lg mx-auto text-center py-16">
      <AlertTriangle size={32} className="mx-auto mb-3 text-amber-400" />
      <p className="text-gray-700 font-medium mb-1">{error}</p>
      <button onClick={() => navigate('/salud/mi-panel')} className="mt-4 btn-back"><ArrowLeft size={14} /> Volver</button>
    </div>
  )

  const { personal, emos, restricciones, atenciones } = data || {}

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/salud/mi-panel')} className="btn-back">
            <ArrowLeft size={14} /> Mi panel
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mi ficha médica</h1>
            <p className="text-gray-500 text-sm mt-0.5">Historial médico ocupacional completo</p>
          </div>
        </div>
        {personal?.id && (
          <button onClick={() => navigate(`/salud/certificado/${personal.id}`)}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <FileText size={14} /> Certificado
          </button>
        )}
      </div>

      {/* Datos del trabajador */}
      {personal && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-roka-500/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-black text-roka-600">
                {personal.nombres?.[0]}{personal.apellidos?.[0]}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">{personal.nombres} {personal.apellidos}</h2>
              <p className="text-sm text-gray-500">DNI: {personal.dni} · {personal.cargo?.nombre} · {personal.area?.nombre}</p>
            </div>
            <div className="text-right text-xs text-gray-400">
              {personal.fecha_ingreso && <p>Ingreso: {format(new Date(personal.fecha_ingreso), 'd MMM yyyy', { locale: es })}</p>}
              {personal.grupo_sanguineo && <p className="font-semibold text-red-500 text-sm mt-1">Tipo: {personal.grupo_sanguineo}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Restricciones activas */}
      {restricciones?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} className="text-amber-600" />
            <h3 className="font-semibold text-amber-800 text-sm">Restricciones médicas activas</h3>
          </div>
          <div className="space-y-2">
            {restricciones.map(r => (
              <div key={r.id} className="bg-white rounded-lg border border-amber-100 px-3 py-2">
                <p className="text-sm font-medium text-gray-800">{r.descripcion}</p>
                <p className="text-xs text-gray-400">{r.tipo_restriccion}{r.area?.nombre ? ` · ${r.area.nombre}` : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key:'emos',      label:`Exámenes (${emos?.length || 0})` },
          { key:'atenciones',label:`Atenciones (${atenciones?.length || 0})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-roka-500 text-roka-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Exámenes */}
      {tab === 'emos' && (
        <div className="space-y-3">
          {!emos?.length ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200 shadow-sm">
              <HeartPulse size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin exámenes médicos registrados</p>
            </div>
          ) : emos.map(emo => <EmoCard key={emo.id} emo={emo} />)}
        </div>
      )}

      {/* Tab: Atenciones */}
      {tab === 'atenciones' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {!atenciones?.length ? (
            <div className="text-center py-12 text-gray-400 text-sm">Sin atenciones registradas</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {atenciones.map(a => (
                <div key={a.id} className="px-5 py-3.5 flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold
                    ${a.tipo === 'emergencia' ? 'bg-red-50 text-red-600'
                    : a.tipo === 'consulta'   ? 'bg-blue-50 text-blue-600'
                    : 'bg-gray-100 text-gray-500'}`}>
                    {ATENCION_TIPO[a.tipo]?.[0] || 'A'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">{ATENCION_TIPO[a.tipo] || a.tipo}</span>
                      {a.baja_laboral && <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full">Baja laboral {a.dias_descanso}d</span>}
                    </div>
                    <p className="text-sm text-gray-800 mt-0.5">{a.descripcion}</p>
                    {a.tratamiento && <p className="text-xs text-gray-400 mt-0.5">{a.tratamiento}</p>}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {format(new Date(a.fecha), 'd MMM yyyy', { locale: es })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
