import { useState, useEffect } from 'react'
import { X, Download, Loader2, QrCode, Printer } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

/**
 * Modal para mostrar QR de un equipo
 *
 * Props:
 * - equipoId: ID del equipo
 * - onClose: callback al cerrar
 */
export default function QrModal({ equipoId, onClose }) {
  const [loading, setLoading] = useState(true)
  const [qrData, setQrData] = useState(null)

  useEffect(() => {
    cargarQr()
  }, [equipoId])

  const cargarQr = async () => {
    try {
      setLoading(true)
      const { data } = await api.get(`/equipos/${equipoId}/qr-data`)
      setQrData(data)
    } catch (err) {
      console.error('Error cargando QR:', err)
      toast.error('Error al generar código QR')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const descargarQr = async () => {
    try {
      // Descargar imagen desde API externa evitando CORS
      const qrImage = document.getElementById('qr-image')
      const response = await fetch(qrImage.src)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.download = `QR_${qrData.codigo}.png`
      link.href = url
      link.click()

      window.URL.revokeObjectURL(url)
      toast.success('QR descargado')
    } catch (err) {
      console.error('Error descargando QR:', err)
      toast.error('Error al descargar el código QR')
    }
  }

  const copiarUrl = () => {
    navigator.clipboard.writeText(qrData.qr_url)
    toast.success('URL copiada al portapapeles')
  }

  const imprimirEtiqueta = () => {
    // Abrir ventana para imprimir etiqueta (ruta pública - no requiere token)
    const url = `/api/equipos/${equipoId}/etiqueta`
    const printWindow = window.open(url, '_blank')

    if (!printWindow) {
      toast.error('Por favor, permite ventanas emergentes para imprimir')
      return
    }

    toast.success('Abriendo vista de impresión...')
  }

  // URL de API pública para generar QR (temporal - después usaremos librería local)
  const getQrImageUrl = (text) => {
    const size = 300
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">

        {/* Header */}
        <div className="border-b border-slate-800 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-roka-500/15 border border-roka-500/30 flex items-center justify-center">
              <QrCode size={18} className="text-roka-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">Código QR</h2>
              <p className="text-sm text-slate-400">Escanea para acceso rápido</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 size={32} className="animate-spin text-roka-400 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Generando código QR...</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">

            {/* Info del equipo */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Equipo</p>
              <p className="text-white font-semibold">{qrData.nombre}</p>
              <p className="text-sm text-slate-400 mt-0.5">{qrData.codigo}</p>
              {qrData.area && (
                <p className="text-xs text-slate-500 mt-1">{qrData.area}</p>
              )}
            </div>

            {/* QR Code */}
            <div className="bg-white p-6 rounded-xl flex items-center justify-center">
              <img
                id="qr-image"
                src={getQrImageUrl(qrData.qr_text)}
                alt="Código QR"
                className="w-64 h-64"
              />
            </div>

            {/* URL */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">URL del QR</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-slate-300 font-mono bg-slate-900 px-2 py-1.5 rounded truncate">
                  {qrData.qr_url}
                </code>
                <button
                  onClick={copiarUrl}
                  className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                >
                  Copiar
                </button>
              </div>
            </div>

            {/* Instrucciones */}
            <div className="bg-roka-500/5 border border-roka-500/20 rounded-xl p-4">
              <p className="text-sm text-slate-300 mb-2">
                <span className="font-semibold text-roka-400">Instrucciones:</span>
              </p>
              <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
                <li>Descarga o imprime este código QR</li>
                <li>Pégalo en el equipo físico</li>
                <li>Escanea con tu móvil para inspeccionar</li>
              </ol>
            </div>

            {/* Botones */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={imprimirEtiqueta} className="btn-primary flex items-center justify-center gap-2">
                  <Printer size={16} />
                  Imprimir
                </button>
                <button onClick={descargarQr} className="btn-secondary flex items-center justify-center gap-2">
                  <Download size={16} />
                  Descargar
                </button>
              </div>
              <button onClick={onClose} className="w-full py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
