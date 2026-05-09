<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_request_batch_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('training_request_batches')->cascadeOnDelete();
            $table->foreignId('training_request_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->index('batch_id');
            $table->index('training_request_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_request_batch_items');
    }
};
