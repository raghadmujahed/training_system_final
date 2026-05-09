<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_relationships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('related_user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('type', ['academic', 'field', 'training_assignment', 'coordinator', 'admin']);
            $table->timestamps();
            $table->unique(['user_id', 'related_user_id', 'type']);
            $table->index(['user_id', 'type']);
            $table->index(['related_user_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_relationships');
    }
};
