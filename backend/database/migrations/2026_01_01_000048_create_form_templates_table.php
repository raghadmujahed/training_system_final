<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('form_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('form_key')->unique();
            $table->json('fields')->nullable();
            $table->enum('target_role', ['student', 'teacher', 'supervisor', 'field_supervisor', 'all'])->default('all');
            $table->enum('target_track', ['education', 'psychology', 'both'])->default('both');
            $table->boolean('is_active')->default(true);
            $table->boolean('is_required')->default(false);
            $table->timestamps();
            $table->index('form_key');
            $table->index('target_role');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_templates');
    }
};
