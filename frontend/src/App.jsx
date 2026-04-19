import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

import AppLayout from './components/layout/AppLayout'
import ErrorBoundary from './components/ErrorBoundary'

// Páginas críticas — carga inmediata
import LoginPage from './pages/auth/LoginPage'

// Lazy loading — todas las demás páginas
const DashboardPage      = lazy(() => import('./pages/dashboard/DashboardPage'))
const NotFoundPage       = lazy(() => import('./pages/NotFoundPage'))

// Fase 2 — IPERC
const IpercDashboardPage      = lazy(() => import('./pages/iperc/IpercDashboardPage'))
const IpercListPage           = lazy(() => import('./pages/iperc/IpercListPage'))
const IpercFormPage           = lazy(() => import('./pages/iperc/IpercFormPage'))
const IpercDetailPage         = lazy(() => import('./pages/iperc/IpercDetailPage'))
const IpercRiesgoResidualPage = lazy(() => import('./pages/iperc/IpercRiesgoResidualPage'))
const IpercContinuoPage       = lazy(() => import('./pages/iperc/IpercContinuoPage'))
const IpercIntegracionPage    = lazy(() => import('./pages/iperc/IpercIntegracionPage'))
const IpercAprobacionPage     = lazy(() => import('./pages/iperc/IpercAprobacionPage'))
const IpercAlertasPage        = lazy(() => import('./pages/iperc/IpercAlertasPage'))
const IpercReportesPage       = lazy(() => import('./pages/iperc/IpercReportesPage'))
const IpercGuiaPage           = lazy(() => import('./pages/iperc/IpercGuiaPage'))
const IpercBancoPage          = lazy(() => import('./pages/iperc/IpercBancoPage'))
const IpercTablaPage          = lazy(() => import('./pages/iperc/IpercTablaPage'))

// Fase 2 — ATS
const AtsListPage        = lazy(() => import('./pages/ats/AtsListPage'))
const AtsFormPage        = lazy(() => import('./pages/ats/AtsFormPage'))
const AtsDetailPage      = lazy(() => import('./pages/ats/AtsDetailPage'))

// Fase 2 — Firmas
const FirmasPendientesPage = lazy(() => import('./pages/firmas/FirmasPendientesPage'))

// Fase 3 — Inspecciones
const InspeccionDashboardPage = lazy(() => import('./pages/inspecciones/InspeccionDashboardPage'))
const InspeccionListPage   = lazy(() => import('./pages/inspecciones/InspeccionListPage'))
const InspeccionFormPage   = lazy(() => import('./pages/inspecciones/InspeccionFormPage'))
const InspeccionDetailPage = lazy(() => import('./pages/inspecciones/InspeccionDetailPage'))

// Inspecciones v2 — Checklist dinámico por catálogo
const InspeccionChecklistWizard = lazy(() => import('./pages/inspecciones/InspeccionChecklistWizard'))
const InspeccionEquiposPage     = lazy(() => import('./pages/inspecciones/InspeccionEquiposPage'))
const InspeccionPreguntasPage   = lazy(() => import('./pages/inspecciones/InspeccionPreguntasPage'))

// Fase 3 — Accidentes
const AccidenteListPage    = lazy(() => import('./pages/accidentes/AccidenteListPage'))
const AccidenteFormPage    = lazy(() => import('./pages/accidentes/AccidenteFormPage'))
const AccidenteDetailPage  = lazy(() => import('./pages/accidentes/AccidenteDetailPage'))

// Fase 3 — Seguimiento
const SeguimientoListPage   = lazy(() => import('./pages/seguimiento/SeguimientoListPage'))
const SeguimientoFormPage   = lazy(() => import('./pages/seguimiento/SeguimientoFormPage'))
const SeguimientoDetailPage = lazy(() => import('./pages/seguimiento/SeguimientoDetailPage'))

// Fase 4 — Personal
const PersonalListPage   = lazy(() => import('./pages/personal/PersonalListPage'))
const PersonalFormPage   = lazy(() => import('./pages/personal/PersonalFormPage'))
const PersonalDetailPage = lazy(() => import('./pages/personal/PersonalDetailPage'))

// Fase 4 — EPPs
const EppDashboardPage     = lazy(() => import('./pages/epps/EppDashboardPage'))
const EppListPage          = lazy(() => import('./pages/epps/EppListPage'))
const EppFormPage          = lazy(() => import('./pages/epps/EppFormPage'))
const EppEntregaPage       = lazy(() => import('./pages/epps/EppEntregaPage'))
const EppProveedoresPage   = lazy(() => import('./pages/epps/EppProveedoresPage'))
const EppMantenimientoPage = lazy(() => import('./pages/epps/EppMantenimientoPage'))
const EppCapacitacionPage  = lazy(() => import('./pages/epps/EppCapacitacionPage'))
const EppReportesPage      = lazy(() => import('./pages/epps/EppReportesPage'))
const EppConfiguracionPage     = lazy(() => import('./pages/epps/EppConfiguracionPage'))
const EppInventarioInicialPage = lazy(() => import('./pages/epps/EppInventarioInicialPage'))

