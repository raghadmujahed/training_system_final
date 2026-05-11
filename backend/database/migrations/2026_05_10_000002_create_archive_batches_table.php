<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create archive_batches table to log all archive operations.
     * This provides audit trail and prevents duplicate archiving.
     */
    public function up(): void
    {
        Schema::create('archive_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_period_id')->constrained('training_periods');
            $table->foreignId('archived_by')->constrained('users');
            $table->timestamp('archived_at');
            $table->enum('status', ['pending', 'completed', 'failed', 'rolled_back'])->default('pending');
            $table->json('summary_counts')->nullable(); // counts of archived records by table
            $table->text('notes')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            // Prevent archiving the same period twice
            $table->unique(['training_period_id', 'status'], 'archive_batch_unique_period')
                ->where('status', 'completed');

            $table->index(['archived_by', 'archived_at']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('archive_batches');
    }
};
