import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import api from '../../services/api'
import NfpaDiamond from '../../components/NfpaDiamond'

const GHS_EMOJI = { GHS01:'💥',GHS02:'🔥',GHS03:'⭕',GHS04:'🔵',GHS05:'⚗️',GHS06:'☠️',GHS07:'⚠️',GHS08:'🫁',GHS09:'🌿' }
const GHS_LABEL = { GHS01:'Explosivo',GHS02:'Inflamable',GHS03:'Comburente',GHS04:'Gas presión',GHS05:'Corrosivo',GHS06:'Tóxico',GHS07:'Irritante',GHS08:'Peligro salud',GHS09:'Peligro MA' }
const RIESGO_WORD = { muy_alto:'⬛ PELIGRO',alto:'⬛ PELIGRO',medio:'🟡 ATENCIÓN',bajo:'🟢 CUIDADO' }

export default function SustanciaEtiquetaPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [s, setS] = useState(null)

  useEffect(() => {
    api.get(`/sustancias/${id}/etiqueta`).then(({ data }) => setS(data)).catch(() => navigate('/sustancias'))
  }, [id])

  if (!s) return <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 print:hidden">
        <button onClick={() => navigate(`/sustancias/${id}`)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Etiqueta GHS — {s.nombre}</h1>
        <button onClick={() => window.print()}
          className="ml-auto flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Printer size={15} /> Imprimir etiqueta
        </button>
      </div>

      {/* Etiqueta imprimible */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #etiqueta-ghs { display: block !important; }
          @page { size: A4 landscape; margin: 10mm; }
        }
        #etiqueta-ghs { font-family: Arial, sans-serif; }
      `}</style>

      <div id="etiqueta-ghs"
        className="bg-white border-4 border-gray-800 rounded-xl p-6 max-w-3xl mx-auto shadow-lg">

        {/* Encabezado */}
        <div className="border-b-2 border-gray-800 pb-4 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-gray-900 leading-tight">{s.nombre}</h2>
              {s.nombre_quimico && <p className="text-sm text-gray-600 mt-0.5">{s.nombre_quimico}</p>}
              {s.formula        && <p className="text-sm font-mono font-bold text-gray-700">{s.formula}</p>}
            </div>
            <div className="text-right text-xs text-gray-500 shrink-0">
              {s.cas && <p><span className="font-semibold">CAS:</span> {s.cas}</p>}
              {s.onu && <p><span className="font-semibold">ONU:</span> {s.onu}</p>}
            </div>
          </div>

          {/* Palabra de advertencia */}
          <div className={`mt-3 inline-block px-4 py-1 rounded text-lg font-black border-2 ${
            ['muy_alto','alto'].includes(s.nivel_riesgo) ? 'border-red-600 text-red-700 bg-red-50' : 'border-amber-500 text-amber-700 bg-amber-50'
          }`}>
            {RIESGO_WORD[s.nivel_riesgo] || '⚠️ ADVERTENCIA'}
          </div>
        </div>

        {/* Pictogramas GHS */}
        {s.pictogramas?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Pictogramas de peligro GHS/SGA</p>
            <div className="flex flex-wrap gap-3">
              {s.pictogramas.map(g => (
                <div key={g} className="border-2 border-red-600 rounded-lg p-3 text-center bg-white min-w-[72px]">
                  <div className="text-3xl">{GHS_EMOJI[g]}</div>
                  <div className="text-[9px] font-bold text-gray-700 mt-1 leading-tight">{GHS_LABEL[g]}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NFPA 704 */}
        {(s.nfpa_salud||s.nfpa_inflamabilidad||s.nfpa_inestabilidad||s.nfpa_especial) && (
          <div className="mb-4 flex items-center gap-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Rombo NFPA 704</p>
              <NfpaDiamond
                salud={s.nfpa_salud}
                inflamabilidad={s.nfpa_inflamabilidad}
                inestabilidad={s.nfpa_inestabilidad}
                especial={s.nfpa_especial || ''}
                size={100}
              />
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <p><span className="inline-block w-3 h-3 rounded-sm bg-blue-600 mr-1.5 align-middle"/><strong>{s.nfpa_salud}</strong> — Salud</p>
              <p><span className="inline-block w-3 h-3 rounded-sm bg-red-600 mr-1.5 align-middle"/><strong>{s.nfpa_inflamabilidad}</strong> — Inflamabilidad</p>
              <p><span className="inline-block w-3 h-3 rounded-sm bg-yellow-500 mr-1.5 align-middle"/><strong>{s.nfpa_inestabilidad}</strong> — Inestabilidad</p>
              <p><span className="inline-block w-3 h-3 rounded-sm bg-gray-200 border border-gray-400 mr-1.5 align-middle"/><strong>{s.nfpa_especial || '—'}</strong> — Especial</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* EPP */}
          {s.requiere_epp?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-1.5">⚠️ EPP obligatorio</p>
              <ul className="text-xs text-gray-700 space-y-0.5">
                {s.requiere_epp.map(e => <li key={e} className="flex items-center gap-1">✓ {e}</li>)}
              </ul>
            </div>
          )}

          {/* Medidas */}
          {s.medidas_control && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-1.5">🛡️ Medidas de seguridad</p>
              <p className="text-xs text-gray-700 whitespace-pre-line">{s.medidas_control}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gray-300 flex items-center justify-between text-xs text-gray-400">
          <span>Proveedor: {s.proveedor || '—'}</span>
          <span>NTP 399.015 — GHS/SGA · Ley 29783</span>
          <span>Mantener HDS disponible en el área</span>
        </div>
      </div>
    </div>
  )
}
