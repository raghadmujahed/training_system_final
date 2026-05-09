<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('training_request_students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_request_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('course_id')->constrained();
            $table->date('start_date');
            $table->date('end_date');
            $table->text('notes')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->foreignId('assigned_teacher_id')->nullable()->constrained('users');
 $table->enum('status', ['pending', 'approved', 'rejected', 'cancelled', 'needs_modification'])
                  ->default('pending');
                $table->timestamps();

            $table->unique(['training_request_id', 'user_id']);
            $table->index('status');
            $table->index(['training_request_id', 'status']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('training_request_students');
    }
};