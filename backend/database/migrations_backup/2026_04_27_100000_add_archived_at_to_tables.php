<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds archived_at column to all tables whose models use HidesArchived trait.
     */
    public function up(): void
    {
        $tables = [
            'enrollments',
            'announcements',
            'attendances',
            'daily_reports',
            'evaluations',
            'field_evaluations',
            'notes',
            'notifications',
            'official_letters',
            'portfolio_entries',
            'sections',
            'student_attendances',
            'student_e_forms',
            'student_evaluations',
            'student_portfolios',
            'supervisor_visits',
            'tasks',
            'task_submissions',
            'training_assignments',
            'training_logs',
            'weekly_schedules',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && !Schema::hasColumn($table, 'archived_at')) {
                Schema::table($table, function (Blueprint $blueprint) use ($table) {
                    $blueprint->timestamp('archived_at')->nullable()->after('updated_at');
                });
                echo "Added archived_at to {$table}\n";
            } elseif (!Schema::hasTable($table)) {
                echo "Table {$table} does not exist, skipping\n";
            } else {
                echo "Table {$table} already has archived_at\n";
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tables = [
            'enrollments',
            'announcements',
            'attendances',
            'daily_reports',
            'evaluations',
            'field_evaluations',
            'notes',
            'notifications',
            'official_letters',
            'portfolio_entries',
            'sections',
            'student_attendances',
            'student_e_forms',
            'student_evaluations',
            'student_portfolios',
            'supervisor_visits',
            'tasks',
            'task_submissions',
            'training_assignments',
            'training_logs',
            'weekly_schedules',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'archived_at')) {
                Schema::table($table, function (Blueprint $blueprint) {
                    $blueprint->dropColumn('archived_at');
                });
            }
        }
    }
};
