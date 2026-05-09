<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('requested_by')->nullable()->constrained('users')->onDelete('set null');
            $table->string('book_status')->default('draft');
            $table->timestamp('sent_to_directorate_at')->nullable();
            $table->timestamp('directorate_approved_at')->nullable();
            $table->timestamp('sent_to_school_at')->nullable();
            $table->timestamp('school_approved_at')->nullable();
            $table->foreignId('training_site_id')->constrained()->cascadeOnDelete();
            $table->foreignId('training_period_id')->nullable()->constrained();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->timestamp('requested_at')->useCurrent();
            $table->text('rejection_reason')->nullable();
            $table->string('letter_number')->nullable();
            $table->date('letter_date')->nullable();
            $table->enum('governing_body', ['directorate_of_education', 'ministry_of_health', 'health_directorate', 'education_directorate'])->default('directorate_of_education');
            $table->string('directorate')->nullable();
            $table->string('attachment_path')->nullable();
            $table->timestamp('coordinator_reviewed_at')->nullable();
            $table->text('needs_edit_reason')->nullable();
            $table->text('coordinator_rejection_reason')->nullable();
            $table->timestamp('batched_at')->nullable();
            $table->timestamps();
            $table->index('training_site_id');
            $table->index('requested_at');
            $table->index('status');
            $table->index(['training_site_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_requests');
    }
};
