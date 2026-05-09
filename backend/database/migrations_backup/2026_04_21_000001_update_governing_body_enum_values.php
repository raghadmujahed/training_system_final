<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Update training_requests table
        Schema::table('training_requests', function (Blueprint $table) {
            $table->enum('governing_body', [
                'directorate_of_education',
                'ministry_of_health',
                'health_directorate',
                'education_directorate'
            ])->nullable()->change();
        });

        // Update training_sites table
        Schema::table('training_sites', function (Blueprint $table) {
            $table->enum('governing_body', [
                'directorate_of_education',
                'ministry_of_health',
                'health_directorate',
                'education_directorate'
            ])->change();
        });

        // Update training_request_batches table
        Schema::table('training_request_batches', function (Blueprint $table) {
            $table->enum('governing_body', [
                'directorate_of_education',
                'ministry_of_health',
                'health_directorate',
                'education_directorate'
            ])->change();
        });
    }

    public function down(): void
    {
        // Revert to original values
        Schema::table('training_requests', function (Blueprint $table) {
            $table->enum('governing_body', [
                'directorate_of_education',
                'ministry_of_health'
            ])->nullable()->change();
        });

        Schema::table('training_sites', function (Blueprint $table) {
            $table->enum('governing_body', [
                'directorate_of_education',
                'ministry_of_health'
            ])->change();
        });

        Schema::table('training_request_batches', function (Blueprint $table) {
            $table->enum('governing_body', [
                'directorate_of_education',
                'ministry_of_health'
            ])->change();
        });
    }
};
