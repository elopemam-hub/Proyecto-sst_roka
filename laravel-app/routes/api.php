<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EmpresaController;
use App\Http\Controllers\Api\PersonalController;
use App\Http\Controllers\Api\UsuarioController;
use App\Http\Controllers\Api\AreaController;
use App\Http\Controllers\Api\SedeController;
use App\Http\Controllers\Api\CargoController;
use App\Http\Controllers\Api\IpercController;
use App\Http\Controllers\Api\IpercBancoController;
use App\Http\Controllers\Api\AtsController;
use App\Http\Controllers\Api\FirmaController;
use App\Http\Controllers\Api\ChecklistController;
use App\Http\Controllers\Api\InspeccionController;
use App\Http\Controllers\Api\AccidenteController;
use App\Http\Controllers\Api\SeguimientoController;
use App\Http\Controllers\Api\EppController;
use App\Http\Controllers\Api\SaludController;
use App\Http\Controllers\Api\CapacitacionController;
use App\Http\Controllers\Api\SimulacroController;
use App\Http\Controllers\Api\AuditoriaInternaController;
use App\Http\Controllers\Api\FormatoController;
use App\Http\Controllers\Api\DocumentoController;
use App\Http\Controllers\Api\ReporteController;
use App\Http\Controllers\Api\VehiculoController;
use App\Http\Controllers\Api\EquipoController;
use App\Http\Controllers\Api\EquipoTipoController;
use App\Http\Controllers\Api\InspeccionProgramadaController;
use App\Http\Controllers\Api\InspeccionSubmoduloController;
use App\Http\Controllers\Api\EquipoQrController;
use App\Http\Controllers\Api\EquipoPdfController;
use App\Http\Controllers\Api\EquipoCertificadoController;
use App\Http\Controllers\Api\SustanciaController;
use App\Http\Controllers\Api\PermisoController;
use App\Http\Controllers\Api\ProgramaSstController;
use App\Http\Controllers\Api\NotificacionController;
use App\Http\Controllers\Api\AuditoriaLogController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — SST ROKA
|--------------------------------------------------------------------------
| Versión: v1
| Autenticación: Laravel Sanctum (Bearer Token)
| Base URL: /api
*/

// ─── Health check (verificar deploy) ────────────────────────────────────────
Route::get('/ping', fn() => response()->json([
    'status'  => 'ok',
    'app'     => config('app.name'),
    'env'     => config('app.env'),
    'version' => '1.0.0',
    'time'    => now()->toIso8601String(),
]));

// ─── Rutas públicas (sin autenticación) ───────────────────────────────────
// throttle:10,1 = máx 10 intentos por minuto por IP (previene brute-force)
Route::prefix('auth')->middleware('throttle:10,1')->group(function () {
    Route::post('/login',  [AuthController::class, 'login']);
});

// QR público (resolver código de equipo sin autenticación)
Route::get('/qr/{codigo}', [EquipoQrController::class, 'resolverCodigo']);
Route::post('/qr/registrar-escaneo', [EquipoQrController::class, 'registrarEscaneo']);
Route::get('/equipos/{id}/ultimas-inspecciones', [EquipoQrController::class, 'ultimasInspecciones']);
Route::get('/equipos/{id}/etiqueta', [EquipoPdfController::class, 'etiquetaPublica']);

