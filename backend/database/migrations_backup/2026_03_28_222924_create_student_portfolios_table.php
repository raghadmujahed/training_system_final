<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('student_portfolios', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained()
                ->onDelete('cascade');

            $table->foreignId('training_assignment_id')
                ->nullable()
                ->constrained('training_assignments')
                ->nullOnDelete();

            $table->timestamps();

            // =========================
            // INDEXES
            // =========================

            // ملفات الطالب
            $table->index('user_id');

            // ملفات التدريب
            $table->index('training_assignment_id');

            // استعلامات شائعة (طالب + تدريب)
            $table->index(['user_id', 'training_assignment_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_portfolios');
    }
};