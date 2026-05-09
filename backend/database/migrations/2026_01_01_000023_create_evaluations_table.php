<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')->constrained('evaluation_templates')->cascadeOnDelete();
            $table->foreignId('evaluator_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('evaluatee_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->foreignId('training_assignment_id')->nullable()->constrained()->cascadeOnDelete();
            $table->decimal('total_score', 5, 2)->nullable();
            $table->text('notes')->nullable();
            $table->enum('evaluation_type', ['academic', 'field', 'peer'])->default('academic');
            $table->string('status')->default('draft');
            $table->boolean('is_final')->default(false);
            $table->text('strengths')->nullable();
            $table->text('areas_for_improvement')->nullable();
            $table->string('recommendation')->nullable();
            $table->json('criteria_scores')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
            $table->index('template_id');
            $table->index('evaluator_id');
            $table->index('evaluatee_id');
            $table->index('training_assignment_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluations');
    }
};
