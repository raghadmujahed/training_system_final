<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAttendanceRequest;
use App\Http\Requests\ApproveAttendanceRequest;
use App\Http\Resources\AttendanceResource;
use App\Models\Attendance;
use App\Models\Notification;
use App\Services\AttendanceService;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    protected $attendanceService;

    public function __construct(AttendanceService $attendanceService)
    {
        $this->attendanceService = $attendanceService;
        $this->authorizeResource(Attendance::class, 'attendance');
    }

    public function index(Request $request)
    {
        $role = $request->user()->role?->name;
        $withRelations = ['user', 'trainingAssignment'];
        if (in_array($role, ['school_manager', 'student', 'academic_supervisor'], true)) {
            $withRelations = ['user', 'trainingAssignment.enrollment.user', 'trainingAssignment.trainingSite', 'trainingAssignment.teacher'];
        }
        $query = Attendance::with($withRelations);
        
        if ($request->has('training_assignment_id')) {
            $query->where('training_assignment_id', $request->training_assignment_id);
        }
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->has('date_from')) {
            $query->whereDate('date', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->whereDate('date', '<=', $request->date_to);
        }

        if ($request->user()->role?->name === 'field_supervisor') {
            $query->whereHas('trainingAssignment', function ($q) use ($request) {
                $uid = $request->user()->id;
                $q->where('teacher_id', $uid)->orWhere('field_supervisor_id', $uid);
            });
        } elseif ($request->user()->role?->name === 'teacher') {
            $query->whereHas('trainingAssignment', function ($q) use ($request) {
                $q->where('teacher_id', $request->user()->id);
            });
        } elseif (in_array($request->user()->role?->name, ['adviser', 'psychologist'], true)) {
            $uid = $request->user()->id;
            $query->whereHas('trainingAssignment', function ($q) use ($uid) {
                $q->where('teacher_id', $uid)->orWhere('field_supervisor_id', $uid);
            });
        } elseif ($request->user()->role?->name === 'school_manager') {
            $query->whereHas('trainingAssignment.trainingSite', function ($q) use ($request) {
                $q->where('id', $request->user()->training_site_id);
            })->whereNotNull('submitted_to_manager_at');
        } elseif ($request->user()->role?->name === 'student') {
            $query->whereHas('trainingAssignment.enrollment', function ($q) use ($request) {
                $q->where('user_id', $request->user()->id);
            });
        } elseif ($request->user()->role?->name === 'academic_supervisor') {
            $query->whereHas('trainingAssignment', function ($q) use ($request) {
                $q->where('academic_supervisor_id', $request->user()->id);
            });
        }
        
        $attendances = $query->latest('date')->paginate($request->per_page ?? 15);
        return AttendanceResource::collection($attendances);
    }

    public function store(StoreAttendanceRequest $request)
    {
        $attendance = $this->attendanceService->recordAttendance(
            $request->validated(),
            $request->user()->id
        );
        return new AttendanceResource($attendance);
    }

    public function show(Attendance $attendance)
    {
        $attendance->load(['trainingAssignment']);
        return new AttendanceResource($attendance->load(['user', 'approvedBy', 'trainingAssignment']));
    }

    public function update(Request $request, Attendance $attendance)
    {
        $attendance->load(['trainingAssignment']);
        $this->authorize('update', $attendance);

        $data = $request->validate([
            'date' => 'sometimes|date',
            'check_in' => 'nullable|date_format:H:i',
            'check_out' => ['nullable', 'date_format:H:i', function ($attr, $value, $fail) use ($request) {
                if ($value && $request->check_in && $value <= $request->check_in) {
                    $fail('ساعة المغادرة يجب أن تكون بعد ساعة الحضور.');
                }
            }],
            'status' => 'sometimes|in:present,absent,late,rejected',
            'periods' => 'nullable|integer|min:0|max:20',
            'notes' => 'nullable|string',
        ]);

        // إذا كان السجل مرفوضاً وأُعيد تعديله، نعيد تعيين حالة الاعتماد
        if ($attendance->status === 'rejected') {
            $data['status'] = 'present';
            $data['approved_by'] = null;
            $data['approved_at'] = null;
            $data['rejection_reason'] = null;
        }

        $attendance->update($data);
        return new AttendanceResource($attendance->fresh()->load(['user', 'trainingAssignment']));
    }

    public function destroy(Attendance $attendance)
    {
        $attendance->load(['trainingAssignment']);
        $this->authorize('delete', $attendance);

        $attendance->delete();
        return response()->json(['message' => 'تم حذف سجل الحضور بنجاح']);
    }

    public function approve(ApproveAttendanceRequest $request, Attendance $attendance)
    {
        $attendance->load(['trainingAssignment']);
        $this->authorize('approve', $attendance);
        $attendance = $this->attendanceService->approveAttendance(
            $attendance,
            $request->user()->id,
            $request->notes
        );

        // تحميل العلاقات المطلوبة
        $attendance->load(['trainingAssignment.enrollment.user', 'trainingAssignment.teacher']);

        // إرسال إشعار للطالب
        $student = $attendance->trainingAssignment?->enrollment?->user;
        if ($student) {
            Notification::create([
                'user_id' => $student->id,
                'type' => 'attendance_approved',
                'message' => 'تم اعتماد سجل الحضور بتاريخ ' . $attendance->date,
                'data' => [
                    'attendance_id' => $attendance->id,
                    'date' => $attendance->date,
                ],
            ]);
        }

        // إرسال إشعار للمعلم المرشد
        $teacher = $attendance->trainingAssignment?->teacher;
        if ($teacher) {
            Notification::create([
                'user_id' => $teacher->id,
                'type' => 'attendance_approved',
                'message' => 'تم اعتماد سجل الحضور للطالب ' . ($student?->name ?? 'الطالب') . ' بتاريخ ' . $attendance->date,
                'data' => [
                    'attendance_id' => $attendance->id,
                    'date' => $attendance->date,
                    'student_name' => $student?->name,
                ],
            ]);
        }

        return new AttendanceResource($attendance);
    }

    public function reject(Request $request, Attendance $attendance)
    {
        try {
            if (!$attendance->trainingAssignment) {
                return response()->json(['message' => 'سجل الحضور غير مرتبط بمهمة تدريبية'], 400);
            }

            $attendance->load(['trainingAssignment']);
            $this->authorize('approve', $attendance);

            $data = $request->validate([
                'rejection_reason' => 'nullable|string|max:500',
            ]);

            $attendance = $this->attendanceService->rejectAttendance(
                $attendance,
                $request->user()->id,
                $data['rejection_reason'] ?? null
            );
            return new AttendanceResource($attendance->load(['user', 'trainingAssignment']));
        } catch (\Exception $e) {
            return response()->json(['message' => 'حدث خطأ أثناء رفض سجل الحضور: ' . $e->getMessage()], 500);
        }
    }

    public function submitToManager(Request $request)
    {
        $request->validate([
            'training_assignment_id' => 'required|exists:training_assignments,id',
        ]);

        $userId = $request->user()->id;
        $assignmentId = $request->training_assignment_id;

        // التحقق من أن المعلم يملك هذا التوزيع
        $assignment = \App\Models\TrainingAssignment::where('id', $assignmentId)
            ->where('teacher_id', $userId)
            ->firstOrFail();

        // تحديث كل السجلات غير المُرسلة
        $count = Attendance::where('training_assignment_id', $assignmentId)
            ->whereNull('submitted_to_manager_at')
            ->update([
                'submitted_to_manager_at' => now(),
                'submitted_to_manager_by' => $userId,
            ]);

        return response()->json([
            'message' => "تم إرسال {$count} سجل حضور لمدير المدرسة بنجاح",
            'submitted_count' => $count,
        ]);
    }

    public function summary(Request $request)
    {
        $request->validate(['training_assignment_id' => 'required|exists:training_assignments,id']);
        $summary = $this->attendanceService->getAttendanceSummary($request->training_assignment_id);
        return response()->json($summary);
    }
}