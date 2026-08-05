import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList, ArrowLeft, ChevronLeft, ChevronRight,
  RefreshCw, Play, Eye, CheckCircle2, Clock, Zap, AlertCircle, Calendar, X,
} from 'lucide-react'
import api from '../../services/api'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const ESTADO_CFG = {
  programada:    { label: 'Pendiente',    icon: Clock,        bg: 'bg-blue-50 border-blue-200',      text: 'text-blue-700' },
  en_ejecucion:  { label: 'En ejecución', icon: Zap,          bg: 'bg-amber-50 border-amber-200',    text: 'text-amber-700' },
  con_hallazgos: { label: 'Con hallazgos',icon: AlertCircle,  bg: 'bg-orange-50 border-orange-200',  text: 'text-orange-700' },
  ejecutada:     { label: 'Ejecutada',    icon: CheckCircle2, bg: 'bg-emerald-50 border-emerald-200',text: 'text-emerald-700' },
  cerrada:       { label: 'Cerrada',      icon: CheckCircle2, bg: 'bg-gray-100 border-gray-200',     text: 'text-gray-600' },
}

const pctColor = v => v == null ? 'text-gray-300' : v >= 90 ? 'text-emerald-600 font-bold' : v >= 70 ? 'text-amber-600 font-bold' : 'text-red-500 font-bold'

const HOY_ISO = () => new Date().toISOString().slice(0, 10)

