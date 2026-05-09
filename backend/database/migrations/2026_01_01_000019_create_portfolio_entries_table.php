<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('portfolio_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_portfolio_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('code')->nullable();
            $table->string('category')->nullable();
            $table->text('content')->nullable();
            $table->string('file_path')->nullable();
            $table->string('review_status')->nullable();
            $table->text('reviewer_note')->nullable();
            $table->unsignedTinyInteger('academic_rating')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
            $table->index('student_portfolio_id');
            $table->index('reviewed_by');
            $table->index('archived_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portfolio_entries');
    }
};
