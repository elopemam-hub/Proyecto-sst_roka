<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Empresas
        Schema::create('empresas', function (Blueprint $table) {
            $table->id();
            $table->string('razon_social');
            $table->string('ruc', 11)->unique();
            $table->string('ciiu', 10)->nullable()->comment('Código Industrial Internacional Uniforme');
            $table->string('representante_legal');
            $table->string('dni_representante', 8);
            $table->string('direccion');
            $table->string('telefono', 20)->nullable();
            $table->string('email')->nullable();
            $table->string('logo_path')->nullable();
            $table->boolean('activa')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // Sedes / plantas
        Schema::create('sedes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->string('nombre');
            $table->string('direccion');
            $table->string('ubigeo', 6)->nullable();
            $table->string('departamento')->nullable();
            $table->string('provincia')->nullable();
            $table->string('distrito')->nullable();
            $table->string('responsable_sst')->nullable();
            $table->boolean('activa')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // Áreas operativas
        Schema::create('areas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sede_id')->constrained('sedes')->onDelete('cascade');
            $table->string('nombre');
            $table->string('codigo', 20)->nullable();
            $table->enum('tipo', ['almacen','transporte','taller','limpieza','vigilancia','distribucion','oficina','otro'])->default('otro');
            $table->text('descripcion')->nullable();
            $table->boolean('activa')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // Cargos / puestos
        Schema::create('cargos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->string('nombre');
            $table->string('codigo', 20)->nullable();
            $table->boolean('es_critico')->default(false)->comment('Cargo con exposición a riesgos críticos');
            $table->boolean('requiere_emo')->default(true)->comment('Requiere Examen Médico Ocupacional');
            $table->text('funciones')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cargos');
        Schema::dropIfExists('areas');
        Schema::dropIfExists('sedes');
        Schema::dropIfExists('empresas');
    }
};
