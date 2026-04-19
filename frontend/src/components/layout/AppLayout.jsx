import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import logoRoka from '../../assets/logo-roka.png'
import cabezasaf from '../../assets/cabezasaf.png'
import {
  LayoutDashboard, AlertTriangle, ClipboardList, Search,
  AlertCircle, TrendingUp, Users, HardHat, HeartPulse,
  GraduationCap, Siren, FileSearch, FileText, FolderArchive,
  BarChart3, FileSignature, ChevronRight, ChevronDown,
  LogOut, Bell, RefreshCw, Building2, LayoutGrid,
  UserCog, Truck, Wrench, CalendarRange, BellRing, ScrollText,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { logout } from '../../store/slices/authSlice'
import api from '../../services/api'
import OfflineBanner from '../OfflineBanner'
import { useServiceWorker } from '../../hooks/useServiceWorker'

const GRUPOS = {
  principal:     null,
  operativo:     'Operativo SST',
  gestion:       'Gestión Humana',
  documental:    'Documental',
  activos:       'Activos',
  planeacion:    'Planeación',
  configuracion: 'Configuración',
  sistema:       'Sistema',
}

const GROUP_ORDER = ['principal', 'operativo', 'gestion', 'documental', 'activos', 'planeacion', 'configuracion', 'sistema']

const menu = [
  { to: '/dashboard',               label: 'Dashboard',        icon: LayoutDashboard, group: 'principal' },
  { to: '/iperc',                   label: 'IPERC',              icon: AlertTriangle,   group: 'operativo' },
  { to: '/iperc/gestion',           label: 'IPERC · Gestión',    icon: AlertTriangle,   group: 'operativo', hidden: true },
  { to: '/iperc/procesos',          label: 'IPERC · Procesos',   icon: AlertTriangle,   group: 'operativo', hidden: true },
  { to: '/iperc/peligros',          label: 'IPERC · Peligros',   icon: AlertTriangle,   group: 'operativo', hidden: true },
  { to: '/iperc/evaluacion',        label: 'IPERC · Evaluación', icon: AlertTriangle,   group: 'operativo', hidden: true },
  { to: '/iperc/controles',         label: 'IPERC · Controles',  icon: AlertTriangle,   group: 'operativo', hidden: true },
  { to: '/iperc/riesgo-residual',   label: 'IPERC · Riesgo Residual', icon: AlertTriangle, group: 'operativo', hidden: true },
  { to: '/iperc/puestos',           label: 'IPERC · Puestos',    icon: AlertTriangle,   group: 'operativo', hidden: true },
  { to: '/iperc/continuo',          label: 'IPERC · Continuo',   icon: AlertTriangle,   group: 'operativo', hidden: true },
  { to: '/iperc/integracion',       label: 'IPERC · Integración SST', icon: AlertTriangle, group: 'operativo', hidden: true },
  { to: '/iperc/aprobacion',        label: 'IPERC · Aprobación', icon: AlertTriangle,   group: 'operativo', hidden: true },
  { to: '/iperc/alertas',           label: 'IPERC · Alertas',    icon: AlertTriangle,   group: 'operativo', hidden: true },
  { to: '/iperc/reportes',          label: 'IPERC · Reportes',   icon: AlertTriangle,   group: 'operativo', hidden: true },
  { to: '/iperc/guia',              label: 'IPERC · Guía Referencial', icon: AlertTriangle, group: 'operativo', hidden: true },
  { to: '/iperc/banco',             label: 'IPERC · Banco de Datos', icon: AlertTriangle, group: 'operativo', hidden: true },
  { to: '/iperc/nuevo',             label: 'Nueva Matriz IPERC', icon: AlertTriangle,   group: 'operativo', hidden: true },
  { to: '/ats',                     label: 'ATS',              icon: ClipboardList,   group: 'operativo' },
  { to: '/inspecciones',       label: 'Inspecciones',      icon: Search,      group: 'operativo' },
  { to: '/inspecciones/lista', label: 'Lista inspecciones', icon: ClipboardList, group: 'operativo', hidden: true },
  { to: '/accidentes',              label: 'Accidentes',       icon: AlertCircle,     group: 'operativo' },
  { to: '/seguimiento',             label: 'Seguimiento',      icon: TrendingUp,      group: 'operativo' },
  { to: '/personal',                label: 'Gestión Humana',   icon: Users,           group: 'gestion' },
  { to: '/epps',                    label: 'EPPs',             icon: HardHat,         group: 'gestion' },
  { to: '/epps/inventario',         label: 'Inventario EPPs',  icon: HardHat,         group: 'gestion', hidden: true },
  { to: '/epps/proveedores',        label: 'Proveedores EPP',  icon: HardHat,         group: 'gestion', hidden: true },
  { to: '/epps/mantenimiento',      label: 'Mantenimiento EPP',icon: HardHat,         group: 'gestion', hidden: true },
  { to: '/epps/capacitacion',       label: 'Capacitación EPP', icon: HardHat,         group: 'gestion', hidden: true },
  { to: '/epps/reportes',           label: 'Reportes EPPs',    icon: HardHat,         group: 'gestion', hidden: true },
  { to: '/epps/configuracion',      label: 'Configuración EPPs',icon: HardHat,        group: 'gestion', hidden: true },
  { to: '/salud',                   label: 'Salud / EMO',      icon: HeartPulse,      group: 'gestion' },
  { to: '/capacitaciones',          label: 'Capacitaciones',   icon: GraduationCap,   group: 'gestion' },
  { to: '/simulacros',              label: 'Simulacros',       icon: Siren,           group: 'gestion' },
  { to: '/auditorias',              label: 'Auditorías',       icon: FileSearch,      group: 'gestion' },
  { to: '/formatos',                label: 'Formatos',         icon: FileText,        group: 'documental' },
  { to: '/documentos',              label: 'Documentos',       icon: FolderArchive,   group: 'documental' },
  { to: '/reportes',                label: 'Reportes MINTRA',  icon: BarChart3,       group: 'documental' },
  { to: '/vehiculos',               label: 'Vehículos',        icon: Truck,           group: 'activos' },
  { to: '/equipos',                 label: 'Equipos',          icon: Wrench,          group: 'activos' },
  { to: '/programa',                label: 'Programa SST',     icon: CalendarRange,   group: 'planeacion' },
  { to: '/configuracion/empresa',   label: 'Empresa',          icon: Building2,       group: 'configuracion' },
  { to: '/configuracion/areas',     label: 'Áreas y Cargos',   icon: LayoutGrid,      group: 'configuracion' },
  { to: '/configuracion/usuarios',  label: 'Usuarios',         icon: UserCog,         group: 'configuracion' },
  { to: '/notificaciones',          label: 'Notificaciones',   icon: BellRing,        group: 'sistema' },
  { to: '/auditoria',               label: 'Auditoría Log',    icon: ScrollText,      group: 'sistema' },
]

// Agrupa items por group key para renderizado por sección
const menuByGroup = menu.reduce((acc, item) => {
  if (!acc[item.group]) acc[item.group] = []
  acc[item.group].push(item)
  return acc
}, {})

function useBreadcrumb() {
  const { pathname } = useLocation()

  // Flatten menu incluyendo children
  const flat = menu.flatMap(m => m.children ? m.children.map(c => ({ ...c, group: m.group })) : [m])

  const match = flat
    .filter(m => m.to !== '/dashboard')
    .sort((a, b) => b.to.length - a.to.length)
    .find(m => pathname.startsWith(m.to))
    || (pathname === '/dashboard' ? menu[0] : null)

  if (!match) return []
  const grupo = GRUPOS[match.group]
  return grupo
    ? [{ label: grupo }, { label: match.label }]
    : [{ label: match.label }]
}

export default function AppLayout() {
  const [collapsed, setCollapsed]           = useState(false)
  const [closedGroups, setClosedGroups]     = useState(new Set())
  const [firmasPendientes, setFirmasPendientes] = useState(0)
  const [notifCount, setNotifCount]         = useState(0)
  const user     = useSelector(s => s.auth.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { updateAvailable, applyUpdate } = useServiceWorker()
  const breadcrumb = useBreadcrumb()

  useEffect(() => {
    cargarFirmasPendientes()
    cargarNotifCount()
    const iv = setInterval(() => { cargarFirmasPendientes(); cargarNotifCount() }, 60000)
    return () => clearInterval(iv)
  }, [])

  const cargarFirmasPendientes = async () => {
    try {
      const { data } = await api.get('/firmas/pendientes')
      setFirmasPendientes(Array.isArray(data) ? data.length : (data.total || 0))
    } catch { /* silent */ }
  }

  const cargarNotifCount = async () => {
    try {
      const { data } = await api.get('/notificaciones/conteo')
      setNotifCount(data.no_leidas ?? data.count ?? 0)
    } catch { /* silent */ }
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const toggleGroup = (g) =>
    setClosedGroups(prev => {
      const next = new Set(prev)
      next.has(g) ? next.delete(g) : next.add(g)
      return next
    })

  const initials = [user?.nombres?.[0], user?.apellidos?.[0]]
    .filter(Boolean).join('').toUpperCase() || '?'

  return (
    <div className="flex h-screen bg-[#f5f6fa] text-gray-900">

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={`${collapsed ? 'w-[60px]' : 'w-[240px]'} bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transition-[width] duration-200 ease-in-out overflow-hidden`}
      >
        {/* Logo row */}
        <div className={`h-16 flex items-center flex-shrink-0 border-b border-gray-100 ${collapsed ? 'justify-center px-2' : 'pl-3 pr-2 justify-between'}`}>
          <div className="flex items-center gap-2 min-w-0">
            {collapsed ? (
              <img src={cabezasaf} alt="SST ROKA" className="w-8 h-8 object-contain" />
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <img src={cabezasaf} alt="SST ROKA" className="h-9 w-9 object-contain flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-gray-900 leading-tight">SST ROKA</p>
                  <p className="text-[8px] font-bold text-gray-900 leading-tight tracking-wide">SEGURIDAD SALUD EN EL TRABAJO</p>
                </div>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <PanelLeftClose size={15} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-px">
          {GROUP_ORDER.map(groupKey => {
            const items = menuByGroup[groupKey]
            if (!items) return null
            const label   = GRUPOS[groupKey]
            const isOpen  = !closedGroups.has(groupKey)

            return (
              <div key={groupKey}>
                {/* Group header — solo visible en modo expandido */}
                {label && !collapsed && (
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[9px] font-semibold text-gray-900 uppercase tracking-widest bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    {label}
                    <ChevronDown
                      size={11}
                      className={`transition-transform duration-150 ${isOpen ? '' : '-rotate-90'}`}
                    />
                  </button>
                )}

                {/* Items */}
                {(isOpen || collapsed) && (
                  <div className="space-y-px">
                    {items.filter(i => !i.hidden).map(item => {
                      const Icon = item.icon
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          title={collapsed ? item.label : undefined}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 rounded-lg text-[13px] transition-all duration-100 ${
                              collapsed ? 'justify-center p-2.5' : 'px-2.5 py-[7px]'
                            } ${
                              isActive
                                ? 'bg-roka-50 text-roka-600 font-medium'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <Icon
                                size={16}
                                className={`flex-shrink-0 transition-colors ${isActive ? 'text-roka-500' : ''}`}
                              />
                              {!collapsed && (
                                <>
                                  <span className="flex-1 truncate">{item.label}</span>
                                  {isActive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-roka-500 flex-shrink-0" />
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </NavLink>
                      )
                    })}
                  </div>
                )}

                {/* Espaciado entre grupos */}
                {label && <div className="h-1" />}
              </div>
            )
          })}
        </nav>

        {/* User card / bottom */}
        <div className="border-t border-gray-100 p-2">
          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              className="w-full flex justify-center p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              title="Expandir menú"
            >
              <PanelLeftOpen size={16} />
            </button>
          ) : (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors group">
              <div className="w-7 h-7 rounded-full bg-roka-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 select-none">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate leading-tight">
                  {user?.nombres} {user?.apellidos}
                </p>
                <p className="text-[10px] text-gray-400 truncate leading-tight capitalize">
                  {user?.rol?.replace(/_/g, ' ')}
                </p>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-1 text-gray-300 hover:text-red-500 rounded-md transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        <OfflineBanner />

        {updateAvailable && (
          <div className="flex items-center justify-between gap-3 bg-roka-500/10 border-b border-roka-200 px-5 py-2 flex-shrink-0">
            <span className="text-sm text-roka-700 font-medium">Nueva versión disponible</span>
            <button
              onClick={applyUpdate}
              className="flex items-center gap-1.5 text-xs bg-roka-500 hover:bg-roka-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              <RefreshCw size={12} /> Actualizar ahora
            </button>
          </div>
        )}

        {/* ── Header ── */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-5 flex-shrink-0 gap-4">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-sm min-w-0">
            {breadcrumb.length === 0 ? (
              <span className="font-semibold text-gray-700">Inicio</span>
            ) : (
              breadcrumb.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight size={13} className="text-gray-300 flex-shrink-0" />}
                  <span
                    className={
                      i === breadcrumb.length - 1
                        ? 'font-semibold text-gray-800 truncate'
                        : 'text-gray-400 text-xs truncate'
                    }
                  >
                    {crumb.label}
                  </span>
                </span>
              ))
            )}
          </nav>

          {/* Acciones */}
          <div className="flex items-center gap-1 flex-shrink-0">

            {/* Búsqueda decorativa */}
            <button className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-gray-400 border border-gray-200 rounded-lg hover:border-gray-300 hover:text-gray-600 transition-colors text-xs mr-2">
              <Search size={13} />
              <span>Buscar...</span>
              <kbd className="ml-1 text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-mono border border-gray-200">⌘K</kbd>
            </button>

            {/* Firmas pendientes */}
            <NavLink
              to="/firmas/pendientes"
              className="relative p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              title="Firmas pendientes"
            >
              <FileSignature size={17} />
              {firmasPendientes > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold min-w-[15px] h-[15px] px-0.5 rounded-full flex items-center justify-center leading-none">
                  {firmasPendientes > 9 ? '9+' : firmasPendientes}
                </span>
              )}
            </NavLink>

            {/* Notificaciones */}
            <button
              onClick={() => navigate('/notificaciones')}
              className="relative p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              title="Notificaciones"
            >
              <Bell size={17} />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold min-w-[15px] h-[15px] px-0.5 rounded-full flex items-center justify-center leading-none">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            {/* Cerrar sesión */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 border border-red-200 hover:border-red-300 rounded-lg transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Salir</span>
            </button>

          </div>
        </header>

        {/* ── Contenido ── */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#f5f6fa]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
