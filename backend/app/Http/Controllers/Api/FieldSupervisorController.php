<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\TrainingAssignment;
use App\Models\Attendance;
use App\Models\DailyReport;
use App\Models\DailyReportTemplate;
use App\Models\FieldEvaluation;
use App\Models\FieldEvaluationTemplate;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Note;
use App\Models\Notification;
use App\Models\FormInstance;
use App\Services\FieldSupervisorAssignmentResolver;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * FieldSupervisorController
 *
 * مركز التحكم للمشرف الميداني (المعلم المرشد / المرشد التربوي / الأخصائي النفسي)
 */
class FieldSupervisorController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * الحصول على ملف المشرف الميداني
     */
    private function getSupervisorProfile(Request $request)
    {
        return $request->user()->fieldSupervisorProfile;
    }

    /**
     * الحصول على معرفات الطلاب المرتبطين بالمشرف
     */
    private function getAssignedStudentIds(Request $request): array
    {
        $user = $request->user();
        
        return FieldSupervisorAssignmentResolver::assignmentsForFieldSupervisorUser($user)
            ->whereIn('status', ['assigned', 'ongoing'])
            ->with('enrollment')
            ->get()
            ->pluck('enrollment.user_id')
            ->filter()
            ->unique()
            ->values()
            ->toArray();
    }

    /**
     * الحصول على تعيينات الطلاب
     */
    private function getStudentAssignments(Request $request, ?int $studentId = null)
    {
        $query = FieldSupervisorAssignmentResolver::assignmentsForFieldSupervisorUser($request->user())
            ->whereIn('status', ['assigned', 'ongoing'])
            ->with(['enrollment.user', 'enrollment.section.course', 'trainingSite']);

        if ($studentId) {
            $query->whereHas('enrollment', function ($q) use ($studentId) {
                $q->where('user_id', $studentId);
            });
        }

        return $query->get();
    }

    /**
     * وصول واجهة المشرف الميداني: دور field_supervisor أو وجود تعيين نشط كـ teacher_id / field_supervisor_id.
     */
    private function canUseFieldSupervisorWorkspace(Request $request): bool
    {
        $user = $request->user();
        if ($user->role?->name === 'field_supervisor') {
            return true;
        }

        return FieldSupervisorAssignmentResolver::assignmentsForFieldSupervisorUser($user)
            ->whereIn('status', ['assigned', 'ongoing'])
            ->exists();
    }

    /**
     * إشعار داخل التطبيق: جدول notifications يفرض notifiable_type / notifiable_id (morph).
     */
    private function notifyInAppUser(int $recipientUserId, string $type, string $message, array $data = []): void
    {
        Notification::create([
            'user_id' => $recipientUserId,
            'type' => $type,
            'message' => $message,
            'notifiable_type' => User::class,
            'notifiable_id' => $recipientUserId,
            'data' => $data === [] ? null : $data,
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DASHBOARD & STATS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * إحصائيات لوحة التحكم
     * GET /field-supervisor/dashboard
     */
    public function dashboard(Request $request)
    {
        $user = $request->user();
        $profile = $this->getSupervisorProfile($request);
        $studentIds = $this->getAssignedStudentIds($request);

        // البطاقات المشتركة
        $stats = [
            'students_count' => count($studentIds),
            'unreviewed_reports_today' => DailyReport::whereIn('student_id', $studentIds)
                ->whereDate('report_date', today())
                ->where('status', DailyReport::STATUS_SUBMITTED)
                ->count(),
            'pending_attendance_today' => $this->getPendingAttendanceCount($studentIds),
            'returned_reports' => DailyReport::whereIn('student_id', $studentIds)
                ->where('status', DailyReport::STATUS_RETURNED)
                ->count(),
            'incomplete_evaluations' => FieldEvaluation::whereIn('student_id', $studentIds)
                ->where('status', FieldEvaluation::STATUS_DRAFT)
                ->count(),
            'new_alerts' => Notification::where('user_id', $user->id)
                ->where('type', 'alert')
                ->whereNull('read_at')
                ->count(),
            'messages_from_supervisor' => $this->countUnreadMessagesFromAcademicSupervisors($user),
        ];

        // البطاقات الخاصة حسب النوع
        $subtypeStats = $this->getSubtypeSpecificStats($profile?->supervisor_type, $studentIds);

        return response()->json([
            'profile' => $profile,
            'stats' => array_merge($stats, $subtypeStats),
            'supervisor_type' => $profile?->supervisor_type,
            'supervisor_type_label' => $profile?->type_label ?? 'مشرف ميداني',
        ]);
    }

    /**
     * إحصائيات خاصة حسب نوع المشرف
     */
    private function getSubtypeSpecificStats(?string $type, array $studentIds): array
    {
        if (!$type) return [];

        return match($type) {
            'mentor_teacher' => [
                'lessons_conducted' => $this->getLessonsCount($studentIds),
                'preparations_needing_attention' => $this->getPreparationsCount($studentIds),
                'classroom_notes' => $this->getClassroomNotesCount($studentIds),
            ],
            'school_counselor' => [
                'counseling_reports_today' => DailyReport::whereIn('student_id', $studentIds)
                    ->whereDate('report_date', today())
                    ->whereHas('template', fn($q) => $q->where('applies_to', 'school_counselor'))
                    ->count(),
                'observed_cases' => $this->getObservedCasesCount($studentIds),
                'counseling_notes' => $this->getCounselingNotesCount($studentIds),
            ],
            'psychologist' => [
                'professional_reports' => FieldEvaluation::whereIn('student_id', $studentIds)
                    ->whereHas('template', fn($q) => $q->where('applies_to', 'psychologist'))
                    ->where('status', FieldEvaluation::STATUS_SUBMITTED)
                    ->count(),
                'sessions_documented' => $this->getSessionsCount($studentIds),
                'notes_pending_review' => DailyReport::whereIn('student_id', $studentIds)
                    ->whereHas('template', fn($q) => $q->where('applies_to', 'psychologist'))
                    ->whereIn('status', [DailyReport::STATUS_SUBMITTED, DailyReport::STATUS_UNDER_REVIEW])
                    ->count(),
            ],
            default => [],
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STUDENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * قائمة الطلاب المرتبطين بالمشرف
     * GET /field-supervisor/students
     */
    public function students(Request $request)
    {
        $assignments = $this->getStudentAssignments($request);
        $profile = $this->getSupervisorProfile($request);

        $students = $assignments->map(function ($assignment) use ($profile) {
            $student = $assignment->enrollment?->user;
            if (!$student) return null;

            // حساب المؤشرات
            $attendanceRate = $this->getAttendanceRate($student->id, $assignment->id);
            $reportStatus = $this->getTodayReportStatus($student->id);
            $evalStatus = $this->getEvaluationStatus($student->id, $assignment->id);

            return [
                'id' => $student->id,
                'name' => $student->name,
                'university_id' => $student->university_id,
                'specialization' => $assignment->enrollment?->section?->course?->name,
                'department' => $student->department?->name,
                'section_name' => $assignment->enrollment?->section?->name,
                'training_site' => $assignment->trainingSite?->name,
                'training_type' => $this->getTrainingTypeLabel($profile?->supervisor_type),
                'assignment_id' => $assignment->id,
                'attendance_rate' => $attendanceRate,
                'last_attendance' => $this->getLastAttendance($student->id, $assignment->id),
                'today_report_status' => $reportStatus,
                'evaluation_status' => $evalStatus,
            ];
        })->filter()->values();

        return response()->json($students);
    }

    /**
     * ملف طالب كامل - نظرة عامة
     * GET /field-supervisor/students/{id}
     */
    public function studentOverview(Request $request, $studentId)
    {
        $student = User::with(['department', 'enrollments.section.course'])
            ->findOrFail($studentId);

        $assignment = $this->getStudentAssignments($request, $studentId)->first();
        
        if (!$assignment) {
            return response()->json(['error' => 'الطالب غير مرتبط بك'], 403);
        }

        $profile = $this->getSupervisorProfile($request);

        // إحصائيات الحضور (مقيّدة بالتعيين الحالي + ملخص الساعات عند توفرها في المساق)
        $attendanceStats = $this->getAttendanceStats($studentId, $assignment->id, $assignment);

        // آخر تقرير
        $lastReport = DailyReport::where('student_id', $studentId)
            ->latest('report_date')
            ->first();

        // حالة التقييم
        $evaluation = FieldEvaluation::where('student_id', $studentId)
            ->where('training_assignment_id', $assignment->id)
            ->first();

        return response()->json([
            'student' => [
                'id' => $student->id,
                'name' => $student->name,
                'university_id' => $student->university_id,
                'specialization' => $assignment->enrollment?->section?->course?->name,
                'department' => $student->department?->name,
                'section' => $assignment->enrollment?->section?->name,
                'training_site' => $assignment->trainingSite?->name,
                'training_type' => $this->getTrainingTypeLabel($profile?->supervisor_type),
                'training_start' => $assignment->start_date?->format('Y-m-d'),
                'training_status' => $assignment->status,
            ],
            'attendance' => $attendanceStats,
            'last_report' => $lastReport ? [
                'date' => $lastReport->report_date->format('Y-m-d'),
                'status' => $lastReport->status,
                'status_label' => $lastReport->status_label,
            ] : null,
            'evaluation' => $evaluation ? [
                'status' => $evaluation->status,
                'status_label' => $evaluation->status_label,
                'total_score' => $evaluation->total_score,
                'grade_label' => $evaluation->grade_label,
                'grade' => $evaluation->grade,
                'is_final' => $evaluation->is_final,
            ] : null,
            'supervisor_type' => $profile?->supervisor_type,
            'supervisor_type_label' => $profile?->type_label ?? null,
            'last_attendance' => $this->getLastAttendance($studentId, $assignment->id),
            'quick_actions' => [
                ['key' => 'record_attendance', 'label' => 'تسجيل حضور', 'icon' => 'check-circle'],
                ['key' => 'review_today_report', 'label' => 'مراجعة تقرير اليوم', 'icon' => 'file-text'],
                ['key' => 'open_evaluation', 'label' => 'فتح التقييم', 'icon' => 'star'],
                ['key' => 'message_student', 'label' => 'رسالة للطالب', 'icon' => 'message-circle'],
                ['key' => 'message_supervisor', 'label' => 'رسالة للمشرف الأكاديمي', 'icon' => 'message-square'],
            ],
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ATTENDANCE
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * سجل حضور الطالب
     * GET /field-supervisor/students/{id}/attendance
     */
    public function studentAttendance(Request $request, $studentId)
    {
        $assignment = $this->getStudentAssignments($request, $studentId)->first();
        $profile = $this->getSupervisorProfile($request);

        if (!$assignment) {
            return response()->json(['error' => 'غير مصرح'], 403);
        }

        $records = Attendance::where('user_id', $studentId)
            ->where('training_assignment_id', $assignment->id)
            ->orderBy('date', 'desc')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'date' => $a->date->format('Y-m-d'),
                'status' => $a->status,
                'check_in' => $a->check_in,
                'check_out' => $a->check_out,
                'notes' => $a->notes,
                'field_supervisor_notes' => $a->field_supervisor_notes,
                'approved_at' => $a->approved_at?->toDateTimeString(),
                'approved_by' => $a->approved_by,
                'is_signed_off' => (bool) $a->approved_at,
                'is_locked' => $a->created_at && $a->created_at->diffInHours(now()) > 24,
            ]);

        // حالة حضور اليوم
        $todayRecord = Attendance::where('user_id', $studentId)
            ->where('training_assignment_id', $assignment->id)
            ->whereDate('date', today())
            ->first();

        $calendar = $this->generateAttendanceCalendar($studentId, $assignment->id);

        $summary = $this->getAttendanceStats($studentId, $assignment->id, $assignment);
        if ($profile?->supervisor_type === 'school_counselor') {
            $summary['school_psychology_policy_hint'] = 'دليل تدريب علم النفس في المدارس: التدريب يومان أسبوعيًا وبحد أدنى 120 ساعة. عند ضبط «ساعات التدريب» في بطاقة المساق يظهر المتبقي تلقائيًا في الملخص أعلاه.';
        }
        if (in_array($profile?->supervisor_type, ['psychologist', 'clinical_psychologist'], true)) {
            $summary['clinical_hours_policy_hint'] = 'التدريب في المراكز/المصحات يُتابع بالساعات المنجزة والتوثيق؛ اضبط ساعات المساق في النظام لعرض المتبقي، واستخدم أوقات الدخول/الخروج لحساب الدوام بدقة.';
        }

        return response()->json([
            'records' => $records,
            'today_status' => $todayRecord?->status ?? 'not_recorded',
            'can_record_today' => !$todayRecord,
            'calendar' => $calendar,
            'summary' => $summary,
        ]);
    }

    /**
     * تسجيل حضور
     * POST /field-supervisor/attendance
     */
    public function recordAttendance(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|exists:users,id',
            'date' => 'required|date',
            'status' => 'required|in:present,absent,late,excused',
            'check_in' => 'nullable|date_format:H:i',
            'check_out' => 'nullable|date_format:H:i',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $studentId = $request->student_id;
        $assignment = $this->getStudentAssignments($request, $studentId)->first();

        if (!$assignment) {
            return response()->json(['error' => 'غير مصرح'], 403);
        }

        // التحقق من عدم وجود سجل مسبق
        $existing = Attendance::where('user_id', $studentId)
            ->where('training_assignment_id', $assignment->id)
            ->whereDate('date', $request->date)
            ->first();

        if ($existing) {
            return response()->json(['error' => 'تم تسجيل الحضور مسبقاً'], 409);
        }

        $attendance = Attendance::create([
            'user_id' => $studentId,
            'training_assignment_id' => $assignment->id,
            'date' => $request->date,
            'status' => $request->status,
            'check_in' => $request->check_in,
            'check_out' => $request->check_out,
            'notes' => $request->notes,
            'recorded_by' => $request->user()->id,
        ]);

        // إشعار للطالب
        $this->notifyInAppUser(
            $studentId,
            'attendance',
            'تم تسجيل حضورك: تم تسجيل حالتك كـ '.$this->getAttendanceStatusLabel($request->status).' لتاريخ '.$request->date
        );

        return response()->json([
            'message' => 'تم تسجيل الحضور بنجاح',
            'attendance' => $attendance,
        ]);
    }

    /**
     * تعديل سجل حضور (خلال 24 ساعة من الإنشاء، ولنفس التعيين المرتبط بالمشرف)
     * PATCH /field-supervisor/attendance/{attendance}
     */
    public function updateAttendance(Request $request, Attendance $attendance)
    {
        $studentId = (int) $attendance->user_id;
        $assignment = $this->getStudentAssignments($request, $studentId)->first();

        if (!$assignment || (int) $attendance->training_assignment_id !== (int) $assignment->id) {
            return response()->json(['error' => 'غير مصرح'], 403);
        }

        if ($attendance->created_at && $attendance->created_at->diffInHours(now()) > 24) {
            return response()->json(['error' => 'انتهت مهلة تعديل هذا السجل (24 ساعة من وقت الإنشاء).'], 423);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:present,absent,late,excused',
            'check_in' => 'nullable|date_format:H:i',
            'check_out' => 'nullable|date_format:H:i',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $status = $request->status;
        $checkIn = $request->check_in;
        $checkOut = $request->check_out;
        if ($status === 'absent') {
            $checkIn = null;
            $checkOut = null;
        }

        $attendance->update([
            'status' => $status,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'notes' => $request->notes,
        ]);

        $this->notifyInAppUser(
            $studentId,
            'attendance',
            'تحديث سجل الحضور: تم تحديث حالة حضورك لتاريخ '.$attendance->date->format('Y-m-d').' إلى: '.$this->getAttendanceStatusLabel($status)
        );

        return response()->json([
            'message' => 'تم تحديث سجل الحضور بنجاح',
            'attendance' => $attendance->fresh(),
        ]);
    }

    /**
     * ملاحظات/اعتماد المشرف الميداني على سجل حضور (بدون قيد 24 ساعة للتعديل على الحقول الأساسية).
     * PATCH /field-supervisor/attendance/{attendance}/supervisor
     */
    public function patchAttendanceSupervisor(Request $request, Attendance $attendance)
    {
        $studentId = (int) $attendance->user_id;
        $assignment = $this->getStudentAssignments($request, $studentId)->first();

        if (! $assignment || (int) $attendance->training_assignment_id !== (int) $assignment->id) {
            return response()->json(['error' => 'غير مصرح'], 403);
        }

        $validator = Validator::make($request->all(), [
            'field_supervisor_notes' => 'nullable|string|max:8000',
            'sign_off' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $updates = [];
        if ($request->exists('field_supervisor_notes')) {
            $updates['field_supervisor_notes'] = $request->input('field_supervisor_notes');
        }
        if ($request->boolean('sign_off')) {
            $updates['approved_by'] = $request->user()->id;
            $updates['approved_at'] = now();
        }

        if ($updates !== []) {
            $attendance->update($updates);
        }

        return response()->json([
            'message' => 'تم حفظ بيانات المشرف الميداني على السجل',
            'attendance' => $attendance->fresh(),
        ]);
    }

    /**
     * لوحة نماذج المشرف الميداني: عناصر للمراجعة + روابط لما يعبئه المشرف بنفسه.
     * GET /field-supervisor/forms-workboard
     */
    public function formsWorkboard(Request $request)
    {
        $user = $request->user();
        if (! $this->canUseFieldSupervisorWorkspace($request)) {
            return response()->json(['error' => 'غير مصرح'], 403);
        }

        $profile = $this->getSupervisorProfile($request);
        $subtype = $profile?->supervisor_type ?? 'mentor_teacher';
        $normalizedEval = FieldEvaluationTemplate::normalizedSupervisorType($subtype);

        $assignmentIds = FieldSupervisorAssignmentResolver::assignmentsForFieldSupervisorUser($user)
            ->whereIn('status', ['assigned', 'ongoing'])
            ->pluck('id');

        $dailyReports = DailyReport::query()
            ->whereIn('training_assignment_id', $assignmentIds)
            ->whereIn('status', [DailyReport::STATUS_SUBMITTED, DailyReport::STATUS_UNDER_REVIEW])
            ->with(['student:id,name,university_id', 'template:id,name,code'])
            ->orderByDesc('report_date')
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'student_id' => $r->student_id,
                'student_name' => $r->student?->name,
                'report_date' => $r->report_date?->format('Y-m-d'),
                'template_name' => $r->template?->name,
                'status' => $r->status,
                'status_label' => $r->status_label,
                'link' => '/field-supervisor/students/'.$r->student_id.'?tab=daily-reports',
            ]);

        $eFormInstances = FormInstance::query()
            ->whereIn('training_assignment_id', $assignmentIds)
            ->where('status', FormInstance::STATUS_PENDING_REVIEW)
            ->where('current_reviewer_id', $user->id)
            ->with([
                'template:id,title_ar,code,owner_type',
                'subject:id,name',
                'trainingAssignment:id,enrollment_id',
                'trainingAssignment.enrollment:id,user_id',
                'trainingAssignment.enrollment.user:id,name',
            ])
            ->orderByDesc('updated_at')
            ->limit(50)
            ->get()
            ->map(function ($f) {
                $traineeId = $f->subject_user_id
                    ?? optional($f->trainingAssignment?->enrollment)->user_id;
                $traineeName = $f->subject?->name
                    ?? optional(optional($f->trainingAssignment?->enrollment)->user)->name;

                return [
                    'id' => $f->id,
                    'template_title' => $f->template?->title_ar ?? $f->template?->code,
                    'owner_type' => $f->template?->owner_type,
                    'subject_user_id' => $f->subject_user_id,
                    'student_id' => $traineeId,
                    'subject_name' => $f->subject?->name,
                    'student_name' => $traineeName,
                    'status' => $f->status,
                    'status_label' => match ($f->status) {
                        'pending_review' => 'بانتظار المراجعة',
                        'submitted' => 'مرسل',
                        default => $f->status,
                    },
                    'link' => '/field-supervisor/form-instances/'.$f->id,
                ];
            });

        $evaluationTemplate = FieldEvaluationTemplate::active()
            ->forType($normalizedEval)
            ->orderBy('code')
            ->first(['id', 'name', 'code', 'applies_to']);

        return response()->json([
            'supervisor_subtype' => $subtype,
            'supervisor_subtype_label' => $profile?->type_label,
            'fill' => [
                'field_evaluation' => [
                    'title' => $evaluationTemplate?->name ?? 'التقييم الميداني',
                    'code' => $evaluationTemplate?->code,
                    'hub_link' => '/field-supervisor/evaluation',
                    'hint' => 'تعبئة الدرجات والملاحظات العامة ثم الإرسال النهائي من صفحة التقييم لكل طالب.',
                ],
                'attendance' => [
                    'title' => 'سجل حضور الطالب المتدرب',
                    'hub_link' => '/field-supervisor/attendance',
                    'hint' => 'التسجيل والملخص والساعات من ملف الطالب → تبويب الحضور؛ اعتماد السجل وملاحظات المرشد من نفس الشاشة.',
                ],
            ],
            'review' => [
                'daily_task_reports' => $dailyReports,
                'e_form_instances' => $eFormInstances,
            ],
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DAILY REPORTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * الحصول على قوالب التقارير
     * GET /field-supervisor/report-templates
     */
    public function getReportTemplates(Request $request)
    {
        $profile = $this->getSupervisorProfile($request);
        $type = FieldEvaluationTemplate::normalizedSupervisorType($profile?->supervisor_type ?? 'mentor_teacher');

        $templates = DailyReportTemplate::active()
            ->forType($type)
            ->orderBy('sort_order')
            ->get();

        return response()->json($templates);
    }

    /**
     * تقارير الطالب اليومية
     * GET /field-supervisor/students/{id}/daily-reports
     */
    public function studentDailyReports(Request $request, $studentId)
    {
        $assignment = $this->getStudentAssignments($request, $studentId)->first();
        
        if (!$assignment) {
            return response()->json(['error' => 'غير مصرح'], 403);
        }

        $reports = DailyReport::with('template')
            ->where('student_id', $studentId)
            ->where('training_assignment_id', $assignment->id)
            ->orderBy('report_date', 'desc')
            ->get()
            ->map(fn($r) => [
                'id' => $r->id,
                'date' => $r->report_date->format('Y-m-d'),
                'template_name' => $r->template?->name,
                'status' => $r->status,
                'status_label' => $r->status_label,
                'status_color' => $r->status_color,
                'has_attachments' => $r->attachments()->exists(),
                'can_review' => in_array($r->status, [DailyReport::STATUS_SUBMITTED, DailyReport::STATUS_UNDER_REVIEW]),
            ]);

        return response()->json($reports);
    }

    /**
     * تقرير محدد
     * GET /field-supervisor/daily-reports/{id}
     */
    public function getDailyReport(Request $request, $reportId)
    {
        $report = DailyReport::with(['template', 'student', 'attachments'])
            ->where('field_supervisor_id', $request->user()->id)
            ->findOrFail($reportId);

        return response()->json([
            'id' => $report->id,
            'date' => $report->report_date->format('Y-m-d'),
            'template' => $report->template,
            'content' => $report->content,
            'status' => $report->status,
            'status_label' => $report->status_label,
            'supervisor_comment' => $report->supervisor_comment,
            'reviewed_at' => $report->reviewed_at?->format('Y-m-d H:i'),
            'student' => [
                'id' => $report->student->id,
                'name' => $report->student->name,
            ],
            'attachments' => $report->attachments,
            'can_confirm' => in_array($report->status, [DailyReport::STATUS_SUBMITTED, DailyReport::STATUS_UNDER_REVIEW]),
            'can_return' => in_array($report->status, [DailyReport::STATUS_SUBMITTED, DailyReport::STATUS_UNDER_REVIEW]),
        ]);
    }

    /**
     * تأكيد تقرير
     * POST /field-supervisor/daily-reports/{id}/confirm
     */
    public function confirmDailyReport(Request $request, $reportId)
    {
        $report = DailyReport::where('field_supervisor_id', $request->user()->id)
            ->findOrFail($reportId);

        if (!in_array($report->status, [DailyReport::STATUS_SUBMITTED, DailyReport::STATUS_UNDER_REVIEW])) {
            return response()->json(['error' => 'لا يمكن تأكيد هذا التقرير'], 422);
        }

        $report->confirm($request->user()->id, $request->comment);

        // إشعار الطالب
        $this->notifyInAppUser(
            (int) $report->student_id,
            'report_confirmed',
            "تم تأكيد تقريرك: تم تأكيد تقرير يوم {$report->report_date->format('Y-m-d')}"
        );

        return response()->json(['message' => 'تم تأكيد التقرير']);
    }

    /**
     * إعادة تقرير للتعديل
     * POST /field-supervisor/daily-reports/{id}/return
     */
    public function returnDailyReport(Request $request, $reportId)
    {
        $validator = Validator::make($request->all(), [
            'comment' => 'required|string|min:5',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $report = DailyReport::where('field_supervisor_id', $request->user()->id)
            ->findOrFail($reportId);

        if (!in_array($report->status, [DailyReport::STATUS_SUBMITTED, DailyReport::STATUS_UNDER_REVIEW])) {
            return response()->json(['error' => 'لا يمكن إعادة هذا التقرير'], 422);
        }

        $report->returnForEdit($request->user()->id, $request->comment);

        // إشعار الطالب
        $this->notifyInAppUser(
            (int) $report->student_id,
            'report_returned',
            "تم إعادة التقرير للتعديل: أُعيد تقرير يوم {$report->report_date->format('Y-m-d')} للتعديل: {$request->comment}"
        );

        return response()->json(['message' => 'تم إعادة التقرير للتعديل']);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EVALUATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * الحصول على قوالب التقييم
     * GET /field-supervisor/evaluation-templates
     */
    public function getEvaluationTemplates(Request $request)
    {
        $profile = $this->getSupervisorProfile($request);
        $type = FieldEvaluationTemplate::normalizedSupervisorType($profile?->supervisor_type ?? 'mentor_teacher');

        $templates = FieldEvaluationTemplate::active()
            ->forType($type)
            ->get();

        return response()->json($templates);
    }

    /**
     * تقييم طالب محدد
     * GET /field-supervisor/students/{id}/evaluation
     */
    public function getStudentEvaluation(Request $request, $studentId)
    {
        $assignment = $this->getStudentAssignments($request, $studentId)->first();
        
        if (!$assignment) {
            return response()->json(['error' => 'غير مصرح'], 403);
        }

        $profile = $this->getSupervisorProfile($request);
        $subtype = FieldEvaluationTemplate::normalizedSupervisorType($profile?->supervisor_type ?? 'mentor_teacher');
        $template = FieldEvaluationTemplate::getDefaultForType($subtype);

        $evaluation = FieldEvaluation::with('template')
            ->where('student_id', $studentId)
            ->where('training_assignment_id', $assignment->id)
            ->first();

        $tplForWeight = $evaluation?->template ?? $template;
        $weightedPreview = ($tplForWeight && $evaluation?->scores)
            ? $tplForWeight->weightedTotalFromScores($evaluation->scores)
            : null;

        return response()->json([
            'template' => $template,
            'supervisor_subtype' => $subtype,
            'weighted_score_preview' => $weightedPreview,
            'evaluation' => $evaluation ? [
                'id' => $evaluation->id,
                'status' => $evaluation->status,
                'status_label' => $evaluation->status_label,
                'scores' => $evaluation->scores,
                'total_score' => $evaluation->total_score,
                'grade' => $evaluation->grade,
                'grade_label' => $evaluation->grade_label,
                'general_notes' => $evaluation->general_notes,
                'strengths' => $evaluation->strengths,
                'areas_for_improvement' => $evaluation->areas_for_improvement,
                'is_final' => $evaluation->is_final,
                'is_editable' => $evaluation->isEditable(),
                'submitted_at' => $evaluation->submitted_at?->format('Y-m-d H:i'),
            ] : null,
            'student_id' => $studentId,
            'assignment_id' => $assignment->id,
        ]);
    }

    /**
     * حفظ مسودة تقييم
     * POST /field-supervisor/students/{id}/evaluation-draft
     */
    public function saveEvaluationDraft(Request $request, $studentId)
    {
        $validator = Validator::make($request->all(), [
            'scores' => 'required|array',
            'general_notes' => 'nullable|string',
            'strengths' => 'nullable|string',
            'areas_for_improvement' => 'nullable|string',
            'template_id' => 'required|exists:field_evaluation_templates,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $assignment = $this->getStudentAssignments($request, $studentId)->first();
        
        if (!$assignment) {
            return response()->json(['error' => 'غير مصرح'], 403);
        }

        $existing = FieldEvaluation::where('student_id', $studentId)
            ->where('training_assignment_id', $assignment->id)
            ->first();
        if ($existing?->is_final) {
            return response()->json(['message' => 'التقييم مُرسَل نهائياً ولا يمكن تعديله.'], 422);
        }

        $tpl = FieldEvaluationTemplate::findOrFail((int) $request->template_id);
        $this->assertFieldEvaluationTemplateForProfile($tpl, $this->getSupervisorProfile($request));

        $evaluation = FieldEvaluation::updateOrCreate(
            [
                'student_id' => $studentId,
                'training_assignment_id' => $assignment->id,
            ],
            [
                'field_supervisor_id' => $request->user()->id,
                'template_id' => $request->template_id,
                'scores' => $request->scores,
                'general_notes' => $request->general_notes,
                'strengths' => $request->strengths,
                'areas_for_improvement' => $request->areas_for_improvement,
                'status' => FieldEvaluation::STATUS_DRAFT,
            ]
        );

        $evaluation->load('template');
        $preview = $evaluation->template
            ? $evaluation->template->weightedTotalFromScores($evaluation->scores ?? [])
            : null;

        return response()->json([
            'message' => 'تم حفظ المسودة',
            'evaluation' => $evaluation,
            'weighted_score_preview' => $preview,
        ]);
    }

    /**
     * إرسال تقييم نهائي
     * POST /field-supervisor/students/{id}/evaluation-submit
     */
    public function submitEvaluation(Request $request, $studentId)
    {
        $validator = Validator::make($request->all(), [
            'scores' => 'required|array',
            'general_notes' => 'nullable|string',
            'strengths' => 'nullable|string',
            'areas_for_improvement' => 'nullable|string',
            'template_id' => 'required|exists:field_evaluation_templates,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $assignment = $this->getStudentAssignments($request, $studentId)->first();
        
        if (!$assignment) {
            return response()->json(['error' => 'غير مصرح'], 403);
        }

        $existing = FieldEvaluation::where('student_id', $studentId)
            ->where('training_assignment_id', $assignment->id)
            ->first();
        if ($existing?->is_final) {
            return response()->json(['message' => 'تم إرسال التقييم مسبقاً ولا يمكن تكرار الإرسال.'], 422);
        }

        $tpl = FieldEvaluationTemplate::findOrFail((int) $request->template_id);
        $this->assertFieldEvaluationTemplateForProfile($tpl, $this->getSupervisorProfile($request));

        $evaluation = FieldEvaluation::updateOrCreate(
            [
                'student_id' => $studentId,
                'training_assignment_id' => $assignment->id,
            ],
            [
                'field_supervisor_id' => $request->user()->id,
                'template_id' => $request->template_id,
                'scores' => $request->scores,
                'general_notes' => $request->general_notes,
                'strengths' => $request->strengths,
                'areas_for_improvement' => $request->areas_for_improvement,
            ]
        );

        $evaluation->submit();
        $evaluation->refresh();

        $gradeText = $evaluation->grade_label ?? $evaluation->grade ?? '—';

        // إشعار للطالب
        $this->notifyInAppUser(
            $studentId,
            'evaluation_submitted',
            "تم رفع تقييمك الميداني: تم إرسال تقييمك الميداني بنجاح. درجتك: {$gradeText}"
        );

        return response()->json([
            'message' => 'تم إرسال التقييم بنجاح',
            'evaluation' => $evaluation->fresh(),
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // COMMUNICATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * رسائل الطالب
     * GET /field-supervisor/students/{id}/messages
     */
    public function studentMessages(Request $request, $studentId)
    {
        $assignment = $this->getStudentAssignments($request, $studentId)->first();
        
        if (!$assignment) {
            return response()->json(['error' => 'غير مصرح'], 403);
        }

        $supervisorId = $request->user()->id;
        $conversation = Conversation::query()
            ->where(function ($q) use ($studentId, $supervisorId) {
                $q->where('participant_one_id', $supervisorId)->where('participant_two_id', $studentId);
            })->orWhere(function ($q) use ($studentId, $supervisorId) {
                $q->where('participant_one_id', $studentId)->where('participant_two_id', $supervisorId);
            })->first();

        if (!$conversation) {
            return response()->json([]);
        }

        $messages = Message::where('conversation_id', $conversation->id)
            ->with('sender')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'content' => $m->message,
                'is_from_me' => $m->sender_id === $supervisorId,
                'sender_name' => $m->sender?->name,
                'related_to' => 'general',
                'created_at' => $m->created_at->format('Y-m-d H:i'),
                'is_read' => $m->is_read,
            ]);

        return response()->json($messages);
    }

    /**
     * إرسال رسالة
     * POST /field-supervisor/students/{id}/messages
     */
    public function sendMessage(Request $request, $studentId)
    {
        $validator = Validator::make($request->all(), [
            'content' => 'required|string|min:2',
            'related_to' => 'nullable|string|in:attendance,daily_report,evaluation,issue,general',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $assignment = $this->getStudentAssignments($request, $studentId)->first();
        
        if (!$assignment) {
            return response()->json(['error' => 'غير مصرح'], 403);
        }

        $conversation = $this->getConversationBetween($request->user()->id, (int) $studentId);

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $request->user()->id,
            'message' => $request->content,
        ]);

        // إشعار للطالب
        $this->notifyInAppUser(
            $studentId,
            'message',
            'رسالة جديدة من المشرف الميداني: '.substr($request->content, 0, 100).(strlen($request->content) > 100 ? '...' : '')
        );

        return response()->json([
            'message' => 'تم إرسال الرسالة',
            'data' => $message,
        ]);
    }

    /**
     * إرسال رسالة للمشرف الأكاديمي
     * POST /field-supervisor/message-academic-supervisor
     */
    public function messageAcademicSupervisor(Request $request, $studentId)
    {
        $validator = Validator::make($request->all(), [
            'content' => 'required|string|min:5',
            'related_to' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $assignment = $this->getStudentAssignments($request, $studentId)->first();
        
        if (!$assignment || !$assignment->academic_supervisor_id) {
            return response()->json(['error' => 'لا يوجد مشرف أكاديمي مرتبط'], 404);
        }

        $conversation = $this->getConversationBetween(
            $request->user()->id,
            (int) $assignment->academic_supervisor_id
        );

        Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $request->user()->id,
            'message' => $request->content,
        ]);

        // إشعار للمشرف الأكاديمي
        $this->notifyInAppUser(
            (int) $assignment->academic_supervisor_id,
            'supervisor_message',
            'رسالة من المشرف الميداني: رسالة بخصوص الطالب: '.$assignment->enrollment?->user?->name
        );

        return response()->json([
            'message' => 'تم إرسال الرسالة للمشرف الأكاديمي',
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TIMELINE / ACTIVITY LOG
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * سجل النشاط
     * GET /field-supervisor/students/{id}/timeline
     */
    public function studentTimeline(Request $request, $studentId)
    {
        $assignment = $this->getStudentAssignments($request, $studentId)->first();
        
        if (!$assignment) {
            return response()->json(['error' => 'غير مصرح'], 403);
        }

        $events = [];

        // حضور
        $attendances = Attendance::where('user_id', $studentId)
            ->where('training_assignment_id', $assignment->id)
            ->orderBy('date', 'desc')
            ->limit(20)
            ->get();

        foreach ($attendances as $a) {
            $events[] = [
                'type' => 'attendance',
                'title' => 'تسجيل حضور',
                'description' => "الحالة: {$this->getAttendanceStatusLabel($a->status)}",
                'date' => $a->date->format('Y-m-d'),
                'time' => $a->created_at->format('H:i'),
                'icon' => 'check-circle',
                'color' => $a->status === 'present' ? 'green' : ($a->status === 'absent' ? 'red' : 'yellow'),
            ];
        }

        // تقارير
        $reports = DailyReport::where('student_id', $studentId)
            ->where('training_assignment_id', $assignment->id)
            ->orderBy('report_date', 'desc')
            ->limit(20)
            ->get();

        foreach ($reports as $r) {
            $events[] = [
                'type' => 'report',
                'title' => $r->status === DailyReport::STATUS_SUBMITTED ? 'رفع تقرير' : 
                    ($r->status === DailyReport::STATUS_CONFIRMED ? 'تأكيد تقرير' : 'إعادة تقرير'),
                'description' => "تقرير يوم {$r->report_date->format('Y-m-d')}",
                'date' => $r->report_date->format('Y-m-d'),
                'time' => $r->created_at->format('H:i'),
                'icon' => 'file-text',
                'color' => $r->status === DailyReport::STATUS_CONFIRMED ? 'green' : 
                    ($r->status === DailyReport::STATUS_RETURNED ? 'red' : 'blue'),
            ];
        }

        // تقييمات
        $evaluations = FieldEvaluation::where('student_id', $studentId)
            ->where('training_assignment_id', $assignment->id)
            ->whereNotNull('submitted_at')
            ->orderBy('submitted_at', 'desc')
            ->get();

        foreach ($evaluations as $e) {
            $events[] = [
                'type' => 'evaluation',
                'title' => 'إرسال تقييم ميداني',
                'description' => $e->grade_label ? "الدرجة: {$e->grade_label}" : '',
                'date' => $e->submitted_at->format('Y-m-d'),
                'time' => $e->submitted_at->format('H:i'),
                'icon' => 'star',
                'color' => 'purple',
            ];
        }

        // رسائل (محادثة المشرف الميداني مع الطالب)
        $supervisorId = $request->user()->id;
        $conv = Conversation::query()
            ->where(function ($q) use ($studentId, $supervisorId) {
                $q->where('participant_one_id', $supervisorId)->where('participant_two_id', $studentId);
            })->orWhere(function ($q) use ($studentId, $supervisorId) {
                $q->where('participant_one_id', $studentId)->where('participant_two_id', $supervisorId);
            })->first();

        if ($conv) {
            $messages = Message::where('conversation_id', $conv->id)
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get();

            foreach ($messages as $m) {
                $body = (string) $m->message;
                $events[] = [
                    'type' => 'message',
                    'title' => $m->sender_id === $supervisorId ? 'أرسلت رسالة' : 'استلمت رسالة',
                    'description' => mb_strlen($body) > 50 ? (mb_substr($body, 0, 50) . '...') : $body,
                    'date' => $m->created_at->format('Y-m-d'),
                    'time' => $m->created_at->format('H:i'),
                    'icon' => 'message-circle',
                    'color' => 'blue',
                ];
            }
        }

        // ترتيب حسب التاريخ
        usort($events, fn($a, $b) => strtotime($b['date'] . ' ' . $b['time']) - strtotime($a['date'] . ' ' . $a['time']));

        return response()->json(array_slice($events, 0, 30));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    private function getAttendanceRate(int $studentId, ?int $assignmentId = null): ?int
    {
        $query = Attendance::where('user_id', $studentId);
        if ($assignmentId) {
            $query->where('training_assignment_id', $assignmentId);
        }

        $stats = $query->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
            ")
            ->first();

        if (! $stats || $stats->total == 0) {
            return null;
        }

        return (int) round(($stats->present / $stats->total) * 100);
    }

    private function getAttendanceStats(int $studentId, ?int $assignmentId = null, ?TrainingAssignment $assignment = null): array
    {
        $query = Attendance::where('user_id', $studentId);
        if ($assignmentId) {
            $query->where('training_assignment_id', $assignmentId);
        }

        $stats = $query->selectRaw("
            COUNT(*) as total_days,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
            SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days
        ")->first();

        $total = $stats?->total_days ?? 0;
        $present = $stats?->present_days ?? 0;

        $base = [
            'total_days' => $total,
            'present_days' => $present,
            'absent_days' => $stats?->absent_days ?? 0,
            'late_days' => $stats?->late_days ?? 0,
            'attendance_rate' => $total > 0 ? round(($present / $total) * 100) : 0,
        ];

        if ($assignment) {
            return array_merge($base, $this->buildTrainingHoursSummary($assignment));
        }

        return $base;
    }

    /**
     * ملخص الساعات المطلوبة/المنجزة للتعيين (يعتمد على training_hours في المساق وسجلات الحضور).
     */
    private function buildTrainingHoursSummary(TrainingAssignment $assignment): array
    {
        $required = (int) ($assignment->enrollment?->section?->course?->training_hours ?? 0);
        $studentUserId = (int) ($assignment->enrollment?->user_id ?? 0);

        $rows = Attendance::query()
            ->where('training_assignment_id', $assignment->id)
            ->when($studentUserId > 0, fn ($q) => $q->where('user_id', $studentUserId))
            ->whereIn('status', ['present', 'late', 'excused'])
            ->orderBy('date')
            ->get();

        $completed = 0.0;
        foreach ($rows as $a) {
            if ($a->check_in && $a->check_out) {
                try {
                    $dateStr = $a->date->format('Y-m-d');
                    $in = Carbon::parse($dateStr . ' ' . $a->check_in->format('H:i:s'));
                    $out = Carbon::parse($dateStr . ' ' . $a->check_out->format('H:i:s'));
                    if ($out->lessThanOrEqualTo($in)) {
                        $out->addDay();
                    }
                    $completed += max(0, $in->diffInMinutes($out) / 60);
                } catch (\Throwable $e) {
                    if (in_array($a->status, ['present', 'late'], true)) {
                        $completed += 1.0;
                    }
                }
            } elseif (in_array($a->status, ['present', 'late'], true)) {
                $completed += 1.0;
            }
        }

        $completedRounded = round($completed, 1);
        $remaining = $required > 0 ? max(0, round($required - $completedRounded, 1)) : null;

        return [
            'required_training_hours' => $required,
            'completed_training_hours' => $completedRounded,
            'remaining_training_hours' => $remaining,
            'hours_summary_mode' => $required > 0 ? 'hours_track' : 'days_only',
        ];
    }

    private function assertFieldEvaluationTemplateForProfile(FieldEvaluationTemplate $template, ?\App\Models\FieldSupervisorProfile $profile): void
    {
        $expected = FieldEvaluationTemplate::normalizedSupervisorType($profile?->supervisor_type ?? 'mentor_teacher');
        $applies = $template->applies_to;
        if ($applies === 'all') {
            return;
        }
        if ($applies === $expected) {
            return;
        }
        abort(422, 'قالب التقييم لا يطابق نوع المشرف الميداني.');
    }

    private function getLastAttendance(int $studentId, ?int $assignmentId = null): ?string
    {
        $q = Attendance::where('user_id', $studentId);
        if ($assignmentId !== null) {
            $q->where('training_assignment_id', $assignmentId);
        }

        return $q->latest('date')->first()?->date?->format('Y-m-d');
    }

    private function generateAttendanceCalendar(int $studentId, int $assignmentId): array
    {
        $attendances = Attendance::where('user_id', $studentId)
            ->where('training_assignment_id', $assignmentId)
            ->whereMonth('date', now()->month)
            ->whereYear('date', now()->year)
            ->get()
            ->keyBy(fn($a) => $a->date->format('Y-m-d'));

        $calendar = [];
        $startOfMonth = now()->startOfMonth();
        $daysInMonth = now()->daysInMonth;

        for ($i = 1; $i <= $daysInMonth; $i++) {
            $date = $startOfMonth->copy()->addDays($i - 1)->format('Y-m-d');
            $attendance = $attendances[$date] ?? null;

            $calendar[] = [
                'day' => $i,
                'date' => $date,
                'status' => $attendance?->status ?? null,
                'is_today' => $date === today()->format('Y-m-d'),
                'is_weekend' => in_array($startOfMonth->copy()->addDays($i - 1)->dayOfWeek, [5, 6]),
            ];
        }

        return $calendar;
    }

    private function getTodayReportStatus(int $studentId): string
    {
        $report = DailyReport::where('student_id', $studentId)
            ->whereDate('report_date', today())
            ->first();

        return $report?->status ?? 'not_submitted';
    }

    private function getEvaluationStatus(int $studentId, ?int $assignmentId = null): string
    {
        $q = FieldEvaluation::where('student_id', $studentId);
        if ($assignmentId !== null) {
            $q->where('training_assignment_id', $assignmentId);
        }
        $eval = $q->latest()->first();

        if (!$eval) {
            return 'not_started';
        }
        if ($eval->is_final
            || $eval->status === FieldEvaluation::STATUS_SUBMITTED
            || $eval->status === FieldEvaluation::STATUS_REVIEWED) {
            return 'completed';
        }

        return $eval->status;
    }

    private function getTrainingTypeLabel(?string $supervisorType): string
    {
        return match ($supervisorType) {
            'mentor_teacher' => 'تدريب تدريسي',
            'school_counselor' => 'تدريب إرشادي مدرسي',
            'psychologist', 'clinical_psychologist' => 'تدريب نفسي/مهني (مؤسسة)',
            default => 'تدريب ميداني',
        };
    }

    private function getAttendanceStatusLabel(string $status): string
    {
        return match($status) {
            'present' => 'حاضر',
            'absent' => 'غائب',
            'late' => 'متأخر',
            'excused' => 'مُعذر',
            default => $status,
        };
    }

    private function getPendingAttendanceCount(array $studentIds): int
    {
        // الطلاب الذين لم يسجل لهم حضور اليوم
        $recordedToday = Attendance::whereIn('user_id', $studentIds)
            ->whereDate('date', today())
            ->pluck('user_id')
            ->toArray();

        return count($studentIds) - count($recordedToday);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Subtype-specific helper methods
    // ═══════════════════════════════════════════════════════════════════════════

    private function getLessonsCount(array $studentIds): int
    {
        // يمكن ربطها بجدول محدد لاحقاً
        return DailyReport::whereIn('student_id', $studentIds)
            ->whereHas('template', fn($q) => $q->where('applies_to', 'mentor_teacher'))
            ->where('status', DailyReport::STATUS_CONFIRMED)
            ->count();
    }

    private function getPreparationsCount(array $studentIds): int
    {
        return 0; // يُحسب لاحقاً حسب البيانات
    }

    private function getClassroomNotesCount(array $studentIds): int
    {
        // جدول notes مرتبط بتعيين تدريبي وليس مباشرة بـ student_id، ولا يوجد عمود type
        return $this->countNotesLinkedToStudents($studentIds);
    }

    private function getObservedCasesCount(array $studentIds): int
    {
        return DailyReport::whereIn('student_id', $studentIds)
            ->whereHas('template', fn($q) => $q->where('applies_to', 'school_counselor'))
            ->where('status', DailyReport::STATUS_CONFIRMED)
            ->count();
    }

    private function getCounselingNotesCount(array $studentIds): int
    {
        return $this->countNotesLinkedToStudents($studentIds);
    }

    /**
     * عدد الملاحظات المخزّنة على تعيينات الطلاب المرتبطين بالمشرف الميداني.
     */
    private function countNotesLinkedToStudents(array $studentIds): int
    {
        if ($studentIds === []) {
            return 0;
        }

        return Note::query()
            ->whereHas('trainingAssignment.enrollment', static function ($q) use ($studentIds) {
                $q->whereIn('user_id', $studentIds);
            })
            ->count();
    }

    private function getSessionsCount(array $studentIds): int
    {
        return DailyReport::whereIn('student_id', $studentIds)
            ->whereHas('template', fn($q) => $q->where('applies_to', 'psychologist'))
            ->where('status', DailyReport::STATUS_CONFIRMED)
            ->count();
    }

    /**
     * محادثة بين مستخدمين (نفس منطق المشرف الأكاديمي — جدول conversations / messages).
     */
    private function getConversationBetween(int $userIdA, int $userIdB): Conversation
    {
        return Conversation::firstOrCreate([
            'participant_one_id' => min($userIdA, $userIdB),
            'participant_two_id' => max($userIdA, $userIdB),
        ]);
    }

    /**
     * رسائل غير مقروءة من مشرف أكاديمي في محادثات يشارك فيها المشرف الميداني.
     */
    private function countUnreadMessagesFromAcademicSupervisors(User $user): int
    {
        return Message::query()
            ->where('sender_id', '!=', $user->id)
            ->where(function ($q) {
                $q->where('is_read', false)->orWhereNull('read_at');
            })
            ->whereHas('conversation', function ($q) use ($user) {
                $q->where('participant_one_id', $user->id)
                    ->orWhere('participant_two_id', $user->id);
            })
            ->whereHas('sender.role', function ($q) {
                $q->where('name', 'academic_supervisor');
            })
            ->count();
    }
}
