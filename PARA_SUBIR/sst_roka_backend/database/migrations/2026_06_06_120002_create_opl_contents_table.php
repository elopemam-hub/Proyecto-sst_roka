<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('opl_contents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('opl_id')->constrained('opls')->onDelete('cascade');
            $table->string('slot'); // incorrect, correct, step1, step2, step3, trouble, s4-step1...s4-step4
            $table->text('description')->nullable();
            $table->string('title')->nullable(); // solo para template steps-4
            $table->string('image_path')->nullable();
            $table->timestamps();

            $table->index(['opl_id', 'slot']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('opl_contents');
    }
};
