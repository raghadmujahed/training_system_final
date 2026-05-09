<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluation_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')->constrained('evaluation_templates')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('field_type')->nullable();
            $table->json('options')->nullable();
            $table->boolean('is_required')->default(true);
            $table->decimal('max_score', 5, 2)->nullable();
            $table->timestamps();
            $table->index('template_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluation_items');
    }
};
