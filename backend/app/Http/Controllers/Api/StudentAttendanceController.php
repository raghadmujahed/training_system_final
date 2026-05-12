<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\PortfolioEntry;
use App\Models\StudentAttendance;
use App\Models\StudentPortfolio;
use App\Models\TrainingAssignment;
use App\Models\TrainingRequestStudent;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class StudentAttendanceController extends Controller
{
    /**
     * عرض جميع سجلات الحضور للطالب الحالي
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        // التأكد أن المستخدم طالب
        if ($user->role?->name !== 'student') {
            return response()->json([
                'message' => 'هذه الخدمة متاحة للطلاب فقط.'
            ], 403);
        }
        
        // جلب سجلات الحضور من جدول attendances (التي يسجلها المعلم المرشد)
        $query = Attendance::with(['trainingAssignment.trainingSite', 'user', 'approvedBy'])
            ->whereHas('trainingAssignment.enrollment', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            })
            ->where('approved_at', '!=', null); // فقط السجلات المعتمدة
        
        // فلترة حسب الشهر/السنة
        if ($request->filled('month') && $request->filled('year')) {
            $query->whereYear('date', $request->year)
                  ->whereMonth('date', $request->month);
        }
        
        // فلترة حسب الفترة
        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('date', [$request->start_date, $request->end_date]);
        }
        
        $attendances = $query->orderBy('date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 50);
        
        // معلومات إضافية
        $trainingSite = null;
        $activeTraining = TrainingRequestStudent::with('trainingRequest.trainingSite')
            ->whereHas('trainingRequest', function($q) {
                $q->whereIn('book_status', ['school_approved', 'directorate_approved']);
            })
            ->where('user_id', $user->id)
            ->first();
        
        if ($activeTraining && $activeTraining->trainingRequest?->trainingSite) {
            $trainingSite = [
                'id' => $activeTraining->trainingRequest->trainingSite->id,
                'name' => $activeTraining->trainingRequest->trainingSite->name,
                'location' => $activeTraining->trainingRequest->trainingSite->location,
            ];
        }
        
        // جلب معرف مدخل الملف الإنجازي لسجل الحضور
        $portfolio = StudentPortfolio::where('user_id', $user->id)->first();
        $portfolioEntryId = null;
        if ($portfolio) {
            $portfolioEntryId = PortfolioEntry::where('student_portfolio_id', $portfolio->id)
                ->where('title', 'سجل الحضور والغياب')
                ->value('id');
        }

        return response()->json([
            'data' => $attendances->items(),
            'meta' => [
                'current_page' => $attendances->currentPage(),
                'last_page' => $attendances->lastPage(),
                'per_page' => $attendances->perPage(),
                'total' => $attendances->total(),
            ],
            'training_site' => $trainingSite,
            'portfolio_entry_id' => $portfolioEntryId,
        ]);
    }

    /**
     * إضافة سجل حضور جديد
     */
    public function store(Request $request)
    {
        return response()->json([
            'message' => 'تسجيل الحضور والغياب يتم من قبل المرشد الميداني (المعلم/المشرف الميداني) في جهة التدريب. يمكنك الاطلاع على السجل من هذه الصفحة عند الاعتماد.',
        ], 403);
    }

    /**
     * عرض سجل حضور محدد
     */
    public function show(Request $request, StudentAttendance $attendance)
    {
        $user = $request->user();
        
        // التأكد أن السجل يخص الطالب
        if ($attendance->user_id !== $user->id && $user->role?->name !== 'admin') {
            return response()->json([
                'message' => 'غير مصرح لك بعرض هذا السجل.'
            ], 403);
        }
        
        return response()->json([
            'data' => $attendance->load(['user', 'trainingRequestStudent.trainingRequest.trainingSite', 'approvedBy'])
        ]);
    }

    /**
     * تعديل سجل حضور
     */
    public function update(Request $request, StudentAttendance $attendance)
    {
        $user = $request->user();

        if ($user->role?->name === 'student') {
            return response()->json([
                'message' => 'لا يمكن للطالب تعديل سجل الحضور. راجع المرشد الميداني.',
            ], 403);
        }
        
        // التأكد من الصلاحية (مشرف ميداني / أدمن)
        if (! $this->userCanManageStudentAttendance($user, (int) $attendance->user_id)) {
            return response()->json([
                'message' => 'غير مصرح لك بتعديل هذا السجل.'
            ], 403);
        }
        
        if ($attendance->approved_at) {
            return response()->json([
                'message' => 'لا يمكن تعديل سجل تم اعتماده.'
            ], 403);
        }
        
        $validator = Validator::make($request->all(), [
            'day' => 'sometimes|string|in:السبت,الأحد,الإثنين,الثلاثاء,الأربعاء,الخميس',
            'date' => 'sometimes|date|before_or_equal:today',
            'check_in' => 'sometimes|date_format:H:i',
            'check_out' => 'sometimes|date_format:H:i|after:check_in',
            'lessons_count' => 'nullable|integer|min:0|max:15',
            'notes' => 'nullable|string|max:1000',
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'message' => 'خطأ في البيانات المدخلة.',
                'errors' => $validator->errors()
            ], 422);
        }
        
        // التأكد من عدم التعارض مع سجل آخر عند تغيير التاريخ
        if ($request->filled('date') && $request->date !== $attendance->date->format('Y-m-d')) {
            $exists = StudentAttendance::forUser($attendance->user_id)
                ->forDate($request->date)
                ->where('id', '!=', $attendance->id)
                ->exists();
            
            if ($exists) {
                return response()->json([
                    'message' => 'يوجد سجل حضور آخر مسجل لهذا اليوم.'
                ], 422);
            }
        }
        
        $attendance->update($request->only([
            'day', 'date', 'check_in', 'check_out', 'lessons_count', 'notes'
        ]));
        
        return response()->json([
            'message' => 'تم تحديث سجل الحضور بنجاح.',
            'data' => $attendance->fresh()
        ]);
    }

    /**
     * حذف سجل حضور
     */
    public function destroy(Request $request, StudentAttendance $attendance)
    {
        $user = $request->user();

        if ($user->role?->name === 'student') {
            return response()->json([
                'message' => 'لا يمكن للطالب حذف سجل الحضور.',
            ], 403);
        }
        
        // التأكد من الصلاحية
        if (! $this->userCanManageStudentAttendance($user, (int) $attendance->user_id)) {
            return response()->json([
                'message' => 'غير مصرح لك بحذف هذا السجل.'
            ], 403);
        }
        
        if ($attendance->approved_at && $user->role?->name !== 'admin') {
            return response()->json([
                'message' => 'لا يمكن حذف سجل تم اعتماده.'
            ], 403);
        }
        
        $studentUserId = (int) $attendance->user_id;

        $attendance->delete();

        // تحديث الملف الإنجازي
        $student = User::query()->find($studentUserId);
        if ($student) {
            $this->syncToPortfolio($student);
        }

        return response()->json([
            'message' => 'تم حذف سجل الحضور بنجاح.'
        ]);
    }

    /**
     * إحصائيات الحضور للطالب
     */
    public function statistics(Request $request)
    {
        $user = $request->user();
        
        if ($user->role?->name !== 'student') {
            return response()->json([
                'message' => 'هذه الخدمة متاحة للطلاب فقط.'
            ], 403);
        }
        
        $month = $request->input('month', now()->month);
        $year = $request->input('year', now()->year);
        
        $stats = StudentAttendance::forUser($user->id)
            ->whereYear('date', $year)
            ->whereMonth('date', $month)
            ->selectRaw('
                COUNT(*) as total_days,
                SUM(CASE WHEN status = "present" THEN 1 ELSE 0 END) as present_days,
                SUM(CASE WHEN status = "absent" THEN 1 ELSE 0 END) as absent_days,
                SUM(CASE WHEN status = "excused" THEN 1 ELSE 0 END) as excused_days,
                SUM(lessons_count) as total_lessons,
                AVG(TIMESTAMPDIFF(HOUR, check_in, check_out)) as avg_hours
            ')
            ->first();
        
        return response()->json([
            'month' => $month,
            'year' => $year,
            'statistics' => $stats
        ]);
    }

    /**
     * حفظ/تحديث سجل الحضور والغياب في الملف الإنجازي
     */
    protected function syncToPortfolio($user)
    {
        $portfolio = StudentPortfolio::where('user_id', $user->id)->first();

        if (! $portfolio) {
            try {
                $assignmentId = $user->currentTrainingAssignment()?->id;
                $portfolio = StudentPortfolio::create([
                    'user_id' => $user->id,
                    'training_assignment_id' => $assignmentId,
                ]);
            } catch (QueryException $e) {
                return null;
            }
        }

        $title = 'سجل الحضور والغياب';
        $content = 'سجل الحضور والغياب اليومي — يتم تحديثه تلقائياً';

        return PortfolioEntry::updateOrCreate(
            [
                'student_portfolio_id' => $portfolio->id,
                'title' => $title,
            ],
            [
                'content' => $content,
            ]
        );
    }

    /**
     * اعتماد سجل الحضور (للمشرف/المعلم المرشد)
     */
    public function approve(Request $request, StudentAttendance $attendance)
    {
        $user = $request->user();
        
        // يمكن للمشرف أو المعلم المرشد الاعتماد
        if (! in_array($user->role?->name, ['supervisor', 'teacher', 'mentor', 'school_manager', 'principal', 'field_supervisor', 'adviser', 'psychologist'], true)) {
            return response()->json([
                'message' => 'غير مصرح لك باعتماد سجلات الحضور.'
            ], 403);
        }
        
        $attendance->update([
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        $syncedAttendance = $this->syncApprovedAttendanceToAcademicAttendance($attendance->fresh(), $user->id);
        
        return response()->json([
            'message' => 'تم اعتماد سجل الحضور بنجاح.',
            'data' => $attendance->fresh(),
            'academic_attendance_id' => $syncedAttendance?->id,
        ]);
    }

    private function syncApprovedAttendanceToAcademicAttendance(StudentAttendance $studentAttendance, int $approvedBy): ?Attendance
    {
        $assignment = null;

        if ($studentAttendance->training_request_student_id) {
            $assignment = TrainingAssignment::query()
                ->where('training_request_student_id', $studentAttendance->training_request_student_id)
                ->whereHas('enrollment.section', fn ($q) => $q->whereNull('archived_at'))
                ->latest('id')
                ->first();
        }

        if (! $assignment) {
            $assignment = TrainingAssignment::query()
                ->whereHas('enrollment', fn ($query) => $query->where('user_id', $studentAttendance->user_id))
                ->whereHas('enrollment.section', fn ($q) => $q->whereNull('archived_at'))
                ->latest('id')
                ->first();
        }

        if (! $assignment) {
            return null;
        }

        return Attendance::updateOrCreate(
            [
                'training_assignment_id' => $assignment->id,
                'user_id' => $studentAttendance->user_id,
                'date' => $studentAttendance->date,
            ],
            [
                'check_in' => $studentAttendance->check_in,
                'check_out' => $studentAttendance->check_out,
                'notes' => $studentAttendance->notes,
                'status' => in_array($studentAttendance->status, ['present', 'absent', 'late'], true)
                    ? $studentAttendance->status
                    : 'present',
                'approved_by' => $approvedBy,
                'approved_at' => $studentAttendance->approved_at ?? now(),
                'visible_to_academic' => true,
            ]
        );
    }

    private function userCanManageStudentAttendance(User $actor, int $studentUserId): bool
    {
        if ($actor->role?->name === 'admin') {
            return true;
        }

        $query = TrainingAssignment::query()
            ->where(function ($q) use ($actor) {
                $q->where('teacher_id', $actor->id);
                if ($actor->role?->name === 'field_supervisor') {
                    $q->orWhere('field_supervisor_id', $actor->id);
                }
            })
            ->whereHas('enrollment', fn ($q) => $q->where('user_id', $studentUserId));

        return $query->exists();
    }
}
