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
            $table->json('scores')->nullable();
            $table->integer('total_score')->nullable();
            $table->string('grade')->nullable();
            $table->text('general_notes')->nullable();
            $table->string('form_context')->nullable();
            $table->string('supervisor_name')->nullable()->comment('اسم المشرف التدريبي');
            $table->date('evaluation_date')->nullable()->comment('تاريخ التقييم');
            $table->text('strengths')->nullable();
            $table->text('areas_for_improvement')->nullable();
            $table->text('recommendations')->nullable();
            $table->text('counselor_notes')->nullable();
            $table->enum('status', ['draft', 'submitted', 'reviewed'])->default('draft');
            $table->boolean('is_final')->default(false);
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->string('archived_period', 50)->nullable();
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
