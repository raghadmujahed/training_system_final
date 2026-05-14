<?php

namespace App\Services;

use App\Models\ArchiveBatch;
use App\Models\TrainingPeriod;
use App\Models\Section;
use App\Models\Enrollment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Centralized Archive Service
 * Handles archiving of period-based operational data.
 * Only System Admin can execute archives.
 */
class ArchiveService
{
    /**
     * Archive all data for a training period.
     * This is a transactional operation - all or nothing.
     *
     * @param int $periodId The training period to archive
     * @param int $adminUserId The admin user executing the archive
     * @return array Archive result with counts
     * @throws \Exception If archiving fails
     */
    public function archivePeriod(int $periodId, int $adminUserId): array
    {
        // Check if already archived
        if (ArchiveBatch::isPeriodArchived($periodId)) {
            throw new \Exception('تم أرشفة هذه الفترة التدريبية مسبقاً');
        }

        $period = TrainingPeriod::findOrFail($periodId);
        $now = now();
        $label = "period_{$periodId}_" . $now->format('Ymd_His');

        // Create pending archive batch
        $batch = ArchiveBatch::create([
            'training_period_id' => $periodId,
            'archived_by' => $adminUserId,
            'archived_at' => $now,
            'status' => 'pending',
            'notes' => "Archive initiated for period: {$period->name}",
        ]);

        try {
            $result = DB::transaction(function () use ($periodId, $now, $label, $period) {
                $archived = [];

                // Archive sections with the training_period_id
                $sectionIds = Section::where('training_period_id', $periodId)
                    ->whereNull('archived_at')
                    ->pluck('id');

                $archived['sections'] = Section::whereIn('id', $sectionIds)
                    ->update([
                        'archived_at' => $now,
                        'archived_period' => $label,
                    ]);

                // Archive enrollments
                $enrollmentIds = Enrollment::where('training_period_id', $periodId)
                    ->whereNull('archived_at')
                    ->pluck('id');

                $archived['enrollments'] = Enrollment::whereIn('id', $enrollmentIds)
                    ->update([
                        'archived_at' => $now,
                        'archived_period' => $label,
                    ]);

                // Archive section_students (pivot table)
                $archived['section_students'] = DB::table('section_students')
                    ->where('training_period_id', $periodId)
                    ->whereNull('archived_at')
                    ->update([
                        'archived_at' => $now,
                        'archived_period' => $label,
                    ]);

                // Archive related data by enrollment_id
                $byEnrollment = [
                    'training_assignments',
                    'student_portfolios',
                    'student_eforms',
                    'daily_reports',
                    'student_evaluations',
                    'field_evaluations',
                    'evaluations',
                    'student_attendances',
                    'attendances',
                    'supervisor_visits',
                    'training_logs',
                ];

                foreach ($byEnrollment as $table) {
                    $archived[$table] = $this->archiveByEnrollment($table, $enrollmentIds, $now, $label);
                }

                // Archive by section_id
                $bySection = ['tasks', 'weekly_schedules'];
                foreach ($bySection as $table) {
                    $archived[$table] = $this->archiveBySection($table, $sectionIds, $now, $label);
                }

                // Cascade archive portfolio_entries
                if (Schema::hasTable('portfolio_entries')) {
                    $portfolioIds = DB::table('student_portfolios')
                        ->where('archived_period', $label)
                        ->pluck('id');
                    $archived['portfolio_entries'] = DB::table('portfolio_entries')
                        ->whereIn('student_portfolio_id', $portfolioIds)
                        ->whereNull('archived_at')
                        ->update([
                            'archived_at' => $now,
                            'archived_period' => $label,
                        ]);
                }

                // Cascade archive task_submissions
                if (Schema::hasTable('task_submissions')) {
                    $taskIds = DB::table('tasks')
                        ->where('archived_period', $label)
                        ->pluck('id');
                    $archived['task_submissions'] = DB::table('task_submissions')
                        ->whereIn('task_id', $taskIds)
                        ->whereNull('archived_at')
                        ->update([
                            'archived_at' => $now,
                            'archived_period' => $label,
                        ]);
                }

                // Archive communication tables by user
                $userIds = Enrollment::where('training_period_id', $periodId)
                    ->pluck('user_id')
                    ->unique()
                    ->values();

                $byUser = ['notes', 'notifications', 'announcements', 'official_letters'];
                foreach ($byUser as $table) {
                    $archived[$table] = $this->archiveByUser($table, $userIds, $now, $label);
                }

                // Mark period as archived/inactive
                $period->update([
                    'is_active'   => false,
                    'archived_at' => $now,
                ]);

                return $archived;
            });

            // Update batch as completed
            $batch->update([
                'status' => 'completed',
                'summary_counts' => $result,
            ]);

            return [
                'success' => true,
                'batch_id' => $batch->id,
                'period_id' => $periodId,
                'archived' => $result,
                'message' => 'تمت أرشفة الفترة التدريبية بنجاح',
            ];

        } catch (\Exception $e) {
            // Mark batch as failed
            $batch->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Get preview counts for a period before archiving.
     */
    public function getPreviewCounts(int $periodId): array
    {
        $period = TrainingPeriod::find($periodId);

        if (!$period) {
            return [
                'period' => null,
                'message' => 'الفترة التدريبية غير موجودة',
                'counts' => [],
            ];
        }

        $sectionIds = Section::where('training_period_id', $periodId)
            ->whereNull('archived_at')
            ->pluck('id');

        $enrollmentIds = Enrollment::where('training_period_id', $periodId)
            ->whereNull('archived_at')
            ->pluck('id');

        $userIds = Enrollment::where('training_period_id', $periodId)
            ->pluck('user_id')
            ->unique()
            ->values();

        $counts = [
            'sections' => $sectionIds->count(),
            'enrollments' => $enrollmentIds->count(),
            'section_students' => DB::table('section_students')
                ->where('training_period_id', $periodId)
                ->whereNull('archived_at')
                ->count(),
            'training_assignments' => $this->countByEnrollment('training_assignments', $enrollmentIds),
            'student_portfolios' => $this->countByEnrollment('student_portfolios', $enrollmentIds),
            'student_eforms' => $this->countByEnrollment('student_eforms', $enrollmentIds),
            'daily_reports' => $this->countByEnrollment('daily_reports', $enrollmentIds),
            'student_evaluations' => $this->countByEnrollment('student_evaluations', $enrollmentIds),
            'field_evaluations' => $this->countByEnrollment('field_evaluations', $enrollmentIds),
            'evaluations' => $this->countByEnrollment('evaluations', $enrollmentIds),
            'student_attendances' => $this->countByEnrollment('student_attendances', $enrollmentIds),
            'attendances' => $this->countByEnrollment('attendances', $enrollmentIds),
            'supervisor_visits' => $this->countByEnrollment('supervisor_visits', $enrollmentIds),
            'training_logs' => $this->countByEnrollment('training_logs', $enrollmentIds),
            'tasks' => $this->countBySection('tasks', $sectionIds),
            'weekly_schedules' => $this->countBySection('weekly_schedules', $sectionIds),
            'notes' => $this->countByUser('notes', $userIds),
            'notifications' => $this->countByUser('notifications', $userIds),
            'announcements' => $this->countByUser('announcements', $userIds),
            'official_letters' => $this->countByUser('official_letters', $userIds),
        ];

        return [
            'period' => [
                'id' => $period->id,
                'name' => $period->name,
                'start_date' => $period->start_date,
                'end_date' => $period->end_date,
            ],
            'already_archived' => ArchiveBatch::isPeriodArchived($periodId),
            'counts' => $counts,
        ];
    }

    /**
     * Get all archive batches with summaries.
     */
    public function getArchiveBatches(): array
    {
        return ArchiveBatch::with(['trainingPeriod', 'archivedBy'])
            ->latest()
            ->get()
            ->map(function ($batch) {
                return [
                    'id' => $batch->id,
                    'period' => [
                        'id' => $batch->trainingPeriod?->id,
                        'name' => $batch->trainingPeriod?->name,
                    ],
                    'archived_by' => [
                        'id' => $batch->archivedBy?->id,
                        'name' => $batch->archivedBy?->name,
                    ],
                    'archived_at' => $batch->archived_at,
                    'status' => $batch->status,
                    'summary_counts' => $batch->summary_counts,
                    'total_count' => collect($batch->summary_counts ?? [])->sum(),
                ];
            })
            ->toArray();
    }

    // Helper methods for counting and archiving

    private function countByEnrollment(string $table, $enrollmentIds): int
    {
        if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'enrollment_id') || !Schema::hasColumn($table, 'archived_at')) {
            return 0;
        }
        return DB::table($table)
            ->whereIn('enrollment_id', $enrollmentIds)
            ->whereNull('archived_at')
            ->count();
    }

