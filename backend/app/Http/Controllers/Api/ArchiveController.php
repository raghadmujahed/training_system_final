<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ArchiveBatch;
use App\Models\TrainingPeriod;
use App\Services\ArchiveService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Archive Controller - Admin Only
 * Centralized archiving system controlled only by System Admin.
 */
class ArchiveController extends Controller
{
    private ArchiveService $archiveService;

    public function __construct(ArchiveService $archiveService)
    {
        $this->archiveService = $archiveService;
    }

    /**
     * Authorize that only admin can archive.
     */
    private function authorizeAdmin(): void
    {
        $user = auth()->user();
        $role = $user?->role?->name;

        if ($role !== 'admin') {
            abort(403, 'لا تملك صلاحية تنفيذ الأرشفة');
        }
    }

    /**
     * Get list of all archive batches (admin only).
     */
    public function index(Request $request)
    {
        $this->authorizeAdmin();

        try {
            $batches = $this->archiveService->getArchiveBatches();

            return response()->json([
                'batches' => $batches,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'حدث خطأ أثناء جلب سجل الأرشفة',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get preview of what would be archived for a specific period.
     */
    public function preview(Request $request, int $periodId)
    {
        $this->authorizeAdmin();

        try {
            $preview = $this->archiveService->getPreviewCounts($periodId);

            return response()->json($preview);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'حدث خطأ أثناء تحضير معاينة الأرشفة',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Archive a specific training period.
     */
    public function archivePeriod(Request $request, int $periodId)
    {
        $this->authorizeAdmin();

        // Validate that period exists
        $period = TrainingPeriod::find($periodId);
        if (!$period) {
            return response()->json([
                'message' => 'الفترة التدريبية غير موجودة',
            ], 404);
        }

        try {
            $result = $this->archiveService->archivePeriod(
                $periodId,
                auth()->id()
            );

            return response()->json($result);
        } catch (\Exception $e) {
            $errorMessage = $e->getMessage();

            // Check for specific error messages
            if (str_contains($errorMessage, 'تم أرشفة هذه الفترة')) {
                return response()->json([
                    'message' => $errorMessage,
                ], 422);
            }

            return response()->json([
                'message' => 'حدث خطأ أثناء تنفيذ الأرشفة',
                'error' => config('app.debug') ? $errorMessage : null,
            ], 500);
        }
    }

    /**
     * Get archived data for a specific period (admin view).
     * Non-admin users should use role-specific endpoints.
     */
    public function periodDetails(Request $request, int $periodId)
    {
        $this->authorizeAdmin();

        try {
            $period = TrainingPeriod::find($periodId);

            if (!$period) {
                return response()->json([
                    'message' => 'الفترة التدريبية غير موجودة',
                ], 404);
            }

            // Get archived sections for this period
            $sections = \App\Models\Section::withArchived()
                ->where('training_period_id', $periodId)
                ->whereNotNull('archived_at')
                ->with(['course', 'academicSupervisor'])
                ->get()
                ->map(function ($s) {
                    return [
                        'id' => $s->id,
                        'name' => $s->name,
                        'course' => $s->course ? ['id' => $s->course->id, 'name' => $s->course->name] : null,
                        'academic_supervisor' => $s->academicSupervisor ? ['id' => $s->academicSupervisor->id, 'name' => $s->academicSupervisor->name] : null,
                        'archived_at' => $s->archived_at,
                    ];
                });

            $latestBatch = ArchiveBatch::where('training_period_id', $periodId)->latest()->first();

            return response()->json([
                'period' => [
                    'id' => $period->id,
                    'name' => $period->name,
                    'start_date' => $period->start_date,
                    'end_date' => $period->end_date,
                    'is_active' => $period->is_active,
                ],
                'archive_batch' => $latestBatch ? [
                    'id' => $latestBatch->id,
                    'archived_at' => $latestBatch->archived_at,
                    'archived_by' => $latestBatch->archivedBy?->name,
                    'summary_counts' => $latestBatch->summary_counts,
                ] : null,
                'sections' => $sections,
                'sections_count' => $sections->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'حدث خطأ أثناء جلب تفاصيل الأرشفة',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get the currently active period that can be archived.
     */
    public function getActivePeriodForArchive(Request $request)
    {
        $this->authorizeAdmin();

        $activePeriod = TrainingPeriod::where('is_active', true)->first();

        if (!$activePeriod) {
            return response()->json([
                'period' => null,
                'message' => 'لا توجد فترة تدريبية نشطة حالياً',
            ]);
        }

        // Check if already archived
        $isArchived = \App\Models\ArchiveBatch::isPeriodArchived($activePeriod->id);

        // Get preview counts
        $preview = $this->archiveService->getPreviewCounts($activePeriod->id);

        return response()->json([
            'period' => [
                'id' => $activePeriod->id,
                'name' => $activePeriod->name,
                'start_date' => $activePeriod->start_date,
                'end_date' => $activePeriod->end_date,
            ],
            'is_archived' => $isArchived,
            'can_archive' => !$isArchived,
            'preview' => $preview,
        ]);
    }

    /**
     * Public read-only details for a specific archived period.
     * Any authenticated user can view archive details.
     * Head of department sees only their department's data.
     */
    public function publicPeriodDetails(Request $request, $periodId)
    {
        try {
            $period = TrainingPeriod::findOrFail($periodId);
            $latestBatch = ArchiveBatch::where('training_period_id', $periodId)
                ->where('status', 'completed')
                ->latest()
                ->first();

            if (!$latestBatch) {
                return response()->json([
                    'message' => 'لم يتم أرشفة هذه الفترة بعد',
                ], 404);
            }

            // Get archived sections for this period
            $sectionsQuery = \App\Models\Section::withArchived()
                ->where('training_period_id', $periodId)
                ->whereNotNull('archived_at')
                ->with(['course', 'academicSupervisor']);

            // Filter by department for head_of_department
            $user = auth()->user();
            if ($user->role?->name === 'head_of_department' && $user->department_id) {
                $sectionsQuery->whereHas('course', function ($q) use ($user) {
                    $q->where('department_id', $user->department_id);
                });
            }

            $sections = $sectionsQuery->get()
                ->map(function ($s) {
                    return [
                        'id' => $s->id,
                        'name' => $s->name,
                        'course' => $s->course ? ['id' => $s->course->id, 'name' => $s->course->name, 'code' => $s->course->code] : null,
                        'academic_supervisor' => $s->academicSupervisor ? ['id' => $s->academicSupervisor->id, 'name' => $s->academicSupervisor->name] : null,
                        'capacity' => $s->capacity,
                        'enrollments_count' => $s->enrollments()->withArchived()->whereNotNull('archived_at')->count(),
                        'archived_at' => $s->archived_at,
                    ];
                });

            // Get archived enrollments for this period
            $enrollments = \App\Models\Enrollment::withArchived()
                ->where('training_period_id', $periodId)
                ->whereNotNull('archived_at')
                ->with(['section.course', 'user'])
                ->get()
                ->map(function ($e) {
                    return [
                        'id' => $e->id,
                        'section_name' => $e->section?->name,
                        'course_name' => $e->section?->course?->name,
                        'course_code' => $e->section?->course?->code,
                        'user_name' => $e->user?->name,
                        'university_id' => $e->user?->university_id,
                        'email' => $e->user?->email,
                        'status' => $e->status,
                        'final_grade' => $e->final_grade,
                        'archived_at' => $e->archived_at,
                    ];
                });

            return response()->json([
                'period' => [
                    'id' => $period->id,
                    'name' => $period->name,
                    'academic_year' => $period->academic_year,
                    'semester' => $period->semester,
                    'semester_label' => $period->semester_label ?? $period->semester,
                ],
                'sections' => $sections,
                'enrollments' => $enrollments,
                'stats' => $latestBatch->summary_counts ?? [],
                'archive_batch' => [
                    'id' => $latestBatch->id,
                    'archived_at' => $latestBatch->archived_at,
                    'summary_counts' => $latestBatch->summary_counts,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'حدث خطأ أثناء جلب تفاصيل الأرشفة',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Public read-only list of archive batches for authenticated users.
     * Any authenticated user can view archive history but not execute archives.
     */
    public function publicBatches(Request $request)
    {
        try {
            $batches = ArchiveBatch::with(['trainingPeriod'])
                ->where('status', 'completed')
                ->latest()
                ->get()
                ->map(function ($batch) {
                    return [
                        'id' => $batch->id,
                        'period' => [
                            'id' => $batch->trainingPeriod?->id,
                            'name' => $batch->trainingPeriod?->name,
                        ],
                        'archived_at' => $batch->archived_at,
                        'status' => $batch->status,
                        'summary_counts' => $batch->summary_counts,
                        'total_count' => collect($batch->summary_counts ?? [])->sum(),
                    ];
                });

            return response()->json([
                'batches' => $batches,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'حدث خطأ أثناء جلب سجل الأرشفة',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}
