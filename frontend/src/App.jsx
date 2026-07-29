import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { ROLES_CONFIG } from './utils/roles'
import { fetchMe, selectInitialized } from './store/slices/authSlice'

import AppLayout from './components/layout/AppLayout'
import ErrorBoundary from './components/ErrorBoundary'

// Páginas críticas — carga inmediata
import LoginPage from './pages/auth/LoginPage'

// Lazy loading — todas las demás páginas
const DashboardPage      = lazy(() => import('./pages/dashboard/DashboardPage'))
const NotFoundPage       = lazy(() => import('./pages/NotFoundPage'))

// QR Landing (público)
const QrLandingPage      = lazy(() => import('./pages/qr/QrLandingPage'))

// Fase 2 — IPERC
const IpercDashboardPage      = lazy(() => import('./pages/iperc/IpercDashboardPage'))
const IpercListPage           = lazy(() => import('./pages/iperc/IpercListPage'))
const IpercFormPage           = lazy(() => import('./pages/iperc/IpercFormPage'))
const IpercDetailPage         = lazy(() => import('./pages/iperc/IpercDetailPage'))
const IpercRiesgoResidualPage = lazy(() => import('./pages/iperc/IpercRiesgoResidualPage'))
const IpercAlertasPage        = lazy(() => import('./pages/iperc/IpercAlertasPage'))
const IpercReportesPage       = lazy(() => import('./pages/iperc/IpercReportesPage'))
const IpercBancoPage          = lazy(() => import('./pages/iperc/IpercBancoPage'))
const IpercTablaPage          = lazy(() => import('./pages/iperc/IpercTablaPage'))

// Fase 2 — ATS
const AtsDashboardPage   = lazy(() => import('./pages/ats/AtsDashboardPage'))
const AtsListPage        = lazy(() => import('./pages/ats/AtsListPage'))
const AtsFormPage        = lazy(() => import('./pages/ats/AtsFormPage'))
const AtsDetailPage      = lazy(() => import('./pages/ats/AtsDetailPage'))

// Fase 2 — Firmas
const FirmasPendientesPage = lazy(() => import('./pages/firmas/FirmasPendientesPage'))

// Fase 3 — Inspecciones
const InspeccionDashboardPage = lazy(() => import('./pages/inspecciones/InspeccionDashboardPage'))
const InspeccionListPage      = lazy(() => import('./pages/inspecciones/InspeccionListPage'))
const InspeccionProgramarPage = lazy(() => import('./pages/inspecciones/InspeccionProgramarPage'))
const InspeccionDiariaPage       = lazy(() => import('./pages/inspecciones/InspeccionDiariaPage'))
const InspeccionTablaDiariaPage  = lazy(() => import('./pages/inspecciones/InspeccionTablaDiariaPage'))
const InspeccionTablaMensualPage = lazy(() => import('./pages/inspecciones/InspeccionTablaMensualPage'))
const InspeccionMensualPage      = lazy(() => import('./pages/inspecciones/InspeccionMensualPage'))
const InspeccionFormPage   = lazy(() => import('./pages/inspecciones/InspeccionFormPage'))
const InspeccionDetailPage = lazy(() => import('./pages/inspecciones/InspeccionDetailPage'))
const InspeccionAlertasPage = lazy(() => import('./pages/inspecciones/InspeccionAlertasPage'))

// Inspecciones v2 — Checklist dinámico por catálogo + wizard general
const MisInspeccionesPage       = lazy(() => import('./pages/inspecciones/MisInspeccionesPage'))
const KpiEquiposPage                = lazy(() => import('./pages/inspecciones/KpiEquiposPage'))
const ExtintorDashboardPage         = lazy(() => import('./pages/inspecciones/ExtintorDashboardPage'))
const EquipoCatalogListaPage        = lazy(() => import('./pages/inspecciones/EquipoCatalogListaPage'))
const EquipoCatalogDashboardPage    = lazy(() => import('./pages/inspecciones/EquipoCatalogDashboardPage'))
const InspeccionChecklistWizard = lazy(() => import('./pages/inspecciones/InspeccionChecklistWizard'))
const InspeccionGeneralWizard   = lazy(() => import('./pages/inspecciones/InspeccionGeneralWizard'))
const InspeccionEquiposPage     = lazy(() => import('./pages/inspecciones/InspeccionEquiposPage'))
const InspeccionPreguntasPage        = lazy(() => import('./pages/inspecciones/InspeccionPreguntasPage'))
const BancoPreguntasImportExportPage = lazy(() => import('./pages/inspecciones/BancoPreguntasImportExportPage'))

