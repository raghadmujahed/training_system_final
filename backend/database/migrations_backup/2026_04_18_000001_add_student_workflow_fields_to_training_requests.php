<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('training_requests', function (Blueprint $table) {
            $table->foreignId('requested_by')
                ->nullable()
                ->after('id')
                ->constrained('users')
                ->nullOnDelete();

            // Helps drive the scenario: student chooses education vs health path.
            $table->enum('governing_body', ['directorate_of_education', 'ministry_of_health'])
                ->nullable()
                ->after('training_site_id');

            // Optional attachment path (front can store uploaded file later)
            $table->string('attachment_path')->nullable()->after('rejection_reason');

            // Coordinator stage (before official send)
            $table->timestamp('coordinator_reviewed_at')->nullable()->after('requested_at');
            $table->text('needs_edit_reason')->nullable()->after('coordinator_reviewed_at');
            $table->text('coordinator_rejection_reason')->nullable()->after('needs_edit_reason');
            $table->timestamp('batched_at')->nullable()->after('coordinator_rejection_reason');
        });
    }

    public function down(): void
    {
        Schema::table('training_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('requested_by');
            $table->dropColumn([
                'governing_body',
                'attachment_path',
                'coordinator_reviewed_at',
                'needs_edit_reason',
                'coordinator_rejection_reason',
                'batched_at',
            ]);
        });
    }
};

