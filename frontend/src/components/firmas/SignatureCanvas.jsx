import { useRef, useState, useEffect, useCallback } from 'react'
import { RotateCcw, Check, Pen } from 'lucide-react'

/**
 * Canvas de firma digital para móvil/tablet/desktop
 * Soporta touch y mouse, genera PNG en base64
 */
export default function SignatureCanvas({ onSave, onCancel, loading = false }) {
  const canvasRef    = useRef(null)
  const isDrawing    = useRef(false)          // useRef, no useState — evita stale closures
  const lastPos      = useRef({ x: 0, y: 0 })
  const [hasSignature, setHasSignature] = useState(false)

  // ── Inicializar/redimensionar canvas ──────────────────────────────────────
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return   // aún no está en el DOM

    const dpr = window.devicePixelRatio || 1
    canvas.width  = Math.floor(rect.width  * dpr)
    canvas.height = Math.floor(rect.height * dpr)

    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)             // más seguro que scale acumulativa

    ctx.fillStyle   = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth   = 2.2
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
  }, [])

  useEffect(() => {
    // requestAnimationFrame garantiza que el modal ya está pintado en pantalla
    const raf = requestAnimationFrame(() => {
      initCanvas()
    })

    // ResizeObserver para reaccionar si el contenedor cambia (responsive)
    const ro = new ResizeObserver(() => initCanvas())
    if (canvasRef.current) ro.observe(canvasRef.current)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [initCanvas])

  // ── Obtener coordenadas relativas al canvas (mouse y touch) ──────────────
  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect   = canvas.getBoundingClientRect()
    const src    = e.touches ? e.touches[0] : e
    return {
      x: src.clientX - rect.left,
      y: src.clientY - rect.top,
    }
  }

  // ── Handlers de dibujo (sin setState para lastPos/isDrawing) ─────────────
  const startDrawing = (e) => {
    e.preventDefault()
    isDrawing.current = true
    lastPos.current   = getPos(e)

    // Punto inicial (para clics sin movimiento)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.arc(lastPos.current.x, lastPos.current.y, 1, 0, Math.PI * 2)
    ctx.fill()
    setHasSignature(true)
  }

  const draw = (e) => {
    if (!isDrawing.current) return
    e.preventDefault()

    const pos = getPos(e)
    const ctx = canvasRef.current.getContext('2d')

    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()

    lastPos.current = pos
  }

  const stopDrawing = (e) => {
    if (e) e.preventDefault()
    isDrawing.current = false
  }

  // ── Limpiar ───────────────────────────────────────────────────────────────
  const limpiar = () => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const rect   = canvas.getBoundingClientRect()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
    // Restaurar estilo de trazo después de limpiar
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth   = 2.2
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    setHasSignature(false)
  }

  // ── Guardar ───────────────────────────────────────────────────────────────
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

      {/* Canvas container — altura fija en el wrapper, no en el canvas */}
      <div
        className="relative bg-white rounded-xl overflow-hidden border-2 border-dashed border-slate-700 hover:border-roka-500/50 transition-colors"
        style={{ height: '200px' }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full h-full touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
        />

        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-slate-300 text-sm italic select-none">Firme aquí</p>
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
