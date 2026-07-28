import { useState } from 'react'
import { X, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react'
import SignatureCanvas from './SignatureCanvas'
import api from '../../services/api'
import toast from 'react-hot-toast'

/**
 * Modal de aprobación masiva de inspecciones.
 * El supervisor dibuja su firma UNA vez y se aplica a todas las inspecciones
 * seleccionadas mediante POST /inspecciones/aprobar-lote.
 *
 * Props:
 * - ids: number[]           — IDs de inspecciones a aprobar
 * - onClose: () => void
 * - onSuccess: (data) => void — recibe el resumen del backend
 */
export default function AprobacionLoteModal({ ids = [], onClose, onSuccess }) {
  const [paso, setPaso] = useState('confirmacion') // confirmacion | firma
  const [observaciones, setObservaciones] = useState('')
  const [loading, setLoading] = useState(false)

  const total = ids.length

  const handleFirmar = async (imagenBase64) => {
    setLoading(true)
    try {
      const { data } = await api.post('/inspecciones/aprobar-lote', {
        ids,
        firma_imagen: imagenBase64,
        observaciones: observaciones || null,
      })

      const r = data.resumen || {}
      const partes = [`${r.aprobadas ?? 0} aprobada(s)`]
      if (r.omitidas) partes.push(`${r.omitidas} omitida(s)`)
      if (r.errores) partes.push(`${r.errores} con error`)
      toast.success(partes.join(' · '), { icon: '✓', duration: 4000 })

      onSuccess?.(data)
      onClose?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al aprobar las inspecciones')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <ShieldCheck size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-gray-900 font-bold text-sm">Aprobación masiva</p>
              <p className="text-gray-500 text-xs">
                Acción: <span className="text-emerald-600 font-semibold">Aprobar {total} inspección(es)</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Paso 1: confirmación */}
        {paso === 'confirmacion' && (
          <div className="p-5 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-amber-800 text-xs leading-relaxed">
                Vas a aprobar <strong>{total}</strong> inspección(es) con una sola firma.
                Esa firma se estampará en cada una con validez legal. Las que ya estén
                aprobadas o no aprobables se omitirán automáticamente.
              </p>
            </div>

            <div>
              <label className="block text-gray-700 text-xs font-semibold mb-1.5">
                Observaciones (opcional)
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={2}
                placeholder="Comentario que quedará registrado en todas las aprobaciones..."
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            </div>

            <p className="text-gray-500 text-[11px] leading-relaxed">
              Al continuar, usted declara haber revisado el conjunto de inspecciones
              seleccionadas y firmarlas digitalmente con validez legal.
            </p>

            <button
              onClick={() => setPaso('firma')}
              disabled={total === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              Continuar a firmar
            </button>
          </div>
        )}

        {/* Paso 2: firma */}
        {paso === 'firma' && (
          <div className="p-5">
            <SignatureCanvas
              onSave={handleFirmar}
              onCancel={() => setPaso('confirmacion')}
              loading={loading}
            />
            {loading && (
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 justify-center">
                <Loader2 size={14} className="animate-spin" />
                Registrando firmas de aprobación...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
