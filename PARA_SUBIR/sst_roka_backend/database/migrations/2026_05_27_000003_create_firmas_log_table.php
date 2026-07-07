<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
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

            $table->index(['solicitud_id', 'evento']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('firmas_log');
    }
};
