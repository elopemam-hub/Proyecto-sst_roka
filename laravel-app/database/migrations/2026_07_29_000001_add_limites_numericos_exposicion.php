<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Separa valor y unidad de los límites de exposición ocupacional.
 *
 * Hasta ahora limite_tlv_twa / limite_stel / limite_idlh y nivel_medido eran
 * varchar libres ("0.5 ppm"), imposibles de comparar sin adivinar. Decidir si
 * un trabajador está sobre el límite es una decisión de salud y no puede
 * apoyarse en parsear texto.
 *
 * Las columnas de texto NO se eliminan: quedan como respaldo y como
 * observación (algunas fichas traen notas del tipo "piel" o "techo"), y hacen
 * el backfill reversible.
 *
 * La unidad va como varchar validado en la aplicación, no como enum, para que
 * añadir una unidad nueva sea un cambio de código y no otra migración.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sustancias_peligrosas', function (Blueprint $table) {
            foreach (['tlv_twa', 'stel', 'idlh'] as $limite) {
                if (!Schema::hasColumn('sustancias_peligrosas', "limite_{$limite}_valor")) {
                    $table->decimal("limite_{$limite}_valor", 12, 4)->nullable()->after("limite_{$limite}");
                    $table->string("limite_{$limite}_unidad", 20)->nullable()->after("limite_{$limite}_valor");
                }
            }
        });

        Schema::table('sustancia_exposiciones', function (Blueprint $table) {
            if (!Schema::hasColumn('sustancia_exposiciones', 'nivel_medido_valor')) {
                $table->decimal('nivel_medido_valor', 12, 4)->nullable()->after('nivel_medido');
                $table->string('nivel_medido_unidad', 20)->nullable()->after('nivel_medido_valor');
            }
            if (!Schema::hasColumn('sustancia_exposiciones', 'evaluacion_automatica')) {
                // Se guarda aparte de resultado_evaluacion: el criterio del
                // higienista no se sobrescribe, se contrasta.
                $table->string('evaluacion_automatica', 24)->nullable()->after('resultado_evaluacion');
                $table->decimal('pct_limite', 8, 2)->nullable()->after('evaluacion_automatica');
                $table->string('limite_aplicado', 10)->nullable()->after('pct_limite');
                $table->string('motivo_evaluacion', 200)->nullable()->after('limite_aplicado');
            }
        });
    }

    public function down(): void
    {
        Schema::table('sustancias_peligrosas', function (Blueprint $table) {
            $table->dropColumn([
                'limite_tlv_twa_valor', 'limite_tlv_twa_unidad',
                'limite_stel_valor', 'limite_stel_unidad',
                'limite_idlh_valor', 'limite_idlh_unidad',
            ]);
        });

        Schema::table('sustancia_exposiciones', function (Blueprint $table) {
            $table->dropColumn([
                'nivel_medido_valor', 'nivel_medido_unidad',
                'evaluacion_automatica', 'pct_limite', 'limite_aplicado', 'motivo_evaluacion',
            ]);
        });
    }
};
