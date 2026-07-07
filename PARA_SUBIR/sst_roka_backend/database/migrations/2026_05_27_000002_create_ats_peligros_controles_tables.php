<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ats_peligros', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ats_tarea_id')->constrained('ats_tareas')->onDelete('cascade');
            $table->enum('tipo_peligro', [
                'fisico', 'quimico', 'biologico', 'ergonomico',
                'psicosocial', 'mecanico', 'electrico', 'locativo', 'otro'
            ]);
            $table->string('descripcion');
            $table->string('riesgo');
            $table->enum('severidad', ['leve', 'moderada', 'grave', 'muy_grave']);
            $table->timestamps();
        });

        Schema::create('ats_controles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ats_tarea_id')->constrained('ats_tareas')->onDelete('cascade');
            $table->enum('tipo_control', [
                'eliminacion', 'sustitucion', 'ingenieria', 'administrativo', 'epp'
            ]);
            $table->text('descripcion');
            $table->boolean('implementado')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ats_controles');
        Schema::dropIfExists('ats_peligros');
    }
};
