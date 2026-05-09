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
            $table->string('letter_number')->nullable();
            $table->date('letter_date')->nullable();
            $table->text('content')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->enum('governing_body', ['directorate_of_education', 'ministry_of_health', 'health_directorate', 'education_directorate'])->default('directorate_of_education');
            $table->string('directorate')->nullable();
            $table->enum('status', ['draft', 'sent', 'partially_sent', 'archived'])->default('draft');
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
            $table->index('created_by');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_request_batches');
    }
};