// Fase 3 — Accidentes
const AccidenteListPage    = lazy(() => import('./pages/accidentes/AccidenteListPage'))
const AccidenteFormPage    = lazy(() => import('./pages/accidentes/AccidenteFormPage'))
const AccidenteDetailPage  = lazy(() => import('./pages/accidentes/AccidenteDetailPage'))

// Fase 3 — Seguimiento
const SeguimientoListPage   = lazy(() => import('./pages/seguimiento/SeguimientoListPage'))
const SeguimientoFormPage   = lazy(() => import('./pages/seguimiento/SeguimientoFormPage'))
const SeguimientoDetailPage = lazy(() => import('./pages/seguimiento/SeguimientoDetailPage'))

// Fase 4 — Personal
const PersonalListPage         = lazy(() => import('./pages/personal/PersonalListPage'))
const PersonalFormPage         = lazy(() => import('./pages/personal/PersonalFormPage'))
const PersonalDetailPage       = lazy(() => import('./pages/personal/PersonalDetailPage'))
const PersonalImportExportPage = lazy(() => import('./pages/personal/PersonalImportExportPage'))

// Fase 4 — EPPs
const EppDashboardPage     = lazy(() => import('./pages/epps/EppDashboardPage'))
const EppListPage          = lazy(() => import('./pages/epps/EppListPage'))
const EppFormPage          = lazy(() => import('./pages/epps/EppFormPage'))
const EppEntregaPage       = lazy(() => import('./pages/epps/EppEntregaPage'))
const EppProveedoresPage   = lazy(() => import('./pages/epps/EppProveedoresPage'))
const EppMantenimientoPage = lazy(() => import('./pages/epps/EppMantenimientoPage'))
const EppReportesPage      = lazy(() => import('./pages/epps/EppReportesPage'))
const EppConfiguracionPage     = lazy(() => import('./pages/epps/EppConfiguracionPage'))
const EppInventarioInicialPage = lazy(() => import('./pages/epps/EppInventarioInicialPage'))
const EppAlertasPage           = lazy(() => import('./pages/epps/EppAlertasPage'))
const EppIngresosPage          = lazy(() => import('./pages/epps/EppIngresosPage'))

// Fase 4 — Salud
const SaludListPage          = lazy(() => import('./pages/salud/SaludListPage'))
const SaludFormPage          = lazy(() => import('./pages/salud/SaludFormPage'))
const SaludDetailPage        = lazy(() => import('./pages/salud/SaludDetailPage'))
const SaludDashboardPage     = lazy(() => import('./pages/salud/SaludDashboardPage'))
const MiPanelMedicoPage      = lazy(() => import('./pages/salud/MiPanelMedicoPage'))
const MiFichaMedicaPage      = lazy(() => import('./pages/salud/MiFichaMedicaPage'))
const FichaMedicaFormPage    = lazy(() => import('./pages/salud/FichaMedicaFormPage'))
const FichasMedicasListPage  = lazy(() => import('./pages/salud/FichasMedicasListPage'))
const SaludDocumentosPage    = lazy(() => import('./pages/salud/SaludDocumentosPage'))
const CronogramaMedicoPage   = lazy(() => import('./pages/salud/CronogramaMedicoPage'))
const SaludImportPage        = lazy(() => import('./pages/salud/SaludImportPage'))
const SaludCitasPage         = lazy(() => import('./pages/salud/SaludCitasPage'))
const CertificadoAptitudPage = lazy(() => import('./pages/salud/CertificadoAptitudPage'))

// Fase 5 — Capacitaciones
const CapacitacionListPage         = lazy(() => import('./pages/capacitaciones/CapacitacionListPage'))
const CapacitacionFormPage         = lazy(() => import('./pages/capacitaciones/CapacitacionFormPage'))
const CapacitacionDetailPage       = lazy(() => import('./pages/capacitaciones/CapacitacionDetailPage'))
const CapacitacionDashboardPage    = lazy(() => import('./pages/capacitaciones/CapacitacionDashboardPage'))
const MatrizTrabajadoresPage       = lazy(() => import('./pages/capacitaciones/MatrizTrabajadoresPage'))
const CronogramaAnualPage          = lazy(() => import('./pages/capacitaciones/CronogramaAnualPage'))
const MisCapacitacionesPage          = lazy(() => import('./pages/capacitaciones/MisCapacitacionesPage'))
const CapacitacionImportExportPage   = lazy(() => import('./pages/capacitaciones/CapacitacionImportExportPage'))

