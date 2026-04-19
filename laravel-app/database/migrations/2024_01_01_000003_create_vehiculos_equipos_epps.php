<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Vehículos
        Schema::create('vehiculos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->foreignId('sede_id')->constrained('sedes')->onDelete('cascade');
            $table->string('placa', 10)->unique();
            $table->string('marca');
            $table->string('modelo');
            $table->year('anio')->nullable();
            $table->string('color')->nullable();
            $table->enum('tipo', ['camion','camioneta','auto','moto','montacarga','otro'])->default('auto');
            $table->date('soat_vencimiento')->nullable();
            $table->date('revision_tecnica_vencimiento')->nullable();
            $table->date('seguro_vencimiento')->nullable();
            $table->enum('estado', ['operativo','mantenimiento','baja'])->default('operativo');
            $table->timestamps();
            $table->softDeletes();
        });

        // Equipos y maquinaria
        Schema::create('equipos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->foreignId('area_id')->constrained('areas')->onDelete('cascade');
            $table->string('nombre');
            $table->string('codigo', 30)->nullable()->unique();
            $table->string('marca')->nullable();
            $table->string('modelo')->nullable();
            $table->string('serie')->nullable();
            $table->enum('tipo', ['maquinaria','herramienta','equipo_medicion','electrico','otro'])->default('otro');
            $table->date('ultimo_mantenimiento')->nullable();
            $table->date('proximo_mantenimiento')->nullable();
            $table->date('certificacion_vencimiento')->nullable();
            $table->enum('estado', ['operativo','mantenimiento','baja'])->default('operativo');
            $table->timestamps();
            $table->softDeletes();
        });

        // NOTA: La definición de catálogo e inventario de EPPs se consolidó
        // en 2024_04_01_000001_create_epps_tables.php (epps_categorias +
        // epps_inventario con softdeletes + epps_entregas). Las tablas
        // epps_tipos y la v1 de epps_inventario quedaron deprecadas.
    }

    public function down(): void
    {
        Schema::dropIfExists('equipos');
        Schema::dropIfExists('vehiculos');
    }
};
