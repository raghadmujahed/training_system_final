<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('official_letters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sent_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('received_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('training_site_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('training_request_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('letter_number')->nullable();
            $table->string('subject');
            $table->text('content');
            $table->enum('type', ['request', 'approval', 'rejection', 'notification', 'to_health_ministry'])->default('request');
            $table->enum('status', ['draft', 'sent', 'received', 'approved', 'rejected', 'archived'])->default('draft');
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
            $table->index('sent_by');
            $table->index('received_by');
            $table->index('training_site_id');
            $table->index('type');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('official_letters');
    }
};
