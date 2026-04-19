<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EmpresaController;
use App\Http\Controllers\Api\PersonalController;
use App\Http\Controllers\Api\UsuarioController;
use App\Http\Controllers\Api\AreaController;
use App\Http\Controllers\Api\IpercController;
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

// ─── Rutas públicas (sin autenticación) ───────────────────────────────────
// throttle:10,1 = máx 10 intentos por minuto por IP (previene brute-force)
Route::prefix('auth')->middleware('throttle:10,1')->group(function () {
    Route::post('/login',  [AuthController::class, 'login']);
});

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
    Route::apiResource('empresas',  EmpresaController::class);
    Route::apiResource('personal',  PersonalController::class);
    Route::apiResource('usuarios',  UsuarioController::class);
    Route::apiResource('areas',     AreaController::class);

    // Rutas adicionales de personal
    Route::prefix('personal')->group(function () {
        Route::get('/{id}/historial-sst', [PersonalController::class, 'historialSst']);
    });

    // Rutas adicionales de usuarios
    Route::prefix('usuarios')->group(function () {
        Route::post('/{id}/toggle-activo',  [UsuarioController::class, 'toggleActivo']);
        Route::post('/{id}/reset-password', [UsuarioController::class, 'resetPassword']);
    });

    // ─── IPERC ─────────────────────────────────────────────────────────────
    Route::prefix('iperc')->group(function () {
        Route::get('/matriz-riesgos',       [IpercController::class, 'matrizRiesgos']);
        Route::post('/{id}/enviar-a-firma', [IpercController::class, 'enviarAFirma']);
    });
    Route::apiResource('iperc', IpercController::class);

    // ─── ATS ───────────────────────────────────────────────────────────────
    Route::prefix('ats')->group(function () {
        Route::post('/{id}/solicitar-firmas', [AtsController::class, 'solicitarFirmas']);
        Route::post('/{id}/cerrar',           [AtsController::class, 'cerrar']);
    });
    Route::apiResource('ats', AtsController::class);

    // ─── INSPECCIONES ──────────────────────────────────────────────────────
    Route::prefix('inspecciones')->group(function () {
        Route::get('/estadisticas',           [InspeccionController::class, 'estadisticas']);
        Route::post('/{id}/ejecutar',         [InspeccionController::class, 'ejecutar']);
        Route::post('/{id}/hallazgos',        [InspeccionController::class, 'registrarHallazgo']);
        Route::post('/{id}/cerrar',           [InspeccionController::class, 'cerrar']);
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
    });
    Route::apiResource('inspecciones', InspeccionController::class);

    // ─── CHECKLIST CATÁLOGO (equipos + preguntas) ─────────────────────────
    Route::prefix('checklist')->group(function () {
        Route::get('/submodulos',              [ChecklistController::class, 'submodulos']);
        Route::get('/equipos',                 [ChecklistController::class, 'equipos']);
        Route::post('/equipos',                [ChecklistController::class, 'equipoStore']);
        Route::get('/equipos/{id}',            [ChecklistController::class, 'equipoShow']);
        Route::put('/equipos/{id}',            [ChecklistController::class, 'equipoUpdate']);
        Route::patch('/equipos/{id}/toggle',   [ChecklistController::class, 'equipoToggle']);
        Route::get('/preguntas/{equipoId}',    [ChecklistController::class, 'preguntas']);
        Route::post('/preguntas',              [ChecklistController::class, 'preguntaStore']);
        Route::put('/preguntas/{id}',          [ChecklistController::class, 'preguntaUpdate']);
        Route::patch('/preguntas/{id}/toggle', [ChecklistController::class, 'preguntaToggle']);
        Route::get('/estadisticas',            [ChecklistController::class, 'estadisticasChecklist']);
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
        Route::get('/categorias',                [EppController::class, 'categorias']);
        Route::get('/estadisticas',              [EppController::class, 'estadisticas']);
        Route::post('/entregas',                 [EppController::class, 'registrarEntrega']);
        Route::post('/entregas/{id}/devolucion', [EppController::class, 'registrarDevolucion']);
        Route::get('/{id}/entregas',             [EppController::class, 'entregas']);
    });
    Route::apiResource('epps', EppController::class);

    // ─── SALUD / EMO ───────────────────────────────────────────────────────
    Route::prefix('salud')->group(function () {
        Route::get('/estadisticas',                          [SaludController::class, 'estadisticas']);
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
        Route::get('/estadisticas',            [CapacitacionController::class, 'estadisticas']);
        Route::post('/{id}/asistencia',        [CapacitacionController::class, 'registrarAsistencia']);
        Route::post('/{id}/ejecutar',          [CapacitacionController::class, 'ejecutar']);
    });
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

    // ─── EQUIPOS (Fase 9) ──────────────────────────────────────────────────
    Route::get('/equipos/estadisticas', [EquipoController::class, 'estadisticas']);
    Route::apiResource('equipos', EquipoController::class);

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

    // ─── AUDITORÍA DE SISTEMA (Fase 9) ─────────────────────────────────────
    Route::prefix('auditoria-log')->group(function () {
        Route::get('/',      [AuditoriaLogController::class, 'index']);
        Route::get('/{id}',  [AuditoriaLogController::class, 'show']);
    });

});
