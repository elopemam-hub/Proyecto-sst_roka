/**
 * NfpaDiamond — Rombo NFPA 704 (Fire Diamond)
 * Norma NFPA 704 Standard System for the Identification of the Hazards
 * of Materials for Emergency Response
 *
 * Disposición visual del rombo (cuadrado rotado 45°):
 *
 *          ▲
 *         /B\   Azul  — Salud (Health)        0-4
 *        / ↑ \
 *       /  1  \
 *  R   /-------\  Y   Rojo   — Inflamabilidad  0-4
 *  ←  / 4  | 2 \  →   Amarillo — Inestabilidad  0-4
 *    /-----|-----\
 *   \ 3        /    Blanco — Especial (OX,W,COR...)
 *    \       /
 *     \   /
 *      ▼
 *
 * Sectores en el grid 2×2 rotado:
 *   [top-left]  = AZUL  (Salud)          → aparece arriba
 *   [top-right] = AMARILLO (Inestabilidad) → aparece a la derecha
 *   [bot-left]  = ROJO  (Inflamabilidad) → aparece a la izquierda
 *   [bot-right] = BLANCO (Especial)      → aparece abajo
 */

const RIESGO_COLOR = {
  0: 'bg-emerald-100 text-emerald-900',
  1: 'bg-amber-100 text-amber-900',
  2: 'bg-orange-200 text-orange-900',
  3: 'bg-red-400 text-white',
  4: 'bg-red-700 text-white',
}

function Sector({ color, textColor, valor, label, size }) {
  const fontSize  = size >= 120 ? 'text-2xl' : size >= 80 ? 'text-xl' : 'text-base'
  const labelSize = size >= 120 ? 'text-[9px]' : 'text-[7px]'

  return (
    <div
      className="flex items-center justify-center w-full h-full relative"
      style={{ backgroundColor: color, color: textColor }}>
      {/* Contenido rotado -45° para quedar erguido */}
      <div
        className="flex flex-col items-center justify-center gap-0 leading-none"
        style={{ transform: 'rotate(-45deg)' }}>
        <span className={`font-black ${fontSize} leading-none`}>{valor}</span>
        {size >= 100 && label && (
          <span className={`${labelSize} font-semibold uppercase tracking-tight opacity-70 leading-tight text-center`}>
            {label}
          </span>
        )}
      </div>
    </div>
  )
}

export default function NfpaDiamond({
  salud         = 0,
  inflamabilidad = 0,
  inestabilidad  = 0,
  especial       = '',
  size           = 140,   // px — lado del cuadrado antes de rotar
  className      = '',
}) {
  if (!salud && !inflamabilidad && !inestabilidad && !especial) return null

  const gap  = Math.max(1, Math.round(size * 0.02))
  const half = Math.round(size / 2)

  return (
    <div
      className={`inline-block ${className}`}
      style={{ width: size, height: size }}
      title={`NFPA 704 — Salud:${salud} Inflamab.:${inflamabilidad} Inestab.:${inestabilidad}${especial ? ` Especial:${especial}` : ''}`}>

      {/* Contenedor exterior rotado 45° con borde negro */}
      <div
        style={{
          width:     size,
          height:    size,
          transform: 'rotate(45deg)',
          border:    `${Math.max(2, size * 0.02)}px solid #111`,
          overflow:  'hidden',
          display:   'grid',
          gridTemplate: `${half}px ${half}px / ${half}px ${half}px`,
          gap:       0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        }}>

        {/* ── AZUL: Salud (arriba, top-left del grid) ── */}
        <Sector
          color={`hsl(220 85% ${Math.max(20, 65 - salud * 10)}%)`}
          textColor="white"
          valor={salud}
          label="Salud"
          size={size}
        />

        {/* ── AMARILLO: Inestabilidad (derecha, top-right del grid) ── */}
        <Sector
          color={`hsl(45 95% ${Math.max(30, 70 - inestabilidad * 8)}%)`}
          textColor={inestabilidad >= 3 ? '#7c2d12' : '#422006'}
          valor={inestabilidad}
          label="Inestab."
          size={size}
        />

        {/* ── ROJO: Inflamabilidad (izquierda, bot-left del grid) ── */}
        <Sector
          color={`hsl(0 85% ${Math.max(20, 60 - inflamabilidad * 8)}%)`}
          textColor="white"
          valor={inflamabilidad}
          label="Inflam."
          size={size}
        />

        {/* ── BLANCO: Especial (abajo, bot-right del grid) ── */}
        <div
          className="flex items-center justify-center w-full h-full"
          style={{ backgroundColor: '#f9fafb', borderTop: `${gap}px solid #111`, borderLeft: `${gap}px solid #111` }}>
          <div
            className="flex flex-col items-center justify-center"
            style={{ transform: 'rotate(-45deg)' }}>
            <span
              className="font-black text-gray-900 text-center leading-none"
              style={{ fontSize: especial && especial.length > 2 ? Math.max(8, size * 0.1) : Math.max(10, size * 0.13) }}>
              {especial || '—'}
            </span>
            {size >= 100 && (
              <span className="text-[7px] text-gray-400 font-semibold uppercase tracking-tight mt-0.5">
                Especial
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

/**
 * Leyenda compacta para acompañar el rombo
 */
export function NfpaLeyenda({ salud, inflamabilidad, inestabilidad, especial, className = '' }) {
  const items = [
    { color: '#1d4ed8', label: 'Salud',          valor: salud,          desc: '(Azul)' },
    { color: '#dc2626', label: 'Inflamabilidad',  valor: inflamabilidad, desc: '(Rojo)' },
    { color: '#ca8a04', label: 'Inestabilidad',   valor: inestabilidad,  desc: '(Amarillo)' },
    { color: '#6b7280', label: 'Especial',         valor: especial || '—', desc: '(Blanco)' },
  ]
  return (
    <div className={`grid grid-cols-2 gap-1.5 ${className}`}>
      {items.map(({ color, label, valor, desc }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-xs text-gray-600">
            <span className="font-bold text-gray-800">{valor}</span> {label}
            <span className="text-gray-400 ml-1">{desc}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
