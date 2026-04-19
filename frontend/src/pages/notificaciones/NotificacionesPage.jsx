import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, AlertTriangle, FileText, Users, Truck, Wrench, Calendar } from 'lucide-react'
import api from '../../services/api'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const MODULO_ICON = {
  accidentes:    AlertTriangle,
  inspecciones:  FileText,
  personal:      Users,
  vehiculos:     Truck,
  equipos:       Wrench,
  programa:      Calendar,
}

const MODULO_LINK = {
  accidentes:   (id) => `/accidentes/${id}`,
  inspecciones: (id) => `/inspecciones/${id}`,
  personal:     (id) => `/personal/${id}`,
  vehiculos:    (id) => `/vehiculos/${id}/editar`,
  equipos:      (id) => `/equipos/${id}/editar`,
  programa:     (id) => `/programa/${id}`,
}

function agruparPorFecha(notifs) {
  const hoy   = new Date(); hoy.setHours(0, 0, 0, 0)
  const ayer  = new Date(hoy); ayer.setDate(ayer.getDate() - 1)
  const semana = new Date(hoy); semana.setDate(semana.getDate() - 7)
  const grupos = { 'Hoy': [], 'Ayer': [], 'Esta semana': [], 'Anteriores': [] }
  for (const n of notifs) {
    const d = new Date(n.created_at); d.setHours(0, 0, 0, 0)
    if (d >= hoy)        grupos['Hoy'].push(n)
    else if (d >= ayer)  grupos['Ayer'].push(n)
    else if (d >= semana) grupos['Esta semana'].push(n)
    else                 grupos['Anteriores'].push(n)
  }
  return grupos
}

export default function NotificacionesPage() {
  const navigate = useNavigate()
  const [notifs, setNotifs]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [filtro, setFiltro]     = useState('todas')
  const [filtroMod, setFiltroMod] = useState('')
  const [page, setPage]         = useState(1)
  const [meta, setMeta]         = useState(null)

  useEffect(() => { cargar(1) }, [filtro, filtroMod])

  const cargar = async (p = page) => {
    setLoading(true)
    try {
      const params = { page: p }
      if (filtro === 'no_leidas') params.leida = 0
      if (filtroMod) params.modulo = filtroMod
      const { data } = await api.get('/notificaciones', { params })
      setNotifs(data.data || data)
      setMeta(data.meta || null)
      setPage(p)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const marcarLeida = async (id) => {
    try {
      await api.patch(`/notificaciones/${id}/leida`)
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
    } catch { /* silent */ }
  }

  const marcarTodas = async () => {
    try {
      await api.patch('/notificaciones/todas-leidas')
      setNotifs(prev => prev.map(n => ({ ...n, leida: true })))
    } catch { /* silent */ }
  }

  const eliminar = async (id) => {
    try {
      await api.delete(`/notificaciones/${id}`)
      setNotifs(prev => prev.filter(n => n.id !== id))
    } catch { /* silent */ }
  }

  const handleClick = (n) => {
    if (!n.leida) marcarLeida(n.id)
    const getLink = MODULO_LINK[n.modulo]
    if (getLink && n.referencia_id) navigate(getLink(n.referencia_id))
  }

  const grupos = agruparPorFecha(notifs)
  const modulosUnicos = [...new Set(notifs.map(n => n.modulo).filter(Boolean))]

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-gray-500 text-sm mt-1">Centro de alertas y avisos del sistema</p>
        </div>
        <button onClick={marcarTodas}
          className="flex items-center gap-2 text-sm text-gray-600 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50">
          <CheckCheck size={15} /> Marcar todas leídas
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[['todas', 'Todas'], ['no_leidas', 'No leídas']].map(([val, label]) => (
            <button key={val} onClick={() => setFiltro(val)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filtro === val ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
        {modulosUnicos.length > 0 && (
          <select value={filtroMod} onChange={e => setFiltroMod(e.target.value)}
            className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-roka-500">
            <option value="">Todos los módulos</option>
            {modulosUnicos.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <Bell size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">No hay notificaciones</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grupos).map(([grupo, items]) => {
            if (!items.length) return null
            return (
              <div key={grupo}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{grupo}</p>
                <div className="space-y-2">
                  {items.map(n => {
                    const Icon = MODULO_ICON[n.modulo] || Bell
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleClick(n)}
                        className={`bg-white rounded-xl border shadow-sm p-4 flex items-start gap-3 cursor-pointer hover:shadow-md transition-shadow ${n.leida ? 'border-gray-200' : 'border-roka-200 bg-roka-50/30'}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${n.leida ? 'bg-gray-100' : 'bg-roka-100'}`}>
                          <Icon size={16} className={n.leida ? 'text-gray-400' : 'text-roka-600'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm ${n.leida ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>{n.titulo}</p>
                            {!n.leida && <span className="text-[10px] bg-roka-500 text-white px-1.5 py-0.5 rounded-full flex-shrink-0">Nueva</span>}
                          </div>
                          {n.mensaje && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.mensaje}</p>}
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                          </p>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); eliminar(n.id) }}
                          className="text-gray-300 hover:text-red-400 text-xs flex-shrink-0 mt-0.5">✕</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Paginación */}
      {meta && meta.last_page > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: meta.last_page }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => cargar(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium ${p === page ? 'bg-roka-500 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
