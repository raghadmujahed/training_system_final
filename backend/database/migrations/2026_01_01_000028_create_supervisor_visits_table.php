<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supervisor_visits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supervisor_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('training_assignment_id')->nullable()->constrained()->cascadeOnDelete();
            $table->date('visit_date');
            $table->date('scheduled_date')->nullable();
            $table->text('notes')->nullable();
            $table->integer('rating')->nullable();
            $table->enum('status', ['planned', 'completed', 'cancelled'])->default('planned');
            $table->string('visit_type')->nullable();
            $table->string('location')->nullable();
            $table->string('training_track')->nullable();
            $table->string('template_type')->nullable();
            $table->json('report_data')->nullable();
            $table->text('positive_points')->nullable();
            $table->text('needs_improvement')->nullable();
            $table->text('general_notes')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->string('archived_period', 50)->nullable();
            $table->timestamps();
            $table->index('supervisor_id');
            $table->index('training_assignment_id');
            $table->index('visit_date');
            $table->index(['supervisor_id', 'scheduled_date', 'status'], 'visits_supervisor_sched_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supervisor_visits');
    }
};
