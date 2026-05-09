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
            $table->foreignId('training_assignment_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('assigned_by')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->text('instructions')->nullable();
            $table->string('target_type')->nullable();
            $table->json('target_ids')->nullable();
            $table->string('task_type')->nullable();
            $table->json('attachments')->nullable();
            $table->decimal('grading_weight', 5, 2)->nullable();
            $table->date('due_date')->nullable();
            $table->enum('status', ['draft', 'published', 'submitted', 'archived'])->default('draft');
            $table->boolean('allow_resubmission')->default(false);
            $table->boolean('is_required')->default(true);
            $table->string('distribution_key')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
            $table->index('assigned_by');
            $table->index('status');
            $table->index('due_date');
            $table->index('distribution_key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
