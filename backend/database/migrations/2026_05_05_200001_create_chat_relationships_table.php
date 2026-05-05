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
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('related_user_id');
            $table->enum('type', ['academic', 'field', 'training_assignment', 'coordinator', 'admin']);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('related_user_id')->references('id')->on('users')->onDelete('cascade');
            $table->unique(['user_id', 'related_user_id', 'type'], 'chat_rel_unique');
            $table->index(['user_id', 'type']);
            $table->index(['related_user_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_relationships');
    }
};