// ─── Rutas protegidas (requieren token) ───────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::prefix('auth')->group(function () {
        Route::post('/logout',  [AuthController::class, 'logout']);
        Route::get('/me',       [AuthController::class, 'me']);
        Route::post('/refresh', [AuthController::class, 'refresh']);
    });

    // Dashboard
    Route::prefix('dashboard')->group(function () {
        Route::get('/kpis',           [DashboardController::class, 'kpis']);
        Route::get('/accidentabilidad', [DashboardController::class, 'accidentabilidad']);
        Route::get('/por-area',       [DashboardController::class, 'porArea']);
    });

    // Datos Maestros
    Route::get('empresa/mia', [EmpresaController::class, 'mia']);
    // Configuración — solo administrador puede gestionar empresa y usuarios
    Route::middleware('check.rol:administrador')->group(function () {
        Route::apiResource('empresas', EmpresaController::class);
        Route::apiResource('usuarios', UsuarioController::class);
        Route::prefix('usuarios')->group(function () {
            Route::post('/{id}/toggle-activo',  [UsuarioController::class, 'toggleActivo']);
            Route::post('/{id}/reset-password', [UsuarioController::class, 'resetPassword']);
        });
    });

    Route::apiResource('sedes',     SedeController::class);
    Route::apiResource('areas',     AreaController::class);
    Route::post('areas/{id}/fusionar', [AreaController::class, 'fusionar']);
    Route::apiResource('cargos',    CargoController::class);

    // Rutas específicas de personal ANTES del apiResource para evitar conflicto de wildcard
    Route::prefix('personal')->group(function () {
        Route::get('/estadisticas',       [PersonalController::class, 'estadisticas']);
        Route::get('/alertas',            [PersonalController::class, 'alertas']);
        Route::post('/importar',          [PersonalController::class, 'importar']);
        Route::get('/{id}/historial-sst', [PersonalController::class, 'historialSst']);
    });
    Route::apiResource('personal', PersonalController::class);

    // ─── IPERC ─────────────────────────────────────────────────────────────
    Route::prefix('iperc')->group(function () {
        Route::get('/estadisticas',         [IpercController::class, 'estadisticas']);
        Route::get('/matriz-riesgos',       [IpercController::class, 'matrizRiesgos']);
        Route::get('/procesos-all',         [IpercController::class, 'procesosAll']);
        Route::get('/peligros-all',         [IpercController::class, 'peligrosAll']);
        Route::get('/controles-all',        [IpercController::class, 'controlesAll']);
        Route::get('/riesgo-residual',      [IpercController::class, 'riesgoResidual']);
        Route::get('/puestos',              [IpercController::class, 'puestos']);
        Route::get('/alertas',              [IpercController::class, 'alertas']);
        Route::post('/{id}/enviar-a-firma', [IpercController::class, 'enviarAFirma']);
    });
    Route::apiResource('iperc', IpercController::class);

    // ─── IPERC BANCO ───────────────────────────────────────────────────────
    Route::prefix('iperc-banco')->group(function () {
        Route::post('/importar-predefinidos', [IpercBancoController::class, 'importarPredefinidos']);
        Route::patch('/{id}/toggle',          [IpercBancoController::class, 'toggle']);
    });
    Route::apiResource('iperc-banco', IpercBancoController::class);

    // ─── ATS ───────────────────────────────────────────────────────────────
    Route::prefix('ats')->group(function () {
        Route::get('/estadisticas',                  [AtsController::class, 'estadisticas']);
        Route::get('/alertas',                       [AtsController::class, 'alertas']);
        Route::post('/{id}/solicitar-firmas',        [AtsController::class, 'solicitarFirmas']);
        Route::post('/{id}/autorizar',               [AtsController::class, 'autorizar']);
        Route::post('/{id}/iniciar',                 [AtsController::class, 'iniciarEjecucion']);
        Route::post('/{id}/cancelar',                [AtsController::class, 'cancelar']);
        Route::post('/{id}/cerrar',                  [AtsController::class, 'cerrar']);
        Route::patch('/{id}/tareas/{tareaId}',       [AtsController::class, 'actualizarEstadoTarea']);
    });
    Route::apiResource('ats', AtsController::class);

    // ─── INSPECCIONES ──────────────────────────────────────────────────────
    Route::prefix('inspecciones')->group(function () {
        // Rutas específicas sin wildcard PRIMERO para evitar conflicto con apiResource {id}
        Route::get('/dashboard',              [InspeccionController::class, 'dashboard']);
        Route::get('/estadisticas',           [InspeccionController::class, 'estadisticas']);
        Route::get('/alertas',                [InspeccionController::class, 'alertas']);
        Route::get('/diarias-tabla',          [InspeccionController::class, 'tablaDiaria']);
        Route::get('/mensuales-tabla',        [InspeccionController::class, 'tablaMensual']);
        Route::get('/programa-mensual',       [InspeccionController::class, 'programaMensual']);
        Route::post('/generar-programa',      [InspeccionController::class, 'generarPrograma']);
        Route::get('/programadas-checklist',  [InspeccionController::class, 'programadasChecklist']);
        Route::post('/programar-checklist',   [InspeccionController::class, 'programarChecklist']);
        Route::get('/pendientes-firma',       [InspeccionController::class, 'pendientesFirma']);

        // Rutas con parámetro {id} - DESPUÉS de las rutas fijas
        Route::post('/{id}/ejecutar',         [InspeccionController::class, 'ejecutar']);
        Route::post('/{id}/hallazgos',        [InspeccionController::class, 'registrarHallazgo']);
        Route::put('/{id}/hallazgos/{hallazgoId}', [InspeccionController::class, 'actualizarHallazgo']);
        Route::post('/{id}/cerrar',           [InspeccionController::class, 'cerrar']);
        Route::post('/{id}/rechazar',         [InspeccionController::class, 'rechazar']);
        Route::post('/{id}/enviar-a-firma',   [InspeccionController::class, 'enviarAFirma']);
        Route::get('/{id}/reporte',           [InspeccionController::class, 'reporte']);

        // Checklist dinámico por inspección
        Route::get('/{id}/checklist/respuestas',           [ChecklistController::class, 'respuestas']);
        Route::post('/{id}/checklist/respuestas',          [ChecklistController::class, 'guardarRespuestas']);
        Route::get('/{id}/checklist/firmas',               [ChecklistController::class, 'firmas']);
        Route::post('/{id}/checklist/firmas',              [ChecklistController::class, 'firmarCanvas']);
        Route::get('/{id}/checklist/acciones',             [ChecklistController::class, 'accionesChecklist']);
        Route::post('/{id}/checklist/acciones',            [ChecklistController::class, 'crearAccion']);
        Route::put('/{id}/checklist/acciones/{accionId}',  [ChecklistController::class, 'actualizarAccion']);
        Route::post('/{id}/checklist/generar-acciones-nc', [ChecklistController::class, 'generarAccionesNC']);

        // apiResource al FINAL - genera: GET /, POST /, GET /{id}, PUT /{id}, DELETE /{id}
        Route::get('/',           [InspeccionController::class, 'index']);
        Route::post('/',          [InspeccionController::class, 'store']);
        Route::get('/{id}',       [InspeccionController::class, 'show']);
        Route::put('/{id}',       [InspeccionController::class, 'update']);
        Route::delete('/{id}',    [InspeccionController::class, 'destroy']);
    });


    // ─── CHECKLIST CATÁLOGO (equipos + preguntas) ─────────────────────────
    // ─── SUB-MÓDULOS (Fase 3 — CRUD dinámico) ──────────────────────────────
    Route::prefix('submodulos')->group(function () {
        Route::get('/',       [InspeccionSubmoduloController::class, 'index']);
        Route::post('/',      [InspeccionSubmoduloController::class, 'store']);
        Route::put('/{id}',   [InspeccionSubmoduloController::class, 'update']);
        Route::delete('/{id}',[InspeccionSubmoduloController::class, 'destroy']);
    });

    Route::prefix('checklist')->group(function () {
        Route::get('/submodulos',              [ChecklistController::class, 'submodulos']);
        Route::get('/equipos',                 [ChecklistController::class, 'equipos']);
        Route::post('/equipos',                [ChecklistController::class, 'equipoStore']);
        Route::get('/equipos/{id}',            [ChecklistController::class, 'equipoShow']);
        Route::put('/equipos/{id}',            [ChecklistController::class, 'equipoUpdate']);
        Route::patch('/equipos/{id}/toggle',    [ChecklistController::class, 'equipoToggle']);
        Route::post('/equipos/{id}/duplicar',  [ChecklistController::class, 'equipoDuplicar']);
        Route::delete('/equipos/{id}',         [ChecklistController::class, 'equipoDestroy']);
        Route::get('/preguntas/{equipoId}',    [ChecklistController::class, 'preguntas']);
        Route::post('/preguntas',              [ChecklistController::class, 'preguntaStore']);
        Route::put('/preguntas/{id}',          [ChecklistController::class, 'preguntaUpdate']);
        Route::patch('/preguntas/{id}/toggle', [ChecklistController::class, 'preguntaToggle']);
        Route::delete('/preguntas/{id}',       [ChecklistController::class, 'preguntaDestroy']);
        Route::get('/estadisticas',                      [ChecklistController::class, 'estadisticasChecklist']);
        Route::post('/recalcular-todas',                 [ChecklistController::class, 'recalcularTodas']);
        Route::get('/inventario-resumen',                [ChecklistController::class, 'inventarioResumen']);
        Route::get('/equipos/{id}/inventario',           [ChecklistController::class, 'inventarioPorCatalogo']);
    });

    // ─── ACCIDENTES ────────────────────────────────────────────────────────
    Route::prefix('accidentes')->group(function () {
        Route::get('/estadisticas',           [AccidenteController::class, 'estadisticas']);
        Route::post('/{id}/investigacion',    [AccidenteController::class, 'registrarInvestigacion']);
        Route::post('/{id}/acciones',         [AccidenteController::class, 'registrarAccion']);
    });
    Route::apiResource('accidentes', AccidenteController::class);

    // ─── SEGUIMIENTO ───────────────────────────────────────────────────────
    Route::prefix('seguimiento')->group(function () {
        Route::get('/resumen',                [SeguimientoController::class, 'resumen']);
        Route::post('/{id}/validar',          [SeguimientoController::class, 'validar']);
    });
    Route::apiResource('seguimiento', SeguimientoController::class);

    // ─── EPPs ──────────────────────────────────────────────────────────────
    Route::prefix('epps')->group(function () {
        Route::get('/alertas',                   [EppController::class, 'alertas']);
        Route::post('/ingresos',                 [EppController::class, 'registrarIngreso']);
        Route::get('/movimientos',               [EppController::class, 'movimientos']);
        Route::get('/tallas/matriz',             [EppController::class, 'matrizTallas']);
        Route::get('/tallas/personal/{personalId}', [EppController::class, 'tallasPersonal']);
        Route::post('/tallas',                   [EppController::class, 'storeTalla']);
        Route::delete('/tallas/{id}',            [EppController::class, 'deleteTalla']);
        Route::get('/tallas/sugerencia',         [EppController::class, 'sugerirTalla']);
        Route::get('/dashboard',                 [EppController::class, 'dashboard']);
        Route::get('/trazabilidad',              [EppController::class, 'trazabilidad']);
        Route::get('/categorias',                [EppController::class, 'categorias']);
        Route::post('/categorias',               [EppController::class, 'storeCategoria']);
        Route::put('/categorias/{id}',           [EppController::class, 'updateCategoria']);
        Route::delete('/categorias/{id}',        [EppController::class, 'destroyCategoria']);
        Route::get('/estadisticas',              [EppController::class, 'estadisticas']);
        Route::post('/importar',                 [EppController::class, 'importar']);
        Route::post('/eliminar-multiple',        [EppController::class, 'eliminarMultiple']);
        Route::delete('/eliminar-todo',          [EppController::class, 'eliminarTodo']);
        Route::get('/entregas/todas',            [EppController::class, 'todasEntregas']);
        Route::post('/entregas',                 [EppController::class, 'registrarEntrega']);
        Route::post('/entregas/{id}/devolucion', [EppController::class, 'registrarDevolucion']);
        Route::get('/proveedores',               [EppController::class, 'proveedores']);
        Route::post('/proveedores',              [EppController::class, 'storeProveedor']);
        Route::put('/proveedores/{id}',          [EppController::class, 'updateProveedor']);
        Route::delete('/proveedores/{id}',       [EppController::class, 'destroyProveedor']);
        Route::get('/mantenimiento',             [EppController::class, 'mantenimiento']);
        Route::post('/mantenimiento',            [EppController::class, 'storeMantenimiento']);
        Route::get('/capacitaciones-epp',        [EppController::class, 'capacitaciones']);
        Route::post('/capacitaciones-epp',       [EppController::class, 'storeCapacitacion']);
        Route::get('/{id}/entregas',             [EppController::class, 'entregas']);
    });
    Route::apiResource('epps', EppController::class);

    // ─── SALUD / EMO ───────────────────────────────────────────────────────
    Route::prefix('salud')->group(function () {
        Route::get('/estadisticas',                          [SaludController::class, 'estadisticas']);
        Route::get('/documentos',                            [SaludController::class, 'documentos']);
        Route::get('/fichas-medicas',                        [SaludController::class, 'listFichasMedicas']);
        Route::get('/ficha-medica',                          [SaludController::class, 'getFichaMedica']);
        Route::put('/ficha-medica',                          [SaludController::class, 'saveFichaMedica']);
        Route::get('/mi-panel',                              [SaludController::class, 'miPanel']);
        Route::get('/mi-ficha',                              [SaludController::class, 'miFicha']);
        Route::get('/cronograma-medico',                     [SaludController::class, 'cronogramaMedico']);
        Route::get('/certificado/{personalId}',              [SaludController::class, 'certificado']);
        Route::get('/personal/{personalId}/restricciones',   [SaludController::class, 'restricciones']);
        Route::post('/restricciones',                        [SaludController::class, 'registrarRestriccion']);
        Route::get('/atenciones',                            [SaludController::class, 'atenciones']);
        Route::post('/atenciones',                           [SaludController::class, 'registrarAtencion']);
    });
    Route::apiResource('salud', SaludController::class)->parameters(['salud' => 'id']);

    // ─── FIRMAS DIGITALES (módulo transversal) ─────────────────────────────
    Route::prefix('firmas')->group(function () {
        Route::get('/pendientes',              [FirmaController::class, 'pendientes']);
        Route::get('/solicitud/{id}',          [FirmaController::class, 'showSolicitud']);
        Route::post('/firmar',                 [FirmaController::class, 'firmar']);
        Route::post('/rechazar',               [FirmaController::class, 'rechazar']);
        Route::get('/documento/{tipo}/{id}',   [FirmaController::class, 'firmasDocumento']);
        Route::get('/{id}/verificar',          [FirmaController::class, 'verificar']);
        Route::get('/log',                     [FirmaController::class, 'log']);
    });

    // ─── CAPACITACIONES (Fase 5) ────────────────────────────────────────
    Route::prefix('capacitaciones')->group(function () {
        Route::get('/estadisticas',               [CapacitacionController::class, 'estadisticas']);
        Route::get('/cronograma',                 [CapacitacionController::class, 'cronograma']);
        Route::get('/mis-capacitaciones',         [CapacitacionController::class, 'misCapacitaciones']);
        Route::get('/matriz-trabajadores',        [CapacitacionController::class, 'matrizTrabajadores']);
        Route::get('/matriz-competencias',        [CapacitacionController::class, 'matrizCompetencias']);
        Route::get('/notas-trabajadores',         [CapacitacionController::class, 'notasTrabajadores']);
        Route::post('/{id}/asistencia',           [CapacitacionController::class, 'registrarAsistencia']);
        Route::post('/{id}/ejecutar',             [CapacitacionController::class, 'ejecutar']);
        Route::post('/{id}/evaluacion',           [CapacitacionController::class, 'guardarEvaluacion']);
        Route::post('/{id}/evaluacion/responder', [CapacitacionController::class, 'responderEvaluacion']);
    });
    Route::get('/personal/{id}/capacitaciones',   [CapacitacionController::class, 'capacitacionesTrabajador']);
    Route::apiResource('capacitaciones', CapacitacionController::class);

    // ─── SIMULACROS (Fase 5) ────────────────────────────────────────────
    Route::prefix('simulacros')->group(function () {
        Route::get('/estadisticas',            [SimulacroController::class, 'estadisticas']);
        Route::post('/{id}/ejecutar',          [SimulacroController::class, 'ejecutar']);
        Route::post('/{id}/evaluacion',        [SimulacroController::class, 'registrarEvaluacion']);
    });
    Route::apiResource('simulacros', SimulacroController::class);

    // ─── AUDITORÍAS (Fase 5) ────────────────────────────────────────────
    Route::prefix('auditorias')->group(function () {
        Route::get('/estadisticas',                    [AuditoriaInternaController::class, 'estadisticas']);
        Route::post('/{id}/hallazgos',                 [AuditoriaInternaController::class, 'registrarHallazgo']);
        Route::post('/hallazgos/{id}/seguimiento',     [AuditoriaInternaController::class, 'registrarSeguimiento']);
    });
    Route::apiResource('auditorias', AuditoriaInternaController::class);

    // ─── BIBLIOTECA DE ARCHIVOS (formatos) ─────────────────────────────
    Route::prefix('formato-archivos')->group(function () {
        Route::get('/estadisticas',          [\App\Http\Controllers\Api\FormatoArchivoController::class, 'estadisticas']);
        Route::get('/{id}/descargar',        [\App\Http\Controllers\Api\FormatoArchivoController::class, 'descargar']);
    });
    Route::apiResource('formato-archivos', \App\Http\Controllers\Api\FormatoArchivoController::class);

    // ─── FORMATOS RM 050-2013-TR (Fase 6) ──────────────────────────────
    Route::prefix('formatos')->group(function () {
        Route::get('/estadisticas',          [FormatoController::class, 'estadisticas']);
        Route::post('/generar/{tipo}',       [FormatoController::class, 'generar']);
        Route::post('/{id}/aprobar',         [FormatoController::class, 'aprobar']);
        Route::post('/{id}/anular',          [FormatoController::class, 'anular']);
    });
    Route::apiResource('formatos', FormatoController::class);

    // ─── DOCUMENTOS SST (Fase 6) ────────────────────────────────────────
    Route::prefix('documentos')->group(function () {
        Route::get('/estadisticas',          [DocumentoController::class, 'estadisticas']);
        Route::post('/{id}/aprobar',         [DocumentoController::class, 'aprobar']);
        Route::post('/{id}/obsoleto',        [DocumentoController::class, 'obsoleto']);
        Route::get('/{id}/versiones',        [DocumentoController::class, 'versiones']);
        Route::get('/{id}/descargar',        [DocumentoController::class, 'descargar']);
    });
    Route::apiResource('documentos', DocumentoController::class);

    // ─── REPORTES MINTRA (Fase 7) ───────────────────────────────────────────
    Route::prefix('reportes')->group(function () {
        Route::get('/consolidado',       [ReporteController::class, 'consolidado']);
        Route::get('/accidentabilidad',  [ReporteController::class, 'accidentabilidad']);
        Route::get('/inspecciones',      [ReporteController::class, 'inspecciones']);
        Route::get('/capacitaciones',    [ReporteController::class, 'capacitaciones']);
        Route::get('/salud',             [ReporteController::class, 'salud']);
        Route::get('/epps',              [ReporteController::class, 'epps']);
        Route::get('/sunafil',           [ReporteController::class, 'sunafil']);
    });

    // ─── VEHÍCULOS (Fase 9) ────────────────────────────────────────────────
    Route::get('/vehiculos/estadisticas', [VehiculoController::class, 'estadisticas']);
    Route::apiResource('vehiculos', VehiculoController::class);

    // ─── TIPOS DE EQUIPO (Fase 1 refactor) ────────────────────────────────
    Route::prefix('equipos-tipos')->group(function () {
        Route::get('/',       [EquipoTipoController::class, 'index']);
        Route::post('/',      [EquipoTipoController::class, 'store']);
        Route::put('/{id}',   [EquipoTipoController::class, 'update']);
        Route::delete('/{id}',[EquipoTipoController::class, 'destroy']);
    });

    // ─── EQUIPOS (Fase 9) ──────────────────────────────────────────────────
    Route::get('/equipos/estadisticas', [EquipoController::class, 'estadisticas']);
    Route::get('/equipos/{id}/qr-data', [EquipoQrController::class, 'qrData']);
    Route::get('/equipos/{id}/qr-estadisticas', [EquipoQrController::class, 'estadisticasQr']);
    Route::post('/equipos/batch-qr-data', [EquipoQrController::class, 'batchQrData']);
    // Route::get('/equipos/{id}/etiqueta', [EquipoPdfController::class, 'etiquetaHtml']); // Movida a ruta pública
    Route::post('/equipos/etiquetas-batch', [EquipoPdfController::class, 'etiquetasBatchHtml']);
    Route::get('/equipos/todas-etiquetas', [EquipoPdfController::class, 'todasEtiquetasHtml']);
    Route::apiResource('equipos', EquipoController::class);

    // ─── INSPECCIONES PROGRAMADAS (Fase 2 scheduler) ──────────────────────
    Route::prefix('inspecciones-programadas')->group(function () {
        Route::get('/dashboard',  [InspeccionProgramadaController::class, 'dashboard']);
        Route::post('/generar',   [InspeccionProgramadaController::class, 'generar']);
        Route::delete('/limpiar', [InspeccionProgramadaController::class, 'limpiar']);
        Route::get('/',           [InspeccionProgramadaController::class, 'index']);
        Route::put('/{id}/realizar', [InspeccionProgramadaController::class, 'realizar']);
        Route::put('/{id}/omitir',   [InspeccionProgramadaController::class, 'omitir']);
        Route::delete('/{id}',       [InspeccionProgramadaController::class, 'destroy']);
    });

    // ─── CERTIFICADOS DE OPERATIVIDAD DE EQUIPOS ───────────────────────────
    Route::prefix('equipos-certificados')->group(function () {
        Route::get('/alertas', [EquipoCertificadoController::class, 'alertas']);
        Route::get('/areas', [EquipoCertificadoController::class, 'areas']);
        Route::get('/', [EquipoCertificadoController::class, 'index']);
        Route::post('/', [EquipoCertificadoController::class, 'store']);
        Route::put('/{id}', [EquipoCertificadoController::class, 'update']);
        Route::delete('/{id}', [EquipoCertificadoController::class, 'destroy']);
    });

    // ─── PROGRAMA SST ANUAL (Fase 9) ───────────────────────────────────────
    Route::prefix('programa')->group(function () {
        Route::get('/estadisticas',              [ProgramaSstController::class, 'estadisticas']);
        Route::get('/{id}/actividades',          [ProgramaSstController::class, 'actividades']);
        Route::post('/{id}/actividades',         [ProgramaSstController::class, 'registrarActividad']);
        Route::put('/actividades/{id}',          [ProgramaSstController::class, 'actualizarActividad']);
    });
    Route::apiResource('programa', ProgramaSstController::class);

    // ─── NOTIFICACIONES (Fase 9) ───────────────────────────────────────────
    Route::prefix('notificaciones')->group(function () {
        Route::get('/conteo',                    [NotificacionController::class, 'conteo']);
        Route::patch('/todas-leidas',            [NotificacionController::class, 'marcarTodasLeidas']);
        Route::patch('/{id}/leida',              [NotificacionController::class, 'marcarLeida']);
        Route::delete('/{id}',                   [NotificacionController::class, 'destroy']);
    });
    Route::get('notificaciones', [NotificacionController::class, 'index']);

    // ─── SUSTANCIAS PELIGROSAS ─────────────────────────────────────────────
    Route::prefix('sustancias')->group(function () {
        Route::get('/estadisticas',                        [SustanciaController::class, 'estadisticas']);
        Route::get('/alertas-stock',                       [SustanciaController::class, 'alertasStock']);
        Route::get('/evolucion',                           [SustanciaController::class, 'evolucion']);
        Route::get('/exportar',                            [SustanciaController::class, 'exportar']);
        Route::get('/inventario-stock',                    [SustanciaController::class, 'inventarioStock']);
        Route::post('/importar/sustancias',               [SustanciaController::class, 'importarSustancias']);
        Route::post('/importar/trabajadores',             [SustanciaController::class, 'importarTrabajadores']);
        Route::get('/incompatibilidades',                  [SustanciaController::class, 'incompatibilidades']);
        Route::post('/incompatibilidades',                 [SustanciaController::class, 'registrarIncompatibilidad']);
        Route::delete('/incompatibilidades/{id}',          [SustanciaController::class, 'eliminarIncompatibilidad']);
        Route::post('/{id}/hds',                           [SustanciaController::class, 'uploadHds']);
        Route::get('/{id}/hds/download',                   [SustanciaController::class, 'downloadHds']);
        Route::get('/{id}/etiqueta',                       [SustanciaController::class, 'etiqueta']);
        Route::get('/{id}/movimientos',                    [SustanciaController::class, 'movimientos']);
        Route::post('/{id}/movimientos',                   [SustanciaController::class, 'registrarMovimiento']);
        Route::get('/{id}/exposiciones',                   [SustanciaController::class, 'exposiciones']);
        Route::post('/{id}/exposiciones',                  [SustanciaController::class, 'registrarExposicion']);
        Route::delete('/{sustId}/exposiciones/{expId}',    [SustanciaController::class, 'eliminarExposicion']);
        Route::get('/{id}/capacitaciones',                 [SustanciaController::class, 'capacitaciones']);
        Route::post('/{id}/capacitaciones',                [SustanciaController::class, 'registrarCapacitacion']);
        Route::delete('/{sustId}/capacitaciones/{capId}',  [SustanciaController::class, 'eliminarCapacitacion']);
    });
    Route::apiResource('sustancias', SustanciaController::class);

    // ─── PERMISOS POR MÓDULO ───────────────────────────────────────────────
    Route::prefix('permisos')->group(function () {
        Route::get('/modulos',                        [PermisoController::class, 'modulos']);
        Route::get('/mis-permisos',                   [PermisoController::class, 'misPermisos']);
        Route::get('/rol/{rol}',                      [PermisoController::class, 'permisosPorRol']);
        Route::put('/rol/{rol}',                      [PermisoController::class, 'actualizarRol']);
        Route::delete('/rol/{rol}/overrides',         [PermisoController::class, 'restaurarRolDefecto']);
        Route::get('/usuario/{id}',                   [PermisoController::class, 'permisosUsuario']);
        Route::put('/usuario/{id}',                   [PermisoController::class, 'actualizarUsuario']);
        Route::delete('/usuario/{id}/overrides',      [PermisoController::class, 'limpiarOverridesUsuario']);
    });

    // ─── AUDITORÍA DE SISTEMA (Fase 9) ─────────────────────────────────────
    Route::prefix('auditoria-log')->group(function () {
        Route::get('/',      [AuditoriaLogController::class, 'index']);
        Route::get('/{id}',  [AuditoriaLogController::class, 'show']);
    });

});
