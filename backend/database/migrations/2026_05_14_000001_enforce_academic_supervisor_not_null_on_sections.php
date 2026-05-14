<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Safe migration: enforces academic_supervisor_id NOT NULL on sections.
 *
 * Safety strategy:
 * 1. Count sections where academic_supervisor_id IS NULL.
 * 2. If any exist, throw a RuntimeException — do not silently fix data.
 * 3. Drop the existing FK (which uses ON DELETE SET NULL).
 * 4. Alter the column to NOT NULL.
 * 5. Re-add the FK with ON DELETE RESTRICT.
 *
 * down() reverses: drop restrict FK → nullable → nullOnDelete FK.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('sections')) {
            return;
        }

        // ── 1. Abort if any sections have no supervisor ────────────────────
        $nullCount = DB::table('sections')->whereNull('academic_supervisor_id')->count();

        if ($nullCount > 0) {
            $ids = DB::table('sections')
                ->whereNull('academic_supervisor_id')
                ->pluck('id')
                ->implode(', ');

            throw new \RuntimeException(
                "Migration aborted: {$nullCount} section(s) have a NULL academic_supervisor_id " .
                "(IDs: {$ids}). Assign an academic supervisor to each section before running " .
                'this migration. A section cannot exist without an academic supervisor.'
            );
        }

        // ── 2. Check current nullability — skip if already NOT NULL ────────
        $columnInfo = DB::selectOne(
            "SELECT IS_NULLABLE FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME   = 'sections'
               AND COLUMN_NAME  = 'academic_supervisor_id'"
        );

        if (! $columnInfo || strtoupper($columnInfo->IS_NULLABLE) !== 'YES') {
            // Column is already NOT NULL — nothing to do.
            Log::info('Migration enforce_academic_supervisor_not_null: column already NOT NULL, skipping.');
            return;
        }

        // ── 3. Drop the existing foreign key (SET NULL constraint) ─────────
        Schema::table('sections', function (Blueprint $table) {
            $table->dropForeign(['academic_supervisor_id']);
        });

        // ── 4. Change column to NOT NULL ───────────────────────────────────
        Schema::table('sections', function (Blueprint $table) {
            $table->unsignedBigInteger('academic_supervisor_id')->nullable(false)->change();
        });

        // ── 5. Re-add foreign key with RESTRICT (no SET NULL) ──────────────
        Schema::table('sections', function (Blueprint $table) {
            $table->foreign('academic_supervisor_id')
                ->references('id')
                ->on('users')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('sections')) {
            return;
        }

        // ── Drop the restrict FK ───────────────────────────────────────────
        Schema::table('sections', function (Blueprint $table) {
            $table->dropForeign(['academic_supervisor_id']);
        });

        // ── Revert column to nullable ──────────────────────────────────────
        Schema::table('sections', function (Blueprint $table) {
            $table->unsignedBigInteger('academic_supervisor_id')->nullable()->change();
        });

        // ── Re-add FK with SET NULL ────────────────────────────────────────
        Schema::table('sections', function (Blueprint $table) {
            $table->foreign('academic_supervisor_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
        });
    }
};
