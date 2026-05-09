<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('supervisor_visits', function (Blueprint $table) {
            $table->id();

            $table->foreignId('training_assignment_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('supervisor_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->date('visit_date');

            $table->text('notes')->nullable();

            $table->decimal('rating', 5, 2)->nullable();
            $table->date('scheduled_date')->nullable();
            $table->enum('status', ['scheduled', 'completed', 'cancelled'])->default('scheduled');

            $table->timestamps();

            // =========================
            // INDEXES
            // =========================

            $table->index('training_assignment_id');
            $table->index('supervisor_id');
            $table->index('visit_date');

            $table->index(['training_assignment_id', 'supervisor_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supervisor_visits');
    }
};