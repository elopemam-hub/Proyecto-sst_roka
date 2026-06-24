import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Package,
  ClipboardCheck,
  FileText,
  History,
  Loader2,
  AlertTriangle,
  CheckCircle,
  MapPin,
} from 'lucide-react'

const FREC_CONFIG = {
  diaria:     { label: 'Inspección Diaria',      sub: 'Check pre-operacional',    color: 'bg-red-600 hover:bg-red-700',     badge: 'bg-red-500/30 text-red-200' },
  semanal:    { label: 'Inspección Semanal',     sub: 'Revisión semanal',         color: 'bg-orange-600 hover:bg-orange-700',badge: 'bg-orange-500/30 text-orange-200' },
  mensual:    { label: 'Inspección Mensual',     sub: 'Revisión mensual completa',color: 'bg-blue-600 hover:bg-blue-700',   badge: 'bg-blue-500/30 text-blue-200' },
  trimestral: { label: 'Inspección Trimestral',  sub: 'Revisión trimestral',      color: 'bg-indigo-600 hover:bg-indigo-700',badge: 'bg-indigo-500/30 text-indigo-200' },
  semestral:  { label: 'Inspección Semestral',   sub: 'Revisión semestral',       color: 'bg-purple-600 hover:bg-purple-700',badge: 'bg-purple-500/30 text-purple-200' },
  anual:      { label: 'Inspección Anual',       sub: 'Revisión anual',           color: 'bg-gray-600 hover:bg-gray-700',   badge: 'bg-gray-500/30 text-gray-200' },
}
import api from '../../services/api'

/**
 * Página landing pública para QR de equipos
 * URL: /qr/{codigo}
 *
 * Muestra menú con opciones:
 * - Inspeccionar equipo
 * - Ver ficha
 * - Ver historial
 */
