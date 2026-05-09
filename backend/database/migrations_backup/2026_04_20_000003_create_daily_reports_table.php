<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * التقارير اليومية التي يرفعها الطلاب
     */
    public function up(): void
    {
        Schema::create('daily_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('field_supervisor_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('training_assignment_id')->constrained()->onDelete('cascade');
            $table->foreignId('template_id')->constrained('daily_report_templates')->onDelete('cascade');
            
            $table->date('report_date');
            $table->json('content'); // المحتوى حسب القالب
            
            // الحالة
            $table->enum('status', [
                'draft',           // مسودة
                'submitted',       // مُرسل
                'under_review',    // قيد المراجعة
                'confirmed',       // مُعتمد
                'returned'         // مُعاد للتعديل
            ])->default('submitted');
            
            // مراجعة المشرف
            $table->text('supervisor_comment')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            
            $table->timestamps();
            
            $table->index(['student_id', 'report_date']);
            $table->index(['field_supervisor_id', 'status']);
            $table->index('status');
            $table->unique(['student_id', 'report_date', 'template_id'], 'unique_daily_report');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_reports');
    }
};
