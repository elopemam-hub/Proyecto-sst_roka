<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ejecución en campo del ATS:
 * - Evidencia (foto + geolocalización) por tarea.
 * - Charla de seguridad pre-inicio y "parar el trabajo" (stop work) en la cabecera.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ats_tareas', function (Blueprint $table) {
            $table->text('evidencia_foto')->nullable()->after('observaciones')->comment('Ruta a la foto de evidencia');
            $table->decimal('geo_lat', 10, 7)->nullable()->after('evidencia_foto');
            $table->decimal('geo_lng', 10, 7)->nullable()->after('geo_lat');
            $table->timestamp('ejecutada_en')->nullable()->after('geo_lng');
        });

        Schema::table('ats', function (Blueprint $table) {
            $table->text('charla_seguridad')->nullable()->after('observaciones_cierre')->comment('Charla de 5 min pre-inicio');
            $table->boolean('detenido')->default(false)->after('charla_seguridad');
            $table->timestamp('detenido_en')->nullable()->after('detenido');
            $table->text('motivo_detencion')->nullable()->after('detenido_en');
        });
    }

    public function down(): void
    {
        Schema::table('ats_tareas', function (Blueprint $table) {
            $table->dropColumn(['evidencia_foto', 'geo_lat', 'geo_lng', 'ejecutada_en']);
        });
        Schema::table('ats', function (Blueprint $table) {
            $table->dropColumn(['charla_seguridad', 'detenido', 'detenido_en', 'motivo_detencion']);
        });
    }
};
