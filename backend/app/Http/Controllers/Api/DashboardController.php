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
            'total_users' => User::count(),
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
        $year = $request->year;

        // Base query builder with filters
        $trainingRequestsQuery = TrainingRequest::query();
        if ($dateFrom) {
            $trainingRequestsQuery->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo) {
            $trainingRequestsQuery->whereDate('created_at', '<=', $dateTo);
        }
        if ($year) {
            $trainingRequestsQuery->whereYear('created_at', $year);
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

        // Get total users for percentage calculations
        // total_users is always the absolute count of ALL users (no department filter)
        // $userQuery (department-filtered) is used only for role-breakdown sub-counts
        $totalUsers = User::count();
        $totalStudents = (clone $studentQuery)->count();
        $totalTrainingRequests = $trainingRequestsQuery->count();

        // Enhanced summary statistics
        $summary = [
            'total_users' => $totalUsers,
            'active_users' => (clone $userQuery)->where('status', 'active')->count(),
            'inactive_users' => (clone $userQuery)->where('status', 'inactive')->count(),
            'total_students' => $totalStudents,
            'total_academic_supervisors' => (clone $userQuery)->whereHas('role', fn($q) => $q->where('name', 'academic_supervisor'))->count(),
            'total_teachers' => (clone $userQuery)->whereHas('role', fn($q) => $q->where('name', 'teacher'))->count(),
            'total_school_managers' => (clone $userQuery)->whereHas('role', fn($q) => $q->whereIn('name', ['school_manager', 'principal']))->count(),
            'total_admins' => (clone $userQuery)->whereHas('role', fn($q) => $q->where('name', 'admin'))->count(),
            'total_coordinators' => (clone $userQuery)->whereHas('role', fn($q) => $q->whereIn('name', ['training_coordinator', 'coordinator']))->count(),
            'total_departments' => Department::count(),
            'total_sections' => $departmentId
                ? Section::whereHas('course', fn($q) => $q->where('department_id', $departmentId))->count()
                : Section::count(),
            'total_training_requests' => $totalTrainingRequests,
            'pending_training_requests' => (clone $trainingRequestsQuery)->where('book_status', 'draft')->count(),
            'approved_training_requests' => (clone $trainingRequestsQuery)->where('status', 'approved')->count(),
            'rejected_training_requests' => (clone $trainingRequestsQuery)->where('status', 'rejected')->count(),
            'completed_training_requests' => (clone $trainingRequestsQuery)->where('status', 'completed')->count(),
            'total_training_sites' => TrainingSite::count(),
            'active_training_sites' => TrainingSite::where('is_active', true)->count(),
            'schools_with_manager' => TrainingSite::whereNotNull('manager_id')->where('manager_id', '!=', '')->count(),
            'schools_without_manager' => TrainingSite::whereNull('manager_id')->orWhere('manager_id', '')->count(),
            'total_evaluation_templates' => \App\Models\EvaluationTemplate::count(),
            'total_evaluations_submitted' => Evaluation::whereNotNull('total_score')->count(),
            'total_portfolio_entries' => PortfolioEntry::count(),
            'pending_review_entries' => PortfolioEntry::where('review_status', 'pending')->count(),
            'total_announcements' => Announcement::count(),
        ];

        // Calculate percentages (avoid division by zero)
        $percentages = [
            'students_percentage' => $totalUsers > 0 ? round(($summary['total_students'] / $totalUsers) * 100, 2) : 0,
            'academic_supervisors_percentage' => $totalUsers > 0 ? round(($summary['total_academic_supervisors'] / $totalUsers) * 100, 2) : 0,
            'teachers_percentage' => $totalUsers > 0 ? round(($summary['total_teachers'] / $totalUsers) * 100, 2) : 0,
            'school_managers_percentage' => $totalUsers > 0 ? round(($summary['total_school_managers'] / $totalUsers) * 100, 2) : 0,
            'approved_requests_percentage' => $totalTrainingRequests > 0 ? round(($summary['approved_training_requests'] / $totalTrainingRequests) * 100, 2) : 0,
            'pending_requests_percentage' => $totalTrainingRequests > 0 ? round(($summary['pending_training_requests'] / $totalTrainingRequests) * 100, 2) : 0,
            'rejected_requests_percentage' => $totalTrainingRequests > 0 ? round(($summary['rejected_training_requests'] / $totalTrainingRequests) * 100, 2) : 0,
            'completed_requests_percentage' => $totalTrainingRequests > 0 ? round(($summary['completed_training_requests'] / $totalTrainingRequests) * 100, 2) : 0,
            'schools_with_manager_percentage' => $summary['total_training_sites'] > 0 ? round(($summary['schools_with_manager'] / $summary['total_training_sites']) * 100, 2) : 0,
            'schools_without_manager_percentage' => $summary['total_training_sites'] > 0 ? round(($summary['schools_without_manager'] / $summary['total_training_sites']) * 100, 2) : 0,
        ];

        // Students section assignment statistics
        $studentsWithSections = (clone $studentQuery)->whereHas('sections')->count();
        $studentsWithoutSections = $totalStudents - $studentsWithSections;
        $percentages['students_with_sections_percentage'] = $totalStudents > 0 ? round(($studentsWithSections / $totalStudents) * 100, 2) : 0;
        $percentages['students_without_sections_percentage'] = $totalStudents > 0 ? round(($studentsWithoutSections / $totalStudents) * 100, 2) : 0;

        // Students training request statistics
        $studentsWithRequests = (clone $studentQuery)->whereHas('trainingRequests')->count();
        $studentsWithoutRequests = $totalStudents - $studentsWithRequests;
        $percentages['students_with_requests_percentage'] = $totalStudents > 0 ? round(($studentsWithRequests / $totalStudents) * 100, 2) : 0;
        $percentages['students_without_requests_percentage'] = $totalStudents > 0 ? round(($studentsWithoutRequests / $totalStudents) * 100, 2) : 0;

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

        // Schools by classification
        $schoolsByClassification = TrainingSite::select('school_type', DB::raw('count(*) as count'))
            ->groupBy('school_type')
            ->orderByDesc('count')
            ->get()
            ->map(fn($item) => [
                'classification' => $item->school_type,
                'count' => $item->count,
            ]);

        // Schools by level
        $schoolsByLevel = TrainingSite::select('school_level', DB::raw('count(*) as count'))
            ->groupBy('school_level')
            ->orderByDesc('count')
            ->get()
            ->map(fn($item) => [
                'level' => $item->school_level,
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
            ->with('manager')
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
                'school_type' => $site->school_type,
                'school_level' => $site->school_level,
                'manager' => $site->manager ? $site->manager->name : 'غير مرتبط بمدير',
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

        // Enhanced charts data
        $charts = [
            'users_by_role' => $usersByRole,
            'students_by_department' => $studentsByDepartment,
            'requests_by_status' => $requestsByStatus,
            'requests_by_department' => $requestsByDepartment,
            'monthly_training_requests' => $this->getMonthlyTrainingRequests($trainingRequestsQuery),
            'sites_by_directorate' => $sitesByDirectorate,
            'sites_by_type' => $sitesByType,
            'schools_by_classification' => $schoolsByClassification,
            'schools_by_level' => $schoolsByLevel,
            'assignments_by_status' => $assignmentsByStatus,
            'portfolio_by_status' => $portfolioByStatus,
            'students_by_section' => $this->getStudentsBySection($departmentId),
            'evaluation_completion' => $this->getEvaluationCompletionStats(),
            'portfolio_activity' => $this->getPortfolioActivity(),
        ];

        // Enhanced tables data
        $tables = [
            'users_by_role' => $this->getUsersByRoleTable($totalUsers),
            'students_by_department' => $this->getStudentsByDepartmentTable($totalStudents),
            'requests_by_status' => $this->getRequestsByStatusTable($totalTrainingRequests),
            'sections_capacity' => $this->getSectionsCapacityTable(),
            'students_without_section' => $this->getStudentsWithoutSectionTable(),
            'students_without_training_request' => $this->getStudentsWithoutTrainingRequestTable(),
            'recent_training_requests' => $this->getRecentTrainingRequestsTable(),
            'recent_evaluations' => $this->getRecentEvaluationsTable(),
            'recent_portfolio_entries' => $this->getRecentPortfolioEntriesTable(),
            'department_summary' => $departmentSummary,
            'training_site_summary' => $trainingSiteSummary,
            'teacher_assignment_stats' => $this->getTeacherAssignmentStats(),
        ];

        // Filters data
        $filters = [
            'departments' => Department::select('id', 'name')->get(),
            'sections' => Section::with('course.department')->select('id', 'name', 'course_id')->get(),
            'roles' => \App\Models\Role::select('id', 'name')->get(),
            'statuses' => [
                ['value' => 'draft', 'label' => 'مسودة'],
                ['value' => 'pending', 'label' => 'قيد الانتظار'],
                ['value' => 'approved', 'label' => 'موافق عليه'],
                ['value' => 'rejected', 'label' => 'مرفوض'],
                ['value' => 'completed', 'label' => 'مكتمل'],
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'summary' => $summary,
                'percentages' => $percentages,
                'charts' => $charts,
                'tables' => $tables,
                'filters' => $filters,
            ],
        ]);
    }

    // Helper methods for enhanced statistics
    private function getMonthlyTrainingRequests($query)
    {
        return $query->select(
                DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
                DB::raw('count(*) as count')
            )
            ->where('created_at', '>=', now()->subMonths(12))
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(fn($item) => [
                'month' => $item->month,
                'count' => $item->count,
            ]);
    }

    private function getStudentsBySection($departmentId = null)
    {
        $query = Section::withCount('sectionStudents');
        if ($departmentId) {
            $query->whereHas('course', fn($q) => $q->where('department_id', $departmentId));
        }
        
        return $query->orderByDesc('section_students_count')
            ->limit(10)
            ->get()
            ->map(fn($section) => [
                'section' => $section->name,
                'count' => $section->section_students_count,
            ]);
    }

    private function getEvaluationCompletionStats()
    {
        $totalStudents = User::whereHas('role', fn($q) => $q->where('name', 'student'))->count();
        $submittedEvaluations = Evaluation::whereNotNull('total_score')->count();
        
        return [
            'submitted' => $submittedEvaluations,
            'pending' => max(0, $totalStudents - $submittedEvaluations),
        ];
    }

    private function getPortfolioActivity()
    {
        return PortfolioEntry::select(
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
    }

    private function getUsersByRoleTable($totalUsers)
    {
        return User::join('roles', 'users.role_id', '=', 'roles.id')
            ->select('roles.name as role', DB::raw('count(*) as count'))
            ->groupBy('roles.id', 'roles.name')
            ->orderByDesc('count')
            ->get()
            ->map(fn($item) => [
                'role' => $item->role,
                'count' => $item->count,
                'percentage' => $totalUsers > 0 ? round(($item->count / $totalUsers) * 100, 2) : 0,
            ]);
    }

    private function getStudentsByDepartmentTable($totalStudents)
    {
        return User::whereHas('role', fn($q) => $q->where('name', 'student'))
            ->join('departments', 'users.department_id', '=', 'departments.id')
            ->select('departments.name as department', DB::raw('count(*) as count'))
            ->groupBy('departments.id', 'departments.name')
            ->orderByDesc('count')
            ->get()
            ->map(fn($item) => [
                'department' => $item->department,
                'count' => $item->count,
                'percentage' => $totalStudents > 0 ? round(($item->count / $totalStudents) * 100, 2) : 0,
            ]);
    }

    private function getRequestsByStatusTable($totalRequests)
    {
        return TrainingRequest::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(fn($item) => [
                'status' => $item->status,
                'count' => $item->count,
                'percentage' => $totalRequests > 0 ? round(($item->count / $totalRequests) * 100, 2) : 0,
            ]);
    }

    private function getSectionsCapacityTable()
    {
        return Section::with(['course.department', 'academicSupervisor'])
            ->withCount('sectionStudents')
            ->get()
            ->map(fn($section) => [
                'section_name' => $section->name,
                'department' => $section->course?->department?->name,
                'academic_supervisor' => $section->academicSupervisor?->name,
                'students_count' => $section->section_students_count,
                'capacity' => $section->capacity ?? 30, // Default capacity if not set
                'fill_percentage' => $section->capacity > 0 ? round(($section->section_students_count / $section->capacity) * 100, 2) : 0,
            ]);
    }

    private function getStudentsWithoutSectionTable()
    {
        return User::whereHas('role', fn($q) => $q->where('name', 'student'))
            ->whereDoesntHave('sections')
            ->with('department')
            ->select('id', 'name', 'university_id', 'email', 'department_id')
            ->limit(20)
            ->get()
            ->map(fn($student) => [
                'name' => $student->name,
                'university_id' => $student->university_id,
                'department' => $student->department?->name,
                'email' => $student->email,
            ]);
    }

    private function getStudentsWithoutTrainingRequestTable()
    {
        return User::whereHas('role', fn($q) => $q->where('name', 'student'))
            ->whereDoesntHave('trainingRequests')
            ->with('department')
            ->select('id', 'name', 'university_id', 'email', 'department_id')
            ->limit(20)
            ->get()
            ->map(fn($student) => [
                'name' => $student->name,
                'university_id' => $student->university_id,
                'department' => $student->department?->name,
                'email' => $student->email,
            ]);
    }

    private function getRecentTrainingRequestsTable()
    {
        return TrainingRequest::with(['trainingSite', 'requestedBy.department'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn($req) => [
                'student' => $req->requestedBy?->name,
                'department' => $req->requestedBy?->department?->name,
                'training_site' => $req->trainingSite?->name,
                'status' => $req->status,
                'created_date' => $req->created_at?->format('Y-m-d'),
            ]);
    }

    private function getRecentEvaluationsTable()
    {
        return Evaluation::with(['student', 'evaluator', 'template'])
            ->whereNotNull('total_score')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn($eval) => [
                'student' => $eval->student?->name,
                'evaluator' => $eval->evaluator?->name,
                'template' => $eval->template?->name,
                'score' => $eval->total_score,
                'date' => $eval->created_at?->format('Y-m-d'),
            ]);
    }

    private function getRecentPortfolioEntriesTable()
    {
        return PortfolioEntry::with('student')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn($entry) => [
                'student' => $entry->student?->name,
                'title' => $entry->title,
                'category' => $entry->category ?? '—',
                'review_status' => $entry->review_status ?? 'pending',
                'created_date' => $entry->created_at?->format('Y-m-d'),
            ]);
    }

    private function getTeacherAssignmentStats()
    {
        // Teachers by school
        $teachersBySchool = TeacherSchoolAssignment::active()
            ->with(['school', 'teacher'])
            ->get()
            ->groupBy('school_id')
            ->map(function ($assignments) {
                $school = $assignments->first()->school;
                return [
                    'school' => $school?->name ?? 'غير محدد',
                    'count' => $assignments->count(),
                ];
            })
            ->values();

        // Teachers without active school assignment
        $teachersWithoutAssignment = TeacherSchoolAssignment::getTeachersWithoutActiveAssignment()->count();

        // Teacher assignments ended this academic year
        $currentYear = date('Y');
        $endedAssignmentsThisYear = TeacherSchoolAssignment::where('status', 'ended')
            ->whereYear('end_date', $currentYear)
            ->count();

        // Total teacher assignment history count
        $totalAssignmentHistory = TeacherSchoolAssignment::count();

        // Schools with no active teachers
        $schoolsWithNoTeachers = TrainingSite::where('is_active', true)
            ->whereDoesntHave('teacherSchoolAssignments', function ($query) {
                $query->active();
            })
            ->count();

        return [
            'teachers_by_school' => $teachersBySchool,
            'teachers_without_assignment' => $teachersWithoutAssignment,
            'ended_assignments_this_year' => $endedAssignmentsThisYear,
            'total_assignment_history' => $totalAssignmentHistory,
            'schools_with_no_teachers' => $schoolsWithNoTeachers,
        ];
    }
}