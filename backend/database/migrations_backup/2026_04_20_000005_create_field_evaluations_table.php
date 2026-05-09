<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * التقييمات الميدانية
     */
    public function up(): void
    {
        Schema::create('field_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('field_supervisor_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('training_assignment_id')->constrained()->onDelete('cascade');
            $table->foreignId('template_id')->constrained('field_evaluation_templates')->onDelete('cascade');
            
            // درجات البنود
            $table->json('scores'); // {criterion_id: score}
            $table->integer('total_score')->nullable();
            $table->string('grade')->nullable(); // ممتاز / جيد / ...
            
            // الملاحظات
            $table->text('general_notes')->nullable();
            $table->text('strengths')->nullable();
            $table->text('areas_for_improvement')->nullable();
            
            // الحالة
            $table->enum('status', [
                'draft',
                'submitted',
                'reviewed'
            ])->default('draft');
            
            $table->boolean('is_final')->default(false);
            $table->timestamp('submitted_at')->nullable();
            
            $table->timestamps();
            
            $table->index(['student_id', 'status']);
            $table->index(['field_supervisor_id', 'status']);
            $table->unique(['student_id', 'template_id'], 'unique_field_eval');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('field_evaluations');
    }
};
