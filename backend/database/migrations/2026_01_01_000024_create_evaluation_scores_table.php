<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluation_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('item_id')->constrained('evaluation_items')->cascadeOnDelete();
            $table->decimal('score', 5, 2)->nullable();
            $table->text('response_text')->nullable();
            $table->string('file_path')->nullable();
            $table->timestamps();
            $table->unique(['evaluation_id', 'item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluation_scores');
    }
};
