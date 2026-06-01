<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Personal (trabajadores)
        Schema::create('personal', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->foreignId('sede_id')->constrained('sedes')->onDelete('cascade');
            $table->foreignId('area_id')->constrained('areas')->onDelete('cascade');
            $table->foreignId('cargo_id')->constrained('cargos')->onDelete('cascade');

            // Datos personales
            $table->string('nombres');
            $table->string('apellidos');
            $table->string('dni', 8)->unique();
            $table->date('fecha_nacimiento')->nullable();
            $table->enum('genero', ['M','F','O'])->nullable();
            $table->string('telefono', 20)->nullable();
            $table->string('email')->nullable();
            $table->string('direccion')->nullable();
            $table->string('foto_path')->nullable();

            // Datos laborales
            $table->string('codigo_empleado', 30)->nullable()->unique();
            $table->date('fecha_ingreso');
            $table->date('fecha_cese')->nullable();
            $table->enum('tipo_contrato', ['planilla','tercero','practicante','locacion'])->default('planilla');
            $table->enum('estado', ['activo','inactivo','suspendido'])->default('activo');
            $table->boolean('es_supervisor_sst')->default(false);

            // Datos de emergencia
            $table->string('contacto_emergencia_nombre')->nullable();
            $table->string('contacto_emergencia_telefono', 20)->nullable();
            $table->string('grupo_sanguineo', 5)->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['empresa_id', 'estado']);
            $table->index(['area_id', 'estado']);
        });

        // Usuarios del sistema
        Schema::create('usuarios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('personal_id')->nullable()->constrained('personal')->onDelete('set null');
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->string('nombre');
            $table->string('email')->unique();
            $table->string('password');
            $table->enum('rol', [
                'administrador',
                'supervisor_sst',
                'tecnico_sst',
                'operativo',
                'vigilante',
                'solo_lectura'
            ])->default('operativo');

            // Permisos granulares por módulo (JSON)
            $table->json('permisos')->nullable()->comment('Permisos adicionales por módulo');

            // Seguridad
            $table->boolean('activo')->default(true);
            $table->boolean('dos_factores')->default(false);
            $table->string('dos_factores_secret')->nullable();
            $table->string('remember_token', 100)->nullable();
            $table->timestamp('ultimo_acceso')->nullable();
            $table->string('ultimo_ip', 45)->nullable();
            $table->integer('intentos_fallidos')->default(0);
            $table->timestamp('bloqueado_hasta')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['empresa_id', 'rol', 'activo']);
        });

        // Tokens de autenticación (Sanctum)
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('usuarios');
        Schema::dropIfExists('personal');
    }
};
