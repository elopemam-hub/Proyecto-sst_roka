import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, ChevronLeft } from 'lucide-react'
import api from '../../services/api'

const NIVELES = [
  { key: 'intolerable', label: 'Intolerable', color: 'bg-red-500', text: 'text-red-400', range: '25–36', accion: 'Suspender actividad' },
  { key: 'importante',  label: 'Importante',  color: 'bg-orange-500', text: 'text-orange-400', range: '17–24', accion: 'Intervención urgente' },
  { key: 'moderado',    label: 'Moderado',    color: 'bg-amber-500', text: 'text-amber-400', range: '9–16', accion: 'Requiere control en plazo definido' },
  { key: 'tolerable',   label: 'Tolerable',   color: 'bg-lime-500', text: 'text-lime-400', range: '5–8', accion: 'Control actual es suficiente' },
  { key: 'trivial',     label: 'Trivial',     color: 'bg-emerald-500', text: 'text-emerald-400', range: '1–4', accion: 'No requiere acción' },
]

const SEVERIDAD_LABELS = ['', 'Lesión sin incapacidad', 'Incapacidad temporal', 'Incapacidad permanente', 'Fatalidad']

// Matriz 5×5: [probabilidad 4-16][severidad 1-4] → clasificación
function clasificar(ip, is_) {
  const nr = ip * is_
  if (nr <= 4)  return 'trivial'
  if (nr <= 8)  return 'tolerable'
  if (nr <= 16) return 'moderado'
  if (nr <= 24) return 'importante'
  return 'intolerable'
}

const CLASIF_BG = {
  trivial: 'bg-emerald-500/20', tolerable: 'bg-lime-500/20',
  moderado: 'bg-amber-500/20', importante: 'bg-orange-500/20', intolerable: 'bg-red-500/20',
}
const CLASIF_TEXT = {
  trivial: 'text-emerald-400', tolerable: 'text-lime-400',
  moderado: 'text-amber-400', importante: 'text-orange-400', intolerable: 'text-red-400',
}

const IP_RANGES = [
  { label: '4', val: 4 }, { label: '5–8', val: 6 }, { label: '9–12', val: 10 },
  { label: '13–16', val: 14 },
]

export default function IpercEvaluacionPage() {
  const navigate = useNavigate()
  const [matriz, setMatriz] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/iperc/matriz-riesgos'),
    ]).then(([{ data: mat }]) => {
      setMatriz(mat)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => navigate('/iperc')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-200 hover:text-white bg-slate-600/80 hover:bg-slate-600 px-2.5 py-1.5 rounded-lg border border-slate-600/50 transition-colors mb-3"
        >
          <ChevronLeft size={13} /> Volver al módulo IPERC
        </button>
        <h1 className="text-2xl font-bold text-white">Evaluación de Riesgos</h1>
        <p className="text-slate-400 text-sm mt-1">Matriz de riesgo 5×5 · Metodología Ley 29783 / RM 050-2013-TR</p>
      </div>

      {/* Distribución actual */}
      {!loading && matriz && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {NIVELES.map(({ key, label, color, text, range, accion }) => (
            <div key={key} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <div className={`w-3 h-3 rounded-full ${color} mb-2`} />
              <p className={`text-2xl font-bold ${text}`}>{matriz[key] ?? 0}</p>
              <p className="text-sm font-medium text-slate-200">{label}</p>
              <p className="text-xs text-slate-500 mt-1">NR {range}</p>
              <p className="text-xs text-slate-600 mt-1 leading-tight">{accion}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabla matriz visual */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <p className="text-sm font-semibold text-slate-300 mb-4">Matriz de Riesgo — Índice de Probabilidad × Índice de Severidad</p>
        <div className="overflow-x-auto">
          <table className="text-xs">
            <thead>
              <tr>
                <th className="px-3 py-2 text-slate-500 text-left font-normal">IP\IS</th>
                {[1, 2, 3, 4].map(is_ => (
                  <th key={is_} className="px-3 py-2 text-slate-400 text-center font-medium">
                    <div>IS={is_}</div>
                    <div className="text-slate-600 font-normal text-[10px] mt-0.5 max-w-20">{SEVERIDAD_LABELS[is_]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'IP=4', ip: 4 },
                { label: 'IP=6-8', ip: 7 },
                { label: 'IP=9-12', ip: 10 },
                { label: 'IP=13-16', ip: 14 },
              ].map(({ label, ip }) => (
                <tr key={ip}>
                  <td className="px-3 py-2 text-slate-400 font-medium">{label}</td>
                  {[1, 2, 3, 4].map(is_ => {
                    const c = clasificar(ip, is_)
                    const nr = ip * is_
                    return (
                      <td key={is_} className={`px-3 py-2 text-center rounded ${CLASIF_BG[c]}`}>
                        <div className={`font-bold ${CLASIF_TEXT[c]}`}>{nr}</div>
                        <div className={`text-[10px] ${CLASIF_TEXT[c]} opacity-80 capitalize`}>{c}</div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Leyenda metodología */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Índice de Probabilidad (IP)</p>
            <div className="space-y-1 text-xs text-slate-500">
              <p>• Personas expuestas: 1-4</p>
              <p>• Procedimientos existentes: 1-4</p>
              <p>• Capacitación del personal: 1-4</p>
              <p>• Frecuencia de exposición: 1-4</p>
              <p className="text-slate-400 font-medium">IP = suma de los 4 factores (4-16)</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Índice de Severidad (IS)</p>
            <div className="space-y-1 text-xs text-slate-500">
              <p>• IS=1: Lesión sin incapacidad</p>
              <p>• IS=2: Incapacidad temporal</p>
              <p>• IS=3: Incapacidad permanente</p>
              <p>• IS=4: Fatalidad o daños irreversibles</p>
              <p className="text-slate-400 font-medium">Nivel de Riesgo (NR) = IP × IS</p>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones por nivel */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700">
          <p className="text-sm font-semibold text-slate-300">Plan de acción por nivel de riesgo</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              {['Nivel', 'Rango NR', 'Clasificación', 'Acción requerida', 'Prioridad'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {[
              { nr: '1–4',  c: 'trivial',     accion: 'No se necesita mejorar la acción preventiva',              prio: 'Baja' },
              { nr: '5–8',  c: 'tolerable',   accion: 'No se necesita establecer controles adicionales',           prio: 'Baja' },
              { nr: '9–16', c: 'moderado',    accion: 'Se deben hacer esfuerzos para reducir el riesgo',           prio: 'Media' },
              { nr: '17–24',c: 'importante',  accion: 'No debe comenzarse el trabajo hasta reducir el riesgo',     prio: 'Alta' },
              { nr: '25–36',c: 'intolerable', accion: 'No debe comenzar ni continuar el trabajo. Suspender actividad', prio: 'Inmediata' },
            ].map(({ nr, c, accion, prio }) => (
              <tr key={c} className="hover:bg-slate-700/30">
                <td className="px-4 py-3">
                  <div className={`w-3 h-3 rounded-full inline-block mr-2 ${c === 'intolerable' ? 'bg-red-500' : c === 'importante' ? 'bg-orange-500' : c === 'moderado' ? 'bg-amber-500' : c === 'tolerable' ? 'bg-lime-500' : 'bg-emerald-500'}`} />
                </td>
                <td className="px-4 py-3 text-slate-300 font-mono">{nr}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${CLASIF_TEXT[c]}`}>{c}</span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">{accion}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${prio === 'Inmediata' ? 'text-red-400' : prio === 'Alta' ? 'text-orange-400' : prio === 'Media' ? 'text-amber-400' : 'text-slate-400'}`}>
                    {prio}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
