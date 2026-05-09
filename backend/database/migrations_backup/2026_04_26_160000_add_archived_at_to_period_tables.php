<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tables that store training-period-related data and should support archiving.
     */
    private array $tables = [
        'sections',
        'enrollments',
        'training_assignments',
        'student_portfolios',
        'portfolio_entries',
        'student_eforms',
        'daily_reports',
        'student_evaluations',
        'field_evaluations',
        'evaluations',
        'student_attendances',
        'attendances',
        'tasks',
        'task_submissions',
        'supervisor_visits',
        'training_logs',
        'weekly_schedules',
    ];

    public function up(): void
    {
        foreach ($this->tables as $tableName) {
            if (!Schema::hasTable($tableName)) {
                continue;
            }
            if (Schema::hasColumn($tableName, 'archived_at')) {
                continue;
            }
            Schema::table($tableName, function (Blueprint $table) {
                $table->timestamp('archived_at')->nullable()->index();
                $table->string('archived_period', 50)->nullable();
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $tableName) {
            if (!Schema::hasTable($tableName)) {
                continue;
            }
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (Schema::hasColumn($tableName, 'archived_at')) {
                    $table->dropColumn('archived_at');
                }
                if (Schema::hasColumn($tableName, 'archived_period')) {
                    $table->dropColumn('archived_period');
                }
            });
        }
    }
};
