import { useNavigate } from 'react-router-dom'
import { Link2, ClipboardList, Search, AlertCircle, TrendingUp, ArrowRight, ChevronLeft } from 'lucide-react'

const INTEGRACIONES = [
  {
    modulo: 'ATS',
    icon: ClipboardList,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    desc: 'El Análisis de Trabajo Seguro se basa en los peligros identificados en el IPERC. Cada ATS debe referenciar los controles establecidos.',
    acciones: [
      { label: 'Ver ATS registrados', to: '/ats' },
      { label: 'Crear nuevo ATS', to: '/ats/nuevo' },
    ],
    referencia: 'RM 050-2013-TR — Registro 04',
  },
  {
    modulo: 'Inspecciones',
    icon: Search,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10 border-teal-500/20',
    desc: 'Las inspecciones verifican la efectividad de los controles implementados en el IPERC. Los hallazgos deben retroalimentar el proceso de identificación.',
    acciones: [
      { label: 'Ver inspecciones', to: '/inspecciones' },
      { label: 'Nueva inspección', to: '/inspecciones/nueva' },
    ],
    referencia: 'ISO 45001:2018 §9.1',
  },
  {
    modulo: 'Accidentes',
    icon: AlertCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    desc: 'Cuando ocurre un accidente, debe revisarse si el peligro estaba identificado en el IPERC y si los controles eran adecuados. Los accidentes generan actualización del IPERC.',
    acciones: [
      { label: 'Ver accidentes', to: '/accidentes' },
      { label: 'Registrar accidente', to: '/accidentes/nuevo' },
    ],
    referencia: 'Ley 29783 Art. 42 y 82',
  },
  {
    modulo: 'Seguimiento',
    icon: TrendingUp,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
    desc: 'El seguimiento de acciones correctivas cierra el ciclo PDCA del IPERC. Las acciones pendientes de controles se gestionan como acciones de mejora continua.',
    acciones: [
      { label: 'Ver seguimiento', to: '/seguimiento' },
    ],
    referencia: 'ISO 45001:2018 §10.2',
  },
]

const CICLO_IPERC = [
  { paso: '1', label: 'Identificar', desc: 'Identificar peligros en procesos y actividades', color: 'border-red-500 text-red-400' },
  { paso: '2', label: 'Evaluar',    desc: 'Evaluar la probabilidad e impacto del riesgo',  color: 'border-amber-500 text-amber-400' },
  { paso: '3', label: 'Controlar',  desc: 'Implementar controles en orden jerárquico',     color: 'border-teal-500 text-teal-400' },
  { paso: '4', label: 'Verificar',  desc: 'Inspeccionar y medir la efectividad',           color: 'border-blue-500 text-blue-400' },
  { paso: '5', label: 'Mejorar',    desc: 'Revisar y actualizar el IPERC periódicamente',  color: 'border-emerald-500 text-emerald-400' },
]

export default function IpercIntegracionPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => navigate('/iperc')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-200 hover:text-white bg-slate-600/80 hover:bg-slate-600 px-2.5 py-1.5 rounded-lg border border-slate-600/50 transition-colors mb-3"
        >
          <ChevronLeft size={13} /> Volver al módulo IPERC
        </button>
        <h1 className="text-2xl font-bold text-white">Integración SST</h1>
        <p className="text-slate-400 text-sm mt-1">El IPERC es el eje central del sistema de gestión SST. Conéctalo con los demás módulos.</p>
      </div>

      {/* Ciclo IPERC */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
        <p className="text-sm font-semibold text-slate-300 mb-4">Ciclo de gestión IPERC (PHVA)</p>
        <div className="flex flex-wrap gap-3">
          {CICLO_IPERC.map(({ paso, label, desc, color }) => (
            <div key={paso} className={`flex-1 min-w-32 border-l-2 pl-3 ${color}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold ${color.split(' ')[1]}`}>{paso}</span>
                <span className="text-sm font-semibold text-slate-200">{label}</span>
              </div>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Módulos integrados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {INTEGRACIONES.map(({ modulo, icon: Icon, color, bg, desc, acciones, referencia }) => (
          <div key={modulo} className={`bg-slate-800 border rounded-xl p-5 ${bg.replace('bg-', 'border-').split(' ')[0]}`}>
            <div className="flex items-start gap-3 mb-3">
              <div className={`p-2 rounded-lg ${bg}`}>
                <Icon size={18} className={color} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-200">{modulo}</p>
                <p className="text-xs text-slate-500">{referencia}</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">{desc}</p>
            <div className="flex flex-wrap gap-2">
              {acciones.map(({ label, to }) => (
                <button key={to} onClick={() => navigate(to)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors">
                  {label} <ArrowRight size={11} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Normativa */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
        <p className="text-sm font-semibold text-slate-300 mb-3">Marco normativo del IPERC</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {[
            { norma: 'Ley 29783',           desc: 'Art. 57: Evaluación de riesgos obligatoria en todos los procesos' },
            { norma: 'DS 005-2012-TR',       desc: 'Art. 82: Registro de evaluación de riesgos (Registro 05)' },
            { norma: 'RM 050-2013-TR',       desc: 'Formatos referenciales — Registro 05: IPERC' },
            { norma: 'ISO 45001:2018',        desc: '§6.1.2: Identificación de peligros y evaluación de riesgos' },
            { norma: 'SUNAFIL',              desc: 'Infracción muy grave por no contar con IPERC actualizado' },
            { norma: 'OEFA',                 desc: 'Considerado en auditorías de cumplimiento ambiental-laboral' },
          ].map(({ norma, desc }) => (
            <div key={norma} className="bg-slate-700/50 rounded-lg p-3">
              <p className="text-roka-400 font-medium mb-1">{norma}</p>
              <p className="text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
