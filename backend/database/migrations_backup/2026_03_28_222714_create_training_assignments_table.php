<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_assignments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('enrollment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('training_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('training_request_student_id')->nullable()->constrained('training_request_students')->onDelete('cascade');
            $table->foreignId('training_site_id')->constrained()->cascadeOnDelete();
            $table->foreignId('training_period_id')->constrained();
            $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('academic_supervisor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('coordinator_id')->nullable()->constrained('users')->nullOnDelete();

            $table->enum('status', ['assigned', 'ongoing', 'completed'])->default('assigned');
            $table->date('start_date');
            $table->date('end_date');

            $table->timestamps();

            $table->index('enrollment_id');
            $table->index('training_request_id');
            $table->index('training_request_student_id');
            $table->index('training_site_id');
            $table->index('training_period_id');
            $table->index('teacher_id');
            $table->index('academic_supervisor_id');
            $table->index('coordinator_id');
            $table->index('status');
            $table->index(['status', 'start_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_assignments');
    }
};