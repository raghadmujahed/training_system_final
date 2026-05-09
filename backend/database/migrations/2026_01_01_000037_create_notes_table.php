<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('training_assignment_id')->nullable()->constrained()->nullOnDelete();
            $table->morphs('notable');
            $table->text('content');
            $table->string('type')->default('general');
            $table->timestamp('archived_at')->nullable();
            $table->string('archived_period', 50)->nullable();
            $table->timestamps();
            $table->index('user_id');
            $table->index('training_assignment_id');
            $table->index('created_at');
            $table->index(['training_assignment_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notes');
    }
};
