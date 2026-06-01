import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  ArrowLeft, Clock, CheckCircle, XCircle, AlertTriangle,
  Plus, ChevronRight, Activity, HeartPulse, FileText, Scale,
} from 'lucide-react'
import api from '../../services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import LeyReferenciaModal from '../../components/salud/LeyReferenciaModal'

const RESULTADO_BADGE = {
  apto:                  { label:'APTO',     cls:'text-emerald-600 bg-emerald-50 border-emerald-200', dot:'bg-emerald-500' },
  apto_con_restricciones:{ label:'APTO C/R', cls:'text-amber-600   bg-amber-50   border-amber-200',   dot:'bg-amber-500'   },
  no_apto:               { label:'NO APTO',  cls:'text-red-600     bg-red-50     border-red-200',     dot:'bg-red-500'     },
}
const TIPO_LABEL = {
  pre_ocupacional:'Examen pre-ocupacional',
  periodico:'Examen periódico anual',
  retiro:'Examen de retiro',
  por_cambio_ocupacional:'Examen por cambio de puesto',
}
const ALERTA_ESTADO = {
  al_dia:     { icon: CheckCircle, color:'text-emerald-500', bg:'bg-emerald-50',  badge:'text-emerald-700 bg-emerald-50 border-emerald-200',  label:'Al día' },
  por_vencer: { icon: Clock,       color:'text-amber-500',  bg:'bg-amber-50',   badge:'text-amber-700   bg-amber-50   border-amber-200',    label:null },
  vencido:    { icon: XCircle,     color:'text-red-500',    bg:'bg-red-50',     badge:'text-red-600     bg-red-50     border-red-200',      label:null },
  pendiente:  { icon: AlertTriangle,color:'text-gray-400',  bg:'bg-gray-50',    badge:'text-gray-600   bg-gray-100   border-gray-200',      label:'Pendiente' },
}

