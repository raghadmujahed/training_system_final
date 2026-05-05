<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAttendanceRequest;
use App\Http\Requests\ApproveAttendanceRequest;
use App\Http\Resources\AttendanceResource;
use App\Models\Attendance;
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
        if ($role === 'school_manager') {
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
        } elseif (in_array($request->user()->role?->name, ['teacher', 'adviser', 'psychologist'], true)) {
            $query->whereHas('trainingAssignment', function ($q) use ($request) {
                $q->where('teacher_id', $request->user()->id);
            });
        } elseif ($request->user()->role?->name === 'school_manager') {
            $query->whereHas('trainingAssignment.trainingSite', function ($q) use ($request) {
                $q->where('id', $request->user()->training_site_id);
            })->whereNotNull('submitted_to_manager_at');
        } elseif ($request->user()->role?->name === 'student') {
            $query->whereHas('trainingAssignment.enrollment', function ($q) use ($request) {
                $q->where('user_id', $request->user()->id);
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
        return new AttendanceResource($attendance->load(['user', 'approvedBy', 'trainingAssignment']));
    }

    public function update(Request $request, Attendance $attendance)
    {
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
        $this->authorize('delete', $attendance);

        $attendance->delete();
        return response()->json(['message' => 'تم حذف سجل الحضور بنجاح']);
    }

    public function approve(ApproveAttendanceRequest $request, Attendance $attendance)
    {
        $this->authorize('approve', $attendance);
        $attendance = $this->attendanceService->approveAttendance(
            $attendance,
            $request->user()->id,
            $request->notes
        );
        return new AttendanceResource($attendance);
    }

    public function reject(Request $request, Attendance $attendance)
    {
        $this->authorize('approve', $attendance);

        $data = $request->validate([
            'rejection_reason' => 'nullable|string|max:500',
        ]);

        $attendance = $this->attendanceService->rejectAttendance(
            $attendance,
            $request->user()->id,
            $data['rejection_reason'] ?? null
        );
        return new AttendanceResource($attendance);
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