// Fase 5 — Simulacros
const SimulacroDashboardPage     = lazy(() => import('./pages/simulacros/SimulacroDashboardPage'))
const SimulacroImportExportPage  = lazy(() => import('./pages/simulacros/SimulacroImportExportPage'))
const SimulacroListPage      = lazy(() => import('./pages/simulacros/SimulacroListPage'))
const SimulacroFormPage      = lazy(() => import('./pages/simulacros/SimulacroFormPage'))
const SimulacroDetailPage    = lazy(() => import('./pages/simulacros/SimulacroDetailPage'))

// Fase 5 — Auditorías
const AuditoriaListPage   = lazy(() => import('./pages/auditorias/AuditoriaListPage'))
const AuditoriaFormPage   = lazy(() => import('./pages/auditorias/AuditoriaFormPage'))
const AuditoriaDetailPage = lazy(() => import('./pages/auditorias/AuditoriaDetailPage'))

// Fase 6 — Formatos
const FormatoListPage                    = lazy(() => import('./pages/formatos/FormatoListPage'))
const FormatoFormPage                    = lazy(() => import('./pages/formatos/FormatoFormPage'))
const FormatoDetailPage                  = lazy(() => import('./pages/formatos/FormatoDetailPage'))
const FormatoBibliotecaPage              = lazy(() => import('./pages/formatos/FormatoBibliotecaPage'))
const FormatoCapacitacionImpresionPage   = lazy(() => import('./pages/formatos/FormatoCapacitacionImpresionPage'))

// Fase 6 — Documentos
const DocumentoListPage   = lazy(() => import('./pages/documentos/DocumentoListPage'))
const DocumentoFormPage   = lazy(() => import('./pages/documentos/DocumentoFormPage'))
const DocumentoDetailPage = lazy(() => import('./pages/documentos/DocumentoDetailPage'))

// Fase 7 — Reportes MINTRA
const ReportesPage = lazy(() => import('./pages/reportes/ReportesPage'))

// Fase 9 — Configuración
const EmpresaPage  = lazy(() => import('./pages/configuracion/EmpresaPage'))
const AreasPage    = lazy(() => import('./pages/configuracion/AreasPage'))
const UsuariosPage  = lazy(() => import('./pages/configuracion/UsuariosPage'))
const PermisosPage  = lazy(() => import('./pages/configuracion/PermisosPage'))

// Fase 9 — Vehículos
const VehiculoListPage = lazy(() => import('./pages/vehiculos/VehiculoListPage'))
const VehiculoFormPage = lazy(() => import('./pages/vehiculos/VehiculoFormPage'))

// Fase 9 — Equipos
const EquipoListPage            = lazy(() => import('./pages/equipos/EquipoListPage'))
const EquipoFormPage            = lazy(() => import('./pages/equipos/EquipoFormPage'))
const EquipoTiposPage           = lazy(() => import('./pages/equipos/EquipoTiposPage'))
const EquipoProgramaPage        = lazy(() => import('./pages/equipos/EquipoProgramaPage'))
const SubmodulosPage            = lazy(() => import('./pages/equipos/SubmodulosPage'))
const EquipoInventarioPage      = lazy(() => import('./pages/equipos/EquipoInventarioPage'))
const EquipoEmergenciaPage      = lazy(() => import('./pages/equipos/EquipoEmergenciaPage'))
const EquipoInventarioAreaPage  = lazy(() => import('./pages/equipos/EquipoInventarioAreaPage'))
const EquipoCertificadosPage    = lazy(() => import('./pages/equipos/EquipoCertificadosPage'))
const EquipoCertificadosAlertasPage = lazy(() => import('./pages/equipos/EquipoCertificadosAlertasPage'))
const MisEquiposHoyPage             = lazy(() => import('./pages/equipos/MisEquiposHoyPage'))
const EquipoAsignacionPage          = lazy(() => import('./pages/equipos/EquipoAsignacionPage'))
const EquipoAsignacionConfigPage    = lazy(() => import('./pages/equipos/EquipoAsignacionConfigPage'))

