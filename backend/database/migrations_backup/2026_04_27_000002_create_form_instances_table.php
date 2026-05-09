<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('form_instances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_template_id')->constrained('form_templates')->cascadeOnDelete();
            $table->foreignId('training_assignment_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('subject_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('owner_type');
            $table->string('status')->default('not_started');
            $table->json('payload')->nullable();
            $table->json('visibility_roles')->nullable();
            $table->json('workflow_state')->nullable();
            $table->timestamp('available_at')->nullable();
            $table->timestamp('due_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('finalized_at')->nullable();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('current_reviewer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->integer('current_review_step')->default(0);
            $table->timestamps();

            $table->unique(['form_template_id', 'training_assignment_id', 'owner_user_id'], 'unique_form_instance_assignment_owner');
            $table->index(['owner_user_id', 'status']);
            $table->index(['subject_user_id', 'status']);
            $table->index(['training_assignment_id', 'status']);
            $table->index(['current_reviewer_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_instances');
    }
};