function TarjetaInspeccion({ insp, onEjecutar, onVer }) {
  const cfg      = ESTADO_CFG[insp.estado] || ESTADO_CFG.programada
  const EstIcon  = cfg.icon
  const puedeEjecutar = ['programada', 'en_ejecucion'].includes(insp.estado)
  const vencida  = puedeEjecutar && insp.planificada_para &&
                   String(insp.planificada_para).slice(0, 10) < HOY_ISO()

  return (
    <div className={`bg-white rounded-xl border ${cfg.bg} p-4 mb-3 shadow-sm`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
          <ClipboardList size={18} className="text-blue-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 leading-tight truncate">
                {insp.equipoCatalogo?.nombre || insp.titulo}
              </p>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{insp.codigo}</p>
            </div>
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border shrink-0 ${cfg.bg} ${cfg.text}`}>
              <EstIcon size={10} />
              {cfg.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500">
            {insp.area?.nombre && (
              <span className="bg-gray-100 px-2 py-0.5 rounded-full">{insp.area.nombre}</span>
            )}
            {insp.planificada_para && (
              <span className={`flex items-center gap-1 ${vencida ? 'text-red-600 font-semibold' : ''}`}>
                <Calendar size={10}/>
                {format(parseISO(insp.planificada_para), 'dd MMM yyyy', { locale: es })}
              </span>
            )}
            {vencida && (
              <span className="bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-semibold">
                Vencida
              </span>
            )}
            {insp.porcentaje_cumplimiento != null && (
              <span className={`font-semibold ${pctColor(insp.porcentaje_cumplimiento)}`}>
                {Number(insp.porcentaje_cumplimiento).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
        {puedeEjecutar ? (
          <button onClick={() => onEjecutar(insp)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors">
            <Play size={14} />
            {insp.estado === 'programada' ? 'Iniciar inspección' : 'Continuar inspección'}
          </button>
        ) : (
          <button onClick={() => onVer(insp)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-sm font-medium py-2 rounded-lg transition-colors">
            <Eye size={14} />
            Ver resultado
          </button>
        )}
      </div>
    </div>
  )
}

export default function MisInspeccionesPage() {
  const navigate = useNavigate()
  const hoy      = new Date()

  // Modo: null = todas las pendientes, {anio, mes} = filtro por mes
  const [filtroMes, setFiltroMes] = useState(null)
  const [navMes,  setNavMes]  = useState(hoy.getMonth() + 1)
  const [navAnio, setNavAnio] = useState(hoy.getFullYear())
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  const cargar = async () => {
    setLoading(true)
    try {
      const params = filtroMes ? { mes: filtroMes.mes, anio: filtroMes.anio } : {}
      const { data: res } = await api.get('/inspecciones/mis-inspecciones', { params })
      setData(res)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [filtroMes])

  const aplicarMes = () => setFiltroMes({ mes: navMes, anio: navAnio })
  const limpiarMes = () => setFiltroMes(null)

  const cambiarNav = (d) => {
    let m = navMes + d, a = navAnio
    if (m < 1)  { m = 12; a-- }
    if (m > 12) { m = 1;  a++ }
    setNavMes(m); setNavAnio(a)
  }

  const handleEjecutar = (insp) => navigate(`/inspecciones/checklist/${insp.id}`, { state: { from: 'mis-inspecciones' } })
  const handleVer      = (insp) => navigate(`/inspecciones/${insp.id}`, { state: { from: 'mis-inspecciones' } })

  const r = data?.resumen || {}

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList size={20} className="text-blue-600" />
              Mis inspecciones
            </h1>
            <p className="text-xs text-gray-400">
              {filtroMes ? `${MESES_ES[filtroMes.mes - 1]} ${filtroMes.anio}` : 'Todas las pendientes'}
            </p>
          </div>
          <button onClick={cargar} className="p-1.5 rounded-lg hover:bg-gray-100" title="Actualizar">
            <RefreshCw size={18} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Filtro de mes */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <Calendar size={14} className="text-gray-400"/>
            <span className="text-xs font-semibold text-gray-600">Filtrar por mes</span>
            {filtroMes && (
              <button onClick={limpiarMes}
                className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                <X size={11}/> Quitar filtro
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 px-4 py-3">
            <button onClick={() => cambiarNav(-1)} className="p-1 rounded hover:bg-gray-100">
              <ChevronLeft size={16} className="text-gray-500"/>
            </button>
            <span className="flex-1 text-center text-sm font-semibold text-gray-700">
              {MESES_ES[navMes - 1]} {navAnio}
            </span>
            <button onClick={() => cambiarNav(1)} className="p-1 rounded hover:bg-gray-100">
              <ChevronRight size={16} className="text-gray-500"/>
            </button>
            <button onClick={aplicarMes}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filtroMes?.mes === navMes && filtroMes?.anio === navAnio
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}>
              {filtroMes?.mes === navMes && filtroMes?.anio === navAnio ? '✓ Aplicado' : 'Aplicar'}
            </button>
          </div>
        </div>

        {/* KPIs */}
        {data && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { l: 'Total',        v: r.total      || 0, color: 'text-gray-700',    bg: 'bg-white' },
              { l: 'Pendientes',   v: r.programadas|| 0, color: 'text-blue-700',    bg: 'bg-blue-50' },
              { l: 'En ejecución', v: r.en_progreso|| 0, color: 'text-amber-700',   bg: 'bg-amber-50' },
              filtroMes
                ? { l: 'Ejecutadas', v: r.ejecutadas || 0, color: 'text-emerald-700', bg: 'bg-emerald-50' }
                : { l: 'Vencidas',   v: r.vencidas   || 0, color: 'text-red-600',     bg: 'bg-red-50' },
            ].map(({ l, v, color, bg }) => (
              <div key={l} className={`${bg} rounded-xl border border-gray-200 p-3 text-center shadow-sm`}>
                <p className={`text-xl font-black ${color}`}>{v}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <RefreshCw size={28} className="animate-spin mx-auto mb-2" />
            <p className="text-sm">Cargando inspecciones…</p>
          </div>
        ) : data?.inspecciones?.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ClipboardList size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-500">Sin inspecciones asignadas</p>
            <p className="text-sm mt-1 text-gray-400">
              {filtroMes
                ? `No tienes inspecciones para ${MESES_ES[filtroMes.mes - 1]} ${filtroMes.anio}`
                : 'No tienes inspecciones pendientes asignadas'}
            </p>
            {filtroMes && (
              <button onClick={limpiarMes} className="mt-3 text-sm text-blue-600 hover:underline">
                Ver todas las pendientes
              </button>
            )}
          </div>
        ) : (
          <div>
            {(data?.inspecciones || []).map(insp => (
              <TarjetaInspeccion
                key={insp.id}
                insp={insp}
                onEjecutar={handleEjecutar}
                onVer={handleVer}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
