<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipo_asignacion_reglas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas');
            $table->foreignId('area_id')->nullable()->constrained('areas')->nullOnDelete();
            $table->foreignId('equipo_id')->nullable()->constrained('equipos')->nullOnDelete();
            $table->foreignId('tipo_id')->nullable()->constrained('equipos_tipos')->nullOnDelete();
            $table->enum('turno', ['mañana', 'tarde', 'noche', 'dia_completo'])->default('dia_completo');
            // JSON array de días: [1=lunes ... 7=domingo]
            $table->json('dias_semana')->default('[1,2,3,4,5]');
            $table->boolean('activo')->default(true);
            $table->string('observaciones', 300)->nullable();
            $table->foreignId('creado_por')->constrained('usuarios');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['empresa_id', 'activo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipo_asignacion_reglas');
    }
};
