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
 * 1. Find all sections where academic_supervisor_id IS NULL.
 * 2. For each such section, try to find an academic_supervisor in the same
 *    department as the section's course. If found, assign them.
 * 3. If no department match found, assign the first available
 *    academic_supervisor in the system (test/seed data only).
 * 4. If NO academic supervisors exist at all, the migration ABORTS with a
 *    clear message rather than silently corrupting data.
 * 5. After cleanup, alter the column to NOT NULL.
 *
 * This migration is idempotent — safe to run multiple times.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('sections')) {
            return;
        }

        // ── 1. Find sections with null academic_supervisor_id ──────────────
        $nullSections = DB::table('sections')
            ->whereNull('academic_supervisor_id')
            ->select('id', 'name', 'course_id')
            ->get();

        if ($nullSections->isNotEmpty()) {
            Log::warning('Migration enforce_academic_supervisor_not_null: found sections without supervisor', [
                'count' => $nullSections->count(),
                'section_ids' => $nullSections->pluck('id')->toArray(),
            ]);

            // Resolve the academic_supervisor role id
            $supervisorRoleId = DB::table('roles')
                ->where('name', 'academic_supervisor')
                ->value('id');

            if (! $supervisorRoleId) {
                throw new \RuntimeException(
                    'Migration aborted: no academic_supervisor role found in the roles table. ' .
                    'Please seed roles before running this migration.'
                );
            }

            // Global fallback supervisor (first available)
            $fallbackSupervisor = DB::table('users')
                ->where('role_id', $supervisorRoleId)
                ->whereNotNull('id')
                ->value('id');

            if (! $fallbackSupervisor) {
                // No supervisors exist at all — log affected IDs and abort.
                // Do not alter the column; let the admin handle this manually.
                Log::error(
                    'Migration enforce_academic_supervisor_not_null: ABORTED. ' .
                    'No academic supervisors found. Affected section IDs: ' .
                    $nullSections->pluck('id')->implode(', ')
                );
                throw new \RuntimeException(
                    'Migration aborted: sections exist without an academic_supervisor_id, ' .
                    'but no academic supervisor users were found. ' .
                    'Affected section IDs: ' . $nullSections->pluck('id')->implode(', ') . '. ' .
                    'Please create at least one academic supervisor user and assign them to these ' .
                    'sections before running this migration.'
                );
            }

            foreach ($nullSections as $section) {
                // Try department-matched supervisor first
                $deptId = DB::table('courses')
                    ->where('id', $section->course_id)
                    ->value('department_id');

                $assignedSupervisorId = $fallbackSupervisor;

                if ($deptId) {
                    $deptSupervisor = DB::table('users')
                        ->where('role_id', $supervisorRoleId)
                        ->where('department_id', $deptId)
                        ->value('id');

                    if ($deptSupervisor) {
                        $assignedSupervisorId = $deptSupervisor;
                    }
                }

                DB::table('sections')
                    ->where('id', $section->id)
                    ->update(['academic_supervisor_id' => $assignedSupervisorId]);

                Log::info("Migration: assigned supervisor {$assignedSupervisorId} to section {$section->id} ({$section->name})");
            }
        }

        // ── 2. Verify no nulls remain before altering column ───────────────
        $remaining = DB::table('sections')->whereNull('academic_supervisor_id')->count();
        if ($remaining > 0) {
            throw new \RuntimeException(
                "Migration aborted: {$remaining} sections still have null academic_supervisor_id after cleanup attempt."
            );
        }

        // ── 3. Alter column to NOT NULL ────────────────────────────────────
        // We only alter if the column is currently nullable.
        // Detect nullability via information_schema (MySQL/MariaDB).
        $isNullable = DB::selectOne(
            "SELECT IS_NULLABLE FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'sections'
               AND COLUMN_NAME = 'academic_supervisor_id'"
        );

        if ($isNullable && strtoupper($isNullable->IS_NULLABLE) === 'YES') {
            Schema::table('sections', function (Blueprint $table) {
                // Change to NOT NULL, keep existing foreign key reference
                $table->foreignId('academic_supervisor_id')
                    ->nullable(false)
                    ->change();
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('sections')) {
            return;
        }

        // Revert to nullable
        Schema::table('sections', function (Blueprint $table) {
            $table->foreignId('academic_supervisor_id')
                ->nullable()
                ->change();
        });
    }
};
