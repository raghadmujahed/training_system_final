<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_assignment_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->text('notes')->nullable();
            $table->text('field_supervisor_notes')->nullable();
            $table->date('date');
            $table->time('check_in')->nullable();
            $table->time('check_out')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->timestamp('approved_at')->nullable();
            $table->enum('status', ['present', 'absent', 'late'])->default('present');
            $table->text('rejection_reason')->nullable();
            $table->integer('periods')->nullable();
            $table->timestamp('submitted_to_manager_at')->nullable();
            $table->foreignId('submitted_to_manager_by')->nullable()->constrained('users');
            $table->text('academic_note')->nullable();
            $table->string('academic_alert_status')->nullable();
            $table->timestamp('academic_commented_at')->nullable();
            $table->boolean('visible_to_academic')->default(true);
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
            $table->index(['training_assignment_id', 'user_id', 'date']);
            $table->index('status');
            $table->index('date');
            $table->index('archived_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