export default function QrLandingPage() {
  const { codigo } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [equipo, setEquipo] = useState(null)
  const [error, setError] = useState(null)
  const [inspecciones, setInspecciones] = useState([])

  useEffect(() => {
    cargarEquipo()
    capturarGeolocalizacion()
  }, [codigo])

  const cargarEquipo = async () => {
    try {
      setLoading(true)
      const { data } = await api.get(`/qr/${codigo}`)
      setEquipo(data)
      setError(null)

      // Cargar últimas inspecciones
      try {
        const { data: insps } = await api.get(`/equipos/${data.equipo_id}/ultimas-inspecciones`)
        setInspecciones(insps)
      } catch (e) {
        console.log('No se pudieron cargar inspecciones')
      }
    } catch (err) {
      console.error('Error cargando equipo:', err)
      setError(err.response?.data?.error || 'Equipo no encontrado')
    } finally {
      setLoading(false)
    }
  }

  const capturarGeolocalizacion = () => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Esperar a que se cargue el equipo
        setTimeout(() => {
          registrarEscaneo({
            latitud: position.coords.latitude,
            longitud: position.coords.longitude,
            precision_metros: position.coords.accuracy,
          })
        }, 1000)
      },
      (error) => {
        console.log('Geolocalización no disponible:', error.message)
        // Registrar sin geolocalización
        setTimeout(() => registrarEscaneo({}), 1000)
      },
      { timeout: 5000, enableHighAccuracy: false }
    )
  }

  const registrarEscaneo = async (geoData) => {
    if (!equipo) return

    try {
      await api.post('/qr/registrar-escaneo', {
        equipo_id: equipo.equipo_id,
        latitud: geoData.latitud,
        longitud: geoData.longitud,
        precision_metros: geoData.precision_metros,
        accion: 'visualizar',
      })
      console.log('✓ Escaneo registrado')
    } catch (err) {
      console.log('Error registrando escaneo:', err)
    }
  }

  const handleAccion = (path, accion) => {
    // Registrar acción antes de navegar
    registrarAccion(accion)

    // Si el usuario está autenticado, navega directamente
    // Si no, redirige a login con returnUrl
    const token = localStorage.getItem('token')
    if (token) {
      navigate(path)
    } else {
      navigate(`/login?returnUrl=${encodeURIComponent(path)}`)
    }
  }

  const registrarAccion = async (accion) => {
    try {
      await api.post('/qr/registrar-escaneo', {
        equipo_id: equipo.equipo_id,
        accion,
      })
    } catch (err) {
      // Silent fail
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-roka-400 mx-auto mb-4" />
          <p className="text-slate-300">Cargando información del equipo...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full text-center">
          <AlertTriangle size={48} className="text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Equipo no encontrado</h2>
          <p className="text-slate-400 mb-1">Código escaneado:</p>
          <code className="text-roka-400 font-mono text-lg">{codigo}</code>
          <p className="text-slate-500 text-sm mt-4">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">

        {/* Header con info del equipo */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-roka-500/15 border border-roka-500/30 flex items-center justify-center shrink-0">
              <Package size={24} className="text-roka-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-slate-500">{equipo.codigo}</span>
                {equipo.estado === 'operativo' && (
                  <CheckCircle size={14} className="text-emerald-400" />
                )}
              </div>
              <h1 className="text-xl font-bold text-white mb-1 truncate">
                {equipo.nombre}
              </h1>
              <p className="text-sm text-slate-400">{equipo.catalogo}</p>

              {equipo.area && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                  <MapPin size={12} />
                  <span>{equipo.area}</span>
                </div>
              )}

              {/* Badges de frecuencias asignadas */}
              {equipo.plantillas?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {equipo.plantillas.map(p => {
                    const cfg = FREC_CONFIG[p.frecuencia]
                    return cfg ? (
                      <span key={p.id} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                        {cfg.label.replace('Inspección ', '')}
                      </span>
                    ) : null
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Últimas inspecciones */}
        {inspecciones.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <History size={16} className="text-slate-400" />
              Últimas inspecciones
            </h3>
            <div className="space-y-2">
              {inspecciones.map((insp, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-slate-900/50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      insp.estado === 'ejecutada' ? 'bg-emerald-400' :
                      insp.estado === 'con_hallazgos' ? 'bg-amber-400' :
                      'bg-slate-400'
                    }`} />
                    <span className="text-slate-300 capitalize">{insp.estado.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="text-slate-500">
                    {insp.ejecutada_en ? new Date(insp.ejecutada_en).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botones de inspección — uno por plantilla/frecuencia */}
        <div className="space-y-2">
          {equipo.plantillas?.length > 0 ? (
            equipo.plantillas.map(p => {
              const cfg = FREC_CONFIG[p.frecuencia] || {
                label: p.nombre || 'Inspeccionar',
                sub:   p.frecuencia ? `Frecuencia ${p.frecuencia}` : 'Iniciar inspección',
                color: 'bg-roka-600 hover:bg-roka-700',
              }
              return (
                <button key={p.id}
                  onClick={() => handleAccion(p.url, 'inspeccionar')}
                  className={`w-full ${cfg.color} text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-between group`}
                >
                  <div className="flex items-center gap-3">
                    <ClipboardCheck size={24} />
                    <div className="text-left">
                      <p className="font-bold">{cfg.label}</p>
                      <p className="text-xs opacity-80">{p.nombre || cfg.sub}</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )
            })
          ) : (
            /* Sin plantilla asignada — botón genérico */
            <button
              onClick={() => handleAccion(`/inspecciones/nueva?equipo_id=${equipo.equipo_id}`, 'inspeccionar')}
              className="w-full bg-roka-600 hover:bg-roka-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <ClipboardCheck size={24} />
                <div className="text-left">
                  <p className="font-bold">Inspeccionar equipo</p>
                  <p className="text-xs text-roka-200 opacity-90">Iniciar nueva inspección</p>
                </div>
              </div>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          <button
            onClick={() => handleAccion(equipo.acciones.ver_ficha, 'ver_ficha')}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <FileText size={20} />
              <div className="text-left">
                <p className="font-semibold">Ver ficha completa</p>
                <p className="text-xs text-slate-400">Detalles y especificaciones</p>
              </div>
            </div>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => handleAccion(equipo.acciones.historial, 'ver_historial')}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <History size={20} />
              <div className="text-left">
                <p className="font-semibold">Ver historial</p>
                <p className="text-xs text-slate-400">Inspecciones y mantenimientos</p>
              </div>
            </div>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-slate-500">
            SST ROKA · Sistema de Seguridad y Salud en el Trabajo
          </p>
        </div>
      </div>
    </div>
  )
}
