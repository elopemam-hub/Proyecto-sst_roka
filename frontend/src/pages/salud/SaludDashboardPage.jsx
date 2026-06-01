import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  HeartPulse, Plus, AlertTriangle, CheckCircle, Clock,
  Users, ChevronRight, CalendarRange, FileText, ShieldCheck,
  Scale, ClipboardList,
} from 'lucide-react'
import api from '../../services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import LeyReferenciaModal from '../../components/salud/LeyReferenciaModal'

const RESULTADO_COLOR = {
  apto:                  'bg-emerald-50 text-emerald-700 border-emerald-200',
  apto_con_restricciones:'bg-amber-50 text-amber-700 border-amber-200',
  no_apto:               'bg-red-50 text-red-700 border-red-200',
}
const RESULTADO_LABEL = { apto:'APTO', apto_con_restricciones:'APTO C/R', no_apto:'NO APTO' }

export default function SaludDashboardPage() {
  const navigate = useNavigate()
  const user     = useSelector(s => s.auth.user)
  const [stats, setStats]     = useState(null)
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLey, setShowLey] = useState(false)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const [{ data: st }, { data: alVenc }, { data: alProx }] = await Promise.all([
        api.get('/salud/estadisticas'),
        api.get('/salud', { params: { vencidas: 1, per_page: 5 } }),
        api.get('/salud', { params: { proximas: 1, per_page: 5 } }),
      ])
      setStats(st)
      const todos = [...(alVenc.data || alVenc), ...(alProx.data || alProx)]
      const uniq = todos.filter((v, i, a) => a.findIndex(x => x.id === v.id) === i)
      setAlertas(uniq.slice(0, 8))
    } catch { } finally { setLoading(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const apto   = stats?.por_resultado?.find(r => r.resultado === 'apto')?.total || 0
  const aptoCR = stats?.por_resultado?.find(r => r.resultado === 'apto_con_restricciones')?.total || 0
  const noApto = stats?.por_resultado?.find(r => r.resultado === 'no_apto')?.total || 0

  // ── KPIs ───────────────────────────────────────────────────────
  const kpis = [
    { label:'Aptos',            value: apto,                     color:'text-emerald-600', icon: CheckCircle, bg:'bg-emerald-50' },
    { label:'Apto c/restric.',  value: aptoCR,                   color:'text-amber-600',   icon: ShieldCheck, bg:'bg-amber-50'   },
    { label:'No aptos',         value: noApto,                   color:'text-red-500',     icon: AlertTriangle,bg:'bg-red-50'   },
    { label:'Vencidos',         value: stats?.vencidas || 0,      color:'text-red-600',     icon: Clock,       bg:'bg-red-50'    },
    { label:'Próx. 30 días',    value: stats?.proximas_30d || 0,  color:'text-amber-600',   icon: Clock,       bg:'bg-amber-50'  },
    { label:'Con restricciones',value:stats?.con_restricciones||0,color:'text-purple-600',  icon: Users,       bg:'bg-purple-50' },
  ]

  // ── Accesos rápidos ────────────────────────────────────────────
  const accesos = [
    { label:'Mi panel médico',   desc:'Tu estado de salud personal',        icon: HeartPulse,   to:'/salud/mi-panel',    color:'text-roka-600',    bg:'bg-roka-50'    },
    { label:'Cronograma médico', desc:'Estado EMO por trabajador',           icon: CalendarRange, to:'/salud/cronograma',  color:'text-blue-600',   bg:'bg-blue-50'    },
    { label:'Lista de exámenes', desc:'Todos los EMOs registrados',          icon: ClipboardList, to:'/salud/lista',       color:'text-purple-600', bg:'bg-purple-50'  },
    { label:'Mi ficha médica',   desc:'Datos clínicos y antecedentes',       icon: FileText,      to:'/salud/ficha-medica',  color:'text-teal-600',   bg:'bg-teal-50'    },
    { label:'Fichas médicas',    desc:'Ver fichas de todos los trabajadores', icon: Users,         to:'/salud/fichas-medicas',color:'text-indigo-600', bg:'bg-indigo-50'  },
    { label:'Documentos',        desc:'Informes y archivos adjuntos EMO',     icon: FileText,      to:'/salud/documentos',    color:'text-rose-600',   bg:'bg-rose-50'    },
    { label:'Nuevo examen',      desc:'Registrar EMO a un trabajador',       icon: Plus,          to:'/salud/nuevo',         color:'text-emerald-600',bg:'bg-emerald-50' },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Salud / EMO</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión de salud ocupacional · Ley 29783 Arts. 49, 71-72</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowLey(true)}
            className="flex items-center gap-2 border border-blue-300 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm">
            <Scale size={14} /> Consultar Ley
          </button>
          <button onClick={() => navigate('/salud/cronograma')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <CalendarRange size={14} /> Cronograma
          </button>
          <button onClick={() => navigate('/salud/nuevo')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={14} /> Nuevo examen
          </button>
        </div>
      </div>

      {/* KPIs — 6 en una sola grilla */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map(({ label, value, color, icon: Icon, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon size={17} className={color} />
            </div>
            <div>
              <p className={`text-2xl font-bold leading-tight ${color}`}>{value}</p>
              <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cuerpo principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Alertas de vencimiento */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-500" /> Alertas de vencimiento
            </h2>
            <button onClick={() => navigate('/salud/lista')}
              className="text-xs text-roka-600 hover:text-roka-700 flex items-center gap-1">
              Ver todos <ChevronRight size={12} />
            </button>
          </div>

          {alertas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <CheckCircle size={28} className="text-emerald-400 mb-2" />
              <p className="text-sm">Sin alertas de vencimiento</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {alertas.map(emo => {
                const dias    = emo.dias_para_vencer
                const vencida = dias !== null && dias < 0
                return (
                  <div key={emo.id}
                    onClick={() => navigate(`/salud/${emo.id}`)}
                    className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${vencida ? 'bg-red-50' : 'bg-amber-50'}`}>
                      <Clock size={15} className={vencida ? 'text-red-500' : 'text-amber-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {emo.personal?.nombres} {emo.personal?.apellidos}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{emo.personal?.dni} · {emo.clinica || '—'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${RESULTADO_COLOR[emo.resultado]}`}>
                        {RESULTADO_LABEL[emo.resultado]}
                      </span>
                      <span className={`text-xs font-semibold ${vencida ? 'text-red-500' : 'text-amber-600'}`}>
                        {vencida ? `Vencido hace ${Math.abs(dias)}d` : `Vence en ${dias}d`}
                      </span>
                    </div>
                    <ChevronRight size={13} className="text-gray-300" />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Accesos rápidos */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-800">Accesos rápidos</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {accesos.map(({ label, desc, icon: Icon, to, color, bg }) => (
              <button key={to} onClick={() => navigate(to)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left">
                <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon size={16} className={color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400 truncate">{desc}</p>
                </div>
                <ChevronRight size={13} className="text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

      </div>

      {showLey && <LeyReferenciaModal onClose={() => setShowLey(false)} />}
    </div>
  )
}
