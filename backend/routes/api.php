<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\{
    TrainingRequestController,
    TrainingRequestBatchController,
    TrainingAssignmentController,
    TrainingProgramController,
    EvaluationController,
    UserController,
    AttendanceController,
    TaskController,
    TrainingLogController,
    OfficialLetterController,
    ConversationController,
    AnnouncementController,
    DashboardController,
    TrainingSiteController,
    CourseController,
    SectionController,
    EnrollmentController,
    ArchiveController,
    DepartmentController,
    RoleController,
    PermissionController,
    StudentPortfolioController,
    SupervisorVisitController,
    SupervisorWorkspaceController,
    FieldSupervisorController,
    FormInstanceController,
    FormTemplateController,
    BackupController,
    ActivityLogController,
    TrainingPeriodController,
    EvaluationTemplateController,
    NotificationController,
    NoteController,
    WeeklyScheduleController,
    FeatureFlagController,
    PortfolioEntryController,
    TaskSubmissionController,
    StudentAttendanceController,
    StudentEFormController,
    StudentEvaluationController,
    HeadOfDepartmentController
};

// Routes publiques
Route::post('/login', [UserController::class, 'login'])->name('login');

// Routes protégées
Route::middleware(['auth:sanctum'])->group(function () {

    Route::post('/logout', [UserController::class, 'logout']);
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/user', [UserController::class, 'currentUser']);

    // Utilisateurs, rôles, départements
    Route::get('users/search', [UserController::class, 'search']);
    Route::apiResource('users', UserController::class);
    Route::put('profile', [UserController::class, 'updateProfile']);
    Route::post('change-password', [UserController::class, 'changePassword']);
    Route::get('staff-directory', [UserController::class, 'getStaffDirectory']);
    Route::patch('users/{user}/status', [UserController::class, 'changeStatus']);
    Route::post('users/bulk-add', [UserController::class, 'bulkAdd']);
    Route::apiResource('roles', RoleController::class);
    Route::apiResource('permissions', PermissionController::class);
    Route::apiResource('departments', DepartmentController::class);

    // Cours, sections, inscriptions
    Route::apiResource('courses', CourseController::class);
    Route::post('courses/{course}/archive', [CourseController::class, 'archive']);
    Route::apiResource('sections', SectionController::class);
    Route::get('sections/{section}/enrollments', [SectionController::class, 'getEnrollments']);
    Route::post('sections/{section}/add-student', [SectionController::class, 'addStudent']);
    Route::post('sections/{section}/remove-student', [SectionController::class, 'removeStudent']);
    Route::post('sections/{section}/move-student', [SectionController::class, 'moveStudent']);
    Route::post('sections/{section}/assign-supervisor', [SectionController::class, 'assignSupervisor']);
    Route::apiResource('enrollments', EnrollmentController::class);

    // Archive current training period
    Route::get('archive/preview', [ArchiveController::class, 'preview']);
    Route::post('archive/current-period', [ArchiveController::class, 'archiveCurrentPeriod']);
    Route::get('archive/periods', [ArchiveController::class, 'listArchivedPeriods']);
    Route::get('archive/period-details', [ArchiveController::class, 'periodDetails']);

    // Sites et périodes de stage
    Route::apiResource('training-sites', TrainingSiteController::class);
    Route::apiResource('training-periods', TrainingPeriodController::class);
    Route::patch('training-periods/{training_period}/set-active', [TrainingPeriodController::class, 'setActive']);

    // Demandes de stage
    Route::get('training-requests', [TrainingRequestController::class, 'index']);
    Route::get('training-requests/{training_request}', [TrainingRequestController::class, 'show']);
    Route::post('training-requests', [TrainingRequestController::class, 'store'])
        ->middleware('feature:training_requests.create');
    Route::post('training-requests/{training_request}/send-to-directorate', [TrainingRequestController::class, 'sendToDirectorate']);
    Route::post('training-requests/{training_request}/directorate-approve', [TrainingRequestController::class, 'directorateApprove']);
    Route::post('training-requests/{training_request}/send-to-school', [TrainingRequestController::class, 'sendToSchool']);
    Route::post('training-requests/{training_request}/school-approve', [TrainingRequestController::class, 'schoolApprove']);
    Route::post('training-requests/{training_request}/reject', [TrainingRequestController::class, 'reject']);
    Route::post('training-requests/{training_request}/coordinator-review', [TrainingRequestController::class, 'coordinatorReview']);

    // Coordinator batching
    Route::get('training-request-batches', [TrainingRequestBatchController::class, 'index']);
    Route::get('training-request-batches/{training_request_batch}', [TrainingRequestBatchController::class, 'show']);
    Route::post('training-request-batches', [TrainingRequestBatchController::class, 'store']);
    Route::post('training-request-batches/{training_request_batch}/send', [TrainingRequestBatchController::class, 'send']);

    // Affectations
    Route::apiResource('training-assignments', TrainingAssignmentController::class);

    // Présences
    Route::apiResource('attendances', AttendanceController::class);
    Route::patch('attendances/{attendance}/approve', [AttendanceController::class, 'approve']);
    Route::patch('attendances/{attendance}/reject', [AttendanceController::class, 'reject']);
    Route::post('attendances/submit-to-manager', [AttendanceController::class, 'submitToManager']);
    Route::get('attendance-summary', [AttendanceController::class, 'summary']);

    // Journal de stage
    Route::apiResource('training-logs', TrainingLogController::class);
    Route::post('training-logs/{training_log}/submit', [TrainingLogController::class, 'submit']);
    Route::post('training-logs/{training_log}/review', [TrainingLogController::class, 'review']);

    // Tâches
    Route::apiResource('tasks', TaskController::class)
        ->middleware('feature:tasks.create')
        ->only(['store']);
    Route::apiResource('tasks', TaskController::class)
        ->only(['index', 'show', 'update', 'destroy']);
    Route::post('tasks/{task}/submit', [TaskController::class, 'submit']);
    Route::apiResource('task-submissions', TaskSubmissionController::class);
    Route::post('task-submissions/{task_submission}/grade', [TaskSubmissionController::class, 'grade']);

    // Évaluations
    Route::apiResource('evaluations', EvaluationController::class)
        ->middleware('feature:evaluations.create')
        ->only(['store']);
    Route::apiResource('evaluations', EvaluationController::class)
        ->only(['index', 'show', 'update', 'destroy']);
    Route::get('student-evaluations/my-site-students', [StudentEvaluationController::class, 'getMySiteStudents']);
    Route::get('student-evaluations/student/{studentId}', [StudentEvaluationController::class, 'byStudent']);
    Route::get('student-evaluations/statistics/summary', [StudentEvaluationController::class, 'statistics']);
    Route::apiResource('student-evaluations', StudentEvaluationController::class);
    Route::apiResource('evaluation-templates', EvaluationTemplateController::class);
    Route::post('evaluation-templates/{evaluation_template}/items', [EvaluationTemplateController::class, 'addItem']);
    Route::put('evaluation-items/{item}', [EvaluationTemplateController::class, 'updateItem']);
    Route::delete('evaluation-items/{item}', [EvaluationTemplateController::class, 'deleteItem']);

    // Dynamic form templates and assigned forms
    Route::post('form-templates/{form_template}/duplicate', [FormTemplateController::class, 'duplicate']);
    Route::apiResource('form-templates', FormTemplateController::class);
    Route::get('form-instances', [FormInstanceController::class, 'index']);
    Route::get('form-instances/{formInstance}', [FormInstanceController::class, 'show']);
    Route::put('form-instances/{formInstance}', [FormInstanceController::class, 'update']);
    Route::post('form-instances/{formInstance}/submit', [FormInstanceController::class, 'submit']);
    Route::post('form-instances/{formInstance}/review', [FormInstanceController::class, 'review']);

    // Portfolios
    Route::apiResource('student-portfolios', StudentPortfolioController::class);
    Route::post('student-portfolios/{student_portfolio}/entries', [StudentPortfolioController::class, 'addEntry']);
    Route::put('portfolio-entries/{entry}', [StudentPortfolioController::class, 'updateEntry']);
    Route::delete('portfolio-entries/{entry}', [StudentPortfolioController::class, 'deleteEntry']);

    // Visites superviseur
    Route::apiResource('supervisor-visits', SupervisorVisitController::class);
    Route::post('supervisor-visits/{supervisor_visit}/complete', [SupervisorVisitController::class, 'complete']);

    // Lettres officielles
    Route::apiResource('official-letters', OfficialLetterController::class);
    Route::post('official-letters/{official_letter}/send', [OfficialLetterController::class, 'send']);
    Route::post('official-letters/{official_letter}/receive', [OfficialLetterController::class, 'receive']);
    Route::post('official-letters/{official_letter}/approve', [OfficialLetterController::class, 'approve']);

    // Messages
    Route::apiResource('conversations', ConversationController::class);
    Route::post('conversations/{conversation}/messages', [ConversationController::class, 'sendMessage']);

    // Annonces — الإنشاء مُصرَّح به لأدوار محددة في FormRequest (لا يعتمد على feature flag)
    Route::post('announcements', [AnnouncementController::class, 'store']);
    Route::apiResource('announcements', AnnouncementController::class)->except(['store']);

    // Notifications
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::post('notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);
    Route::delete('notifications/{notification}', [NotificationController::class, 'destroy']);

    // Notes
    Route::apiResource('notes', NoteController::class);

    // Planning hebdomadaire
    Route::apiResource('weekly-schedules', WeeklyScheduleController::class);

    // Feature flags
    Route::get('feature-flags', [FeatureFlagController::class, 'index']);
    Route::patch('feature-flags/{feature_flag}', [FeatureFlagController::class, 'update']);
    Route::get('feature-flags/check/{name}', [FeatureFlagController::class, 'check']);

    // Sauvegardes
    Route::apiResource('backups', BackupController::class);
    Route::post('backups/{backup_id}/restore', [BackupController::class, 'restore']);
    Route::get('backups/{id}/table/{tableName}', [BackupController::class, 'getTableData']);
    Route::get('backups/{id}/download', [BackupController::class, 'download']);

    // Logs d'activité
    Route::post('activity-logs/page-visit', [ActivityLogController::class, 'trackPageVisit']);
    Route::apiResource('activity-logs', ActivityLogController::class);

    // ========== ROUTES SUPERVISOR WORKSPACE ==========
    Route::prefix('supervisor')->group(function () {
        Route::get('/stats', [SupervisorWorkspaceController::class, 'stats']);
        Route::get('/students', [SupervisorWorkspaceController::class, 'students']);
        Route::get('/sections', [SupervisorWorkspaceController::class, 'sections']);
        Route::get('/students/{studentId}/overview', [SupervisorWorkspaceController::class, 'studentOverview']);
        Route::patch('/students/{studentId}/academic-status', [SupervisorWorkspaceController::class, 'updateStudentAcademicStatus']);
        Route::get('/students/{studentId}/academic-status-history', [SupervisorWorkspaceController::class, 'studentAcademicStatusHistory']);
        Route::get('/students/{studentId}/attendance', [SupervisorWorkspaceController::class, 'studentAttendance']);
        Route::post('/students/{studentId}/attendance-comment', [SupervisorWorkspaceController::class, 'attendanceComment']);
        Route::post('/students/{studentId}/attendance-alert', [SupervisorWorkspaceController::class, 'attendanceAlert']);
        Route::get('/students/{studentId}/daily-logs', [SupervisorWorkspaceController::class, 'studentDailyLogs']);
        Route::post('/students/{studentId}/daily-logs/{logId}/academic-review', [SupervisorWorkspaceController::class, 'reviewDailyLog']);
        Route::post('/students/{studentId}/daily-logs/{logId}/flag', [SupervisorWorkspaceController::class, 'flagDailyLog']);
        Route::get('/students/{studentId}/portfolio', [SupervisorWorkspaceController::class, 'studentPortfolio']);
        Route::post('/students/{studentId}/portfolio/review-section', [SupervisorWorkspaceController::class, 'reviewPortfolioSection']);
        Route::post('/students/{studentId}/portfolio/final-review', [SupervisorWorkspaceController::class, 'finalPortfolioReview']);
        Route::get('/students/{studentId}/visits', [SupervisorWorkspaceController::class, 'studentVisits']);
        Route::post('/visits', [SupervisorWorkspaceController::class, 'storeVisit']);
        Route::put('/visits/{visitId}', [SupervisorWorkspaceController::class, 'updateVisit']);
        Route::post('/visits/{visitId}/complete', [SupervisorWorkspaceController::class, 'completeVisit']);
        Route::get('/visits/{visitId}', [SupervisorWorkspaceController::class, 'showVisit']);
        Route::get('/students/{studentId}/tasks', [SupervisorWorkspaceController::class, 'studentTasks']);
        Route::post('/tasks', [SupervisorWorkspaceController::class, 'storeTask']);
        Route::put('/tasks/{taskId}', [SupervisorWorkspaceController::class, 'updateTask']);
        Route::delete('/tasks/{taskId}', [SupervisorWorkspaceController::class, 'deleteTask']);
        Route::get('/students/{studentId}/task-submissions', [SupervisorWorkspaceController::class, 'studentTaskSubmissions']);
        Route::get('/task-submissions/{submissionId}', [SupervisorWorkspaceController::class, 'showTaskSubmission']);
        Route::post('/task-submissions/{submissionId}/review', [SupervisorWorkspaceController::class, 'reviewTaskSubmission']);
        Route::post('/task-submissions/{submissionId}/request-resubmission', [SupervisorWorkspaceController::class, 'requestResubmission']);
        Route::post('/task-submissions/{submissionId}/grade', [SupervisorWorkspaceController::class, 'gradeSubmission']);
        Route::get('/students/{studentId}/field-evaluations', [SupervisorWorkspaceController::class, 'studentFieldEvaluations']);
        Route::get('/students/{studentId}/academic-evaluation', [SupervisorWorkspaceController::class, 'studentAcademicEvaluation']);
        Route::post('/students/{studentId}/academic-evaluation-draft', [SupervisorWorkspaceController::class, 'saveAcademicEvaluationDraft']);
        Route::post('/students/{studentId}/academic-evaluation-submit', [SupervisorWorkspaceController::class, 'submitAcademicEvaluation']);
        Route::get('/students/{studentId}/messages', [SupervisorWorkspaceController::class, 'studentMessages']);
        Route::post('/students/{studentId}/messages', [SupervisorWorkspaceController::class, 'sendMessage']);
        Route::get('/students/{studentId}/timeline', [SupervisorWorkspaceController::class, 'studentTimeline']);
        Route::post('/students/{studentId}/escalate', [SupervisorWorkspaceController::class, 'escalate']);
    });

    // ========== ROUTES FIELD SUPERVISOR WORKSPACE ==========
    Route::prefix('field-supervisor')->group(function () {
        // Dashboard
        Route::get('/dashboard', [FieldSupervisorController::class, 'dashboard']);
        
        // Students
        Route::get('/students', [FieldSupervisorController::class, 'students']);
        Route::get('/students/{studentId}', [FieldSupervisorController::class, 'studentOverview']);
        
        // Attendance
        Route::get('/students/{studentId}/attendance', [FieldSupervisorController::class, 'studentAttendance']);
        Route::post('/attendance', [FieldSupervisorController::class, 'recordAttendance']);
        Route::patch('/attendance/{attendance}', [FieldSupervisorController::class, 'updateAttendance']);
        Route::patch('/attendance/{attendance}/supervisor', [FieldSupervisorController::class, 'patchAttendanceSupervisor']);

        Route::get('/forms-workboard', [FieldSupervisorController::class, 'formsWorkboard']);
        
        // Daily Reports
        Route::get('/report-templates', [FieldSupervisorController::class, 'getReportTemplates']);
        Route::get('/students/{studentId}/daily-reports', [FieldSupervisorController::class, 'studentDailyReports']);
        Route::get('/daily-reports/{reportId}', [FieldSupervisorController::class, 'getDailyReport']);
        Route::post('/daily-reports/{reportId}/confirm', [FieldSupervisorController::class, 'confirmDailyReport']);
        Route::post('/daily-reports/{reportId}/return', [FieldSupervisorController::class, 'returnDailyReport']);
        
        // Evaluations
        Route::get('/evaluation-templates', [FieldSupervisorController::class, 'getEvaluationTemplates']);
        Route::get('/students/{studentId}/evaluation', [FieldSupervisorController::class, 'getStudentEvaluation']);
        Route::post('/students/{studentId}/evaluation-draft', [FieldSupervisorController::class, 'saveEvaluationDraft']);
        Route::post('/students/{studentId}/evaluation-submit', [FieldSupervisorController::class, 'submitEvaluation']);
        
        // Communication
        Route::get('/students/{studentId}/messages', [FieldSupervisorController::class, 'studentMessages']);
        Route::post('/students/{studentId}/messages', [FieldSupervisorController::class, 'sendMessage']);
        Route::post('/students/{studentId}/message-academic-supervisor', [FieldSupervisorController::class, 'messageAcademicSupervisor']);
        
        // Timeline
        Route::get('/students/{studentId}/timeline', [FieldSupervisorController::class, 'studentTimeline']);
    });

    // ========== ROUTES ÉTUDIANTS ==========
    Route::prefix('student')->group(function () {
        Route::get('/dashboard-summary', [DashboardController::class, 'studentSummary']);
        Route::get('/training-requests', [TrainingRequestController::class, 'studentIndex']);
        Route::post('/training-requests', [TrainingRequestController::class, 'studentStore'])
            ->middleware('feature:training_requests.create');
        Route::put('/training-requests/{training_request}', [TrainingRequestController::class, 'studentUpdate']);
        Route::delete('/training-requests/{training_request}', [TrainingRequestController::class, 'studentDestroy']);
        Route::get('/schedule', [WeeklyScheduleController::class, 'studentSchedule']);
        
        // Training logs
        Route::get('/training-logs', [TrainingLogController::class, 'getTrainingLogs']);
        Route::post('/training-logs', [TrainingLogController::class, 'store']);
        Route::put('/training-logs/{training_log}', [TrainingLogController::class, 'update']);
        Route::post('/training-logs/{training_log}/submit', [TrainingLogController::class, 'submit']);
        
        // Portfolio
        Route::get('/portfolio', [StudentPortfolioController::class, 'show']);
        Route::post('/portfolio/entries', [PortfolioEntryController::class, 'store']);
        Route::put('/portfolio/entries/{entry}', [PortfolioEntryController::class, 'update']);
        Route::delete('/portfolio/entries/{entry}', [PortfolioEntryController::class, 'destroy']);
        
        // Tâches étudiant
        Route::get('/tasks', [TaskController::class, 'studentIndex']);
        Route::post('/tasks/{task}/submit', [TaskSubmissionController::class, 'store']);
        Route::put('/task-submissions/{task_submission}', [TaskSubmissionController::class, 'studentUpdate']);
        
        // Notifications étudiant
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);

        // E-Forms étudiant
        Route::get('/e-forms', [StudentEFormController::class, 'index']);
        Route::post('/e-forms', [StudentEFormController::class, 'store']);
        Route::post('/e-forms/{eform}/submit', [StudentEFormController::class, 'submit']);

        // Training Program (برنامج التدريب)
        Route::get('/training-program', [TrainingProgramController::class, 'show']);
        Route::post('/training-program', [TrainingProgramController::class, 'store']);
    });

    // ========== ROUTES مدير جهة التدريب ==========
    Route::prefix('school-manager')->group(function () {
        Route::get('/mentor-requests', [TrainingRequestController::class, 'schoolManagerMentorRequests']);
        Route::get('/teachers', [TrainingRequestController::class, 'schoolManagerTeachers']);
        Route::post('/mentor-requests/{training_request}/approve', [TrainingRequestController::class, 'schoolManagerApprove']);
    });

    // ========== ROUTES سجل حضور الطالب ==========
    Route::prefix('student')->group(function () {
        Route::get('/attendance', [StudentAttendanceController::class, 'index']);
        Route::post('/attendance', [StudentAttendanceController::class, 'store'])
            ->middleware('feature:attendances.create');
        Route::get('/attendance/{attendance}', [StudentAttendanceController::class, 'show']);
        Route::put('/attendance/{attendance}', [StudentAttendanceController::class, 'update']);
        Route::delete('/attendance/{attendance}', [StudentAttendanceController::class, 'destroy']);
        Route::get('/attendance/statistics/summary', [StudentAttendanceController::class, 'statistics']);
        Route::post('/attendance/{attendance}/approve', [StudentAttendanceController::class, 'approve']);
    });

    // Portfolio personnel
    Route::get('/my-portfolio', [StudentPortfolioController::class, 'getMyPortfolio']);

    // Training Program - view student program (mentor/supervisor/coordinator)
    Route::get('/students/{studentId}/training-program', [TrainingProgramController::class, 'showForStudent']);

    // Training Program - coordinator management
    Route::get('/coordinator/training-programs', [TrainingProgramController::class, 'indexForCoordinator'])->middleware('role:training_coordinator');
    Route::patch('/coordinator/training-programs/{id}/status', [TrainingProgramController::class, 'updateStatus'])->middleware('role:training_coordinator');

    // ========== ROUTES HEAD OF DEPARTMENT ==========
    Route::prefix('head-department')->group(function () {
        // Test endpoint
        Route::get('/test', [HeadOfDepartmentController::class, 'test']);
        // Dashboard and Statistics
        Route::get('/dashboard', [HeadOfDepartmentController::class, 'getDashboardStats']);
        Route::get('/students', [HeadOfDepartmentController::class, 'getStudentsList']);
        Route::get('/students/{studentId}', [HeadOfDepartmentController::class, 'getStudentDetails']);
        Route::get('/distribution-status', [HeadOfDepartmentController::class, 'getDistributionStatus']);
        Route::get('/reports', [HeadOfDepartmentController::class, 'getReports']);
        
        // Administrative Decisions
        Route::post('/students/{studentId}/modify-assignment', [HeadOfDepartmentController::class, 'modifyStudentAssignment']);
        Route::get('/rejected-cases', [HeadOfDepartmentController::class, 'reviewRejectedCases']);
        Route::post('/bulk-enroll', [HeadOfDepartmentController::class, 'bulkEnrollStudents']);
        
        // Search students
        Route::get('/search-students', [HeadOfDepartmentController::class, 'searchStudents']);
    });
});