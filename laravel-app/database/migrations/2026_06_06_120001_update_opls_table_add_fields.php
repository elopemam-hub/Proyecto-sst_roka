<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('opls', function (Blueprint $table) {
            // Agregar campos nuevos (title, code, category ya existen)
            $table->string('author')->nullable()->after('title');
            $table->string('approver')->nullable()->after('author');
            $table->date('date')->nullable()->after('approver');
            $table->enum('orientation', ['portrait', 'landscape'])->default('portrait')->after('category');
            $table->enum('template_type', ['correct-incorrect', 'step-by-step', 'steps-4', 'trouble-solution'])->default('correct-incorrect')->after('orientation');
            $table->string('logo_left')->nullable()->after('template_type');
            $table->string('logo_right')->nullable()->after('logo_left');
            $table->string('background_style')->default('white')->after('logo_right');
            $table->string('revision')->default('Rev. 0')->after('version');
        });
    }

    public function down(): void
    {
        Schema::table('opls', function (Blueprint $table) {
            $table->dropColumn([
                'author', 'approver', 'date', 'orientation', 'template_type',
                'logo_left', 'logo_right', 'background_style', 'revision'
            ]);
        });
    }
};
