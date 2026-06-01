import { X, Scale, BookOpen, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { useState } from 'react'

const NORMAS = [
  {
    codigo: 'Ley 29783',
    titulo: 'Ley de Seguridad y Salud en el Trabajo',
    color: 'border-blue-400 bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
    articulos: [
      {
        num: 'Art. 49°',
        titulo: 'Obligaciones del empleador en materia de salud',
        texto: 'El empleador debe practicar exámenes médicos antes, durante y al término de la relación laboral a los trabajadores, acordes con los riesgos a los que están expuestos en sus labores.',
        destacado: true,
      },
      {
        num: 'Art. 71°',
        titulo: 'Información de resultados',
        texto: 'Los resultados de los exámenes médicos deben ser informados al trabajador, con énfasis en los valores de referencia.',
      },
      {
        num: 'Art. 72°',
        titulo: 'Confidencialidad',
        texto: 'Los datos médicos del trabajador tienen carácter confidencial. No pueden ser utilizados para ningún acto discriminatorio.',
      },
      {
        num: 'Art. 74°',
        titulo: 'Participación del médico ocupacional',
        texto: 'Los exámenes médicos ocupacionales deben ser realizados por médicos con especialidad en medicina ocupacional o por médicos con entrenamiento en medicina del trabajo.',
      },
      {
        num: 'Art. 75°',
        titulo: 'Registro y comunicación',
        texto: 'Los empleadores con 20 o más trabajadores deben implementar el registro de monitoreo de agentes físicos, químicos, biológicos y psicosociales.',
      },
    ],
  },
  {
    codigo: 'DS 005-2012-TR',
    titulo: 'Reglamento de la Ley de SST',
    color: 'border-emerald-400 bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-700',
    articulos: [
      {
        num: 'Art. 101°',
        titulo: 'Frecuencia de exámenes periódicos',
        texto: 'Los exámenes médicos periódicos son anuales para los trabajadores expuestos a riesgo o para todos si se determina en el reglamento interno. Para menores de 18 años y mayores de 50 años son obligatorios anualmente.',
        destacado: true,
      },
      {
        num: 'Art. 102°',
        titulo: 'Examen pre-ocupacional',
        texto: 'Los exámenes médicos pre-ocupacionales son de cargo del empleador y son previos al inicio de la relación laboral con el trabajador.',
      },
      {
        num: 'Art. 103°',
        titulo: 'Examen de retiro',
        texto: 'El examen médico de retiro se realiza al término de la relación laboral. Es facultativo y puede ser solicitado por el empleador o por el trabajador.',
      },
    ],
  },
  {
    codigo: 'RM 312-2011-MINSA',
    titulo: 'Protocolos de Exámenes Médico Ocupacionales',
    color: 'border-purple-400 bg-purple-50',
    badge: 'bg-purple-100 text-purple-700',
    articulos: [
      {
        num: 'Protocolo 1',
        titulo: 'Examen médico ocupacional básico',
        texto: 'Incluye: anamnesis ocupacional, examen físico completo, evaluación nutricional (peso, talla, IMC), presión arterial, frecuencia cardíaca, agudeza visual y auditiva básica.',
        destacado: true,
      },
      {
        num: 'Protocolo 2',
        titulo: 'Evaluaciones complementarias según riesgo',
        texto: 'Según el perfil de riesgo del puesto: espirometría (exposición a polvos/gases), audiometría (ruido), electrocardiograma (esfuerzo físico), glucosa, hemograma, función renal y hepática.',
      },
      {
        num: 'Vigencia',
        titulo: 'Periodicidad de los exámenes',
        texto: 'Examen pre-ocupacional: antes del ingreso. Periódico: cada 12 meses (riesgo alto), cada 24 meses (riesgo medio). Retiro: en los últimos 30 días de la relación laboral. Cambio de puesto: antes del cambio.',
      },
    ],
  },
  {
    codigo: 'RM 050-2013-TR',
    titulo: 'Formatos de Registros del SGSST',
    color: 'border-amber-400 bg-amber-50',
    badge: 'bg-amber-100 text-amber-700',
    articulos: [
      {
        num: 'Registro N° 5',
        titulo: 'Registro de monitoreo de agentes ocupacionales',
        texto: 'Las empresas con 20 o más trabajadores deben llevar el registro de los resultados de los exámenes médicos, monitoreo de agentes y evaluaciones del puesto de trabajo.',
      },
      {
        num: 'Conservación',
        titulo: 'Tiempo de conservación de registros',
        texto: 'Los registros de exámenes médicos ocupacionales deben conservarse durante 20 años para enfermedades profesionales y 5 años para el resto de registros.',
        destacado: true,
      },
    ],
  },
]

const FRECUENCIAS = [
  { tipo: 'Pre-ocupacional', frecuencia: 'Antes del ingreso', obligatorio: true, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { tipo: 'Periódico anual', frecuencia: 'Cada 12 meses (riesgo alto)', obligatorio: true, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { tipo: 'Periódico biennial', frecuencia: 'Cada 24 meses (riesgo medio)', obligatorio: false, color: 'text-teal-600 bg-teal-50 border-teal-200' },
  { tipo: 'Por cambio de puesto', frecuencia: 'Antes del cambio', obligatorio: true, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { tipo: 'Retiro', frecuencia: 'Últimos 30 días de la relación', obligatorio: false, color: 'text-gray-600 bg-gray-50 border-gray-200' },
]

function ArticuloItem({ art }) {
  const [abierto, setAbierto] = useState(art.destacado || false)
  return (
    <div className={`rounded-lg border overflow-hidden ${art.destacado ? 'border-gray-300' : 'border-gray-200'}`}>
      <button
        onClick={() => setAbierto(!abierto)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${art.destacado ? 'bg-gray-50 hover:bg-gray-100' : 'bg-white hover:bg-gray-50'}`}>
        <span className="text-xs font-bold text-gray-500 w-16 flex-shrink-0">{art.num}</span>
        <span className="flex-1 text-sm font-medium text-gray-800">{art.titulo}</span>
        {abierto ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />}
      </button>
      {abierto && (
        <div className="px-4 py-3 border-t border-gray-100 bg-white">
          <p className="text-sm text-gray-600 leading-relaxed">{art.texto}</p>
        </div>
      )}
    </div>
  )
}

export default function LeyReferenciaModal({ onClose }) {
  const [normaActiva, setNormaActiva] = useState(0)
  const [tab, setTab] = useState('normas')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <Scale size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Marco legal — Salud Ocupacional</h2>
              <p className="text-xs text-gray-400">Ley 29783 y normas complementarias</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-gray-200">
          {[
            { key: 'normas', label: 'Artículos legales', icon: BookOpen },
            { key: 'frecuencias', label: 'Frecuencias de exámenes', icon: Scale },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Tab: Normas */}
          {tab === 'normas' && (
            <div className="flex h-full">
              {/* Sidebar normas */}
              <div className="w-44 flex-shrink-0 border-r border-gray-200 py-3">
                {NORMAS.map((n, i) => (
                  <button key={i} onClick={() => setNormaActiva(i)}
                    className={`w-full text-left px-4 py-3 transition-colors ${normaActiva === i ? 'bg-blue-50 border-r-2 border-blue-500' : 'hover:bg-gray-50'}`}>
                    <p className={`text-xs font-bold ${normaActiva === i ? 'text-blue-700' : 'text-gray-700'}`}>{n.codigo}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{n.titulo.split(' ').slice(0, 4).join(' ')}...</p>
                  </button>
                ))}
              </div>

              {/* Contenido norma */}
              <div className="flex-1 p-5 space-y-3 overflow-y-auto">
                {(() => {
                  const norma = NORMAS[normaActiva]
                  return (
                    <>
                      <div className={`rounded-xl border-l-4 p-4 ${norma.color}`}>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${norma.badge}`}>{norma.codigo}</span>
                        <h3 className="font-semibold text-gray-800 mt-2">{norma.titulo}</h3>
                      </div>
                      {norma.articulos.map((art, j) => (
                        <ArticuloItem key={j} art={art} />
                      ))}
                    </>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Tab: Frecuencias */}
          {tab === 'frecuencias' && (
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-500">Según DS 005-2012-TR y RM 312-2011-MINSA, los tipos de exámenes médicos ocupacionales y su periodicidad son:</p>
              <div className="space-y-2">
                {FRECUENCIAS.map((f, i) => (
                  <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${f.color}`}>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{f.tipo}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{f.frecuencia}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${f.color}`}>
                      {f.obligatorio ? 'Obligatorio' : 'Facultativo'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
                <p className="text-xs font-semibold text-blue-700 mb-2">⚠ Criterios especiales de obligatoriedad</p>
                <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
                  <li>Trabajadores menores de 18 años: examen anual obligatorio</li>
                  <li>Trabajadores mayores de 50 años: examen anual obligatorio</li>
                  <li>Trabajadores expuestos a riesgo alto: examen anual obligatorio</li>
                  <li>Empresas con más de 500 trabajadores: médico ocupacional a tiempo completo</li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 mb-2">📋 Exámenes mínimos según RM 312-2011-MINSA</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-amber-700">
                  {[
                    'Evaluación clínica completa', 'Peso, talla e IMC',
                    'Presión arterial', 'Agudeza visual',
                    'Audiometría (si hay ruido)', 'Espirometría (si hay polvo/gases)',
                    'Glucosa en ayunas', 'Hemograma completo',
                  ].map(e => (
                    <div key={e} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      {e}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-400">Información de referencia — verificar normas vigentes</p>
          <div className="flex gap-2">
            <a href="https://www.leyes.congreso.gob.pe/Documentos/2016/Leyes/29783.pdf"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
              Ley 29783 PDF <ExternalLink size={11} />
            </a>
            <button onClick={onClose}
              className="text-xs text-gray-600 border border-gray-300 hover:bg-gray-50 px-4 py-1.5 rounded-lg transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
