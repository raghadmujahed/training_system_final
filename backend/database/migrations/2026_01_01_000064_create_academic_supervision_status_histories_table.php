<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('academic_supervision_status_histories', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('training_assignment_id');
            $table->unsignedBigInteger('student_id');
            $table->unsignedBigInteger('academic_supervisor_id')->nullable();
            $table->string('old_status')->nullable();
            $table->string('new_status');
            $table->text('note')->nullable();
            $table->unsignedBigInteger('changed_by')->nullable();
            $table->timestamp('changed_at');
            $table->timestamps();

            $table->foreign('training_assignment_id', 'as_status_hist_assignment_fk')
                ->references('id')
                ->on('training_assignments')
                ->cascadeOnDelete();
            $table->foreign('student_id', 'as_status_hist_student_fk')
                ->references('id')
                ->on('users')
                ->cascadeOnDelete();
            $table->foreign('academic_supervisor_id', 'as_status_hist_supervisor_fk')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
            $table->foreign('changed_by', 'as_status_hist_changed_by_fk')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
            $table->index(['training_assignment_id', 'changed_at'], 'academic_status_history_assignment_idx');
            $table->index(['student_id', 'academic_supervisor_id'], 'academic_status_history_student_supervisor_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('academic_supervision_status_histories');
    }
};
