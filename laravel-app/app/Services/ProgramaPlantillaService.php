<?php

namespace App\Services;

use App\Models\ProgramaSst;
use Illuminate\Support\Facades\DB;

/**
 * Plantilla base del Programa Anual de SST según la estructura exigida por la
 * Ley 29783 y su reglamento (DS 005-2012-TR), con los registros obligatorios de
 * la RM 050-2013-TR.
 *
 * Sirve para que el usuario no tipee el programa desde cero: se genera la
 * estructura completa y luego se ajustan metas, meses y responsables. Las
 * actividades que el sistema ya registra quedan vinculadas a su módulo para que
 * el cumplimiento se calcule solo (ver ProgramaCumplimientoService).
 */
class ProgramaPlantillaService
{
    private const TODO_EL_ANIO = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    /**
     * Estructura: elemento => [numero, nombre, actividades[]]
     * Cada actividad: [numero, actividad, meses, meta_cantidad, meta_texto,
     *                  evidencia_texto, responsable_texto, modulo, filtro, segun_corresponda]
     */
    private const ESTRUCTURA = [
        [1, 'EVALUACIÓN Y DIAGNÓSTICO DE LÍNEA BASE DEL SGSST', [
            ['1.1', 'Evaluar el Sistema de Gestión de Seguridad y Salud en el Trabajo', [12], 1,
                'Evaluación del Sistema de Gestión de Seguridad y Salud en el Trabajo',
                'Documento de evaluación del SGSST', 'Unidad de Recursos Humanos'],
            ['1.2', 'Elaborar el plan de acción a partir del diagnóstico de línea base', [1], 1,
                'Plan de acción elaborado', 'Plan de acción aprobado', 'Unidad de Recursos Humanos'],
        ]],

        [2, 'LIDERAZGO Y COMPROMISO DIRECTIVO', [
            ['2.1', 'Establecer la Política de Seguridad y Salud en el Trabajo', [1], 1,
                'Política de Seguridad y Salud en el Trabajo',
                'Documento que establece la Política de Seguridad y Salud en el Trabajo', 'Dirección Ejecutiva'],
            ['2.2', 'Difundir la Política de Seguridad y Salud en el Trabajo', [1], 1,
                'Actividad de difusión de la Política de Seguridad y Salud en el Trabajo',
                'Evidencia de difusión', 'Unidad de Recursos Humanos'],
            ['2.3', 'Programar y organizar las reuniones del Comité de Seguridad y Salud en el Trabajo',
                self::TODO_EL_ANIO, 12,
                'Reuniones realizadas por el Comité de Seguridad y Salud en el Trabajo',
                'Actas de reunión del Comité de Seguridad y Salud en el Trabajo', 'Unidad de Recursos Humanos'],
            ['2.4', 'Elaborar la Matriz Legal del Sistema de Gestión de Seguridad y Salud en el Trabajo', [2], 1,
                'Matriz Legal del SGSST', 'Documento de Matriz Legal del SGSST', 'Unidad de Recursos Humanos'],
            ['2.5', 'Elaborar y aprobar el Reglamento Interno de Seguridad y Salud en el Trabajo', [3], 1,
                'Reglamento Interno de SST aprobado',
                'Documento del RISST y acta de aprobación', 'Comité de Seguridad y Salud en el Trabajo'],
        ]],

        [3, 'CAPACITACIÓN', [
            ['3.1', 'Ejecutar la Inducción en Seguridad y Salud en el Trabajo', [], null,
                'Charlas de inducción realizadas', 'Registro de asistencia', 'Unidad de Recursos Humanos',
                'capacitacion', ['tipo' => ['induccion']], true],
            // Queda manual a propósito: el módulo no distingue por tipo las
            // capacitaciones al Comité, y contar todas daría un 100% falso en
            // un documento que audita SUNAFIL. Se vincula desde la UI si el
            // usuario define un filtro que las identifique.
            ['3.2', 'Realizar capacitaciones dirigidas al Comité de Seguridad y Salud en el Trabajo',
                [3, 6, 9, 12], 4, 'Capacitaciones realizadas', 'Registro de asistencia',
                'Unidad de Recursos Humanos'],
            ['3.3', 'Realizar capacitaciones dirigidas a todos los servidores',
                [2, 5, 8, 11], 4, 'Capacitaciones realizadas', 'Registro de asistencia',
                'Unidad de Recursos Humanos', 'capacitacion', ['tipo' => ['general', 'sensibilizacion']]],
            ['3.4', 'Realizar capacitaciones de respuesta ante emergencias', [5, 11], 2,
                'Capacitaciones realizadas', 'Registro de asistencia',
                'Unidad de Recursos Humanos'],
        ]],

        [4, 'IDENTIFICACIÓN DE PELIGROS, EVALUACIÓN DE RIESGOS Y ESTABLECIMIENTO DE CONTROLES (IPERC)', [
            ['4.1', 'Elaborar la Matriz IPERC de todas las áreas', [1, 2, 3, 4], 1,
                'Matriz IPERC de todas las áreas', 'Documento de la Matriz IPERC de todas las áreas',
                'Unidad de Recursos Humanos / Comité de SST', 'iperc'],
            ['4.2', 'Revisar y aprobar la Matriz IPERC', [4, 5], 1,
                'Matriz IPERC de todas las áreas aprobada',
                'Documento de la Matriz IPERC aprobada', 'Comité de Seguridad y Salud en el Trabajo'],
            ['4.3', 'Difundir la Matriz IPERC a los trabajadores', [5], 1,
                'Actividad de difusión de la Matriz IPERC', 'Registro de asistencia',
                'Unidad de Recursos Humanos'],
            ['4.4', 'Elaborar y publicar el Mapa de Riesgos', [5], 1,
                'Mapa de Riesgos publicado', 'Mapa de Riesgos y evidencia de publicación',
                'Unidad de Recursos Humanos'],
        ]],

        [5, 'SALUD OCUPACIONAL', [
            ['5.1', 'Elaborar e implementar el Plan de Vigilancia de la Salud de los trabajadores', [1], 1,
                'Plan de Vigilancia de la Salud elaborado', 'Plan elaborado', 'Unidad de Recursos Humanos'],
            ['5.2', 'Aprobar el Plan de Vigilancia de la Salud de los trabajadores', [1], 1,
                'Plan de Vigilancia de la Salud aprobado por el CSST',
                'Actas de reunión del Comité de Seguridad y Salud en el Trabajo',
                'Comité de Seguridad y Salud en el Trabajo'],
            ['5.3', 'Ejecutar los exámenes médicos ocupacionales', [3, 4, 5, 6, 7, 8, 9], null,
                'Exámenes médicos ocupacionales realizados',
                'Certificados de aptitud médica ocupacional', 'Unidad de Recursos Humanos', 'emo'],
            ['5.4', 'Realizar el monitoreo de agentes físicos, químicos, biológicos y disergonómicos', [7], 1,
                'Monitoreo de agentes ocupacionales realizado', 'Informe de monitoreo',
                'Unidad de Recursos Humanos'],
        ]],

        [6, 'INSPECCIONES INTERNAS DE SEGURIDAD Y SALUD EN EL TRABAJO', [
            ['6.1', 'Ejecutar las inspecciones internas planificadas', self::TODO_EL_ANIO, 12,
                'Inspecciones internas realizadas', 'Registro de inspecciones internas de SST',
                'Unidad de Recursos Humanos / Comité de SST', 'inspeccion'],
            ['6.2', 'Levantar las observaciones detectadas en las inspecciones', [], null,
                'Observaciones levantadas', 'Registro de acciones correctivas',
                'Jefes de área', 'manual', null, true],
        ]],

        [7, 'PREPARACIÓN Y RESPUESTA ANTE EMERGENCIAS', [
            ['7.1', 'Conformar y capacitar las brigadas de emergencia', [2, 3], 1,
                'Brigadas conformadas y capacitadas', 'Acta de conformación y registro de asistencia',
                'Unidad de Recursos Humanos'],
            ['7.2', 'Ejecutar los simulacros programados', [5, 8, 11], 3,
                'Simulacros realizados', 'Informe y registro de simulacro',
                'Unidad de Recursos Humanos / Brigadas', 'simulacro'],
            ['7.3', 'Inspeccionar los equipos de emergencia (extintores, botiquines, luces de emergencia)',
                self::TODO_EL_ANIO, 12, 'Inspecciones de equipos de emergencia realizadas',
                'Registro de inspección de equipos de emergencia', 'Unidad de Recursos Humanos'],
        ]],

        [8, 'INVESTIGACIÓN DE ACCIDENTES, INCIDENTES Y ENFERMEDADES OCUPACIONALES', [
            ['8.1', 'Investigar los accidentes de trabajo, incidentes peligrosos y enfermedades ocupacionales',
                [], null, 'Investigaciones realizadas',
                'Registro de accidentes de trabajo e incidentes peligrosos',
                'Unidad de Recursos Humanos / Comité de SST', 'accidente', null, true],
            ['8.2', 'Implementar y verificar las medidas correctivas derivadas de la investigación', [], null,
                'Medidas correctivas implementadas', 'Registro de acciones correctivas',
                'Jefes de área', 'manual', null, true],
            ['8.3', 'Reportar los accidentes de trabajo a la autoridad competente', [], null,
                'Reportes presentados', 'Cargo de reporte al MTPE',
                'Unidad de Recursos Humanos', 'manual', null, true],
        ]],

        [9, 'AUDITORÍA INTERNA DEL SGSST', [
            ['9.1', 'Programar y ejecutar la auditoría interna del SGSST', [10, 11], 1,
                'Auditoría interna del SGSST realizada', 'Informe de auditoría',
                'Unidad de Recursos Humanos', 'auditoria'],
            ['9.2', 'Levantar los hallazgos de la auditoría interna', [11, 12], 1,
                'Hallazgos levantados', 'Registro de acciones correctivas',
                'Jefes de área'],
        ]],

        [10, 'EQUIPOS DE PROTECCIÓN PERSONAL', [
            ['10.1', 'Entregar los EPP según la matriz de asignación por puesto', self::TODO_EL_ANIO, 12,
                'Entregas de EPP realizadas', 'Registro de entrega de EPP',
                'Unidad de Recursos Humanos'],
            ['10.2', 'Verificar el uso y estado de conservación de los EPP', self::TODO_EL_ANIO, 12,
                'Verificaciones realizadas', 'Registro de inspección de EPP',
                'Jefes de área / Comité de SST'],
        ]],

        [11, 'DOCUMENTACIÓN Y REGISTROS DEL SGSST', [
            ['11.1', 'Mantener actualizados los registros obligatorios (RM 050-2013-TR)',
                self::TODO_EL_ANIO, 12, 'Registros obligatorios actualizados',
                'Registros obligatorios del SGSST', 'Unidad de Recursos Humanos'],
            ['11.2', 'Revisar y actualizar los documentos del SGSST', [6, 12], 2,
                'Documentos del SGSST revisados', 'Documentos aprobados y versionados',
                'Unidad de Recursos Humanos', 'documento'],
        ]],
    ];

