<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('training_request_student_id')->nullable()->constrained('training_request_students')->onDelete('set null');
            $table->string('day');
            $table->date('date');
            $table->time('check_in');
            $table->time('check_out');
            $table->integer('lessons_count')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['present', 'absent', 'excused'])->default('present');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'date']);
            $table->index(['training_request_student_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_attendances');
    }
};
