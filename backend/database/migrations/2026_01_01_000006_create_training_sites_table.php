<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_sites', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('location')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('mobile')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('capacity')->default(3);
            $table->enum('directorate', ['وسط', 'شمال', 'جنوب', 'يطا'])->nullable();
            $table->enum('site_type', ['school', 'health_center'])->default('school');
            $table->enum('governing_body', ['directorate_of_education', 'ministry_of_health'])->default('directorate_of_education');
            $table->enum('school_type', ['public', 'private', 'unrwa'])->default('public');
            $table->enum('gender_classification', ['boys', 'girls', 'mixed'])->nullable();
            $table->enum('school_level', ['lower', 'upper', 'both'])->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index('is_active');
            $table->index('capacity');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_sites');
    }
};
