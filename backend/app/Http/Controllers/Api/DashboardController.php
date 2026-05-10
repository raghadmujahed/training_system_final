<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TrainingAssignment;
use App\Models\User;
use App\Models\TrainingSite;
use App\Models\Evaluation;
use App\Models\TrainingRequest;
use App\Models\TrainingRequestBatch;
use App\Models\FeatureFlag;
use App\Models\Notification;
use App\Models\StudentPortfolio;
use App\Models\PortfolioEntry;
use App\Models\Task;
use App\Models\TrainingProgram;
use App\Models\Department;
use App\Models\Section;
use App\Models\Enrollment;
use App\Models\Attendance;
use App\Models\Backup;
use App\Models\Announcement;
use App\Http\Resources\NotificationResource;
use App\Http\Resources\TaskResource;
use App\Http\Resources\TrainingRequestResource;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        $stats = [
            'total_students' => User::whereHas('role', fn($q) => $q->where('name', 'student'))->count(),
            'active_trainings' => TrainingAssignment::where('status', 'ongoing')->count(),
            'completed_trainings' => TrainingAssignment::where('status', 'completed')->count(),
            'total_sites' => TrainingSite::count(),
            // Exclude archived evaluations from pending count
            'pending_evaluations' => Evaluation::whereNull('total_score')->whereNull('archived_at')->count(),
        ];
        
        // إحصائيات حسب المستخدم
        if ($request->user()->role?->name === 'teacher') {
            $stats['my_students'] = TrainingAssignment::where('teacher_id', $request->user()->id)
                ->with('enrollment.user')->get()->pluck('enrollment.user')->unique()->count();
        } elseif ($request->user()->role?->name === 'academic_supervisor') {
            $stats['my_students'] = TrainingAssignment::where('academic_supervisor_id', $request->user()->id)->count();
        } elseif ($request->user()->role?->name === 'student') {
            $stats['my_training'] = TrainingAssignment::whereHas('enrollment', fn($q) => $q->where('user_id', $request->user()->id))
                ->first();
        } elseif (in_array($request->user()->role?->name, ['training_coordinator', 'coordinator'], true)) {
            $stats['coordinator_pending_review'] = TrainingRequest::whereIn('book_status', [
                'sent_to_coordinator',
                'coordinator_under_review',
                'needs_edit',
            ])->count();
            $stats['coordinator_prelim_approved'] = TrainingRequest::where('book_status', 'prelim_approved')->count();
            $stats['coordinator_open_batches'] = TrainingRequestBatch::where('status', 'draft')->count();
        }

        return response()->json($stats);
    }

    public function studentSummary(Request $request)
    {
        $user = $request->user()->loadMissing(['role', 'department', 'trainingSite', 'enrollments.section.course']);

        if ($user->role?->name !== 'student') {
            abort(403);
        }

        $latestRequest = TrainingRequest::with([
            'trainingSite',
            'trainingPeriod',
            'trainingRequestStudents' => function ($query) use ($user) {
                $query->where('user_id', $user->id)
                    ->with(['user', 'course', 'assignedTeacher']);
            },
        ])
            ->where(function ($query) use ($user) {
                $query->where('requested_by', $user->id)
                    ->orWhereHas('trainingRequestStudents', fn ($studentQuery) => $studentQuery->where('user_id', $user->id));
            })
            ->latest()
            ->first();

        $studentTasksQuery = Task::whereHas('trainingAssignment.enrollment', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        });

        $pendingTasksCount = (clone $studentTasksQuery)
            ->whereNotIn('status', ['submitted', 'graded'])
            ->count();

        $latestTasks = (clone $studentTasksQuery)
            ->with(['assignedBy', 'submissions' => function ($query) use ($user) {
                $query->where('user_id', $user->id)->latest();
            }])
            ->latest()
            ->limit(4)
            ->get();

        $portfolio = StudentPortfolio::withCount('entries')
            ->where('user_id', $user->id)
            ->first();

        $program = TrainingProgram::where('user_id', $user->id)->first();
        $assignment = $user->currentTrainingAssignment();
        $notifications = Notification::query()
            ->forRecipient($user)
            ->latest()
            ->limit(3)
            ->get();

        return response()->json([
            'user' => UserResource::make($user)->resolve($request),
            'training_request' => $latestRequest
                ? TrainingRequestResource::make($latestRequest)->resolve($request)
                : null,
            'tasks' => [
                'pending_count' => $pendingTasksCount,
                'latest' => TaskResource::collection($latestTasks)->resolve($request),
            ],
            'portfolio' => [
                'entries_count' => (int) ($portfolio?->entries_count ?? 0),
            ],
            'training_program' => [
                'data' => $program ? [
                    'id' => $program->id,
                    'schedule' => $program->schedule,
                    'status' => $program->status,
                    'coordinator_note' => $program->coordinator_note,
                    'created_at' => $program->created_at,
                    'updated_at' => $program->updated_at,
                ] : null,
                'is_editable' => FeatureFlag::where('name', 'training_program.edit')->value('is_open') ?? false,
                'student_info' => [
                    'name' => $user->name,
                    'university_id' => $user->university_id,
                    'school' => $assignment?->trainingSite?->name ?? '—',
                    'semester' => $assignment?->trainingPeriod?->name ?? '—',
                ],
            ],
            'notifications' => NotificationResource::collection($notifications)->resolve($request),
        ]);
    }

    public function adminReports(Request $request)
    {
        // Apply filters
        $dateFrom = $request->date_from;
        $dateTo = $request->date_to;
        $departmentId = $request->department_id;

        // Base query builder with filters
        $trainingRequestsQuery = TrainingRequest::query();
        if ($dateFrom) {
            $trainingRequestsQuery->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo) {
            $trainingRequestsQuery->whereDate('created_at', '<=', $dateTo);
        }

        // Base user query with department filter
        $userQuery = User::query();
        if ($departmentId) {
            $userQuery->where('department_id', $departmentId);
        }

        // Base student query with department filter
        $studentQuery = User::whereHas('role', fn($q) => $q->where('name', 'student'));
        if ($departmentId) {
            $studentQuery->where('department_id', $departmentId);
        }

        // Summary statistics with department filtering
        $summary = [
            'total_users' => (clone $userQuery)->count(),
            'active_users' => (clone $userQuery)->where('status', 'active')->count(),
            'inactive_users' => (clone $userQuery)->where('status', 'inactive')->count(),
            'total_students' => (clone $studentQuery)->count(),
            'total_departments' => Department::count(),
            'total_sections' => $departmentId
                ? Section::whereHas('course', fn($q) => $q->where('department_id', $departmentId))->count()
                : Section::count(),
            'total_training_requests' => $trainingRequestsQuery->count(),
            'pending_requests' => (clone $trainingRequestsQuery)->where('book_status', 'draft')->count(),
            'approved_requests' => (clone $trainingRequestsQuery)->where('status', 'approved')->count(),
            'rejected_requests' => (clone $trainingRequestsQuery)->where('status', 'rejected')->count(),
            'total_training_sites' => TrainingSite::count(),
            'active_training_sites' => TrainingSite::where('is_active', true)->count(),
            'total_portfolio_entries' => PortfolioEntry::count(),
            'pending_review_entries' => PortfolioEntry::where('review_status', 'pending')->count(),
            'total_backups' => Backup::count(),
            'total_announcements' => Announcement::count(),
        ];

        // Students by department
        $studentsByDepartment = User::whereHas('role', fn($q) => $q->where('name', 'student'))
            ->join('departments', 'users.department_id', '=', 'departments.id')
            ->select('departments.name as department', DB::raw('count(*) as count'))
            ->groupBy('departments.id', 'departments.name')
            ->orderByDesc('count')
            ->get()
            ->map(fn($item) => [
                'department' => $item->department,
                'count' => $item->count,
            ]);

        // Users by role
        $usersByRole = User::join('roles', 'users.role_id', '=', 'roles.id')
            ->select('roles.name as role', DB::raw('count(*) as count'))
            ->groupBy('roles.id', 'roles.name')
            ->orderByDesc('count')
            ->get()
            ->map(fn($item) => [
                'role' => $item->role,
                'count' => $item->count,
            ]);

        // Training requests by status
        $requestsByStatus = TrainingRequest::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(fn($item) => [
                'status' => $item->status,
                'count' => $item->count,
            ]);

        // Training requests by department (through users)
        $requestsByDepartment = TrainingRequest::join('users', 'training_requests.requested_by', '=', 'users.id')
            ->join('departments', 'users.department_id', '=', 'departments.id')
            ->select('departments.name as department', DB::raw('count(*) as count'))
            ->groupBy('departments.id', 'departments.name')
            ->orderByDesc('count')
            ->get()
            ->map(fn($item) => [
                'department' => $item->department,
                'count' => $item->count,
            ]);

        // Training requests over time (last 6 months)
        $requestsOverTime = TrainingRequest::select(
            DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
            DB::raw('count(*) as count')
        )
            ->where('created_at', '>=', now()->subMonths(6))
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(fn($item) => [
                'month' => $item->month,
                'count' => $item->count,
            ]);

        // Training sites by directorate
        $sitesByDirectorate = TrainingSite::select('directorate', DB::raw('count(*) as count'))
            ->groupBy('directorate')
            ->orderByDesc('count')
            ->get()
            ->map(fn($item) => [
                'directorate' => $item->directorate,
                'count' => $item->count,
            ]);

        // Training sites by type
        $sitesByType = TrainingSite::select('site_type', DB::raw('count(*) as count'))
            ->groupBy('site_type')
            ->get()
            ->map(fn($item) => [
                'type' => $item->site_type,
                'count' => $item->count,
            ]);

        // Students with/without active training assignments
        $studentsWithAssignments = User::whereHas('role', fn($q) => $q->where('name', 'student'))
            ->whereHas('enrollment.trainingAssignments', fn($q) => $q->where('status', 'ongoing'))
            ->count();
        $studentsWithoutAssignments = $summary['total_students'] - $studentsWithAssignments;

        // Training assignments by status
        $assignmentsByStatus = TrainingAssignment::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(fn($item) => [
                'status' => $item->status,
                'count' => $item->count,
            ]);

        // Portfolio entries by review status
        $portfolioByStatus = PortfolioEntry::select('review_status', DB::raw('count(*) as count'))
            ->groupBy('review_status')
            ->get()
            ->map(fn($item) => [
                'status' => $item->review_status,
                'count' => $item->count,
            ]);

        // Tables data
        $departmentSummary = Department::withCount('users')
            ->withCount('sections')
            ->get()
            ->map(fn($dept) => [
                'id' => $dept->id,
                'name' => $dept->name,
                'users_count' => $dept->users_count,
                'sections_count' => $dept->sections_count,
            ]);

        $trainingSiteSummary = TrainingSite::withCount('trainingAssignments')
            ->get()
            ->map(fn($site) => [
                'id' => $site->id,
                'name' => $site->name,
                'location' => $site->location,
                'is_active' => $site->is_active,
                'capacity' => $site->capacity,
                'assignments_count' => $site->training_assignments_count,
                'directorate' => $site->directorate,
                'site_type' => $site->site_type,
            ]);

        $recentRequests = TrainingRequest::with(['trainingSite', 'requestedBy'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn($req) => [
                'id' => $req->id,
                'letter_number' => $req->letter_number,
                'letter_date' => $req->letter_date,
                'book_status' => $req->book_status,
                'status' => $req->status,
                'training_site' => $req->trainingSite?->name,
                'requested_by' => $req->requestedBy?->name,
                'created_at' => $req->created_at,
            ]);

        return response()->json([
            'summary' => $summary,
            'charts' => [
                'users_by_role' => $usersByRole,
                'students_by_department' => $studentsByDepartment,
                'requests_by_status' => $requestsByStatus,
                'requests_by_department' => $requestsByDepartment,
                'requests_over_time' => $requestsOverTime,
                'sites_by_directorate' => $sitesByDirectorate,
                'sites_by_type' => $sitesByType,
                'assignments_by_status' => $assignmentsByStatus,
                'portfolio_by_status' => $portfolioByStatus,
                'students_with_assignments' => $studentsWithAssignments,
                'students_without_assignments' => $studentsWithoutAssignments,
            ],
            'tables' => [
                'department_summary' => $departmentSummary,
                'training_site_summary' => $trainingSiteSummary,
                'recent_requests' => $recentRequests,
            ],
        ]);
    }
}