    /**
     * Crea elementos y actividades de la plantilla en un programa existente.
     * Solo se aplica sobre un programa vacío: reaplicarla duplicaría todo.
     *
     * @return array{elementos:int, actividades:int}
     */
    public function aplicar(ProgramaSst $programa): array
    {
        if ($programa->actividades()->exists() || $programa->elementos()->exists()) {
            throw new \RuntimeException('El programa ya tiene actividades cargadas.');
        }

        $totalActividades = 0;
        $ordenActividad   = 0;

        DB::transaction(function () use ($programa, &$totalActividades, &$ordenActividad) {
            foreach (self::ESTRUCTURA as $ordenElemento => [$numero, $nombre, $actividades]) {
                $elemento = $programa->elementos()->create([
                    'numero' => $numero,
                    'nombre' => $nombre,
                    'orden'  => $ordenElemento,
                ]);

                foreach ($actividades as $a) {
                    $programa->actividades()->create([
                        'elemento_id'       => $elemento->id,
                        'numero'            => $a[0],
                        'actividad'         => $a[1],
                        'meses'             => $a[2],
                        'meta_cantidad'     => $a[3],
                        'meta_texto'        => $a[4],
                        'evidencia_texto'   => $a[5],
                        'responsable_texto' => $a[6],
                        'modulo_vinculado'  => $a[7] ?? 'manual',
                        'filtro'            => $a[8] ?? null,
                        'segun_corresponda' => $a[9] ?? false,
                        'orden'             => $ordenActividad++,
                    ]);
                    $totalActividades++;
                }
            }
        });

        return ['elementos' => count(self::ESTRUCTURA), 'actividades' => $totalActividades];
    }
}
