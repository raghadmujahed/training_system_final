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
        Schema::create('student_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('evaluator_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('training_request_student_id')->nullable()->constrained('training_request_students')->onDelete('cascade');
            
            // Rating fields (1-5 scale)
            $table->tinyInteger('attendance')->nullable();
            $table->tinyInteger('punctuality')->nullable();
            $table->tinyInteger('commitment')->nullable();
            $table->tinyInteger('initiative')->nullable();
            $table->tinyInteger('cooperation')->nullable();
            $table->tinyInteger('communication')->nullable();
            $table->tinyInteger('professional_conduct')->nullable();
            $table->tinyInteger('knowledge_application')->nullable();
            $table->tinyInteger('skills_development')->nullable();
            $table->tinyInteger('overall_performance')->nullable();
            
            // Text fields
            $table->text('strengths')->nullable();
            $table->text('weaknesses')->nullable();
            $table->text('recommendations')->nullable();
            $table->text('additional_notes')->nullable();
            
            $table->date('evaluation_date')->default(now());
            $table->timestamps();
            
            // Indexes for better performance
            $table->index(['student_id', 'evaluation_date']);
            $table->index(['evaluator_id', 'evaluation_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_evaluations');
    }
};
