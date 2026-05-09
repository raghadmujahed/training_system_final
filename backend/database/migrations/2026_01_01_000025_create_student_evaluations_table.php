<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('evaluation_template_id')->constrained()->cascadeOnDelete();
            $table->foreignId('evaluator_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('score', 5, 2)->nullable();
            $table->text('feedback')->nullable();
            $table->json('scores_by_criteria')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->string('status')->default('pending');
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
            $table->index('student_id');
            $table->index('evaluation_template_id');
            $table->index('evaluator_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_evaluations');
    }
};
