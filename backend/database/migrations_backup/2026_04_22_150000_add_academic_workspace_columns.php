<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->text('academic_note')->nullable()->after('notes');
            $table->string('academic_alert_status')->nullable()->after('academic_note');
            $table->timestamp('academic_commented_at')->nullable()->after('academic_alert_status');
            $table->boolean('visible_to_academic')->default(true)->after('academic_commented_at');
        });

        Schema::table('training_logs', function (Blueprint $table) {
            $table->string('academic_review_status')->nullable()->after('status');
            $table->text('academic_note')->nullable()->after('academic_review_status');
            $table->boolean('needs_discussion')->default(false)->after('academic_note');
            $table->timestamp('academic_reviewed_at')->nullable()->after('needs_discussion');
        });

        Schema::table('portfolio_entries', function (Blueprint $table) {
            $table->string('code')->nullable()->after('title');
            $table->string('category')->nullable()->after('code');
            $table->string('review_status')->nullable()->after('file_path');
            $table->text('reviewer_note')->nullable()->after('review_status');
            $table->unsignedBigInteger('reviewed_by')->nullable()->after('reviewer_note');
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');
        });

        Schema::table('supervisor_visits', function (Blueprint $table) {
            $table->string('visit_type')->nullable()->after('status');
            $table->string('location')->nullable()->after('visit_type');
            $table->string('training_track')->nullable()->after('location');
            $table->string('template_type')->nullable()->after('training_track');
            $table->json('report_data')->nullable()->after('template_type');
            $table->text('positive_points')->nullable()->after('report_data');
            $table->text('needs_improvement')->nullable()->after('positive_points');
            $table->text('general_notes')->nullable()->after('needs_improvement');
            $table->timestamp('completed_at')->nullable()->after('general_notes');
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->text('instructions')->nullable()->after('description');
            $table->string('target_type')->nullable()->after('instructions');
            $table->json('target_ids')->nullable()->after('target_type');
            $table->string('task_type')->nullable()->after('target_ids');
            $table->json('attachments')->nullable()->after('task_type');
            $table->decimal('grading_weight', 5, 2)->nullable()->after('attachments');
        });

        Schema::table('task_submissions', function (Blueprint $table) {
            $table->string('review_status')->nullable()->after('notes');
            $table->decimal('score', 5, 2)->nullable()->after('review_status');
            $table->text('feedback')->nullable()->after('score');
            $table->boolean('needs_resubmission')->default(false)->after('feedback');
            $table->unsignedBigInteger('reviewed_by')->nullable()->after('needs_resubmission');
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');
        });

        Schema::table('evaluations', function (Blueprint $table) {
            $table->string('status')->default('draft')->after('notes');
            $table->boolean('is_final')->default(false)->after('status');
            $table->text('strengths')->nullable()->after('is_final');
            $table->text('areas_for_improvement')->nullable()->after('strengths');
            $table->string('recommendation')->nullable()->after('areas_for_improvement');
            $table->json('criteria_scores')->nullable()->after('recommendation');
            $table->timestamp('submitted_at')->nullable()->after('criteria_scores');
        });
    }

    public function down(): void
    {
        Schema::table('evaluations', function (Blueprint $table) {
            $table->dropColumn([
                'status', 'is_final', 'strengths', 'areas_for_improvement',
                'recommendation', 'criteria_scores', 'submitted_at',
            ]);
        });

        Schema::table('task_submissions', function (Blueprint $table) {
            $table->dropColumn([
                'review_status', 'score', 'feedback', 'needs_resubmission', 'reviewed_by', 'reviewed_at',
            ]);
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn([
                'instructions', 'target_type', 'target_ids', 'task_type', 'attachments', 'grading_weight',
            ]);
        });

        Schema::table('supervisor_visits', function (Blueprint $table) {
            $table->dropColumn([
                'visit_type', 'location', 'training_track', 'template_type', 'report_data',
                'positive_points', 'needs_improvement', 'general_notes', 'completed_at',
            ]);
        });

        Schema::table('portfolio_entries', function (Blueprint $table) {
            $table->dropColumn([
                'code', 'category', 'review_status', 'reviewer_note', 'reviewed_by', 'reviewed_at',
            ]);
        });

        Schema::table('training_logs', function (Blueprint $table) {
            $table->dropColumn([
                'academic_review_status', 'academic_note', 'needs_discussion', 'academic_reviewed_at',
            ]);
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->dropColumn([
                'academic_note', 'academic_alert_status', 'academic_commented_at', 'visible_to_academic',
            ]);
        });
    }
};
