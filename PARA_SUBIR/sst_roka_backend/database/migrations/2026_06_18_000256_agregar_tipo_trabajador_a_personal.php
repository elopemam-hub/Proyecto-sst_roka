<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('personal', function (Blueprint $table) {
            // Tipo de trabajador: interno (empleado de la empresa) o tercero (proveedor/contratista)
            $table->enum('tipo_trabajador', ['interno', 'tercero'])
                  ->default('interno')
                  ->after('cargo_id')
                  ->comment('Tipo de trabajador: interno o tercero');

            // Empresa tercera (solo si tipo_trabajador = 'tercero')
            $table->string('empresa_tercera', 255)
                  ->nullable()
                  ->after('tipo_trabajador')
                  ->comment('Nombre de la empresa proveedora (si es tercero)');

            // Certificaciones del trabajador (JSON con certificados y vigencias)
            $table->text('certificaciones')
                  ->nullable()
                  ->after('empresa_tercera')
                  ->comment('Certificaciones del trabajador tercero (JSON)');

            // Vigencia del contrato/certificaciones (para alertas)
            $table->date('vigencia_hasta')
                  ->nullable()
                  ->after('certificaciones')
                  ->comment('Fecha de vigencia del contrato o certificación');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('personal', function (Blueprint $table) {
            $table->dropColumn(['tipo_trabajador', 'empresa_tercera', 'certificaciones', 'vigencia_hasta']);
        });
    }
};
