<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Log de auditoría — inmutable, append-only
        Schema::create('auditoria_log', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->onDelete('set null');
            $table->string('usuario_nombre')->nullable()->comment('Snapshot del nombre al momento del evento');
            $table->string('modulo', 50);
            $table->string('accion', 100);
            $table->string('modelo', 100)->nullable();
            $table->unsignedBigInteger('modelo_id')->nullable();
            $table->json('valor_anterior')->nullable();
            $table->json('valor_nuevo')->nullable();
            $table->string('ip', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamp('creado_en')->useCurrent();

            // Sin softDeletes — log inmutable
            $table->index(['modulo', 'accion']);
            $table->index(['usuario_id', 'creado_en']);
            $table->index(['modelo', 'modelo_id']);
        });

        // Notificaciones in-app
        Schema::create('notificaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->onDelete('cascade');
            $table->string('titulo');
            $table->text('mensaje');
            $table->string('tipo', 50)->default('info')->comment('info, warning, danger, success');
            $table->string('modulo', 50)->nullable();
            $table->unsignedBigInteger('referencia_id')->nullable();
            $table->string('url_accion')->nullable();
            $table->boolean('leida')->default(false);
            $table->timestamp('leida_en')->nullable();
            $table->timestamps();

            $table->index(['usuario_id', 'leida']);
        });

        // Configuración de alertas automáticas
        Schema::create('alertas_config', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->string('tipo', 100)->comment('vencimiento_emo, stock_critico_epp, inspeccion_vencida, etc.');
            $table->integer('dias_anticipacion')->default(30);
            $table->boolean('notificar_email')->default(true);
            $table->boolean('notificar_push')->default(true);
            $table->boolean('notificar_sms')->default(false);
            $table->json('roles_destinatarios')->nullable()->comment('Roles que reciben la alerta');
            $table->boolean('activa')->default(true);
            $table->timestamps();
        });

        // Programa SST anual
        Schema::create('programa_sst', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->year('anio');
            $table->string('objetivo');
            $table->text('descripcion')->nullable();
            $table->enum('estado', ['borrador','aprobado','en_ejecucion','cerrado'])->default('borrador');
            $table->decimal('presupuesto', 12, 2)->nullable();
            $table->decimal('presupuesto_ejecutado', 12, 2)->default(0);
            $table->date('fecha_aprobacion')->nullable();
            $table->foreignId('aprobado_por')->nullable()->constrained('usuarios')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'anio']);
        });

        // Actividades del programa SST
        Schema::create('programa_sst_actividades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('programa_id')->constrained('programa_sst')->onDelete('cascade');
            $table->string('nombre');
            $table->enum('tipo', ['capacitacion','inspeccion','simulacro','auditoria','monitoreo','otro'])->default('otro');
            $table->date('fecha_programada');
            $table->date('fecha_ejecutada')->nullable();
            $table->foreignId('responsable_id')->nullable()->constrained('personal')->onDelete('set null');
            $table->decimal('presupuesto', 10, 2)->nullable();
            $table->enum('estado', ['pendiente','en_proceso','completado','cancelado'])->default('pendiente');
            $table->text('observaciones')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('programa_sst_actividades');
        Schema::dropIfExists('programa_sst');
        Schema::dropIfExists('alertas_config');
        Schema::dropIfExists('notificaciones');
        Schema::dropIfExists('auditoria_log');
    }
};
