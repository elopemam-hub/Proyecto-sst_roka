<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('formatos_registros', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->enum('tipo_registro', [
                'reg_01', 'reg_02', 'reg_03', 'reg_04', 'reg_05',
                'reg_06', 'reg_07', 'reg_08', 'reg_09', 'reg_10',
            ]);
            $table->string('correlativo', 30)->unique();
            $table->string('titulo', 250);
            $table->unsignedSmallInteger('periodo_anio');
            $table->unsignedTinyInteger('periodo_mes')->nullable();
            $table->enum('estado', ['borrador', 'vigente', 'anulado'])->default('borrador');
            $table->json('datos_json')->nullable();
            $table->string('origen_tipo', 50)->nullable();
            $table->unsignedBigInteger('origen_id')->nullable();
            $table->foreignId('creado_por')->constrained('usuarios')->restrictOnDelete();
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->index(['empresa_id', 'tipo_registro']);
            $table->index(['empresa_id', 'estado']);
            $table->index(['empresa_id', 'periodo_anio']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('formatos_registros');
    }
};
