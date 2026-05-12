<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('section_students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('section_id')->constrained()->onDelete('cascade');
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('training_period_id')->nullable()->constrained('training_periods')->nullOnDelete();
            $table->enum('status', ['accepted', 'rejected', 'pending'])->default('accepted');
            $table->text('notes')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->string('archived_period')->nullable();
            $table->timestamps();
            $table->unique(['section_id', 'student_id']);
            $table->index(['student_id', 'status']);
            $table->index(['archived_at']);
            $table->index(['archived_period']);
            $table->index(['training_period_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('section_students');
    }
};
