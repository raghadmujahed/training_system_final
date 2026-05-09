<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $this->addIndexIfMissing($table, 'attendances', ['training_assignment_id', 'status', 'date'], 'att_assign_status_date_idx');
        });

        Schema::table('training_logs', function (Blueprint $table) {
            $this->addIndexIfMissing($table, 'training_logs', ['training_assignment_id', 'status'], 'logs_assign_status_idx');
            $this->addIndexIfMissing($table, 'training_logs', ['training_assignment_id', 'academic_review_status'], 'logs_assign_academic_status_idx');
        });

        Schema::table('task_submissions', function (Blueprint $table) {
            $this->addIndexIfMissing($table, 'task_submissions', ['review_status', 'needs_resubmission'], 'task_sub_review_resub_idx');
            $this->addIndexIfMissing($table, 'task_submissions', ['user_id', 'review_status'], 'task_sub_user_review_idx');
            $this->addIndexIfMissing($table, 'task_submissions', ['task_id', 'review_status'], 'task_sub_task_review_idx');
        });

        Schema::table('evaluations', function (Blueprint $table) {
            $this->addIndexIfMissing($table, 'evaluations', ['training_assignment_id', 'is_final'], 'eval_assign_final_idx');
            $this->addIndexIfMissing($table, 'evaluations', ['evaluator_id', 'is_final'], 'eval_evaluator_final_idx');
            $this->addIndexIfMissing($table, 'evaluations', ['status', 'submitted_at'], 'eval_status_submitted_idx');
        });

        Schema::table('sections', function (Blueprint $table) {
            $this->addIndexIfMissing($table, 'sections', ['academic_supervisor_id', 'semester', 'course_id'], 'sections_supervisor_sem_course_idx');
        });

        Schema::table('enrollments', function (Blueprint $table) {
            $this->addIndexIfMissing($table, 'enrollments', ['section_id', 'status'], 'enrollments_section_status_idx');
            $this->addIndexIfMissing($table, 'enrollments', ['user_id', 'status'], 'enrollments_user_status_idx');
        });

        Schema::table('supervisor_visits', function (Blueprint $table) {
            $this->addIndexIfMissing($table, 'supervisor_visits', ['supervisor_id', 'scheduled_date', 'status'], 'visits_supervisor_sched_status_idx');
        });

        Schema::table('notes', function (Blueprint $table) {
            $this->addIndexIfMissing($table, 'notes', ['training_assignment_id', 'created_at'], 'notes_assign_created_idx');
        });
    }

    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $this->dropIndexIfExists($table, 'notes', 'notes_assign_created_idx');
        });

        Schema::table('supervisor_visits', function (Blueprint $table) {
            $this->dropIndexIfExists($table, 'supervisor_visits', 'visits_supervisor_sched_status_idx');
        });

        Schema::table('enrollments', function (Blueprint $table) {
            $this->dropIndexIfExists($table, 'enrollments', 'enrollments_section_status_idx');
            $this->dropIndexIfExists($table, 'enrollments', 'enrollments_user_status_idx');
        });

        Schema::table('sections', function (Blueprint $table) {
            $this->dropIndexIfExists($table, 'sections', 'sections_supervisor_sem_course_idx');
        });

        Schema::table('evaluations', function (Blueprint $table) {
            $this->dropIndexIfExists($table, 'evaluations', 'eval_assign_final_idx');
            $this->dropIndexIfExists($table, 'evaluations', 'eval_evaluator_final_idx');
            $this->dropIndexIfExists($table, 'evaluations', 'eval_status_submitted_idx');
        });

        Schema::table('task_submissions', function (Blueprint $table) {
            $this->dropIndexIfExists($table, 'task_submissions', 'task_sub_review_resub_idx');
            $this->dropIndexIfExists($table, 'task_submissions', 'task_sub_user_review_idx');
            $this->dropIndexIfExists($table, 'task_submissions', 'task_sub_task_review_idx');
        });

        Schema::table('training_logs', function (Blueprint $table) {
            $this->dropIndexIfExists($table, 'training_logs', 'logs_assign_status_idx');
            $this->dropIndexIfExists($table, 'training_logs', 'logs_assign_academic_status_idx');
        });

        Schema::table('attendances', function (Blueprint $table) {
            $this->dropIndexIfExists($table, 'attendances', 'att_assign_status_date_idx');
        });
    }

    private function addIndexIfMissing(Blueprint $table, string $tableName, array $columns, string $indexName): void
    {
        if (! $this->indexExists($tableName, $indexName)) {
            $table->index($columns, $indexName);
        }
    }

    private function dropIndexIfExists(Blueprint $table, string $tableName, string $indexName): void
    {
        if ($this->indexExists($tableName, $indexName)) {
            $table->dropIndex($indexName);
        }
    }

    private function indexExists(string $tableName, string $indexName): bool
    {
        return collect(Schema::getIndexes($tableName))
            ->contains(fn ($index) => ($index['name'] ?? null) === $indexName);
    }
};
