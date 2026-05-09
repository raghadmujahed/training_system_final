<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_assignment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->date('log_date');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->text('activities_performed')->nullable();
            $table->text('supervisor_notes')->nullable();
            $table->text('student_reflection')->nullable();
            $table->enum('status', ['draft', 'submitted', 'reviewed'])->default('draft');
            $table->string('academic_review_status')->nullable();
            $table->text('academic_note')->nullable();
            $table->boolean('needs_discussion')->default(false);
            $table->timestamp('academic_reviewed_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
            $table->index('training_assignment_id');
            $table->index('user_id');
            $table->index('log_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_logs');
    }
};
