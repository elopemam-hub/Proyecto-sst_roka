<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Versionado real del IPERC: enlaza cada nueva versión con su versión padre,
 * para trazar el historial de revisiones de una matriz aprobada.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('iperc', function (Blueprint $table) {
            $table->foreignId('version_padre_id')
                ->nullable()
                ->after('version')
                ->constrained('iperc')
                ->nullOnDelete()
                ->comment('IPERC del que deriva esta versión');
        });
    }

    public function down(): void
    {
        Schema::table('iperc', function (Blueprint $table) {
            $table->dropForeign(['version_padre_id']);
            $table->dropColumn('version_padre_id');
        });
    }
};
