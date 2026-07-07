<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('opl_id')->constrained('opls')->onDelete('cascade');
            $table->string('name');
            $table->date('date');
            $table->string('signature_path')->nullable();
            $table->timestamps();

            $table->index('opl_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_records');
    }
};
