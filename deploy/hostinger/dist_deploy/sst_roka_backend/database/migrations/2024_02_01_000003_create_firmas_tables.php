<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * FIRMAS DIGITALES — Módulo transversal
 * Integración con: IPERC, ATS, Inspecciones, Capacitaciones, Accidentes,
 *                  Auditorías, Simulacros, Documentos, Formatos, EPPs
 *
 * Principios:
 * - No repudio: el firmante no puede negar haber firmado
 * - Integridad: hash SHA-256 del contenido firmado
 * - Autenticidad: usuario autenticado + 2FA opcional
 * - Log inmutable: append-only
 */
return new class extends Migration
{
    public function up(): void
    {
        // Flujos de firma configurables por tipo de documento
        Schema::create('firmas_flujos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->string('nombre')->comment('Ej: Flujo aprobación ATS crítico');
            $table->string('modulo', 50)->comment('iperc, ats, inspecciones, etc.');
            $table->string('tipo_documento', 100)->nullable()->comment('Subtipo dentro del módulo');
            $table->text('descripcion')->nullable();
            $table->boolean('activo')->default(true);
            $table->boolean('secuencial')->default(true)->comment('Firmar en orden vs simultáneo');
            $table->integer('dias_limite')->default(7)->comment('Días para completar flujo');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['empresa_id', 'modulo', 'activo']);
        });

        // Firmantes del flujo — por rol o por usuario específico
        Schema::create('firmas_flujo_firmantes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('flujo_id')->constrained('firmas_flujos')->onDelete('cascade');
            $table->integer('orden')->default(0);
            $table->enum('tipo_firmante', ['rol', 'usuario_especifico', 'cargo']);
            $table->string('valor_firmante', 100)->comment('Nombre del rol/cargo o ID usuario');
            $table->enum('accion', ['elabora', 'revisa', 'aprueba', 'recibe', 'ejecuta'])->default('revisa');
            $table->boolean('es_obligatorio')->default(true);
            $table->timestamps();

            $table->index(['flujo_id', 'orden']);
        });

        // Solicitudes de firma generadas
        Schema::create('firmas_solicitudes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->foreignId('flujo_id')->nullable()->constrained('firmas_flujos')->onDelete('set null');

            // Polimórfico: referencia al documento a firmar
            $table->string('documento_tipo', 100)->comment('App\\Models\\Iperc, App\\Models\\Ats, etc.');
            $table->unsignedBigInteger('documento_id');
            $table->string('documento_codigo', 50)->nullable()->comment('Código legible');
            $table->string('documento_titulo');

            // Hash de integridad del documento al momento de solicitar firma
            $table->string('hash_documento', 64)->comment('SHA-256 del contenido');
            $table->json('snapshot_datos')->nullable()->comment('Datos del documento al firmar');

            // Estado del flujo
            $table->enum('estado', [
                'pendiente', 'en_proceso', 'completada', 'rechazada', 'vencida', 'cancelada'
            ])->default('pendiente');
            $table->timestamp('solicitada_en')->useCurrent();
            $table->timestamp('fecha_limite')->nullable();
            $table->timestamp('completada_en')->nullable();

            $table->foreignId('solicitada_por')->constrained('usuarios')->onDelete('restrict');
            $table->timestamps();

            $table->index(['empresa_id', 'estado']);
            $table->index(['documento_tipo', 'documento_id']);
            $table->index('fecha_limite');
        });

        // Firmas individuales registradas
        Schema::create('firmas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('solicitud_id')->nullable()->constrained('firmas_solicitudes')->onDelete('cascade');
            $table->foreignId('usuario_id')->constrained('usuarios')->onDelete('restrict');

            // Polimórfico directo para firmas sin flujo formal
            $table->string('documento_tipo', 100);
            $table->unsignedBigInteger('documento_id');

            // Datos del firmante (snapshot al momento de firmar)
            $table->string('firmante_nombre');
            $table->string('firmante_dni', 8)->nullable();
            $table->string('firmante_cargo')->nullable();
            $table->string('firmante_rol', 50);
            $table->enum('accion_firma', ['elabora', 'revisa', 'aprueba', 'recibe', 'ejecuta', 'acepta']);

            // Método de autenticación usado
            $table->enum('metodo_firma', ['canvas', 'pin', 'totp', 'biometrico'])->default('canvas');
            $table->text('firma_imagen_path')->nullable()->comment('Ruta al PNG de la firma canvas');
            $table->string('firma_imagen_hash', 64)->nullable()->comment('Hash de la imagen');

            // Evidencia de no repudio
            $table->string('hash_documento_firmado', 64)->comment('Hash del documento al firmar');
            $table->string('hash_firma', 64)->unique()->comment('Hash único de esta firma');
            $table->string('ip', 45);
            $table->string('user_agent', 500)->nullable();
            $table->json('geolocalizacion')->nullable()->comment('Lat/Lng si disponible');
            $table->string('dispositivo', 100)->nullable();

            // Sello de tiempo
            $table->timestamp('firmado_en')->useCurrent();
            $table->string('sello_tiempo', 255)->nullable()->comment('Timestamp criptográfico opcional');

            // 2FA verification
            $table->boolean('verificado_2fa')->default(false);
            $table->string('token_2fa_usado', 10)->nullable();

            $table->text('observaciones')->nullable();
            $table->boolean('rechazada')->default(false);
            $table->text('motivo_rechazo')->nullable();

            $table->timestamps();

            // NO softDeletes — las firmas son inmutables
            $table->index(['documento_tipo', 'documento_id']);
            $table->index(['usuario_id', 'firmado_en']);
        });

        // Log inmutable de eventos de firma (auditoría)
        Schema::create('firmas_log', function (Blueprint $table) {
            $table->id();
            $table->foreignId('firma_id')->nullable()->constrained('firmas')->onDelete('set null');
            $table->foreignId('solicitud_id')->nullable()->constrained('firmas_solicitudes')->onDelete('set null');
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->onDelete('set null');

            $table->enum('evento', [
                'solicitud_creada',
                'firma_pendiente_notificada',
                'firma_realizada',
                'firma_rechazada',
                'flujo_completado',
                'solicitud_cancelada',
                'recordatorio_enviado',
                'solicitud_vencida'
            ]);
            $table->json('detalles')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamp('creado_en')->useCurrent();

            // Sin updates ni deletes — append-only
            $table->index(['solicitud_id', 'evento']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('firmas_log');
        Schema::dropIfExists('firmas');
        Schema::dropIfExists('firmas_solicitudes');
        Schema::dropIfExists('firmas_flujo_firmantes');
        Schema::dropIfExists('firmas_flujos');
    }
};