    private function countBySection(string $table, $sectionIds): int
    {
        if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'section_id') || !Schema::hasColumn($table, 'archived_at')) {
            return 0;
        }
        return DB::table($table)
            ->whereIn('section_id', $sectionIds)
            ->whereNull('archived_at')
            ->count();
    }

    private function countByUser(string $table, $userIds): int
    {
        if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'archived_at')) {
            return 0;
        }
        $userColumn = $this->detectUserColumn($table);
        if (!$userColumn) {
            return 0;
        }
        return DB::table($table)
            ->whereIn($userColumn, $userIds)
            ->whereNull('archived_at')
            ->count();
    }

    private function archiveByEnrollment(string $table, $enrollmentIds, $now, string $label): int
    {
        if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'enrollment_id') || !Schema::hasColumn($table, 'archived_at')) {
            return 0;
        }
        return DB::table($table)
            ->whereIn('enrollment_id', $enrollmentIds)
            ->whereNull('archived_at')
            ->update(['archived_at' => $now, 'archived_period' => $label]);
    }

    private function archiveBySection(string $table, $sectionIds, $now, string $label): int
    {
        if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'section_id') || !Schema::hasColumn($table, 'archived_at')) {
            return 0;
        }
        return DB::table($table)
            ->whereIn('section_id', $sectionIds)
            ->whereNull('archived_at')
            ->update(['archived_at' => $now, 'archived_period' => $label]);
    }

    private function archiveByUser(string $table, $userIds, $now, string $label): int
    {
        if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'archived_at')) {
            return 0;
        }
        $userColumn = $this->detectUserColumn($table);
        if (!$userColumn) {
            return 0;
        }
        return DB::table($table)
            ->whereIn($userColumn, $userIds)
            ->whereNull('archived_at')
            ->update(['archived_at' => $now, 'archived_period' => $label]);
    }

    private function detectUserColumn(string $table): ?string
    {
        foreach (['user_id', 'recipient_id', 'sender_id', 'created_by', 'author_id'] as $col) {
            if (Schema::hasColumn($table, $col)) {
                return $col;
            }
        }
        return null;
    }
}