// ── Indicador de salud con barra ──────────────────────────────────
function IndicadorSalud({ label, value, unit, min, max, optMin, optMax, color = 'bg-roka-500' }) {
  if (value == null) return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-xs text-gray-300">Sin datos</span>
    </div>
  )
  const pct = max > min ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 50
  const enRango = value >= (optMin ?? min) && value <= (optMax ?? max)
  return (
    <div className="py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <span className={`text-sm font-bold ${enRango ? 'text-emerald-600' : 'text-amber-600'}`}>
          {value} <span className="text-xs font-normal text-gray-400">{unit}</span>
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${enRango ? 'bg-emerald-500' : 'bg-amber-400'}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function MiPanelMedicoPage() {
  const navigate = useNavigate()
  const user     = useSelector(s => s.auth.user)
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const [showLey, setShowLey] = useState(false)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data: d } = await api.get('/salud/mi-panel')
      setData(d)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar datos')
    } finally { setLoading(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="max-w-lg mx-auto text-center py-16">
      <AlertTriangle size={32} className="mx-auto mb-3 text-amber-400" />
      <p className="text-gray-700 font-medium mb-1">{error}</p>
      <p className="text-sm text-gray-400">Contacta al administrador para vincular tu usuario a un trabajador.</p>
      <button onClick={() => navigate('/salud')} className="mt-4 btn-back"><ArrowLeft size={14} /> Volver</button>
    </div>
  )

  const { stats, alertas, indicadores, historial } = data || {}
  const resultadoBadge = RESULTADO_BADGE[stats?.resultado_actual] || RESULTADO_BADGE.apto

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/salud')} className="btn-back">
            <ArrowLeft size={14} /> Salud
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mi panel</h1>
            <p className="text-gray-500 text-sm mt-0.5">Resumen de salud ocupacional · Ley 29783</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowLey(true)}
            className="flex items-center gap-2 border border-blue-300 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm">
            <Scale size={14} /> Consultar Ley ↗
          </button>
          <button onClick={() => navigate('/salud/ficha-medica')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <FileText size={14} /> Mi ficha médica
          </button>
          {user?.personal_id && (
            <button onClick={() => navigate(`/salud/certificado/${user.personal_id}`)}
              className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <FileText size={14} /> Certificado
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Estado actual — destacado */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center col-span-1">
          <p className={`text-2xl font-black ${resultadoBadge.cls.split(' ')[0]}`}>
            {resultadoBadge.label}
          </p>
          <p className="text-xs text-gray-500 mt-1">Estado actual de aptitud</p>
        </div>
        {[
          { label:'Exámenes realizados',      value: stats?.total_examenes || 0,  color:'text-blue-600' },
          { label:'Días para próximo examen', value: stats?.dias_proximo != null ? `${Math.max(0,stats.dias_proximo)}d` : '—',
            color: stats?.dias_proximo != null && stats.dias_proximo <= 30 ? 'text-amber-600' : 'text-gray-800' },
          { label:'Último examen anual',      value: stats?.ultimo_anual || '—',  color:'text-purple-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas y vencimientos */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-500" />
            <h3 className="font-semibold text-gray-800">Alertas y vencimientos</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {(alertas || []).map(a => {
              const est = ALERTA_ESTADO[a.estado] || ALERTA_ESTADO.pendiente
              const Icon = est.icon
              const badgeLabel = a.estado === 'por_vencer'
                ? `${a.dias_restantes}d`
                : a.estado === 'vencido'
                ? `${Math.abs(a.dias_restantes)}d`
                : est.label
              return (
                <div key={a.tipo}
                  onClick={() => a.emo_id && navigate(`/salud/${a.emo_id}`)}
                  className={`px-5 py-3.5 flex items-center gap-3 ${a.emo_id ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}>
                  <div className={`w-8 h-8 ${est.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon size={15} className={est.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{TIPO_LABEL[a.tipo]}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.estado === 'pendiente'
                        ? 'Pendiente programación'
                        : a.fecha_examen
                          ? `Realizado: ${format(new Date(a.fecha_examen), 'd MMM yyyy', { locale: es })}`
                          : ''}
                      {a.estado === 'al_dia' && ' · Vigente'}
                    </p>
                  </div>
                  {badgeLabel && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${est.badge}`}>
                      {badgeLabel}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Indicadores de salud */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Activity size={15} className="text-roka-500" />
            <h3 className="font-semibold text-gray-800">Indicadores de salud</h3>
            {!indicadores && <span className="text-xs text-gray-400 ml-auto">Sin examen registrado</span>}
          </div>
          <div className="px-5 py-2">
            {!indicadores ? (
              <div className="text-center py-8 text-gray-400">
                <HeartPulse size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin indicadores disponibles</p>
                <p className="text-xs mt-1">Requiere examen médico con datos biométricos</p>
              </div>
            ) : (
              <>
                <IndicadorSalud
                  label="Presión arterial"
                  value={indicadores.presion_sistolica && indicadores.presion_diastolica
                    ? `${indicadores.presion_sistolica}/${indicadores.presion_diastolica}`
                    : null}
                  unit="mmHg"
                  min={0} max={200} optMin={0} optMax={200}
                />
                <IndicadorSalud
                  label="IMC"
                  value={indicadores.imc}
                  unit={indicadores.interpretacion_imc ? `— ${indicadores.interpretacion_imc}` : ''}
                  min={15} max={40} optMin={18.5} optMax={24.9}
                />
                <IndicadorSalud
                  label="Glucosa en ayunas"
                  value={indicadores.glucosa}
                  unit="mg/dL"
                  min={50} max={200} optMin={70} optMax={100}
                />
                <IndicadorSalud
                  label="Hemoglobina"
                  value={indicadores.hemoglobina}
                  unit="g/dL"
                  min={8} max={20} optMin={12} optMax={17}
                />
                {indicadores.frecuencia_cardiaca && (
                  <IndicadorSalud
                    label="Frec. cardíaca"
                    value={indicadores.frecuencia_cardiaca}
                    unit="lpm"
                    min={40} max={150} optMin={60} optMax={100}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Historial de exámenes */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Activity size={15} className="text-roka-500" /> Historial de exámenes
          </h3>
          <button onClick={() => navigate('/salud/mi-ficha')}
            className="text-xs text-roka-600 hover:text-roka-700 flex items-center gap-1">
            Ver completo <ChevronRight size={12} />
          </button>
        </div>
        {(!historial || historial.length === 0) ? (
          <div className="text-center py-10 text-gray-400 text-sm">Sin exámenes registrados</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {historial.map(emo => {
              const b = RESULTADO_BADGE[emo.resultado] || RESULTADO_BADGE.apto
              return (
                <div key={emo.id}
                  onClick={() => navigate(`/salud/${emo.id}`)}
                  className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 cursor-pointer transition-colors">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${b.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{TIPO_LABEL[emo.tipo] || emo.tipo}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {emo.fecha_examen ? format(new Date(emo.fecha_examen), 'd MMM yyyy', { locale: es }) : '—'}
                      {emo.medico ? ` · Dr. ${emo.medico}` : ''}
                      {emo.clinica ? ` · ${emo.clinica}` : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${b.cls}`}>
                    {b.label}
                  </span>
                  <ChevronRight size={13} className="text-gray-300" />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showLey && <LeyReferenciaModal onClose={() => setShowLey(false)} />}
    </div>
  )
}
