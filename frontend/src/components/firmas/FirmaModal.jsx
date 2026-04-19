import { useState } from 'react'
import { X, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react'
import SignatureCanvas from './SignatureCanvas'
import api from '../../services/api'
import toast from 'react-hot-toast'

/**
 * Modal transversal para firma digital de cualquier documento
 *
 * Props:
 * - documentoTipo: clase PHP (ej: "App\\Models\\Iperc")
 * - documentoId: ID numérico
 * - titulo: texto descriptivo
 * - accion: elabora | revisa | aprueba | recibe | ejecuta | acepta
 * - solicitudId: opcional, si viene de un flujo
 * - onClose: callback al cerrar
 * - onSuccess: callback tras firma exitosa
 */
export default function FirmaModal({
  documentoTipo,
  documentoId,
  titulo,
  accion = 'acepta',
  solicitudId = null,
  onClose,
  onSuccess,
}) {
  const [paso, setPaso] = useState('confirmacion') // confirmacion | firma | procesando
  const [observaciones, setObservaciones] = useState('')
  const [loading, setLoading] = useState(false)
  const [aceptaTerminos, setAceptaTerminos] = useState(false)

  const accionesLabel = {
    elabora:  'Elaborar',
    revisa:   'Revisar',
    aprueba:  'Aprobar',
    recibe:   'Recibir',
    ejecuta:  'Ejecutar',
    acepta:   'Aceptar',
  }

  const handleFirmar = async (imagenBase64) => {
    setLoading(true)
    try {
      // Geolocalización (si disponible)
      const geo = await obtenerGeolocalizacion()

      const { data } = await api.post('/firmas/firmar', {
        solicitud_id:     solicitudId,
        documento_tipo:   documentoTipo,
        documento_id:     documentoId,
        accion,
        metodo:           'canvas',
        firma_imagen:     imagenBase64,
        observaciones:    observaciones || null,
        geolocalizacion:  geo,
        dispositivo:      navigator.userAgent.includes('Mobile') ? 'móvil' : 'escritorio',
      })

      toast.success('Firma registrada correctamente', {
        icon: '✓',
        duration: 3500,
      })

      onSuccess?.(data)
      onClose?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar la firma')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-slide-up">

        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-5 py-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-roka-500/15 border border-roka-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck size={18} className="text-roka-400" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-100">Firma digital</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Acción: <span className="text-roka-400 font-medium">{accionesLabel[accion]}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body — Paso 1: confirmación */}
        {paso === 'confirmacion' && (
          <div className="p-5 space-y-4">
            {/* Documento a firmar */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-medium">
                Documento a firmar
              </p>
              <p className="text-slate-200 font-medium">{titulo}</p>
            </div>

            {/* Aviso legal */}
            <div className="flex gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
              <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-slate-200 font-medium mb-1">Compromiso legal</p>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Al firmar, usted declara haber leído y comprendido el contenido del documento.
                  Esta firma tiene validez legal conforme a la Ley 29783 y su reglamento.
                  Quedará registrada con su identidad, IP, dispositivo, hora y hash criptográfico.
                </p>
              </div>
            </div>

            {/* Observaciones opcional */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Observaciones <span className="text-slate-500 text-xs">(opcional)</span>
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="input min-h-[70px] resize-y"
                placeholder="Comentarios adicionales sobre esta firma..."
                maxLength={500}
              />
            </div>

            {/* Checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-lg hover:bg-slate-800/30 transition-colors">
              <input
                type="checkbox"
                checked={aceptaTerminos}
                onChange={(e) => setAceptaTerminos(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-roka-500"
              />
              <span className="text-sm text-slate-300">
                He leído el documento y acepto firmarlo digitalmente con validez legal.
              </span>
            </label>

            {/* Botones */}
            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button
                onClick={() => setPaso('firma')}
                disabled={!aceptaTerminos}
                className="btn-primary flex-1"
              >
                Continuar a firmar
              </button>
            </div>
          </div>
        )}

        {/* Body — Paso 2: firma */}
        {paso === 'firma' && (
          <div className="p-5">
            <SignatureCanvas
              onSave={handleFirmar}
              onCancel={() => setPaso('confirmacion')}
              loading={loading}
            />

            {loading && (
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-400 justify-center">
                <Loader2 size={14} className="animate-spin" />
                Generando hash criptográfico y registrando firma...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Helper para obtener geolocalización con timeout
function obtenerGeolocalizacion() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    const timeout = setTimeout(() => resolve(null), 3000)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeout)
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precision: pos.coords.accuracy,
        })
      },
      () => { clearTimeout(timeout); resolve(null) },
      { timeout: 3000, enableHighAccuracy: false }
    )
  })
}
