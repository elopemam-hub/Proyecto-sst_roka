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

        // Catálogo de tipos de EPP
        Schema::create('epps_tipos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->string('nombre');
            $table->string('codigo', 20)->nullable();
            $table->enum('categoria', ['cabeza','ojos','cara','oidos','respiracion','manos','pies','cuerpo','caidas','otro'])->default('otro');
            $table->integer('vida_util_meses')->default(12)->comment('Vida útil estimada en meses');
            $table->string('norma_tecnica')->nullable()->comment('Ejemplo: ANSI Z89.1');
            $table->text('descripcion')->nullable();
            $table->timestamps();
        });

        // Inventario de EPPs
        Schema::create('epps_inventario', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->foreignId('epp_tipo_id')->constrained('epps_tipos')->onDelete('cascade');
            $table->string('talla')->nullable();
            $table->string('marca')->nullable();
            $table->string('modelo')->nullable();
            $table->integer('stock_actual')->default(0);
            $table->integer('stock_minimo')->default(5);
            $table->date('fecha_vencimiento')->nullable();
            $table->string('ubicacion')->nullable();
            $table->timestamps();

            $table->index(['empresa_id', 'epp_tipo_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('epps_inventario');
        Schema::dropIfExists('epps_tipos');
        Schema::dropIfExists('equipos');
        Schema::dropIfExists('vehiculos');
    }
};