// Sustancias Peligrosas
const SustanciaListPage              = lazy(() => import('./pages/sustancias/SustanciaListPage'))
const SustanciaFormPage              = lazy(() => import('./pages/sustancias/SustanciaFormPage'))
const SustanciaDetailPage            = lazy(() => import('./pages/sustancias/SustanciaDetailPage'))
const SustanciaDashboardPage         = lazy(() => import('./pages/sustancias/SustanciaDashboardPage'))
const SustanciaEtiquetaPage          = lazy(() => import('./pages/sustancias/SustanciaEtiquetaPage'))
const SustanciaIncompatibilidadesPage= lazy(() => import('./pages/sustancias/SustanciaIncompatibilidadesPage'))
const SustanciaMovimientosPage       = lazy(() => import('./pages/sustancias/SustanciaMovimientosPage'))
const SustanciaImportPage            = lazy(() => import('./pages/sustancias/SustanciaImportPage'))
const SustanciaInventarioPage        = lazy(() => import('./pages/sustancias/SustanciaInventarioPage'))

// Fase 9 — Programa SST
const ProgramaListPage   = lazy(() => import('./pages/programa/ProgramaListPage'))
const ProgramaDetailPage = lazy(() => import('./pages/programa/ProgramaDetailPage'))
const ProgramaFormPage   = lazy(() => import('./pages/programa/ProgramaFormPage'))

// Fase 9 — Notificaciones
const NotificacionesPage = lazy(() => import('./pages/notificaciones/NotificacionesPage'))

// Fase 9 — Auditoría de sistema
const AuditoriaLogPage = lazy(() => import('./pages/auditoria/AuditoriaLogPage'))

// Sin acceso
const SinAccesoPage = lazy(() => import('./pages/SinAccesoPage'))

