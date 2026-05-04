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
        $query = Attendance::with(['user', 'trainingAssignment']);
        
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
        } elseif ($request->user()->role?->name === 'student') {
            $query->where('user_id', $request->user()->id);
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

    public function summary(Request $request)
    {
        $request->validate(['training_assignment_id' => 'required|exists:training_assignments,id']);
        $summary = $this->attendanceService->getAttendanceSummary($request->training_assignment_id);
        return response()->json($summary);
    }
}