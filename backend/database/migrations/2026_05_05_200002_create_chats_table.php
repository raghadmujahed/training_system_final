<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chats', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['direct', 'group', 'context'])->default('direct');
            $table->enum('context_type', ['training', 'visit'])->nullable();
            $table->unsignedBigInteger('context_id')->nullable();
            $table->timestamps();

            $table->index(['type', 'context_type', 'context_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chats');
    }
};
