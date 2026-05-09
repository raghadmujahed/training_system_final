<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('participant_one_id');
            $table->unsignedBigInteger('participant_two_id');
            $table->timestamps();

            $table->foreign('participant_one_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('participant_two_id')->references('id')->on('users')->onDelete('cascade');

            $table->index(['participant_one_id', 'participant_two_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};