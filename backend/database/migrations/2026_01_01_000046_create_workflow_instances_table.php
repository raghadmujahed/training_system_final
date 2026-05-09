<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workflow_instances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workflow_template_id')->constrained()->cascadeOnDelete();
            $table->morphs('entity');
            $table->foreignId('initiated_by')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['pending', 'approved', 'rejected', 'in_progress'])->default('pending');
            $table->integer('current_step')->default(0);
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->index('workflow_template_id');
            $table->index('initiated_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workflow_instances');
    }
};
