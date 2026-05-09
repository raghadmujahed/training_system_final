<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('field_evaluation_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->text('description')->nullable();
            $table->enum('form_type', ['evaluation', 'student_form'])->default('evaluation');
            $table->enum('applies_to', ['education', 'psychology', 'health', 'all'])->default('all');
            $table->json('criteria')->nullable();
            $table->integer('total_score')->default(100);
            $table->json('score_ranges')->nullable();
            $table->boolean('allow_draft')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index('applies_to');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('field_evaluation_templates');
    }
};
