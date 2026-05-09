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
      Schema::create('evaluations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('training_assignment_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('evaluator_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->foreignId('template_id')
                ->constrained('evaluation_templates')
                ->cascadeOnDelete();

            $table->decimal('total_score', 5, 2)->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();

            // =========================
            // INDEXES
            // =========================

            // التقارير حسب المهمة
            $table->index('training_assignment_id');

            // التقارير حسب المقيّم
            $table->index('evaluator_id');

            // التقارير حسب النموذج
            $table->index('template_id');

            // مهم جداً للتقارير المركبة (فلترة شائعة)
            $table->index(['training_assignment_id', 'evaluator_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluations');
    }
};