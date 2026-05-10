<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teacher_school_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('school_id')->constrained('training_sites')->onDelete('cascade');
            $table->string('academic_year')->nullable();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->string('status')->default('active'); // active, ended, transferred
            $table->string('action_type')->nullable(); // assignment, end_assignment, transfer
            $table->text('reason')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            // Indexes for performance and constraints
            $table->index(['teacher_id', 'is_active'], 'tsa_teacher_active_idx');
            $table->index(['school_id', 'is_active'], 'tsa_school_active_idx');
            $table->index(['academic_year', 'is_active'], 'tsa_year_active_idx');
            $table->index(['status', 'created_at'], 'tsa_status_created_idx');
            $table->unique(['teacher_id', 'school_id', 'is_active'], 'tsa_teacher_school_active_unique');

            // Prevent overlapping active assignments for the same teacher
            $table->unique(['teacher_id', 'is_active'], 'tsa_teacher_active_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_school_assignments');
    }
};
