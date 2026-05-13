<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotent migration: ensures training_period_id exists on sections table.
 * Safe to run even if the column already exists.
 * Does NOT delete or modify any existing data.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('sections')) {
            return;
        }

        // Add training_period_id only if it doesn't already exist
        if (!Schema::hasColumn('sections', 'training_period_id')) {
            Schema::table('sections', function (Blueprint $table) {
                $table->foreignId('training_period_id')
                    ->nullable()
                    ->after('course_id')
                    ->constrained('training_periods')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('sections', 'training_period_id')) {
            Schema::table('sections', function (Blueprint $table) {
                $table->dropForeign(['training_period_id']);
                $table->dropColumn('training_period_id');
            });
        }
    }
};
