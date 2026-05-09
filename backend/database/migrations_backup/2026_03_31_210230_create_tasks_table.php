<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();

            $table->string('title');
            $table->text('description')->nullable();

            $table->foreignId('training_assignment_id')
                ->constrained()
                ->onDelete('cascade');

            $table->foreignId('assigned_by')
                ->constrained('users')
                ->onDelete('cascade');

            $table->date('due_date')->nullable();

            $table->enum('status', ['pending', 'in_progress', 'completed', 'submitted', 'graded'])
                ->default('pending');

            $table->timestamps();

            // =========================
            // INDEXES
            // =========================

            $table->index('training_assignment_id');
            $table->index('assigned_by');
            $table->index('due_date');
            $table->index('status');

            $table->index(['training_assignment_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};