// Fase 4 — Salud
const SaludListPage   = lazy(() => import('./pages/salud/SaludListPage'))
const SaludFormPage   = lazy(() => import('./pages/salud/SaludFormPage'))
const SaludDetailPage = lazy(() => import('./pages/salud/SaludDetailPage'))

// Fase 5 — Capacitaciones
const CapacitacionListPage   = lazy(() => import('./pages/capacitaciones/CapacitacionListPage'))
const CapacitacionFormPage   = lazy(() => import('./pages/capacitaciones/CapacitacionFormPage'))
const CapacitacionDetailPage = lazy(() => import('./pages/capacitaciones/CapacitacionDetailPage'))

// Fase 5 — Simulacros
const SimulacroListPage   = lazy(() => import('./pages/simulacros/SimulacroListPage'))
const SimulacroFormPage   = lazy(() => import('./pages/simulacros/SimulacroFormPage'))
const SimulacroDetailPage = lazy(() => import('./pages/simulacros/SimulacroDetailPage'))

// Fase 5 — Auditorías
const AuditoriaListPage   = lazy(() => import('./pages/auditorias/AuditoriaListPage'))
const AuditoriaFormPage   = lazy(() => import('./pages/auditorias/AuditoriaFormPage'))
const AuditoriaDetailPage = lazy(() => import('./pages/auditorias/AuditoriaDetailPage'))

// Fase 6 — Formatos
const FormatoListPage   = lazy(() => import('./pages/formatos/FormatoListPage'))
const FormatoFormPage   = lazy(() => import('./pages/formatos/FormatoFormPage'))
const FormatoDetailPage = lazy(() => import('./pages/formatos/FormatoDetailPage'))

// Fase 6 — Documentos
const DocumentoListPage   = lazy(() => import('./pages/documentos/DocumentoListPage'))
const DocumentoFormPage   = lazy(() => import('./pages/documentos/DocumentoFormPage'))
const DocumentoDetailPage = lazy(() => import('./pages/documentos/DocumentoDetailPage'))

// Fase 7 — Reportes MINTRA
const ReportesPage = lazy(() => import('./pages/reportes/ReportesPage'))

// Fase 9 — Configuración
const EmpresaPage  = lazy(() => import('./pages/configuracion/EmpresaPage'))
const AreasPage    = lazy(() => import('./pages/configuracion/AreasPage'))
const UsuariosPage = lazy(() => import('./pages/configuracion/UsuariosPage'))

// Fase 9 — Vehículos
const VehiculoListPage = lazy(() => import('./pages/vehiculos/VehiculoListPage'))
const VehiculoFormPage = lazy(() => import('./pages/vehiculos/VehiculoFormPage'))

// Fase 9 — Equipos
const EquipoListPage = lazy(() => import('./pages/equipos/EquipoListPage'))
const EquipoFormPage = lazy(() => import('./pages/equipos/EquipoFormPage'))

// Fase 9 — Programa SST
const ProgramaListPage   = lazy(() => import('./pages/programa/ProgramaListPage'))
const ProgramaDetailPage = lazy(() => import('./pages/programa/ProgramaDetailPage'))
const ProgramaFormPage   = lazy(() => import('./pages/programa/ProgramaFormPage'))

// Fase 9 — Notificaciones
const NotificacionesPage = lazy(() => import('./pages/notificaciones/NotificacionesPage'))

// Fase 9 — Auditoría de sistema
const AuditoriaLogPage = lazy(() => import('./pages/auditoria/AuditoriaLogPage'))

