<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_request_students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('assigned_teacher_id')->nullable()->constrained('users')->onDelete('set null');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('notes')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
            $table->unique(['training_request_id', 'user_id']);
            $table->index('user_id');
            $table->index('course_id');
            $table->index('assigned_teacher_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_request_students');
    }
};
