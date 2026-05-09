<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('form_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_instance_id')->constrained('form_instances')->cascadeOnDelete();
            $table->integer('step')->default(1);
            $table->string('reviewer_role');
            $table->foreignId('reviewer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('pending');
            $table->text('comment')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['reviewer_id', 'status']);
            $table->index(['form_instance_id', 'step']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_reviews');
    }
};
