import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Search, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react'

const GUIA = [
  {
    tipo: 'fisico',
    label: 'Físico',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    desc: 'Agentes del entorno físico que pueden causar daño',
    peligros: [
      { peligro: 'Ruido excesivo', riesgo: 'Pérdida auditiva, estrés', medidas: 'Orejeras, protectores auditivos, reducción en fuente' },
      { peligro: 'Vibración de maquinaria', riesgo: 'Trastornos musculoesqueléticos, Raynaud', medidas: 'Anti-vibración, rotación de puestos' },
      { peligro: 'Temperatura extrema (calor)', riesgo: 'Golpe de calor, deshidratación', medidas: 'Ventilación, pausas, hidratación' },
      { peligro: 'Temperatura extrema (frío)', riesgo: 'Hipotermia, congelamiento', medidas: 'Ropa térmica, calefacción, pausas activas' },
      { peligro: 'Iluminación deficiente', riesgo: 'Fatiga visual, accidentes', medidas: 'Iluminación adecuada, mantenimiento luminarias' },
      { peligro: 'Radiación UV solar', riesgo: 'Quemaduras, cáncer de piel', medidas: 'Protector solar, ropa protectora, sombra' },
      { peligro: 'Radiación ionizante', riesgo: 'Cáncer, mutaciones', medidas: 'Blindaje, dosímetros, límites de exposición' },
    ],
  },
  {
    tipo: 'quimico',
    label: 'Químico',
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    desc: 'Sustancias químicas en forma de gas, vapor, polvo, humo o niebla',
    peligros: [
      { peligro: 'Gases tóxicos', riesgo: 'Intoxicación, asfixia', medidas: 'Ventilación, respiradores, detector de gases' },
      { peligro: 'Vapores de solventes', riesgo: 'Daño hepático, neurológico', medidas: 'Sustitución, ventilación local, EPP respiratorio' },
      { peligro: 'Polvo de sílice', riesgo: 'Silicosis', medidas: 'Supresión por agua, respiradores P100' },
      { peligro: 'Ácidos y bases', riesgo: 'Quemaduras químicas', medidas: 'Guantes, careta, ducha lavaojos' },
      { peligro: 'Plaguicidas', riesgo: 'Intoxicación aguda o crónica', medidas: 'EPP específico, MSDS, capacitación' },
    ],
  },
  {
    tipo: 'biologico',
    label: 'Biológico',
    color: 'text-green-400 bg-green-500/10 border-green-500/20',
    desc: 'Microorganismos, toxinas y agentes infecciosos',
    peligros: [
      { peligro: 'Contacto con sangre/fluidos', riesgo: 'VIH, hepatitis B/C', medidas: 'Guantes, mascarilla, protocolo de bioseguridad' },
      { peligro: 'Vectores (mosquitos, roedores)', riesgo: 'Dengue, leptospirosis', medidas: 'Control vectorial, vacunación, EPP' },
      { peligro: 'Hongos en ambientes húmedos', riesgo: 'Alergias, aspergilosis', medidas: 'Control de humedad, mascarillas N95' },
    ],
  },
  {
    tipo: 'ergonomico',
    label: 'Ergonómico',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    desc: 'Factores relacionados con la adaptación del trabajo a las capacidades humanas',
    peligros: [
      { peligro: 'Levantamiento manual de cargas', riesgo: 'Lumbalgia, hernia', medidas: 'Técnica correcta, ayuda mecánica, límite 25kg' },
      { peligro: 'Posturas forzadas prolongadas', riesgo: 'TME, contracturas', medidas: 'Silla regulable, pausas activas, rotación' },
      { peligro: 'Movimientos repetitivos', riesgo: 'Síndrome del túnel carpiano', medidas: 'Rotación de tareas, reposos, ergonomía de puesto' },
      { peligro: 'Trabajo con pantallas', riesgo: 'Fatiga visual, cervicalgia', medidas: 'Regla 20-20-20, altura monitor, silla ergonómica' },
    ],
  },
  {
    tipo: 'psicosocial',
    label: 'Psicosocial',
    color: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
    desc: 'Condiciones organizacionales y relacionales que afectan la salud mental',
    peligros: [
      { peligro: 'Carga de trabajo excesiva', riesgo: 'Estrés, burnout', medidas: 'Planificación, delegación, equilibrio vida-trabajo' },
      { peligro: 'Trabajo nocturno o turnos', riesgo: 'Trastorno del sueño, accidentes', medidas: 'Rotación adecuada, pausas, iluminación' },
      { peligro: 'Acoso laboral (mobbing)', riesgo: 'Ansiedad, depresión', medidas: 'Protocolo anti-acoso, canal de denuncia' },
      { peligro: 'Violencia de terceros', riesgo: 'Trauma psicológico, lesiones', medidas: 'Protocolos de seguridad, entrenamiento' },
    ],
  },
  {
    tipo: 'mecanico',
    label: 'Mecánico',
    color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    desc: 'Partes móviles de máquinas y equipos con potencial de causar lesiones',
    peligros: [
      { peligro: 'Atrapamiento en maquinaria', riesgo: 'Amputación, aplastamiento', medidas: 'Guardas, interbloqueos, LOTO' },
      { peligro: 'Proyección de materiales', riesgo: 'Lesiones oculares, heridas', medidas: 'Protección ocular, pantallas protectoras' },
      { peligro: 'Herramientas cortantes', riesgo: 'Cortes, laceraciones', medidas: 'Guantes anticorte, procedimientos seguros' },
      { peligro: 'Vehículos y montacargas', riesgo: 'Atropello, aplastamiento', medidas: 'Señalización, vías peatonales, límite velocidad' },
    ],
  },
  {
    tipo: 'electrico',
    label: 'Eléctrico',
    color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    desc: 'Riesgos asociados a instalaciones y equipos eléctricos',
    peligros: [
      { peligro: 'Contacto directo con partes vivas', riesgo: 'Electrocución, paro cardíaco', medidas: 'Aislamiento, LOTO, guantes dieléctricos' },
      { peligro: 'Contacto indirecto (falla aislamiento)', riesgo: 'Descarga eléctrica', medidas: 'Puesta a tierra, diferenciales' },
      { peligro: 'Electricidad estática', riesgo: 'Chispa, explosión en atmósferas inflamables', medidas: 'Puesta a tierra, ropa antiestática' },
      { peligro: 'Arco eléctrico', riesgo: 'Quemaduras graves', medidas: 'EPP arco, análisis de riesgo eléctrico' },
    ],
  },
  {
    tipo: 'locativo',
    label: 'Locativo',
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    desc: 'Condiciones del lugar de trabajo que pueden causar accidentes',
    peligros: [
      { peligro: 'Pisos mojados / resbaladizos', riesgo: 'Caídas al mismo nivel', medidas: 'Señalización, limpieza inmediata, antideslizante' },
      { peligro: 'Trabajo en altura', riesgo: 'Caída de distinto nivel', medidas: 'Arnés, línea de vida, barandas, permiso trabajo' },
      { peligro: 'Espacios confinados', riesgo: 'Asfixia, explosión', medidas: 'Medición de gases, ventilación, permiso entrada' },
      { peligro: 'Almacenamiento inadecuado', riesgo: 'Caída de objetos', medidas: 'Estanterías seguras, orden, casco' },
      { peligro: 'Desorden y obstáculos', riesgo: 'Tropiezo, caídas', medidas: 'Programa 5S, señalización de vías' },
    ],
  },
  {
    tipo: 'fenomeno_natural',
    label: 'Fenómeno Natural',
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    desc: 'Eventos naturales con potencial de causar daños',
    peligros: [
      { peligro: 'Sismo / Terremoto', riesgo: 'Derrumbe, aplastamiento', medidas: 'Plan de evacuación, zonas seguras, simulacros' },
      { peligro: 'Inundación', riesgo: 'Ahogamiento, pérdida de activos', medidas: 'Mapeo de zonas inundables, drenaje, alertas' },
      { peligro: 'Deslizamiento de tierra', riesgo: 'Sepultamiento', medidas: 'Evaluación geotécnica, monitoreo, evacuación' },
      { peligro: 'Tormenta eléctrica', riesgo: 'Impacto de rayo', medidas: 'Pararrayos, protocolo de tormenta' },
    ],
  },
]

