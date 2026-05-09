<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('field_supervisor_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('template_id')->nullable()->constrained('daily_report_templates')->onDelete('set null');
            $table->foreignId('training_assignment_id')->nullable()->constrained()->cascadeOnDelete();
            $table->date('report_date');
            $table->json('data')->nullable();
            $table->text('student_notes')->nullable();
            $table->text('supervisor_notes')->nullable();
            $table->enum('status', ['draft', 'submitted', 'reviewed'])->default('draft');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
            $table->index('student_id');
            $table->index('field_supervisor_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_reports');
    }
};
