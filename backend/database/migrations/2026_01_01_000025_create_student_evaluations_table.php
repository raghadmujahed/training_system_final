<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('evaluator_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('training_request_student_id')->nullable()->constrained('training_request_students')->onDelete('cascade');

            // Rating fields (1-5 scale)
            $table->tinyInteger('supervisor')->nullable();
            $table->tinyInteger('attendance')->nullable();
            $table->tinyInteger('cooperation_with_staff')->nullable();
            $table->tinyInteger('professionalism')->nullable();
            $table->tinyInteger('dealing_with_students')->nullable();
            $table->tinyInteger('manners')->nullable();
            $table->tinyInteger('participation_in_activities')->nullable();
            $table->tinyInteger('school')->nullable();
            $table->tinyInteger('comfort')->nullable();
            $table->tinyInteger('professional_ethics')->nullable();

            // Text fields
            $table->text('general_notes')->nullable();

            $table->date('evaluation_date')->default(now());
            $table->timestamp('archived_at')->nullable();
            $table->string('archived_period', 50)->nullable();
            $table->timestamps();

            // Indexes for better performance
            $table->index(['student_id', 'evaluation_date']);
            $table->index(['evaluator_id', 'evaluation_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_evaluations');
    }
};