export default function IpercGuiaPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [expandido, setExpandido] = useState(null)

  const filtrado = GUIA.map(cat => ({
    ...cat,
    peligros: cat.peligros.filter(p =>
      p.peligro.toLowerCase().includes(search.toLowerCase()) ||
      p.riesgo.toLowerCase().includes(search.toLowerCase()) ||
      cat.label.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.peligros.length > 0 || !search)

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => navigate('/iperc')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-200 hover:text-white bg-slate-600/80 hover:bg-slate-600 px-2.5 py-1.5 rounded-lg border border-slate-600/50 transition-colors mb-3"
        >
          <ChevronLeft size={13} /> Volver al módulo IPERC
        </button>
        <h1 className="text-2xl font-bold text-white">Guía Referencial de Peligros y Riesgos</h1>
        <p className="text-slate-400 text-sm mt-1">Catálogo de peligros por tipo · Ley 29783 / RM 050-2013-TR</p>
      </div>

      {/* Búsqueda */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar peligro, riesgo o tipo..." className="input pl-9" />
        </div>
      </div>

      {/* Contador categorías */}
      <div className="flex flex-wrap gap-2">
        {GUIA.map(cat => (
          <span key={cat.tipo} className={`text-xs px-3 py-1 rounded-full border ${cat.color} cursor-pointer`}
            onClick={() => setExpandido(expandido === cat.tipo ? null : cat.tipo)}>
            {cat.label} ({cat.peligros.length})
          </span>
        ))}
      </div>

      {/* Categorías */}
      <div className="space-y-3">
        {filtrado.map(cat => (
          <div key={cat.tipo} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <button
              onClick={() => setExpandido(expandido === cat.tipo ? null : cat.tipo)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${cat.color}`}>{cat.label}</span>
                <span className="text-sm text-slate-300">{cat.desc}</span>
                <span className="text-xs text-slate-500">({cat.peligros.length} peligros)</span>
              </div>
              {expandido === cat.tipo ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
            </button>

            {(expandido === cat.tipo || search) && cat.peligros.length > 0 && (
              <div className="border-t border-slate-700">
                <table className="w-full text-xs">
                  <thead className="bg-slate-900/50">
                    <tr>
                      {['Peligro identificado', 'Riesgo / Consecuencia potencial', 'Medidas de control sugeridas'].map(h => (
                        <th key={h} className="text-left px-4 py-2 text-slate-500 font-medium uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {cat.peligros.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-700/20">
                        <td className="px-4 py-2.5 font-medium text-slate-200">{p.peligro}</td>
                        <td className="px-4 py-2.5 text-slate-400">{p.riesgo}</td>
                        <td className="px-4 py-2.5 text-slate-500">{p.medidas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Nota legal */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-xs text-slate-500">
        <p className="font-medium text-slate-400 mb-1">Referencia normativa</p>
        <p>Este catálogo es de carácter referencial y debe adaptarse a las condiciones específicas de cada empresa y puesto de trabajo, conforme al Anexo 3 de la RM 050-2013-TR y la metodología establecida en el DS 005-2012-TR (Art. 77-82).</p>
      </div>
    </div>
  )
}
