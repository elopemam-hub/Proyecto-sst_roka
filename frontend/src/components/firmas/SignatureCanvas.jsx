import { useRef, useState, useEffect } from 'react'
import { RotateCcw, Check, Pen } from 'lucide-react'

/**
 * Canvas de firma digital para móvil/tablet/desktop
 * Soporta touch y mouse, genera PNG en base64
 */
export default function SignatureCanvas({ onSave, onCancel, loading = false }) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 })

  // Inicializar canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // Ajustar tamaño real al contenedor (DPI-aware)
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width  = rect.width  * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Fondo blanco (para que al guardar PNG no sea transparente)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Estilo de trazo
    ctx.strokeStyle   = '#0f172a'
    ctx.lineWidth     = 2.2
    ctx.lineCap       = 'round'
    ctx.lineJoin      = 'round'
  }, [])

  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect   = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const startDrawing = (e) => {
    e.preventDefault()
    const pos = getPos(e)
    setLastPos(pos)
    setIsDrawing(true)
  }

  const draw = (e) => {
    if (!isDrawing) return
    e.preventDefault()
    const pos = getPos(e)
    const ctx = canvasRef.current.getContext('2d')

    ctx.beginPath()
    ctx.moveTo(lastPos.x, lastPos.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()

    setLastPos(pos)
    setHasSignature(true)
  }

  const stopDrawing = () => setIsDrawing(false)

  const limpiar = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
    setHasSignature(false)
  }

  const guardar = () => {
    if (!hasSignature) return
    const base64 = canvasRef.current.toDataURL('image/png')
    onSave?.(base64)
  }

  return (
    <div className="space-y-3">
      {/* Instrucciones */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Pen size={14} className="text-roka-400" />
        <span>Dibuje su firma en el recuadro usando dedo, stylus o mouse</span>
      </div>

      {/* Canvas container */}
      <div className="relative bg-white rounded-xl overflow-hidden border-2 border-dashed border-slate-700 hover:border-slate-600 transition-colors">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none"
          style={{ height: '200px' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-slate-400 text-sm italic select-none">
              Firme aquí
            </p>
          </div>
        )}

        {/* Línea base */}
        <div className="absolute bottom-8 left-8 right-8 border-b border-slate-300 pointer-events-none" />
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={limpiar}
          disabled={!hasSignature || loading}
          className="btn-secondary flex items-center gap-2"
          type="button"
        >
          <RotateCcw size={14} />
          Limpiar
        </button>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={loading}
              className="btn-secondary"
              type="button"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={guardar}
            disabled={!hasSignature || loading}
            className="btn-primary flex items-center gap-2"
            type="button"
          >
            <Check size={14} />
            {loading ? 'Registrando...' : 'Confirmar firma'}
          </button>
        </div>
      </div>
    </div>
  )
}