// Spinner de transición de ruta
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function AppInitializer({ children }) {
  const dispatch    = useDispatch()
  const token       = useSelector(s => s.auth.token)
  const initialized = useSelector(selectInitialized)

  useEffect(() => {
    if (token && !initialized) {
      dispatch(fetchMe())
    }
  }, [token, initialized, dispatch])

  // Mientras se valida el token muestra spinner en lugar de redirigir
  if (token && !initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="w-10 h-10 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return children
}

function RequireAuth({ children }) {
  const token       = useSelector(s => s.auth.token)
  const initialized = useSelector(selectInitialized)
  // Si hay token pero aún no se validó, no redirigir todavía
  if (token && !initialized) return null
  if (!token) return <Navigate to="/login" replace />
  return children
}

function RequireRol({ modulos, children }) {
  const user        = useSelector(s => s.auth.user)
  const initialized = useSelector(selectInitialized)
  const token       = useSelector(s => s.auth.token)
  // Esperar a que fetchMe termine antes de evaluar el rol
  if (token && !initialized) return null
  const rol = user?.rol
  if (!rol) return <Navigate to="/login" replace />
  const cfg = ROLES_CONFIG[rol]
  const ok = cfg?.modulos?.includes('*') || modulos.some(m => cfg?.modulos?.includes(m))
  if (!ok) return <Navigate to="/sin-acceso" replace />
  return children
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInitializer>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/qr/:codigo" element={<QrLandingPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />

            <Route path="dashboard" element={<DashboardPage />} />

            {/* IPERC — Dashboard principal */}
            <Route path="iperc"                      element={<IpercDashboardPage />} />
            <Route path="iperc/gestion"              element={<IpercListPage />} />
            <Route path="iperc/nuevo"                element={<IpercFormPage />} />
            <Route path="iperc/riesgo-residual"      element={<IpercRiesgoResidualPage />} />
            <Route path="iperc/alertas"              element={<IpercAlertasPage />} />
            <Route path="iperc/reportes"             element={<IpercReportesPage />} />
            <Route path="iperc/banco"                element={<IpercBancoPage />} />
            <Route path="iperc/tabla"                element={<IpercTablaPage />} />
            <Route path="iperc/:id"                  element={<IpercDetailPage />} />
            <Route path="iperc/:id/editar"           element={<IpercFormPage />} />

            {/* ATS */}
            <Route path="ats"                  element={<AtsDashboardPage />} />
            <Route path="ats/gestion"          element={<AtsListPage />} />
            <Route path="ats/nuevo"            element={<AtsFormPage />} />
            <Route path="ats/:id"              element={<AtsDetailPage />} />
            <Route path="ats/:id/editar"       element={<AtsFormPage />} />

            {/* Firmas */}
            <Route path="firmas/pendientes"    element={<FirmasPendientesPage />} />

            {/* Inspecciones */}
            <Route path="inspecciones"                        element={<InspeccionDashboardPage />} />
            <Route path="inspecciones/lista"                  element={<InspeccionListPage />} />
            <Route path="inspecciones/programar"             element={<InspeccionProgramarPage />} />
            <Route path="inspecciones/diarias"              element={<InspeccionDiariaPage />} />
            <Route path="inspecciones/tabla-diaria"         element={<InspeccionTablaDiariaPage />} />
            <Route path="inspecciones/tabla-mensual"        element={<InspeccionTablaMensualPage />} />
            <Route path="inspecciones/mensual"              element={<InspeccionMensualPage />} />
            <Route path="inspecciones/mis-inspecciones"     element={<MisInspeccionesPage />} />
            <Route path="inspecciones/kpi-equipos"          element={<KpiEquiposPage />} />
            <Route path="inspecciones/extintores-dashboard"   element={<ExtintorDashboardPage />} />
            <Route path="inspecciones/catalogo"               element={<EquipoCatalogListaPage />} />
            <Route path="inspecciones/catalogo/:catalogoId/dashboard" element={<EquipoCatalogDashboardPage />} />
            <Route path="inspecciones/alertas"                element={<InspeccionAlertasPage />} />
            <Route path="inspecciones/nueva"                  element={<InspeccionFormPage />} />
            <Route path="inspecciones/nueva/general"          element={<InspeccionGeneralWizard />} />
            <Route path="inspecciones/checklist/nueva"        element={<InspeccionChecklistWizard />} />
            <Route path="inspecciones/checklist/:id"          element={<InspeccionChecklistWizard />} />
            {/* Redirigir rutas antiguas al nuevo hogar en Módulo Equipos */}
            <Route path="inspecciones/equipos"            element={<Navigate to="/equipos/catalogo" replace />} />
            <Route path="inspecciones/preguntas"          element={<Navigate to="/equipos/preguntas" replace />} />
            <Route path="inspecciones/preguntas/importar" element={<Navigate to="/equipos/preguntas/importar" replace />} />
            <Route path="inspecciones/:id"                    element={<InspeccionDetailPage />} />
            <Route path="inspecciones/:id/editar"             element={<InspeccionFormPage />} />

            {/* Accidentes */}
            <Route path="accidentes"                element={<AccidenteListPage />} />
            <Route path="accidentes/nuevo"          element={<AccidenteFormPage />} />
            <Route path="accidentes/:id"            element={<AccidenteDetailPage />} />
            <Route path="accidentes/:id/editar"     element={<AccidenteFormPage />} />

            {/* Seguimiento */}
            <Route path="seguimiento"               element={<SeguimientoListPage />} />
            <Route path="seguimiento/nueva"         element={<SeguimientoFormPage />} />
            <Route path="seguimiento/:id"           element={<SeguimientoDetailPage />} />
            <Route path="seguimiento/:id/editar"    element={<SeguimientoFormPage />} />

            {/* Personal */}
            <Route path="personal"                  element={<PersonalListPage />} />
            <Route path="personal/importar"         element={<PersonalImportExportPage />} />
            <Route path="personal/nuevo"            element={<PersonalFormPage />} />
            <Route path="personal/:id"              element={<PersonalDetailPage />} />
            <Route path="personal/:id/editar"       element={<PersonalFormPage />} />

            {/* EPPs */}
            <Route path="epps"                      element={<EppDashboardPage />} />
            <Route path="epps/alertas"              element={<EppAlertasPage />} />
            <Route path="epps/inventario"           element={<EppListPage />} />
            <Route path="epps/nuevo"                element={<EppFormPage />} />
            <Route path="epps/:id/editar"           element={<EppFormPage />} />
            <Route path="epps/ingresos"             element={<EppIngresosPage />} />
            <Route path="epps/entrega"              element={<EppEntregaPage />} />
            <Route path="epps/proveedores"          element={<EppProveedoresPage />} />
            <Route path="epps/mantenimiento"        element={<EppMantenimientoPage />} />
            <Route path="epps/reportes"             element={<EppReportesPage />} />
            <Route path="epps/configuracion"        element={<EppConfiguracionPage />} />
            <Route path="epps/inventario-inicial"   element={<EppInventarioInicialPage />} />

            {/* Salud */}
            {/* Salud / EMO */}
            <Route path="salud"                            element={<SaludDashboardPage />} />
            <Route path="salud/lista"                      element={<SaludListPage />} />
            <Route path="salud/mi-panel"                   element={<MiPanelMedicoPage />} />
            <Route path="salud/mi-ficha"                   element={<MiFichaMedicaPage />} />
            <Route path="salud/ficha-medica"               element={<FichaMedicaFormPage />} />
            <Route path="salud/fichas-medicas"             element={<FichasMedicasListPage />} />
            <Route path="salud/documentos"                 element={<SaludDocumentosPage />} />
            <Route path="salud/cronograma"                 element={<CronogramaMedicoPage />} />
            <Route path="salud/importar"                   element={<SaludImportPage />} />
            <Route path="salud/citas"                      element={<SaludCitasPage />} />
            <Route path="salud/certificado/:personalId"    element={<CertificadoAptitudPage />} />
            <Route path="salud/nuevo"                      element={<SaludFormPage />} />
            <Route path="salud/:id"                        element={<SaludDetailPage />} />
            <Route path="salud/:id/editar"                 element={<SaludFormPage />} />

            {/* Capacitaciones */}
            <Route path="capacitaciones"                          element={<CapacitacionDashboardPage />} />
            <Route path="capacitaciones/lista"                    element={<CapacitacionListPage />} />
            <Route path="capacitaciones/matriz"                   element={<MatrizTrabajadoresPage />} />
            <Route path="capacitaciones/cronograma"               element={<CronogramaAnualPage />} />
            <Route path="capacitaciones/mis-capacitaciones"       element={<MisCapacitacionesPage />} />
            <Route path="capacitaciones/importar"                 element={<CapacitacionImportExportPage />} />
            <Route path="capacitaciones/nueva"                    element={<CapacitacionFormPage />} />
            <Route path="capacitaciones/:id"                      element={<CapacitacionDetailPage />} />
            <Route path="capacitaciones/:id/editar"               element={<CapacitacionFormPage />} />

            {/* Simulacros */}
            <Route path="simulacros"                  element={<SimulacroDashboardPage />} />
            <Route path="simulacros/lista"            element={<SimulacroListPage />} />
            <Route path="simulacros/importar"         element={<SimulacroImportExportPage />} />
            <Route path="simulacros/nuevo"            element={<SimulacroFormPage />} />
            <Route path="simulacros/:id"              element={<SimulacroDetailPage />} />
            <Route path="simulacros/:id/editar"       element={<SimulacroFormPage />} />

            {/* Auditorías */}
            <Route path="auditorias"                  element={<AuditoriaListPage />} />
            <Route path="auditorias/nueva"            element={<AuditoriaFormPage />} />
            <Route path="auditorias/:id"              element={<AuditoriaDetailPage />} />
            <Route path="auditorias/:id/editar"       element={<AuditoriaFormPage />} />

            {/* Formatos RM 050-2013-TR */}
            <Route path="formatos"                    element={<FormatoListPage />} />
            <Route path="formatos/biblioteca"         element={<FormatoBibliotecaPage />} />
            <Route path="formatos/nuevo"              element={<FormatoFormPage />} />
            <Route path="formatos/:id"                element={<FormatoDetailPage />} />
            <Route path="formatos/:id/editar"         element={<FormatoFormPage />} />
            <Route path="formatos/capacitacion/:id/imprimir" element={<FormatoCapacitacionImpresionPage />} />

            {/* Documentos SST */}
            <Route path="documentos"                  element={<DocumentoListPage />} />
            <Route path="documentos/nuevo"            element={<DocumentoFormPage />} />
            <Route path="documentos/:id"              element={<DocumentoDetailPage />} />
            <Route path="documentos/:id/editar"       element={<DocumentoFormPage />} />

            {/* Reportes MINTRA */}
            <Route path="reportes" element={
              <RequireRol modulos={['reportes']}>
                <ReportesPage />
              </RequireRol>
            } />

            {/* Configuración — solo administrador */}
            <Route path="configuracion/empresa" element={
              <RequireRol modulos={['configuracion']}>
                <EmpresaPage />
              </RequireRol>
            } />
            <Route path="configuracion/areas" element={
              <RequireRol modulos={['configuracion']}>
                <AreasPage />
              </RequireRol>
            } />
            <Route path="configuracion/usuarios" element={
              <RequireRol modulos={['configuracion']}>
                <UsuariosPage />
              </RequireRol>
            } />
            <Route path="configuracion/permisos" element={
              <RequireRol modulos={['configuracion']}>
                <PermisosPage />
              </RequireRol>
            } />

            {/* Sin acceso */}
            <Route path="sin-acceso" element={<SinAccesoPage />} />

            {/* Vehículos */}
            <Route path="vehiculos"                   element={<VehiculoListPage />} />
            <Route path="vehiculos/nuevo"             element={<VehiculoFormPage />} />
            <Route path="vehiculos/:id/editar"        element={<VehiculoFormPage />} />

            {/* Equipos */}
            <Route path="equipos"                     element={<EquipoListPage />} />
            <Route path="equipos/tipos"               element={<EquipoTiposPage />} />
            <Route path="equipos/programa"             element={<EquipoProgramaPage />} />
            <Route path="equipos/submodulos"           element={<SubmodulosPage />} />
            <Route path="equipos/inventario"          element={<EquipoInventarioPage />} />
            <Route path="equipos/inventario-area"    element={<EquipoInventarioAreaPage />} />
            <Route path="equipos/emergencia"          element={<EquipoEmergenciaPage />} />
            <Route path="equipos/certificados"        element={<EquipoCertificadosPage />} />
            <Route path="equipos/certificados/alertas" element={<EquipoCertificadosAlertasPage />} />
            <Route path="equipos/asignaciones"         element={<EquipoAsignacionPage />} />
            <Route path="equipos/asignaciones/config"  element={<EquipoAsignacionConfigPage />} />
            <Route path="equipos/mis-equipos"          element={<MisEquiposHoyPage />} />

            {/* Sustancias Peligrosas */}
            <Route path="sustancias"                        element={<SustanciaListPage />} />
            <Route path="sustancias/dashboard"              element={<SustanciaDashboardPage />} />
            <Route path="sustancias/incompatibilidades"     element={<SustanciaIncompatibilidadesPage />} />
            <Route path="sustancias/nueva"                  element={<SustanciaFormPage />} />
            <Route path="sustancias/:id"                    element={<SustanciaDetailPage />} />
            <Route path="sustancias/:id/editar"             element={<SustanciaFormPage />} />
            <Route path="sustancias/:id/etiqueta"             element={<SustanciaEtiquetaPage />} />
            <Route path="sustancias/:id/movimientos"         element={<SustanciaMovimientosPage />} />
            <Route path="sustancias/importar"               element={<SustanciaImportPage />} />
            <Route path="sustancias/inventario"             element={<SustanciaInventarioPage />} />
            {/* Catálogo de tipos y banco de preguntas — hogar definitivo en Equipos */}
            <Route path="equipos/catalogo"            element={<InspeccionEquiposPage />} />
            <Route path="equipos/preguntas"           element={<InspeccionPreguntasPage />} />
            <Route path="equipos/preguntas/importar"  element={<BancoPreguntasImportExportPage />} />
            <Route path="equipos/nuevo"               element={<EquipoFormPage />} />
            <Route path="equipos/:id/editar"          element={<EquipoFormPage />} />

            {/* Programa SST */}
            <Route path="programa"                    element={<ProgramaListPage />} />
            <Route path="programa/nuevo"              element={<ProgramaFormPage />} />
            <Route path="programa/:id"                element={<ProgramaDetailPage />} />
            <Route path="programa/:id/editar"         element={<ProgramaFormPage />} />

            {/* Notificaciones */}
            <Route path="notificaciones"              element={<NotificacionesPage />} />

            {/* Auditoría de sistema */}
            <Route path="auditoria"                   element={<AuditoriaLogPage />} />

            <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      </Suspense>
      </AppInitializer>
    </ErrorBoundary>
  )
}