// Spinner de transición de ruta
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function RequireAuth({ children }) {
  const token = useSelector(s => s.auth.token)
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
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
            <Route path="iperc/continuo"             element={<IpercContinuoPage />} />
            <Route path="iperc/integracion"          element={<IpercIntegracionPage />} />
            <Route path="iperc/aprobacion"           element={<IpercAprobacionPage />} />
            <Route path="iperc/alertas"              element={<IpercAlertasPage />} />
            <Route path="iperc/reportes"             element={<IpercReportesPage />} />
            <Route path="iperc/guia"                 element={<IpercGuiaPage />} />
            <Route path="iperc/banco"                element={<IpercBancoPage />} />
            <Route path="iperc/tabla"                element={<IpercTablaPage />} />
            <Route path="iperc/:id"                  element={<IpercDetailPage />} />
            <Route path="iperc/:id/editar"           element={<IpercFormPage />} />

            {/* ATS */}
            <Route path="ats"                  element={<AtsListPage />} />
            <Route path="ats/nuevo"            element={<AtsFormPage />} />
            <Route path="ats/:id"              element={<AtsDetailPage />} />
            <Route path="ats/:id/editar"       element={<AtsFormPage />} />

            {/* Firmas */}
            <Route path="firmas/pendientes"    element={<FirmasPendientesPage />} />

            {/* Inspecciones */}
            <Route path="inspecciones"                        element={<InspeccionDashboardPage />} />
            <Route path="inspecciones/lista"                  element={<InspeccionListPage />} />
            <Route path="inspecciones/nueva"                  element={<InspeccionFormPage />} />
            <Route path="inspecciones/nueva/general"          element={<InspeccionFormPage />} />
            <Route path="inspecciones/checklist/nueva"        element={<InspeccionChecklistWizard />} />
            <Route path="inspecciones/checklist/:id"          element={<InspeccionChecklistWizard />} />
            <Route path="inspecciones/equipos"                element={<InspeccionEquiposPage />} />
            <Route path="inspecciones/preguntas"              element={<InspeccionPreguntasPage />} />
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
            <Route path="personal/nuevo"            element={<PersonalFormPage />} />
            <Route path="personal/:id"              element={<PersonalDetailPage />} />
            <Route path="personal/:id/editar"       element={<PersonalFormPage />} />

            {/* EPPs */}
            <Route path="epps"                      element={<EppDashboardPage />} />
            <Route path="epps/inventario"           element={<EppListPage />} />
            <Route path="epps/nuevo"                element={<EppFormPage />} />
            <Route path="epps/:id/editar"           element={<EppFormPage />} />
            <Route path="epps/entrega"              element={<EppEntregaPage />} />
            <Route path="epps/proveedores"          element={<EppProveedoresPage />} />
            <Route path="epps/mantenimiento"        element={<EppMantenimientoPage />} />
            <Route path="epps/capacitacion"         element={<EppCapacitacionPage />} />
            <Route path="epps/reportes"             element={<EppReportesPage />} />
            <Route path="epps/configuracion"        element={<EppConfiguracionPage />} />
            <Route path="epps/inventario-inicial"   element={<EppInventarioInicialPage />} />

            {/* Salud */}
            <Route path="salud"                     element={<SaludListPage />} />
            <Route path="salud/nuevo"               element={<SaludFormPage />} />
            <Route path="salud/:id"                 element={<SaludDetailPage />} />
            <Route path="salud/:id/editar"          element={<SaludFormPage />} />

            {/* Capacitaciones */}
            <Route path="capacitaciones"              element={<CapacitacionListPage />} />
            <Route path="capacitaciones/nueva"        element={<CapacitacionFormPage />} />
            <Route path="capacitaciones/:id"          element={<CapacitacionDetailPage />} />
            <Route path="capacitaciones/:id/editar"   element={<CapacitacionFormPage />} />

            {/* Simulacros */}
            <Route path="simulacros"                  element={<SimulacroListPage />} />
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
            <Route path="formatos/nuevo"              element={<FormatoFormPage />} />
            <Route path="formatos/:id"                element={<FormatoDetailPage />} />
            <Route path="formatos/:id/editar"         element={<FormatoFormPage />} />

            {/* Documentos SST */}
            <Route path="documentos"                  element={<DocumentoListPage />} />
            <Route path="documentos/nuevo"            element={<DocumentoFormPage />} />
            <Route path="documentos/:id"              element={<DocumentoDetailPage />} />
            <Route path="documentos/:id/editar"       element={<DocumentoFormPage />} />

            {/* Reportes MINTRA */}
            <Route path="reportes"                    element={<ReportesPage />} />

            {/* Configuración */}
            <Route path="configuracion/empresa"       element={<EmpresaPage />} />
            <Route path="configuracion/areas"         element={<AreasPage />} />
            <Route path="configuracion/usuarios"      element={<UsuariosPage />} />

            {/* Vehículos */}
            <Route path="vehiculos"                   element={<VehiculoListPage />} />
            <Route path="vehiculos/nuevo"             element={<VehiculoFormPage />} />
            <Route path="vehiculos/:id/editar"        element={<VehiculoFormPage />} />

            {/* Equipos */}
            <Route path="equipos"                     element={<EquipoListPage />} />
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
    </ErrorBoundary>
  )
}
