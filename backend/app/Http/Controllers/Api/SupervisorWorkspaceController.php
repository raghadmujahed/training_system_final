<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddAttendanceAlertRequest;
use App\Http\Requests\AddAttendanceCommentRequest;
use App\Http\Requests\EscalateStudentIssueRequest;
use App\Http\Requests\ReviewDailyLogRequest;
use App\Http\Requests\ReviewPortfolioSectionRequest;
use App\Http\Requests\ReviewTaskSubmissionRequest;
use App\Http\Requests\SaveAcademicEvaluationDraftRequest;
use App\Http\Requests\SendSupervisorMessageRequest;
use App\Http\Requests\StoreAcademicTaskRequest;
use App\Http\Requests\StoreSupervisorVisitRequest;
use App\Http\Requests\SubmitAcademicEvaluationRequest;
use App\Http\Requests\UpdateAcademicTaskRequest;
use App\Http\Requests\UpdateAcademicSupervisionStatusRequest;
use App\Http\Requests\UpdateSupervisorVisitRequest;
use App\Http\Resources\SupervisorSectionResource;
use App\Http\Resources\SupervisorStudentResource;
use App\Models\AcademicSupervisionStatusHistory;
use App\Models\Conversation;
use App\Models\DailyReport;
use App\Models\EvaluationTemplate;
use App\Models\FieldEvaluation;
use App\Models\Message;
use App\Models\Notification;
use App\Models\PortfolioEntry;
use App\Models\Role;
use App\Models\Section;
use App\Services\AcademicSupervisorStudentService;
use App\Services\TrainingTrackResolver;
use App\Support\ApiResponse;
use App\Models\User;
use App\Models\SupervisorVisit;
use App\Models\Attendance;
use App\Models\TrainingLog;
use App\Models\Task;
use App\Models\TaskSubmission;
use App\Models\Evaluation;
use App\Models\Enrollment;
use App\Models\StudentPortfolio;
use App\Models\Note;
use App\Models\TrainingAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class SupervisorWorkspaceController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly AcademicSupervisorStudentService $studentService,
        private readonly TrainingTrackResolver $trackResolver
    ) {
        $this->middleware('auth:sanctum');
    }

    public function stats(Request $request)
    {
        $user = $request->user();
        $assignments = $this->studentService->supervisedAssignmentsQuery($user)->get();
        $assignmentIds = $assignments->pluck('id');
        $studentIds = $assignments->pluck('enrollment.user_id')->filter()->unique()->values();

        // Also count sections assigned directly via academic_supervisor_id (section_students pivot)
        $directSectionIds = Section::where('academic_supervisor_id', $user->id)
            ->when($user->department_id, fn ($q) => $q->where(function ($q2) use ($user) {
                $q2->whereHas('course', fn ($cq) => $cq->where('department_id', $user->department_id))
                    ->orWhereHas('students', fn ($sq) => $sq->where('department_id', $user->department_id));
            }))
            ->pluck('id');

        // Also count students from section_students pivot
        $pivotStudentIds = \DB::table('section_students')
            ->whereIn('section_id', $directSectionIds)
            ->where('status', 'accepted')
            ->pluck('student_id')
            ->unique()
            ->values();

        $allStudentIds = $studentIds->merge($pivotStudentIds)->unique()->values();
        $allSectionIds = $assignments->pluck('enrollment.section_id')->filter()->unique()
            ->merge($directSectionIds)->unique()->values();

        $recentActivity = Note::query()
            ->whereIn('training_assignment_id', $assignmentIds)
            ->latest('id')
            ->limit(5)
            ->get(['id', 'content', 'training_assignment_id', 'created_at']);

        $upcomingVisits = SupervisorVisit::query()
            ->where('supervisor_id', $user->id)
            ->whereDate('scheduled_date', '>=', now()->toDateString())
            ->orderBy('scheduled_date')
            ->limit(5)
            ->get();

        $trackDistribution = $assignments->groupBy(fn ($a) => $this->trackResolver->resolveForAssignment($a) ?? 'unknown')
            ->map(fn ($group, $track) => ['training_track' => $track, 'count' => $group->count()])
            ->values();

        $openTasksCount = Task::whereIn('training_assignment_id', $assignmentIds)
            ->whereIn('status', ['pending', 'in_progress'])
            ->count();

        $pendingSubmissionsCount = TaskSubmission::whereHas('task', fn ($q) => $q->whereIn('training_assignment_id', $assignmentIds))
            ->whereIn('review_status', [null, 'pending', 'under_review'])
            ->count();

        $finalAcademicEvaluationsCount = (int) Evaluation::query()
            ->whereIn('training_assignment_id', $assignmentIds)
            ->where('is_final', true)
            ->distinct()
            ->count('training_assignment_id');
        $academicStatusDistribution = $assignments
            ->groupBy(fn ($assignment) => $assignment->academic_status ?? 'not_started')
            ->map(fn ($group, $status) => [
                'status' => $status,
                'label' => $this->academicStatusLabel((string) $status),
                'count' => $group->count(),
            ])
            ->values();

        return $this->successResponse([
            'supervisor_profile' => [
                'id' => $user->id,
                'name' => $user->name,
                'department' => data_get($user, 'department.name'),
            ],
            'department_summary' => [
                'department' => $this->trackResolver->resolveDepartment($user),
            ],
            'sections_count' => $allSectionIds->count(),
            'students_count' => $allStudentIds->count(),
            'visits_this_week' => SupervisorVisit::where('supervisor_id', $user->id)
                ->whereBetween('scheduled_date', [now()->startOfWeek(), now()->endOfWeek()])
                ->count(),
            'visible_daily_logs_count' => TrainingLog::whereIn('training_assignment_id', $assignmentIds)
                ->where('status', 'approved')
                ->count(),
            'unreviewed_logs' => TrainingLog::whereIn('training_assignment_id', $assignmentIds)
                ->where('status', 'submitted')
                ->count(),
            'attendance_alerts_count' => Attendance::whereIn('training_assignment_id', $assignmentIds)
                ->whereIn('status', ['absent', 'late'])
                ->whereDate('date', '>=', now()->subDays(14)->toDateString())
                ->count(),
            'missing_portfolio_items_count' => PortfolioEntry::whereIn('student_portfolio_id', StudentPortfolio::whereIn('training_assignment_id', $assignmentIds)->pluck('id'))
                ->whereNull('file_path')
                ->count(),
            'open_tasks_count' => $openTasksCount,
            'pending_submissions_count' => $pendingSubmissionsCount,
            'pending_academic_evaluations_count' => max(0, $studentIds->count() - $finalAcademicEvaluationsCount),
            'pending_field_evaluations_count' => FieldEvaluation::whereIn('training_assignment_id', $assignmentIds)->where('is_final', false)->count(),
            'critical_cases_count' => Attendance::whereIn('training_assignment_id', $assignmentIds)->where('status', 'absent')->whereDate('date', '>=', now()->subDays(7)->toDateString())->count(),
            'recent_activity' => $recentActivity,
            'upcoming_visits' => $upcomingVisits,
            'track_distribution' => $trackDistribution,
            'academic_status_distribution' => $academicStatusDistribution,
        ], 'Supervisor stats loaded successfully.');
    }

    public function students(Request $request)
    {
        $user = $request->user();
        $perPage = max(1, min((int) $request->input('per_page', 15), 500));
        $filters = [
            'section_id' => $request->input('section_id'),
            'department' => $request->input('department'),
            'training_track' => $request->input('training_track'),
            'attendance_status' => $request->input('attendance_status'),
            'daily_log_status' => $request->input('daily_log_status'),
            'portfolio_status' => $request->input('portfolio_status'),
            'evaluation_status' => $request->input('evaluation_status'),
            'search' => $request->input('search'),
        ];

        // قائمة على مستوى التسجيل في الشعبة (وليس فقط تعيينات التدريب) حتى يظهر الطالب قبل إنشاء تعيين.
        $query = $this->studentService->supervisedEnrollmentsQuery($user)
            ->with([
                'user.department',
                'section.course',
                'latestTrainingAssignment.trainingSite',
                'latestTrainingAssignment.teacher',
                'latestTrainingAssignment.academicStatusUpdatedBy:id,name',
                // TrainingTrackResolver reads assignment→enrollment; without this, one query per roster row.
                'latestTrainingAssignment.enrollment.user.department',
                'latestTrainingAssignment.enrollment.section.course',
            ]);

        if ($filters['section_id']) {
            $query->where('section_id', (int) $filters['section_id']);
        }
        if ($filters['department']) {
            $query->whereHas('user.department', function ($q) use ($filters) {
                $q->where('name', 'like', '%' . $filters['department'] . '%');
            });
        }
        if ($filters['training_track']) {
            $query->whereHas('trainingAssignments', fn ($ta) => $ta->forTrainingTrack((string) $filters['training_track']));
        }
        if ($filters['attendance_status']) {
            $status = (string) $filters['attendance_status'];
            if (in_array($status, ['present', 'absent', 'late'], true)) {
                $query->whereHas('trainingAssignments', fn ($ta) => $ta->whereHas('attendances', fn ($q) => $q->where('status', $status)));
            }
        }
        if ($filters['daily_log_status']) {
            $logStatus = (string) $filters['daily_log_status'];
            if (in_array($logStatus, ['draft', 'submitted', 'approved', 'returned'], true)) {
                $query->whereHas('trainingAssignments', fn ($ta) => $ta->whereHas('trainingLogs', fn ($q) => $q->where('status', $logStatus)));
            }
        }
        if ($filters['portfolio_status']) {
            $portfolioFilter = (string) $filters['portfolio_status'];
            if ($portfolioFilter === 'missing_files') {
                $query->whereHas('trainingAssignments', fn ($ta) => $ta->whereHas('studentPortfolio.entries', fn ($q) => $q->whereNull('file_path')));
            } elseif (in_array($portfolioFilter, ['complete_files', 'no_missing_files'], true)) {
                $query->whereHas('trainingAssignments', function ($ta) {
                    $ta->whereHas('studentPortfolio')
                        ->whereDoesntHave('studentPortfolio.entries', fn ($q) => $q->whereNull('file_path'));
                });
            }
        }
        if ($filters['evaluation_status']) {
            $evalFilter = (string) $filters['evaluation_status'];
            if ($evalFilter === 'final') {
                $query->whereHas('trainingAssignments', fn ($ta) => $ta->whereHas('evaluations', fn ($q) => $q->where('is_final', true)));
            } elseif (in_array($evalFilter, ['draft', 'pending', 'not_final', 'draft_or_missing'], true)) {
                $query->whereHas('trainingAssignments', fn ($ta) => $ta->whereDoesntHave('evaluations', fn ($q) => $q->where('is_final', true)));
            }
        }
        if ($filters['search']) {
            $search = (string) $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->whereHas('user', function ($userQuery) use ($search) {
                    $userQuery->where('name', 'like', '%' . $search . '%')
                        ->orWhere('university_id', 'like', '%' . $search . '%');
                })->orWhereHas('trainingAssignments.trainingSite', function ($siteQuery) use ($search) {
                    $siteQuery->where('name', 'like', '%' . $search . '%');
                });
            });
        }

        $query->orderByDesc('id');

        $enrolledUserIds = (clone $query)->pluck('user_id')->unique();

        $paginator = $query->paginate($perPage);

        $pivotExtraAssignmentIds = collect();
        if ($paginator->currentPage() === 1 && ! $this->supervisorStudentListFiltersRequireAssignment($filters)) {
            $pivotExtraAssignmentIds = $this->pivotOnlySupervisorStudentAssignmentIds($user, $filters, $enrolledUserIds);
        }

        $assignmentIds = $paginator->getCollection()
            ->map(fn (Enrollment $enrollment) => $enrollment->latestTrainingAssignment?->id)
            ->merge($pivotExtraAssignmentIds)
            ->filter()
            ->unique()
            ->values();

        $attendanceAggregates = Attendance::query()
            ->whereIn('training_assignment_id', $assignmentIds)
            ->selectRaw("
                training_assignment_id,
                COUNT(*) as total,
                SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN status='late' THEN 1 ELSE 0 END) as late_count
            ")
            ->groupBy('training_assignment_id')
            ->get()
            ->keyBy('training_assignment_id');

        $approvedLogsCount = TrainingLog::query()
            ->whereIn('training_assignment_id', $assignmentIds)
            ->where('status', 'approved')
            ->selectRaw('training_assignment_id, COUNT(*) as total')
            ->groupBy('training_assignment_id')
            ->pluck('total', 'training_assignment_id');

        $portfolioEntryCount = StudentPortfolio::query()
            ->whereIn('training_assignment_id', $assignmentIds)
            ->withCount('entries')
            ->get()
            ->pluck('entries_count', 'training_assignment_id');

        $fieldEvaluationFinalExists = FieldEvaluation::query()
            ->whereIn('training_assignment_id', $assignmentIds)
            ->where('is_final', true)
            ->select('training_assignment_id')
            ->distinct()
            ->pluck('training_assignment_id')
            ->flip();

        $academicEvaluationFinalExists = Evaluation::query()
            ->whereIn('training_assignment_id', $assignmentIds)
            ->where('is_final', true)
            ->select('training_assignment_id')
            ->distinct()
            ->pluck('training_assignment_id')
            ->flip();

        $pendingSubmissionExists = TaskSubmission::query()
            ->whereHas('task', fn ($q) => $q->whereIn('training_assignment_id', $assignmentIds))
            ->whereIn('review_status', [null, 'pending', 'under_review'])
            ->with('task:id,training_assignment_id')
            ->get()
            ->groupBy(fn ($submission) => $submission->task?->training_assignment_id)
            ->map(fn ($group) => $group->isNotEmpty());

        $lastActivityByAssignment = Note::query()
            ->whereIn('training_assignment_id', $assignmentIds)
            ->selectRaw('training_assignment_id, MAX(created_at) as last_activity_at')
            ->groupBy('training_assignment_id')
            ->pluck('last_activity_at', 'training_assignment_id');

        $rows = $paginator->getCollection()->map(function (Enrollment $enrollment) use (
            $attendanceAggregates,
            $approvedLogsCount,
            $portfolioEntryCount,
            $fieldEvaluationFinalExists,
            $academicEvaluationFinalExists,
            $pendingSubmissionExists,
            $lastActivityByAssignment
        ) {
            $student = $enrollment->user;
            if (! $student) {
                return null;
            }

            return $this->buildSupervisorWorkspaceStudentRow(
                $student,
                $enrollment->section,
                $enrollment->latestTrainingAssignment,
                $attendanceAggregates,
                $approvedLogsCount,
                $portfolioEntryCount,
                $fieldEvaluationFinalExists,
                $academicEvaluationFinalExists,
                $pendingSubmissionExists,
                $lastActivityByAssignment
            );
        })->filter()->values();

        $pivotOnlyTotal = $this->countPivotOnlySupervisorStudents($user, $filters, $enrolledUserIds);
        if ($paginator->currentPage() === 1 && ! $this->supervisorStudentListFiltersRequireAssignment($filters)) {
            $pivotRows = $this->pivotOnlySupervisorStudentRows(
                $user,
                $filters,
                $enrolledUserIds,
                $attendanceAggregates,
                $approvedLogsCount,
                $portfolioEntryCount,
                $fieldEvaluationFinalExists,
                $academicEvaluationFinalExists,
                $pendingSubmissionExists,
                $lastActivityByAssignment
            );
            $rows = $rows->concat($pivotRows)->values();
        }

        return $this->successResponse(
            SupervisorStudentResource::collection($rows),
            'Students loaded successfully.',
            200,
            [
                'meta' => [
                    'total' => $paginator->total() + $pivotOnlyTotal,
                    'page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'last_page' => $paginator->lastPage(),
                ],
                'filters' => $filters,
                'summary' => [
                    'students_count' => $paginator->total() + $pivotOnlyTotal,
                    'critical_count' => $rows->where('risk_level', 'critical')->count(),
                    'warning_count' => $rows->where('risk_level', 'medium')->count(),
                ],
            ]
        );
    }

    public function sections(Request $request)
    {
        $supervisor = $request->user();
        $perPage = max(1, min((int) $request->input('per_page', 15), 500));
        $filters = [
            'department' => $request->input('department'),
            'course_id' => $request->input('course_id'),
            'semester' => $request->input('semester'),
            'training_track' => $request->input('training_track'),
            'search' => $request->input('search'),
        ];

        $query = Section::query()
            ->where('academic_supervisor_id', $supervisor->id)
            ->when($supervisor->department_id, function ($sectionQuery) use ($supervisor) {
                $sectionQuery->where(function ($q) use ($supervisor) {
                    $q->whereHas('course', fn ($courseQuery) => $courseQuery->where('department_id', $supervisor->department_id))
                        ->orWhereHas('enrollments.user', fn ($studentQuery) => $studentQuery->where('department_id', $supervisor->department_id))
                        ->orWhereHas('students', fn ($studentQuery) => $studentQuery->where('department_id', $supervisor->department_id));
                });
            })
            ->with(['course', 'academicSupervisor', 'enrollments.user.department', 'enrollments.trainingAssignments.trainingSite', 'students.department'])
            ->withCount('enrollments');

        if ($filters['semester']) {
            $query->where('semester', $filters['semester']);
        }
        if ($filters['course_id']) {
            $query->where('course_id', (int) $filters['course_id']);
        }
        if ($filters['department']) {
            $query->where(function ($q) use ($filters) {
                $q->whereHas('enrollments.user.department', function ($dq) use ($filters) {
                    $dq->where('name', 'like', '%' . $filters['department'] . '%');
                })->orWhereHas('students.department', function ($dq) use ($filters) {
                    $dq->where('name', 'like', '%' . $filters['department'] . '%');
                });
            });
        }
        if ($filters['training_track']) {
            $track = strtolower((string) $filters['training_track']);
            if ($track === 'psychology_clinic') {
                $query->where(function ($q) {
                    $q->whereHas('enrollments.trainingAssignments.trainingSite', fn ($sq) => $sq->whereIn('site_type', ['health_center', 'clinic']))
                        ->orWhereHas('students.department', fn ($sq) => $sq->where('name', 'like', '%psych%'));
                });
            } elseif ($track === 'psychology_school') {
                $query->where(function ($q) {
                    $q->whereHas('enrollments.trainingAssignments.trainingSite', fn ($sq) => $sq->where('site_type', 'school'))
                        ->orWhereHas('students.department', fn ($sq) => $sq->where('name', 'like', '%psych%'));
                });
            } else {
                $query->where(function ($q) {
                    $q->whereHas('enrollments.trainingAssignments.trainingSite', fn ($sq) => $sq->where('site_type', 'school'))
                        ->orWhereHas('students.department', fn ($sq) => $sq->where('name', 'like', '%usool%')->orWhere('name', 'like', '%تربي%'));
                });
            }
        }
        if ($filters['search']) {
            $search = (string) $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhereHas('course', fn ($cq) => $cq->where('name', 'like', '%' . $search . '%'));
            });
        }

        $paginator = $query->paginate($perPage);
        $sections = $paginator->getCollection()->map(function ($section) {
            $firstAssignment = $section->enrollments
                ->flatMap(fn ($enrollment) => $enrollment->trainingAssignments)
                ->first();
            $trainingSitesCount = $section->enrollments
                ->flatMap(fn ($enrollment) => $enrollment->trainingAssignments)
                ->pluck('training_site_id')
                ->filter()
                ->unique()
                ->count();

            // Count students from both enrollments and section_students pivot
            $enrollmentCount = (int) $section->enrollments_count;
            $pivotStudentCount = $section->students->count();
            $totalStudents = max($enrollmentCount, $pivotStudentCount);

            // Get department from enrollments first, then from section_students
            $department = data_get($section, 'enrollments.0.user.department.name')
                ?? data_get($section, 'students.0.department.name');

            // Resolve training track from assignment or from section_students department
            $trainingTrack = $this->trackResolver->resolveForAssignment($firstAssignment);
            if (!$trainingTrack) {
                $pivotDept = data_get($section, 'students.0.department.name');
                if ($pivotDept && (str_contains(strtolower($pivotDept), 'psych') || str_contains($pivotDept, 'علم النفس'))) {
                    $trainingTrack = 'psychology';
                } elseif ($pivotDept) {
                    $trainingTrack = 'education';
                }
            }

            // Build students list from both enrollments and section_students
            $enrollmentStudents = $section->enrollments->map(fn ($e) => [
                'id' => $e->user?->id,
                'name' => $e->user?->name,
                'university_id' => $e->user?->university_id,
                'department' => data_get($e, 'user.department.label') ?? data_get($e, 'user.department.name'),
                'major' => $e->user?->major,
            ])->filter(fn ($s) => $s['id']);

            $pivotStudents = $section->students->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'university_id' => $s->university_id,
                'department' => data_get($s, 'department.label') ?? data_get($s, 'department.name'),
                'major' => $s->major,
            ])->filter(fn ($s) => $s['id']);

            // Merge: prefer enrollment students, add pivot students not already included
            $existingIds = $enrollmentStudents->pluck('id')->toArray();
            $allStudents = $enrollmentStudents->merge(
                $pivotStudents->filter(fn ($s) => !in_array($s['id'], $existingIds))
            )->values();

            return [
                'id' => $section->id,
                'section_code' => $section->id,
                'section_name' => $section->name,
                'course' => data_get($section, 'course.name'),
                'department' => $department,
                'training_track' => $trainingTrack,
                'students_count' => $totalStudents,
                'students' => $allStudents,
                'training_sites_count' => $trainingSitesCount,
                'academic_supervisor' => data_get($section, 'academicSupervisor.name'),
                'status' => 'active',
            ];
        })->values();

        return $this->successResponse(
            SupervisorSectionResource::collection($sections),
            'Sections loaded successfully.',
            200,
            [
                'meta' => [
                    'total' => $paginator->total(),
                    'page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'last_page' => $paginator->lastPage(),
                ],
                'filters' => $filters,
                'summary' => [
                    'sections_count' => $paginator->total(),
                    'students_count' => $sections->sum('students_count'),
                ],
            ]
        );
    }

    public function studentOverview(Request $request, $studentId)
    {
        $supervisor = $request->user();
        $student = User::with('department')->findOrFail($studentId);

        // Try to get TrainingAssignment; if none, check if student is in a supervised section
        $assignment = $this->studentService->getAssignmentForStudent($supervisor, (int) $studentId);

        if (!$assignment) {
            // Check if student is in a section supervised by this supervisor
            if (!$this->studentService->isStudentInSupervisedSection($supervisor, (int) $studentId)) {
                abort(403, 'You are not authorized to access this student.');
            }

            // Student is in a supervised section but has no training assignment yet
            // Return basic student info with empty summaries
            $enrollment = \App\Models\Enrollment::where('user_id', $studentId)
                ->whereHas('section', fn ($q) => $q->where('academic_supervisor_id', $supervisor->id))
                ->with(['section.course'])
                ->latest()
                ->first();

            $section = $enrollment?->section ?? \App\Models\Section::where('academic_supervisor_id', $supervisor->id)
                ->whereHas('students', fn ($q) => $q->where('student_id', $studentId))
                ->with(['course'])
                ->first();

            return $this->successResponse([
                'student' => $student,
                'summaries' => [
                    'attendance' => null,
                    'daily_logs' => ['total' => 0, 'approved' => 0],
                    'portfolio' => ['entries_count' => 0],
                    'visits' => ['completed' => 0],
                    'tasks' => ['total' => 0, 'open_count' => 0, 'pending_submissions' => 0],
                    'evaluations' => ['field' => null, 'academic' => null],
                ],
                'related_data' => [
                    'assignment' => null,
                    'academic_supervision' => [
                        'status' => 'not_started',
                        'status_label' => $this->academicStatusLabel('not_started'),
                        'note' => null,
                        'updated_at' => null,
                        'updated_by' => null,
                    ],
                    'section' => $section,
                    'course' => $section?->course,
                    'training_site' => null,
                    'field_supervisor' => null,
                ],
                'permissions' => [
                    'can_review_attendance' => false,
                    'can_review_logs' => false,
                    'can_submit_academic_evaluation' => false,
                ],
                'track_config_hints' => [
                    'department' => $this->trackResolver->resolveDepartment($student),
                    'training_track' => null,
                ],
                'has_training_assignment' => false,
            ], 'Student overview loaded (no training assignment yet).');
        }

        $assignmentId = $assignment->id;

        $attendanceSummary = Attendance::where('training_assignment_id', $assignmentId)
            ->selectRaw("
                COUNT(*) as total_days,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
                SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days
            ")->first();

        $dailyLogsSummary = TrainingLog::where('training_assignment_id', $assignmentId)
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
            ")
            ->first();

        $portfolio = StudentPortfolio::where('training_assignment_id', $assignmentId)->withCount('entries')->first();

        $visitsCompleted = SupervisorVisit::where('training_assignment_id', $assignmentId)
            ->where('status', 'completed')
            ->count();

        $tasksSummary = Task::where('training_assignment_id', $assignmentId)
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN status IN ('pending','in_progress') THEN 1 ELSE 0 END) as open_count
            ")
            ->first();

        $pendingSubmissions = TaskSubmission::whereHas('task', fn ($q) => $q->where('training_assignment_id', $assignmentId))
            ->whereIn('review_status', [null, 'pending', 'under_review'])
            ->count();

        $latestFieldEvaluation = FieldEvaluation::where('training_assignment_id', $assignmentId)->latest()->first();
        $latestAcademicEvaluation = Evaluation::where('training_assignment_id', $assignmentId)
            ->where('evaluator_id', $request->user()->id)
            ->latest()
            ->first();

        return $this->successResponse([
            'student' => $student,
            'summaries' => [
                'attendance' => $attendanceSummary,
                'daily_logs' => [
                    'total' => (int) ($dailyLogsSummary?->total ?? 0),
                    'approved' => (int) ($dailyLogsSummary?->approved ?? 0),
                ],
                'portfolio' => [
                    'entries_count' => (int) ($portfolio?->entries_count ?? 0),
                ],
                'visits' => [
                    'completed' => $visitsCompleted,
                ],
                'tasks' => [
                    'total' => (int) ($tasksSummary?->total ?? 0),
                    'open_count' => (int) ($tasksSummary?->open_count ?? 0),
                    'pending_submissions' => $pendingSubmissions,
                ],
                'evaluations' => [
                    'field' => $latestFieldEvaluation,
                    'academic' => $latestAcademicEvaluation,
                ],
            ],
            'related_data' => [
                'assignment' => $assignment,
                'academic_supervision' => [
                    'status' => $assignment->academic_status ?? 'not_started',
                    'status_label' => $this->academicStatusLabel($assignment->academic_status ?? 'not_started'),
                    'note' => $assignment->academic_status_note,
                    'updated_at' => $assignment->academic_status_updated_at,
                    'updated_by' => $assignment->academicStatusUpdatedBy?->name,
                ],
                'section' => data_get($assignment, 'enrollment.section'),
                'course' => data_get($assignment, 'enrollment.section.course'),
                'training_site' => $assignment->trainingSite,
                'field_supervisor' => $assignment->teacher,
            ],
            'permissions' => [
                'can_review_attendance' => true,
                'can_review_logs' => true,
                'can_submit_academic_evaluation' => true,
            ],
            'track_config_hints' => [
                'department' => $this->trackResolver->resolveDepartment($student),
                'training_track' => $this->trackResolver->resolveForAssignment($assignment),
            ],
            'has_training_assignment' => true,
        ], 'Student overview loaded successfully.');
    }

    public function updateStudentAcademicStatus(UpdateAcademicSupervisionStatusRequest $request, $studentId)
    {
        $assignment = $this->studentService->updateAcademicStatus(
            $request->user(),
            (int) $studentId,
            $request->string('academic_status')->toString(),
            $request->input('note')
        );

        $this->createActivity($request->user()->id, 'academic_status_updated', 'Academic supervision status updated.');

        return $this->successResponse([
            'training_assignment_id' => $assignment->id,
            'student_id' => data_get($assignment, 'enrollment.user_id'),
            'academic_status' => $assignment->academic_status,
            'academic_status_label' => $this->academicStatusLabel($assignment->academic_status),
            'academic_status_note' => $assignment->academic_status_note,
            'academic_status_updated_at' => $assignment->academic_status_updated_at,
            'academic_status_updated_by' => $assignment->academicStatusUpdatedBy?->name,
        ], 'Academic supervision status updated successfully.');
    }

    public function studentAcademicStatusHistory(Request $request, $studentId)
    {
        $assignment = $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $studentId);
        $history = AcademicSupervisionStatusHistory::query()
            ->where('training_assignment_id', $assignment->id)
            ->with(['changedBy:id,name', 'academicSupervisor:id,name'])
            ->latest('changed_at')
            ->paginate($request->per_page ?? 30);

        return $this->successResponse($history, 'Academic supervision status history loaded successfully.');
    }

    public function studentAttendance(Request $request, $studentId)
    {
        $isSupervisedStudent = $this->studentService->supervisedAssignmentsBaseQuery($request->user())
            ->whereHas('enrollment', fn($q) => $q->where('user_id', (int) $studentId))
            ->exists();

        abort_unless($isSupervisedStudent || $request->user()->role?->name === 'admin', 403, 'غير مصرح.');

        $enrollmentIds = \App\Models\Enrollment::where('user_id', (int) $studentId)->pluck('id');

        $assignmentIds = \App\Models\TrainingAssignment::whereIn('enrollment_id', $enrollmentIds)->pluck('id');

        if ($assignmentIds->isEmpty()) {
            return $this->successResponse([
                'records' => [], 'summary' => ['total_days'=>0,'present_days'=>0,'absent_days'=>0,'late_days'=>0,'attendance_rate'=>0],
                'monthly_aggregation' => [], 'absences_count' => 0, 'late_count' => 0, 'unreviewed_records_count' => 0, 'academic_visibility_status' => 'visible',
            ], 'Attendance loaded successfully.');
        }

        $records = Attendance::with(['user', 'trainingAssignment.enrollment.user', 'trainingAssignment.trainingSite'])
            ->whereIn('training_assignment_id', $assignmentIds)
            ->orderBy('date', 'desc')
            ->paginate($request->per_page ?? 50);

        $summary = Attendance::whereIn('training_assignment_id', $assignmentIds)
            ->selectRaw("
                COUNT(*) as total_days,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
                SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days
            ")
            ->first();

        $total = $summary?->total_days ?? 0;
        $present = $summary?->present_days ?? 0;

        return $this->successResponse([
            'records' => $records->items(),
            'summary' => [
                'total_days' => $total,
                'present_days' => $present,
                'absent_days' => $summary?->absent_days ?? 0,
                'late_days' => $summary?->late_days ?? 0,
                'attendance_rate' => $total > 0 ? round(($present / $total) * 100) : 0,
            ],
            'monthly_aggregation' => $this->attendanceMonthlyAggregation($assignmentIds->first()),
            'absences_count' => (int) ($summary?->absent_days ?? 0),
            'late_count' => (int) ($summary?->late_days ?? 0),
            'unreviewed_records_count' => Attendance::whereIn('training_assignment_id', $assignmentIds)->whereNull('approved_at')->count(),
            'academic_visibility_status' => 'visible',
        ], 'Attendance loaded successfully.', 200, [
            'meta' => [
                'total' => $records->total(),
                'page' => $records->currentPage(),
                'per_page' => $records->perPage(),
                'last_page' => $records->lastPage(),
            ],
            'filters' => [
                'from' => $request->input('from'),
                'to' => $request->input('to'),
                'status' => $request->input('status'),
            ],
        ]);
    }

    public function attendanceComment(AddAttendanceCommentRequest $request, $studentId)
    {
        $assignment = $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $studentId);
        $attendance = Attendance::where('id', $request->integer('attendance_id'))
            ->where('training_assignment_id', $assignment->id)
            ->firstOrFail();

        $attendance->update([
            'academic_note' => $request->string('comment'),
            'academic_commented_at' => now(),
        ]);

        $this->createActivity($request->user()->id, 'attendance_comment_added', 'Academic attendance comment added.');

        return $this->successResponse($attendance, 'Attendance comment added.');
    }

    public function attendanceAlert(AddAttendanceAlertRequest $request, $studentId)
    {
        $assignment = $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $studentId);
        $attendance = Attendance::where('id', $request->integer('attendance_id'))
            ->where('training_assignment_id', $assignment->id)
            ->firstOrFail();

            $attendance->update([
            'academic_alert_status' => 'raised',
            'academic_commented_at' => now(),
        ]);

        Notification::create([
            'user_id' => $this->resolveTargetUserId($request->string('target')->toString(), (int) $studentId) ?? $request->user()->id,
            'type' => 'attendance_alert',
            'message' => $request->string('message'),
            'notifiable_type' => Attendance::class,
            'notifiable_id' => $attendance->id,
            'data' => [
                'attendance_id' => $attendance->id,
                'target' => $request->string('target'),
                'student_id' => (int) $studentId,
            ],
        ]);

        $this->createActivity($request->user()->id, 'attendance_alert_raised', 'Attendance alert raised by academic supervisor.');

        return $this->successResponse(null, 'Attendance alert created successfully.');
    }

    public function studentDailyLogs(Request $request, $studentId)
    {
        $assignment = $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $studentId);
        $logs = TrainingLog::where('training_assignment_id', $assignment->id)
            ->orderBy('log_date', 'desc')
            ->paginate($request->per_page ?? 50);
        $dailyReports = DailyReport::query()
            ->where('training_assignment_id', $assignment->id)
            ->whereIn('status', [DailyReport::STATUS_CONFIRMED, DailyReport::STATUS_UNDER_REVIEW])
            ->with(['fieldSupervisor:id,name', 'reviewer:id,name'])
            ->orderBy('report_date', 'desc')
            ->get()
            ->map(fn (DailyReport $report) => [
                'id' => 'daily-report-' . $report->id,
                'source' => 'daily_report',
                'source_id' => $report->id,
                'title' => 'تقرير يومي ميداني',
                'date' => optional($report->report_date)->toDateString(),
                'log_date' => optional($report->report_date)->toDateString(),
                'status' => $report->status === DailyReport::STATUS_CONFIRMED ? 'approved' : 'under_review',
                'description' => $this->dailyReportDescription($report),
                'mentor_comment' => $report->supervisor_comment,
                'supervisor_name' => $report->fieldSupervisor?->name,
                'reviewed_at' => $report->reviewed_at,
                'reviewed_by' => $report->reviewer?->name,
            ]);
        $trainingLogRows = collect($logs->items())->map(fn (TrainingLog $log) => [
            'id' => $log->id,
            'source' => 'training_log',
            'source_id' => $log->id,
            'title' => 'سجل يومي',
            'date' => optional($log->log_date)->toDateString(),
            'log_date' => optional($log->log_date)->toDateString(),
            'status' => $log->status,
            'description' => $log->activities_performed,
            'mentor_comment' => $log->supervisor_notes,
            'student_reflection' => $log->student_reflection,
            'academic_note' => $log->academic_note,
            'academic_review_status' => $log->academic_review_status,
        ]);
        $visibleLogs = $trainingLogRows
            ->merge($dailyReports)
            ->sortByDesc(fn ($row) => $row['date'] ?? '')
            ->values();

        return $this->successResponse([
            'logs' => $visibleLogs,
            'counters' => [
                'total' => $logs->total() + $dailyReports->count(),
                'approved' => TrainingLog::where('training_assignment_id', $assignment->id)->where('status', 'approved')->count()
                    + $dailyReports->where('status', 'approved')->count(),
                'returned' => TrainingLog::where('training_assignment_id', $assignment->id)->where('status', 'returned')->count(),
            ],
            'status_distribution' => TrainingLog::where('training_assignment_id', $assignment->id)
                ->selectRaw('status, COUNT(*) as count')
                ->groupBy('status')
                ->get(),
        ], 'Daily logs loaded successfully.', 200, [
            'meta' => [
                'total' => $logs->total(),
                'page' => $logs->currentPage(),
                'per_page' => $logs->perPage(),
                'last_page' => $logs->lastPage(),
            ],
            'filters' => [
                'status' => $request->input('status'),
                'from' => $request->input('from'),
                'to' => $request->input('to'),
            ],
            'summary' => [
                'approved_count' => TrainingLog::where('training_assignment_id', $assignment->id)->where('status', 'approved')->count()
                    + $dailyReports->where('status', 'approved')->count(),
                'returned_count' => TrainingLog::where('training_assignment_id', $assignment->id)->where('status', 'returned')->count(),
            ],
        ]);
    }

    public function reviewDailyLog(ReviewDailyLogRequest $request, $studentId, $logId)
    {
        $assignment = $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $studentId);
        $log = TrainingLog::where('id', $logId)->where('training_assignment_id', $assignment->id)->firstOrFail();

        $log->update([
            'academic_review_status' => 'reviewed',
            'academic_note' => $request->string('academic_note'),
            'needs_discussion' => (bool) $request->boolean('needs_discussion'),
            'academic_reviewed_at' => now(),
        ]);

        $this->createActivity($request->user()->id, 'daily_log_reviewed', 'Academic review added to daily log.');

        return $this->successResponse($log, 'Daily log reviewed successfully.');
    }

    public function flagDailyLog(Request $request, $studentId, $logId)
    {
        $request->validate(['flag_reason' => 'required|string|max:1500']);
        $assignment = $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $studentId);
        $log = TrainingLog::where('id', $logId)->where('training_assignment_id', $assignment->id)->firstOrFail();

        $log->update([
            'academic_review_status' => 'flagged',
            'academic_note' => $request->string('flag_reason'),
            'needs_discussion' => true,
            'academic_reviewed_at' => now(),
        ]);

        $this->createActivity($request->user()->id, 'daily_log_flagged', 'Daily log flagged by academic supervisor.');

        return $this->successResponse($log, 'Daily log flagged successfully.');
    }

    public function studentPortfolio(Request $request, $studentId)
    {
        $assignment = $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $studentId);
        $portfolio = StudentPortfolio::where('training_assignment_id', $assignment->id)
            ->with('entries.reviewer')
            ->first();

        if (! $portfolio) {
            return $this->successResponse([
                'portfolio_meta' => null,
                'training_track' => $this->trackResolver->resolveForAssignment($assignment),
                'completion_percentage' => 0,
                'sections' => [],
                'attachments' => [],
                'missing_items' => [],
                'reviewed_items_count' => 0,
                'needs_revision_items_count' => 0,
                'final_review_status' => 'not_started',
            ], 'Portfolio not created yet.');
        }

        $entries = $portfolio->entries;
        $reviewedCount = $entries->where('review_status', 'reviewed')->count();
        $needsRevisionCount = $entries->where('review_status', 'needs_revision')->count();
        $completion = $entries->count() > 0 ? round(($reviewedCount / $entries->count()) * 100) : 0;

        return $this->successResponse([
            'portfolio_meta' => Arr::only($portfolio->toArray(), ['id', 'created_at', 'updated_at']),
            'training_track' => $this->trackResolver->resolveForAssignment($assignment),
            'completion_percentage' => $completion,
            'sections' => $entries,
            'attachments' => $entries->pluck('file_path')->filter()->values(),
            'missing_items' => $entries->whereNull('file_path')->values(),
            'reviewed_items_count' => $reviewedCount,
            'needs_revision_items_count' => $needsRevisionCount,
            'final_review_status' => $needsRevisionCount > 0 ? 'needs_revision' : ($reviewedCount > 0 ? 'in_review' : 'not_started'),
        ], 'Portfolio loaded successfully.');
    }

    public function reviewPortfolioSection(ReviewPortfolioSectionRequest $request, $studentId)
    {
        $assignment = $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $studentId);
        $entry = PortfolioEntry::where('id', $request->integer('entry_id'))
            ->whereHas('studentPortfolio', fn ($q) => $q->where('training_assignment_id', $assignment->id))
            ->firstOrFail();

        $entry->update([
            'review_status' => $request->string('status'),
            'reviewer_note' => $request->string('reviewer_note'),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        $this->createActivity($request->user()->id, 'portfolio_section_reviewed', 'Portfolio section reviewed.');

        return $this->successResponse($entry, 'Portfolio section reviewed successfully.');
    }

    public function finalPortfolioReview(Request $request, $studentId)
    {
        $request->validate(['final_note' => 'required|string|max:2000']);
        $assignment = $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $studentId);
        Note::create([
            'user_id' => $request->user()->id,
            'training_assignment_id' => $assignment->id,
            'content' => '[PORTFOLIO_FINAL_REVIEW] ' . $request->string('final_note'),
        ]);

        return $this->successResponse(null, 'Portfolio final review saved.');
    }

    public function tasksIndex(Request $request)
    {
        $user = $request->user();
        $tasks = Task::query()
            ->where('assigned_by', $user->id)
            ->with(['trainingAssignment.enrollment.user', 'submissions'])
            ->latest('id')
            ->get();

        $groups = $tasks->groupBy(fn (Task $task) => $task->distribution_key ?: ('task-' . $task->id));
        $data = $groups->map(function ($group, $groupId) {
            $lead = $group->first();
            $submittedCount = $group->filter(fn ($task) => $task->submissions->isNotEmpty())->count();
            return [
                ...$this->taskListRow($lead),
                'id' => (string) $groupId,
                'targeted_students_count' => $group->count(),
                'submitted_students_count' => $submittedCount,
            ];
        })->values();

        return $this->successResponse($data, 'Tasks loaded successfully.');
    }

    public function showTask(Request $request, $taskId)
    {
        $tasks = $this->resolveTaskGroup($request->user(), (string) $taskId);
        abort_if($tasks->isEmpty(), 404);
        $lead = $tasks->first();

        $students = $tasks->map(fn ($task) => $task->trainingAssignment?->enrollment?->user)
            ->filter()
            ->map(fn ($s) => Arr::only($s->toArray(), ['id', 'name', 'university_id']))
            ->unique('id')
            ->values();

        return $this->successResponse([
            'task' => [
                ...$this->taskListRow($lead),
                'id' => (string) $taskId,
                'targeted_students_count' => $students->count(),
            ],
            'target_students' => $students,
            'submissions_count' => $tasks->sum(fn ($t) => $t->submissions->count()),
        ], 'Task details loaded successfully.');
    }

    public function taskSubmissionsBoard(Request $request, $taskId)
    {
        $tasks = $this->resolveTaskGroup($request->user(), (string) $taskId);
        abort_if($tasks->isEmpty(), 404);
        $lead = $tasks->first();

        $rows = $tasks->map(function (Task $task) {
            $student = $task->trainingAssignment?->enrollment?->user;
            $submission = $task->submissions
                ->where('user_id', $student?->id)
                ->sortByDesc('submitted_at')
                ->first();
            return [
                'task_id' => $task->id,
                'student_id' => $student?->id,
                'student_name' => $student?->name,
                'university_id' => $student?->university_id,
                'status' => $this->resolveSubmissionStatus($task, $submission),
                'submitted_at' => $submission?->submitted_at,
                'attachments' => $submission?->file_path ? [$submission->file_path] : [],
                'student_note' => $submission?->notes,
                'supervisor_feedback' => $submission?->feedback,
                'review_status' => $submission?->review_status,
                'submission_id' => $submission?->id,
            ];
        })->values();

        return $this->successResponse([
            'task' => [
                ...$this->taskListRow($lead),
                'id' => (string) $taskId,
            ],
            'submissions' => $rows,
        ], 'Task submissions loaded successfully.');
    }

    public function studentTasks(Request $request, $studentId)
    {
        $assignment = $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $studentId);
        $tasks = Task::where('training_assignment_id', $assignment->id)
            ->with('submissions')
            ->orderBy('due_date', 'desc')
            ->paginate($request->per_page ?? 50);

        return $this->successResponse($tasks, 'Tasks loaded successfully.', 200, [
            'meta' => [
                'total' => $tasks->total(),
                'page' => $tasks->currentPage(),
                'per_page' => $tasks->perPage(),
                'last_page' => $tasks->lastPage(),
            ],
            'filters' => [
                'status' => $request->input('status'),
                'task_type' => $request->input('task_type'),
            ],
            'summary' => [
                'open_tasks_count' => Task::where('training_assignment_id', $assignment->id)->whereIn('status', ['pending', 'in_progress'])->count(),
            ],
        ]);
    }

    public function storeTask(StoreAcademicTaskRequest $request)
    {
        $user = $request->user();
        $created = collect();
        $distributionKey = (string) Str::uuid();
        $targetType = $request->string('target_type')->toString();
        $targetIds = collect($request->input('target_ids', []))
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->values();

        $assignmentIds = $this->studentService->trainingAssignmentIdsForTaskTargets(
            $user,
            $targetType,
            $targetIds->all()
        );

        foreach ($assignmentIds->unique()->values() as $assignmentId) {
            $created->push(Task::create([
                'training_assignment_id' => (int) $assignmentId,
                'assigned_by' => $user->id,
                'title' => $request->string('title'),
                'description' => $request->input('description'),
                'instructions' => $request->input('instructions'),
                'due_date' => $request->input('due_date'),
                'target_type' => $request->input('target_type'),
                'target_ids' => $request->input('target_ids'),
                'task_type' => $request->input('task_type'),
                'attachments' => $request->input('attachments', []),
                'grading_weight' => $request->input('grading_weight'),
                'allow_resubmission' => (bool) $request->boolean('allow_resubmission', false),
                'is_required' => (bool) $request->boolean('is_required', true),
                'distribution_key' => $distributionKey,
                'status' => $request->input('status', 'pending'),
            ]));
        }

        abort_if($created->isEmpty(), 422, 'تعذر إنشاء المهمة: لا يوجد تعيين تدريب (training assignment) للطلاب المختارين. أكمل تعيين الميدان أو طلب التدريب أولاً. | No valid targets: missing training placement for the selected student(s).');

        $this->createActivity($user->id, 'task_created', 'Supervisor created new task(s).');

        return $this->successResponse($created, 'Task(s) created successfully.', 201);
    }

    public function updateTask(UpdateAcademicTaskRequest $request, $taskId)
    {
        $task = Task::findOrFail($taskId);
        abort_unless((int) $task->assigned_by === (int) $request->user()->id, 403, 'Unauthorized task update.');
        if (($task->due_date && now()->gt($task->due_date)) || $task->submissions()->exists()) {
            return $this->errorResponse('Task can no longer be edited.');
        }

        $task->update($request->validated());
        return $this->successResponse($task, 'Task updated successfully.');
    }

    public function deleteTask(Request $request, $taskId)
    {
        $task = Task::findOrFail($taskId);
        abort_unless((int) $task->assigned_by === (int) $request->user()->id, 403, 'Unauthorized task deletion.');
        abort_if($task->submissions()->exists(), 422, 'Task cannot be deleted after submissions.');
        $task->delete();

        return $this->successResponse(null, 'Task deleted successfully.');
    }

    public function studentTaskSubmissions(Request $request, $studentId)
    {
        $assignment = $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $studentId);
        $submissions = TaskSubmission::where('user_id', $studentId)
            ->whereHas('task', fn ($q) => $q->where('training_assignment_id', $assignment->id))
            ->with('task')
            ->orderBy('submitted_at', 'desc')
            ->paginate($request->per_page ?? 50);

        return $this->successResponse($submissions, 'Task submissions loaded successfully.', 200, [
            'meta' => [
                'total' => $submissions->total(),
                'page' => $submissions->currentPage(),
                'per_page' => $submissions->perPage(),
                'last_page' => $submissions->lastPage(),
            ],
            'filters' => [
                'review_status' => $request->input('review_status'),
                'needs_resubmission' => $request->input('needs_resubmission'),
            ],
            'summary' => [
                'pending_review_count' => TaskSubmission::where('user_id', $studentId)
                    ->whereHas('task', fn ($q) => $q->where('training_assignment_id', $assignment->id))
                    ->whereIn('review_status', [null, 'pending', 'under_review'])
                    ->count(),
            ],
        ]);
    }

    public function showTaskSubmission(Request $request, $submissionId)
    {
        $submission = TaskSubmission::with(['task.trainingAssignment.enrollment', 'user'])->findOrFail($submissionId);
        $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $submission->user_id);
        return $this->successResponse($submission);
    }

    public function reviewTaskSubmission(ReviewTaskSubmissionRequest $request, $submissionId)
    {
        $submission = TaskSubmission::with('task.trainingAssignment.enrollment')->findOrFail($submissionId);
        $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $submission->user_id);

        $submission->update([
            'review_status' => 'reviewed',
            'feedback' => $request->string('feedback'),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return $this->successResponse($submission, 'Submission reviewed successfully.');
    }

    public function requestResubmission(Request $request, $submissionId)
    {
        $request->validate(['feedback' => 'required|string|max:2000']);
        $submission = TaskSubmission::findOrFail($submissionId);
        $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $submission->user_id);
        $submission->update([
            'review_status' => 'needs_resubmission',
            'needs_resubmission' => true,
            'feedback' => $request->string('feedback'),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);
        return $this->successResponse($submission, 'Resubmission requested successfully.');
    }

    public function acceptSubmission(Request $request, $submissionId)
    {
        $request->validate(['feedback' => 'nullable|string|max:2000']);
        $submission = TaskSubmission::findOrFail($submissionId);
        $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $submission->user_id);
        $submission->update([
            'review_status' => 'accepted',
            'needs_resubmission' => false,
            'feedback' => $request->input('feedback'),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);
        return $this->successResponse($submission, 'Submission accepted successfully.');
    }

    public function gradeSubmission(Request $request, $submissionId)
    {
        $request->validate([
            'score' => 'required|numeric|min:0|max:100',
            'feedback' => 'nullable|string|max:2000',
        ]);
        $submission = TaskSubmission::findOrFail($submissionId);
        $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $submission->user_id);
        $submission->update([
            'review_status' => 'graded',
            'score' => $request->input('score'),
            'feedback' => $request->input('feedback'),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'needs_resubmission' => false,
        ]);
        return $this->successResponse($submission, 'Submission graded successfully.');
    }

    public function studentFieldEvaluations(Request $request, $studentId)
    {
        $assignment = $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $studentId);
        $evaluations = FieldEvaluation::where('training_assignment_id', $assignment->id)
            ->with(['template', 'fieldSupervisor'])
            ->get();

        return $this->successResponse([
            'evaluations' => $evaluations,
            'missing_evaluations' => $evaluations->where('is_final', false)->count(),
            'final_field_score_summary' => $evaluations->where('is_final', true)->avg('total_score'),
        ], 'Field evaluations loaded successfully.');
    }

    public function studentAcademicEvaluation(Request $request, $studentId)
    {
        $assignment = $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $studentId);
        $departmentKey = $this->resolveDepartmentKeyForAssignment($assignment);
        $evaluation = Evaluation::where('training_assignment_id', $assignment->id)
            ->where('evaluator_id', $request->user()->id)
            ->latest()
            ->first();

        $template = EvaluationTemplate::query()
            ->where(function ($q) use ($departmentKey) {
                $q->where('target_role', 'academic_supervisor');
                if (Schema::hasColumn('evaluation_templates', 'department_key')) {
                    $q->where(function ($inner) use ($departmentKey) {
                        $inner->where('department_key', $departmentKey)->orWhereNull('department_key');
                    });
                }
            })
            ->with('items')
            ->when(
                Schema::hasColumn('evaluation_templates', 'department_key'),
                fn ($query) => $query->orderByRaw('CASE WHEN department_key IS NULL THEN 1 ELSE 0 END')
            )
            ->first();

        return $this->successResponse([
            'evaluation' => $evaluation,
            'rubric_template' => $template,
            'status' => $evaluation?->status ?? 'draft',
            'department_key' => $departmentKey,
        ]);
    }

    public function saveAcademicEvaluationDraft(SaveAcademicEvaluationDraftRequest $request, $studentId)
    {
        $assignment = $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $studentId);
        $departmentKey = $this->resolveDepartmentKeyForAssignment($assignment);
        $templateId = $this->resolveAcademicTemplateId($departmentKey);
        $criteriaScores = $this->normalizeCriteriaScores($request->input('criteria_scores', []));

        $evaluation = Evaluation::firstOrCreate(
            [
                'training_assignment_id' => $assignment->id,
                'evaluator_id' => $request->user()->id,
            ],
            [
                'template_id' => $templateId,
            ]
        );

        if ($evaluation->is_final) {
            return $this->errorResponse('Final evaluation is read-only.');
        }

        $evaluation->update([
            'template_id' => $templateId,
            'criteria_scores' => $criteriaScores,
            'notes' => $request->input('notes'),
            'strengths' => $request->input('strengths'),
            'areas_for_improvement' => $request->input('areas_for_improvement'),
            'recommendation' => $request->input('recommendation'),
            'total_score' => $request->input('total_score') ?? collect($criteriaScores)->avg('score'),
            'status' => 'draft',
            'is_final' => false,
        ]);

        return $this->successResponse($evaluation, 'Academic evaluation draft saved.');
    }

    public function submitAcademicEvaluation(SubmitAcademicEvaluationRequest $request, $studentId)
    {
        $assignment = $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $studentId);
        $departmentKey = $this->resolveDepartmentKeyForAssignment($assignment);
        $templateId = $this->resolveAcademicTemplateId($departmentKey);
        $criteriaScores = $this->normalizeCriteriaScores($request->input('criteria_scores', []));
        $evaluation = Evaluation::where('training_assignment_id', $assignment->id)
            ->where('evaluator_id', $request->user()->id)
            ->firstOrFail();

        abort_if($evaluation->is_final, 422, 'Final evaluation is already submitted.');

        $evaluation->update([
            'template_id' => $templateId,
            'criteria_scores' => $criteriaScores,
            'notes' => $request->input('notes'),
            'strengths' => $request->input('strengths'),
            'areas_for_improvement' => $request->input('areas_for_improvement'),
            'recommendation' => $request->input('recommendation'),
            'total_score' => $request->input('total_score') ?? collect($criteriaScores)->avg('score'),
            'status' => 'final',
            'is_final' => true,
            'submitted_at' => now(),
        ]);

        $this->createActivity($request->user()->id, 'academic_evaluation_submitted', 'Academic evaluation submitted as final.');

        return $this->successResponse($evaluation, 'Academic evaluation submitted successfully.');
    }

    public function studentMessages(Request $request, $studentId)
    {
        $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $studentId);

        $conversation = Conversation::query()
            ->where(function ($q) use ($studentId, $request) {
                $q->where('participant_one_id', $request->user()->id)->where('participant_two_id', $studentId);
            })->orWhere(function ($q) use ($studentId, $request) {
                $q->where('participant_one_id', $studentId)->where('participant_two_id', $request->user()->id);
            })->first();

        $messages = $conversation
            ? Message::where('conversation_id', $conversation->id)->with('sender')->latest()->paginate($request->per_page ?? 50)
            : null;

        return $this->successResponse($messages ?? ['data' => []], 'Messages loaded successfully.');
    }

    public function sendMessage(SendSupervisorMessageRequest $request, $studentId)
    {
        $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $studentId);
        abort_unless((int) $request->integer('target_user_id') === (int) $studentId, 422, 'Target must match supervised student.');

        $conversation = Conversation::firstOrCreate([
            'participant_one_id' => min($request->user()->id, (int) $studentId),
            'participant_two_id' => max($request->user()->id, (int) $studentId),
        ]);

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $request->user()->id,
            'message' => $request->string('content'),
        ]);

        $this->createActivity($request->user()->id, 'supervisor_message_sent', 'Supervisor sent message to student.');

        return $this->successResponse($message, 'Message sent successfully.');
    }

    public function studentTimeline(Request $request, $studentId)
    {
        $assignment = $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $studentId);

        $events = collect()
            ->merge(Attendance::where('training_assignment_id', $assignment->id)->get()->map(fn ($row) => [
                'type' => 'attendance',
                'datetime' => $row->date,
                'data' => $row,
            ]))
            ->merge(TrainingLog::where('training_assignment_id', $assignment->id)->get()->map(fn ($row) => [
                'type' => 'daily_log',
                'datetime' => $row->log_date,
                'data' => $row,
            ]))
            ->merge(SupervisorVisit::where('training_assignment_id', $assignment->id)->get()->map(fn ($row) => [
                'type' => 'visit',
                'datetime' => $row->scheduled_date ?? $row->visit_date,
                'data' => $row,
            ]))
            ->merge(Task::where('training_assignment_id', $assignment->id)->get()->map(fn ($row) => [
                'type' => 'task',
                'datetime' => $row->created_at,
                'data' => $row,
            ]))
            ->merge(Evaluation::where('training_assignment_id', $assignment->id)->get()->map(fn ($row) => [
                'type' => 'evaluation',
                'datetime' => $row->submitted_at ?? $row->created_at,
                'data' => $row,
            ]))
            ->sortByDesc('datetime')
            ->values();

        return $this->successResponse($events, 'Timeline loaded successfully.');
    }

    public function escalate(EscalateStudentIssueRequest $request, $studentId)
    {
        $assignment = $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $studentId);
        $note = Note::create([
            'user_id' => $request->user()->id,
            'training_assignment_id' => $assignment->id,
            'content' => sprintf(
                '[ESCALATION][%s][%s] %s',
                $request->string('target'),
                $request->string('reason'),
                $request->string('details')
            ),
        ]);

        Notification::create([
            'user_id' => $this->resolveTargetUserId($request->string('target')->toString(), (int) $studentId) ?? $request->user()->id,
            'type' => 'student_escalation',
            'message' => 'Student case escalated.',
            'notifiable_type' => Note::class,
            'notifiable_id' => $note->id,
            'data' => [
                'student_id' => (int) $studentId,
                'reason' => $request->string('reason'),
                'target' => $request->string('target'),
            ],
        ]);

        $this->createActivity($request->user()->id, 'student_escalated', 'Student issue escalated.');

        return $this->successResponse(null, 'Student issue escalated successfully.');
    }

    public function studentVisits(Request $request, $studentId)
    {
        $assignment = $this->studentService->mustGetAssignmentForStudent($request->user(), (int) $studentId);
        $visits = SupervisorVisit::where('training_assignment_id', $assignment->id)->latest('scheduled_date')->get();
        return $this->successResponse($visits);
    }

    public function storeVisit(StoreSupervisorVisitRequest $request)
    {
        if ($request->filled('training_assignment_id')) {
            $assignment = $this->studentService->supervisedAssignmentsQuery($request->user())
                ->where('id', $request->integer('training_assignment_id'))
                ->firstOrFail();
        } else {
            $assignment = $this->studentService->mustGetAssignmentForStudent($request->user(), $request->integer('student_id'));
        }

        $assignment->loadMissing(['trainingSite', 'enrollment.user']);

        $scheduled = $request->input('scheduled_date');
        $visit = SupervisorVisit::create([
            'training_assignment_id' => $assignment->id,
            'supervisor_id' => $request->user()->id,
            'visit_date' => $scheduled ?? now()->toDateString(),
            'scheduled_date' => $scheduled,
            'visit_type' => $request->input('visit_type'),
            'location' => $request->input('location') ?: $this->resolveVisitLocation($assignment),
            'training_track' => $request->input('training_track', $this->trackResolver->resolveForAssignment($assignment)),
            'template_type' => $request->input('template_type'),
            'notes' => $request->input('notes'),
            'status' => 'scheduled',
        ]);

        $studentId = (int) data_get($assignment, 'enrollment.user_id');
        $notificationData = [
            'visit_id' => $visit->id,
            'training_assignment_id' => $assignment->id,
            'student_id' => $studentId,
            'scheduled_date' => $visit->scheduled_date,
            'visit_type' => $visit->visit_type,
            'location' => $visit->location,
            'notes' => $visit->notes,
        ];

        if ($studentId) {
            Notification::create([
                'user_id' => $studentId,
                'type' => 'supervisor_visit_scheduled',
                'message' => 'تمت جدولة زيارة ميدانية لك من المشرف الأكاديمي بتاريخ ' . $visit->scheduled_date,
                'notifiable_type' => SupervisorVisit::class,
                'notifiable_id' => $visit->id,
                'data' => $notificationData,
            ]);
        }

        if ($assignment->teacher_id) {
            Notification::create([
                'user_id' => $assignment->teacher_id,
                'type' => 'supervisor_visit_scheduled',
                'message' => 'تمت جدولة زيارة ميدانية لطالب مرتبط بك بتاريخ ' . $visit->scheduled_date,
                'notifiable_type' => SupervisorVisit::class,
                'notifiable_id' => $visit->id,
                'data' => $notificationData,
            ]);
        }

        $this->createActivity($request->user()->id, 'visit_scheduled', 'Supervisor visit scheduled.');
        return $this->successResponse($visit, 'Visit scheduled successfully.', 201);
    }

    public function updateVisit(UpdateSupervisorVisitRequest $request, $visitId)
    {
        $visit = SupervisorVisit::findOrFail($visitId);
        abort_unless((int) $visit->supervisor_id === (int) $request->user()->id, 403);
        $visit->update($request->validated());
        return $this->successResponse($visit, 'Visit updated successfully.');
    }

    public function completeVisit(Request $request, $visitId)
    {
        $request->validate([
            'report_data' => 'nullable|array',
            'rating' => 'nullable|numeric|min:0|max:100',
            'positive_points' => 'nullable|string',
            'needs_improvement' => 'nullable|string',
            'general_notes' => 'nullable|string',
        ]);
        $visit = SupervisorVisit::findOrFail($visitId);
        abort_unless((int) $visit->supervisor_id === (int) $request->user()->id, 403);
        $visit->update([
            'visit_date' => now()->toDateString(),
            'status' => 'completed',
            'completed_at' => now(),
            'report_data' => $request->input('report_data'),
            'rating' => $request->input('rating'),
            'positive_points' => $request->input('positive_points'),
            'needs_improvement' => $request->input('needs_improvement'),
            'general_notes' => $request->input('general_notes'),
        ]);
        $this->createActivity($request->user()->id, 'visit_completed', 'Supervisor visit completed.');
        return $this->successResponse($visit, 'Visit completed successfully.');
    }

    public function showVisit(Request $request, $visitId)
    {
        $visit = SupervisorVisit::with('trainingAssignment.enrollment.user')->findOrFail($visitId);
        abort_unless((int) $visit->supervisor_id === (int) $request->user()->id, 403);
        return $this->successResponse($visit);
    }

    private function taskListRow(Task $task): array
    {
        $submission = $task->submissions->sortByDesc('submitted_at')->first();
        $student = $task->trainingAssignment?->enrollment?->user;
        return [
            'id' => $task->id,
            'title' => $task->title,
            'description' => $task->description,
            'instructions' => $task->instructions,
            'task_type' => $task->task_type,
            'target_type' => $task->target_type,
            'target_ids' => $task->target_ids ?? [],
            'due_date' => optional($task->due_date)->toDateString(),
            'attachments' => $task->attachments ?? [],
            'allow_resubmission' => (bool) $task->allow_resubmission,
            'is_required' => (bool) $task->is_required,
            'status' => $task->status,
            'student' => $student ? Arr::only($student->toArray(), ['id', 'name', 'university_id']) : null,
            'submission_status' => $this->resolveSubmissionStatus($task, $submission),
            'submitted_at' => $submission?->submitted_at,
        ];
    }

    private function resolveSubmissionStatus(Task $task, ?TaskSubmission $submission): string
    {
        if (! $submission) {
            return 'not_submitted';
        }
        if ((bool) $submission->needs_resubmission || $submission->review_status === 'needs_resubmission') {
            return 'needs_resubmission';
        }
        if (in_array($submission->review_status, ['accepted', 'graded'], true)) {
            return 'accepted';
        }
        if ($submission->review_status === 'under_review') {
            return 'under_review';
        }
        if ($submission->submitted_at && $task->due_date && $submission->submitted_at->gt($task->due_date->endOfDay())) {
            return 'late';
        }
        return 'submitted';
    }

    private function resolveTaskGroup(User $user, string $taskGroupId): \Illuminate\Support\Collection
    {
        $query = Task::query()
            ->with(['trainingAssignment.enrollment.user', 'submissions.user'])
            ->where('assigned_by', $user->id);

        if (str_starts_with($taskGroupId, 'task-')) {
            $id = (int) str_replace('task-', '', $taskGroupId);
            return $query->where('id', $id)->get();
        }

        if (is_numeric($taskGroupId)) {
            $task = (clone $query)->where('id', (int) $taskGroupId)->first();
            if ($task && $task->distribution_key) {
                return $query->where('distribution_key', $task->distribution_key)->get();
            }
            return $task ? collect([$task]) : collect();
        }

        return $query->where('distribution_key', $taskGroupId)->get();
    }

    private function attendanceMonthlyAggregation(int $assignmentId): \Illuminate\Support\Collection
    {
        $driver = DB::connection()->getDriverName();
        if ($driver === 'sqlite') {
            return Attendance::where('training_assignment_id', $assignmentId)
                ->selectRaw("strftime('%Y-%m', date) as month, COUNT(*) as total")
                ->groupByRaw("strftime('%Y-%m', date)")
                ->orderByDesc('month')
                ->get();
        }

        return Attendance::where('training_assignment_id', $assignmentId)
            ->selectRaw("DATE_FORMAT(date, '%Y-%m') as month, COUNT(*) as total")
            ->groupByRaw("DATE_FORMAT(date, '%Y-%m')")
            ->orderByDesc('month')
            ->get();
    }

    private function dailyReportDescription(DailyReport $report): string
    {
        $content = collect((array) $report->content)
            ->map(function ($value, $key) {
                if (is_array($value)) {
                    $value = implode('، ', array_filter($value));
                }

                return trim((string) $key) !== ''
                    ? trim((string) $key) . ': ' . trim((string) $value)
                    : trim((string) $value);
            })
            ->filter()
            ->take(4)
            ->implode(' | ');

        return $content !== '' ? $content : 'تقرير يومي ميداني معتمد للمراجعة الأكاديمية.';
    }

    private function resolveVisitLocation($assignment): ?string
    {
        $site = $assignment->trainingSite;

        if (! $site) {
            return null;
        }

        return collect([$site->name, $site->location])
            ->filter()
            ->unique()
            ->implode(' - ') ?: null;
    }

    private function createActivity(int $userId, string $action, string $description): void
    {
        \App\Models\ActivityLog::create([
            'user_id' => $userId,
            'action' => $action,
            'description' => $description,
            'ip_address' => request()->ip(),
            'method' => request()->method(),
            'route' => request()->path(),
            'user_agent' => (string) request()->userAgent(),
        ]);
    }

    private function resolveTargetUserId(string $target, int $studentId): ?int
    {
        if ($target === 'student') {
            return $studentId;
        }

        if ($target === 'field_supervisor') {
            $assignment = $this->studentService->getAssignmentForStudent(request()->user(), $studentId);
            return $assignment?->teacher_id;
        }

        $roleName = match ($target) {
            'coordinator' => 'coordinator',
            'department_head' => 'department_head',
            'admin' => 'admin',
            default => null,
        };

        if (! $roleName) {
            return null;
        }

        $roleId = Role::where('name', $roleName)->value('id');
        if (! $roleId) {
            return null;
        }

        return User::where('role_id', $roleId)->value('id');
    }

    private function resolveDepartmentKeyForAssignment($assignment): ?string
    {
        return data_get($assignment, 'enrollment.user.department.name');
    }

    private function academicStatusLabel(?string $status): string
    {
        return match ($status) {
            'in_training' => 'قيد التدريب',
            'needs_follow_up' => 'يحتاج متابعة',
            'completed' => 'مكتمل',
            'late' => 'متأخر',
            'withdrawn' => 'منسحب',
            default => 'لم يباشر',
        };
    }

    private function resolveAcademicTemplateId(?string $departmentKey): ?int
    {
        $query = EvaluationTemplate::query()
            ->where('target_role', 'academic_supervisor');

        if (Schema::hasColumn('evaluation_templates', 'department_key')) {
            $query->where(function ($q) use ($departmentKey) {
                $q->where('department_key', $departmentKey)->orWhereNull('department_key');
            })->orderByRaw('CASE WHEN department_key IS NULL THEN 1 ELSE 0 END');
        }

        return $query->value('id');
    }

    private function buildSupervisorWorkspaceStudentRow(
        User $student,
        ?Section $section,
        ?TrainingAssignment $assignment,
        $attendanceAggregates,
        $approvedLogsCount,
        $portfolioEntryCount,
        $fieldEvaluationFinalExists,
        $academicEvaluationFinalExists,
        $pendingSubmissionExists,
        $lastActivityByAssignment
    ): array {
        $assignmentId = $assignment?->id;

        $attendanceSummary = $assignmentId ? $attendanceAggregates->get($assignmentId) : null;
        $portfolioCount = $assignmentId ? (int) ($portfolioEntryCount[$assignmentId] ?? 0) : 0;
        $submissionPending = $assignmentId ? (bool) ($pendingSubmissionExists[$assignmentId] ?? false) : false;
        $totalAttendance = (int) ($attendanceSummary?->total ?? 0);
        $presentAttendance = (int) ($attendanceSummary?->present ?? 0);
        $attendanceRate = $totalAttendance > 0 ? round(($presentAttendance / $totalAttendance) * 100) : null;
        $absentCount = (int) ($attendanceSummary?->absent ?? 0);
        $lateCount = (int) ($attendanceSummary?->late_count ?? 0);
        $riskLevel = 'low';
        if (($attendanceRate !== null && $attendanceRate < 60) || $absentCount >= 3) {
            $riskLevel = 'critical';
        } elseif ($submissionPending || ($attendanceRate !== null && $attendanceRate < 80) || $lateCount >= 3) {
            $riskLevel = 'medium';
        }

        $trainingTrack = $assignment
            ? $this->trackResolver->resolveForAssignment($assignment)
            : null;
        if (! $trainingTrack) {
            $deptName = (string) data_get($student, 'department.name', '');
            if ($deptName !== '' && (str_contains(strtolower($deptName), 'psych') || str_contains($deptName, 'علم النفس'))) {
                $trainingTrack = 'psychology';
            } elseif ($deptName !== '') {
                $trainingTrack = 'education';
            }
        }

        return [
            'id' => $student->id,
            'student_id' => $student->id,
            'name' => $student->name,
            'university_id' => $student->university_id,
            'department' => data_get($student, 'department.name'),
            'specialization' => data_get($student, 'department.name'),
            'section_id' => $section?->id,
            'section' => $section?->name,
            'course_id' => data_get($section, 'course.id'),
            'course' => data_get($section, 'course.name'),
            'training_site' => $assignment ? data_get($assignment, 'trainingSite.name') : null,
            'field_supervisor_name' => $assignment ? data_get($assignment, 'teacher.name') : null,
            'attendance_status_summary' => $totalAttendance > 0
                ? $attendanceRate . '%'
                : 'n/a',
            'daily_log_status_summary' => $assignmentId ? (int) ($approvedLogsCount[$assignmentId] ?? 0) : 0,
            'portfolio_completion' => $portfolioCount,
            'field_evaluation_status' => $assignmentId && isset($fieldEvaluationFinalExists[$assignmentId]) ? 'submitted' : 'pending',
            'academic_evaluation_status' => $assignmentId && isset($academicEvaluationFinalExists[$assignmentId]) ? 'final' : 'draft_or_missing',
            'risk_level' => $riskLevel,
            'last_activity_at' => $assignmentId ? ($lastActivityByAssignment[$assignmentId] ?? null) : null,
            'training_track' => $trainingTrack,
            'training_assignment_id' => $assignmentId,
            'academic_status' => $assignment?->academic_status ?? 'not_started',
            'academic_status_label' => $this->academicStatusLabel($assignment?->academic_status ?? 'not_started'),
            'academic_status_note' => $assignment?->academic_status_note,
            'academic_status_updated_at' => $assignment?->academic_status_updated_at,
            'academic_status_updated_by' => $assignment?->academicStatusUpdatedBy?->name,
        ];
    }

    private function supervisorStudentListFiltersRequireAssignment(array $filters): bool
    {
        foreach (['training_track', 'attendance_status', 'daily_log_status', 'portfolio_status', 'evaluation_status'] as $key) {
            if (! empty($filters[$key])) {
                return true;
            }
        }

        return false;
    }

    private function supervisedSectionIdsForPivotStudents(User $supervisor, array $filters): Collection
    {
        $q = Section::query()->withArchived()->where('academic_supervisor_id', $supervisor->id);
        if ($supervisor->department_id) {
            $q->where(function ($sq) use ($supervisor) {
                $sq->whereHas('course', fn ($c) => $c->where('department_id', $supervisor->department_id))
                    ->orWhereHas('enrollments.user', fn ($u) => $u->where('department_id', $supervisor->department_id))
                    ->orWhereHas('students', fn ($u) => $u->where('department_id', $supervisor->department_id));
            });
        }
        if (! empty($filters['section_id'])) {
            $q->where('id', (int) $filters['section_id']);
        }

        return $q->pluck('id');
    }

    /**
     * طلاب مربوطون بالشعبة عبر section_students فقط (بدون صف enrollment لنفس الشعبة) — يطابق عدّ بطاقة الشعبة في الواجهة.
     */
    private function pivotOnlySupervisorStudentUserIds(User $supervisor, array $filters, Collection $enrolledUserIds): ?Collection
    {
        $sectionIds = $this->supervisedSectionIdsForPivotStudents($supervisor, $filters);
        if ($sectionIds->isEmpty()) {
            return null;
        }

        $pivotUserIds = DB::table('section_students')
            ->whereIn('section_id', $sectionIds)
            ->where('status', 'accepted')
            ->whereNotExists(function ($q) {
                $q->selectRaw('1')
                    ->from('enrollments')
                    ->whereColumn('enrollments.user_id', 'section_students.student_id')
                    ->whereColumn('enrollments.section_id', 'section_students.section_id');
            })
            ->pluck('student_id')
            ->unique()
            ->diff($enrolledUserIds);

        if ($pivotUserIds->isEmpty()) {
            return null;
        }

        $q = User::query()->whereIn('id', $pivotUserIds)
            ->whereHas('role', fn ($r) => $r->where('name', 'student'));
        if (! empty($filters['department'])) {
            $q->whereHas('department', fn ($dq) => $dq->where('name', 'like', '%' . $filters['department'] . '%'));
        }
        if (! empty($filters['search'])) {
            $search = (string) $filters['search'];
            $q->where(function ($qq) use ($search) {
                $qq->where('name', 'like', '%' . $search . '%')
                    ->orWhere('university_id', 'like', '%' . $search . '%');
            });
        }

        $ids = $q->pluck('id');

        return $ids->isEmpty() ? null : $ids;
    }

    private function countPivotOnlySupervisorStudents(User $supervisor, array $filters, Collection $enrolledUserIds): int
    {
        if ($this->supervisorStudentListFiltersRequireAssignment($filters)) {
            return 0;
        }
        $ids = $this->pivotOnlySupervisorStudentUserIds($supervisor, $filters, $enrolledUserIds);

        return $ids?->count() ?? 0;
    }

    private function pivotOnlySupervisorStudentAssignmentIds(User $supervisor, array $filters, Collection $enrolledUserIds): Collection
    {
        $ids = $this->pivotOnlySupervisorStudentUserIds($supervisor, $filters, $enrolledUserIds);
        if ($ids === null || $ids->isEmpty()) {
            return collect();
        }

        $assignmentIds = collect();
        foreach ($ids as $userId) {
            $aid = TrainingAssignment::query()->withArchived()
                ->whereHas('enrollment', fn ($e) => $e->withArchived()->where('user_id', $userId))
                ->latest('id')
                ->value('id');
            if ($aid) {
                $assignmentIds->push($aid);
            }
        }

        return $assignmentIds->unique()->values();
    }

    private function pivotOnlySupervisorStudentRows(
        User $supervisor,
        array $filters,
        Collection $enrolledUserIds,
        $attendanceAggregates,
        $approvedLogsCount,
        $portfolioEntryCount,
        $fieldEvaluationFinalExists,
        $academicEvaluationFinalExists,
        $pendingSubmissionExists,
        $lastActivityByAssignment
    ): Collection {
        $ids = $this->pivotOnlySupervisorStudentUserIds($supervisor, $filters, $enrolledUserIds);
        if ($ids === null || $ids->isEmpty()) {
            return collect();
        }

        $sectionIds = $this->supervisedSectionIdsForPivotStudents($supervisor, $filters);
        $rows = collect();

        foreach ($ids as $userId) {
            $student = User::with('department')->find($userId);
            if (! $student) {
                continue;
            }
            $sectionId = (int) DB::table('section_students')
                ->where('student_id', $userId)
                ->whereIn('section_id', $sectionIds)
                ->where('status', 'accepted')
                ->value('section_id');
            $section = $sectionId ? Section::withArchived()->with('course')->find($sectionId) : null;
            $assignment = TrainingAssignment::query()->withArchived()
                ->with(['trainingSite', 'teacher', 'academicStatusUpdatedBy:id,name'])
                ->whereHas('enrollment', fn ($e) => $e->withArchived()->where('user_id', $userId))
                ->latest('id')
                ->first();

            $rows->push($this->buildSupervisorWorkspaceStudentRow(
                $student,
                $section,
                $assignment,
                $attendanceAggregates,
                $approvedLogsCount,
                $portfolioEntryCount,
                $fieldEvaluationFinalExists,
                $academicEvaluationFinalExists,
                $pendingSubmissionExists,
                $lastActivityByAssignment
            ));
        }

        return $rows;
    }

    private function normalizeCriteriaScores(array $criteriaScores): array
    {
        return collect($criteriaScores)->map(function ($row) {
            return [
                'criterion' => (string) data_get($row, 'criterion', data_get($row, 'title', '')),
                'score' => is_numeric(data_get($row, 'score')) ? (float) data_get($row, 'score') : 0,
                'max_score' => is_numeric(data_get($row, 'max_score')) ? (float) data_get($row, 'max_score') : null,
                'weight' => is_numeric(data_get($row, 'weight')) ? (float) data_get($row, 'weight') : null,
                'is_required' => (bool) data_get($row, 'is_required', false),
            ];
        })->filter(fn ($row) => $row['criterion'] !== '')->values()->all();
    }
}
