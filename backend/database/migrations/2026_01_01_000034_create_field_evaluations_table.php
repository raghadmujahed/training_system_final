<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('field_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('field_supervisor_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('template_id')->nullable()->constrained('evaluation_templates')->onDelete('set null');
            $table->foreignId('training_assignment_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('form_context')->nullable();
            $table->decimal('score', 5, 2)->nullable();
            $table->text('strengths')->nullable();
            $table->text('areas_for_improvement')->nullable();
            $table->text('recommendations')->nullable();
            $table->text('counselor_notes')->nullable();
            $table->enum('status', ['draft', 'submitted', 'reviewed'])->default('draft');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
            $table->index('student_id');
            $table->index('field_supervisor_id');
            $table->index('training_assignment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('field_evaluations');
    }
};
