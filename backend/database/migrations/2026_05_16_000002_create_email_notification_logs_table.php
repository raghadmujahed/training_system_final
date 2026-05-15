<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('email_notification_logs')) {
            return;
        }

        Schema::create('email_notification_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_request_id')->nullable()->constrained()->nullOnDelete();
            $table->string('event_type', 64);
            $table->string('recipient_type', 32)->nullable();
            $table->string('recipient_email');
            $table->string('subject');
            $table->text('body')->nullable();
            $table->string('status', 16)->default('sent'); // sent, failed, skipped
            $table->text('error_message')->nullable();
            $table->string('dedup_hash', 64)->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['training_request_id', 'event_type']);
            $table->index('recipient_email');
            $table->index('dedup_hash');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_notification_logs');
    }
};
