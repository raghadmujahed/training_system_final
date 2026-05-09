<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_request_batches', function (Blueprint $table) {
            $table->id();
            $table->enum('governing_body', ['directorate_of_education', 'ministry_of_health']);
            $table->enum('directorate', ['وسط', 'شمال', 'جنوب', 'يطا'])->nullable(); // for education batches only

            $table->enum('status', ['draft', 'sent', 'cancelled'])->default('draft');

            $table->string('letter_number')->nullable();
            $table->date('letter_date')->nullable();
            $table->text('content')->nullable();

            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('sent_at')->nullable();

            $table->timestamps();

            $table->index(['governing_body', 'directorate', 'status']);
        });

        Schema::create('training_request_batch_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('training_request_batches')->cascadeOnDelete();
            $table->foreignId('training_request_id')->constrained('training_requests')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['batch_id', 'training_request_id']);
            $table->unique(['training_request_id']); // each request belongs to at most one active batch
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_request_batch_items');
        Schema::dropIfExists('training_request_batches');
    }
};

