<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTrainingLogRequest;
use App\Http\Requests\UpdateTrainingLogRequest;
use App\Http\Requests\ReviewTrainingLogRequest;
use App\Http\Resources\TrainingLogResource;
use App\Models\TrainingLog;
use App\Services\TrainingLogService;
use Illuminate\Http\Request;

class TrainingLogController extends Controller
{
    protected $trainingLogService;

    public function __construct(TrainingLogService $trainingLogService)
    {
        $this->trainingLogService = $trainingLogService;
    }
// داخل TrainingLogController

public function getTrainingLogs(Request $request)
{
    $user = auth()->user();
    if (!$user) {
        return response()->json(['message' => 'Unauthenticated'], 401);
    }

    // استعلام مباشر باستخدام JOIN
    $logs = TrainingLog::join('training_assignments', 'training_logs.training_assignment_id', '=', 'training_assignments.id')
        ->join('enrollments', 'training_assignments.enrollment_id', '=', 'enrollments.id')
        ->where('enrollments.user_id', $user->id)
        ->select('training_logs.*')  // نأخذ فقط أعمدة training_logs
        ->orderBy('training_logs.log_date', 'desc')
        ->get();

    return response()->json($logs);
}

public function index(Request $request)
{
    $user = $request->user();

    $query = TrainingLog::query();

    if ($user->role?->name === 'student') {
        // نفس الـ JOIN لتحديد الـ training assignments الخاصة بهذا الطالب
        $query->join('training_assignments', 'training_logs.training_assignment_id', '=', 'training_assignments.id')
              ->join('enrollments', 'training_assignments.enrollment_id', '=', 'enrollments.id')
              ->where('enrollments.user_id', $user->id)
              ->select('training_logs.*'); // تجنب تضارب الأعمدة
    } elseif (in_array($user->role?->name, ['teacher', 'adviser', 'academic_supervisor', 'psychologist', 'school_manager', 'principal'], true)) {
        // الكادر الميداني: عرض سجلات الطلبة المرتبطين بموقع التدريب أو التعيين
        if ($user->role?->name === 'teacher') {
            $query->whereHas('trainingAssignment', fn ($q) => $q->where('teacher_id', $user->id));
        } elseif ($user->role?->name === 'adviser') {
            $query->whereHas('trainingAssignment', fn ($q) => $q->where('training_site_id', $user->training_site_id));
        } elseif ($user->role?->name === 'academic_supervisor') {
            $query->whereHas('trainingAssignment', fn ($q) => $q->where('academic_supervisor_id', $user->id));
        } elseif (in_array($user->role?->name, ['school_manager', 'principal'], true)) {
            $query->whereHas('trainingAssignment', fn ($q) => $q->where('training_site_id', $user->training_site_id));
        }
    }

    $query->with(['trainingAssignment.enrollment.user']);

    $logs = $query->latest('log_date')->paginate($request->per_page ?? 15);

    return TrainingLogResource::collection($logs);
}
    public function store(StoreTrainingLogRequest $request)
    {
        $user = $request->user();

        $assignment = $user->currentTrainingAssignment();

        if (! $assignment) {
            return response()->json([
                'message' => 'لا يمكنك إضافة سجل بدون تدريب',
            ], 400);
        }

        $data = $request->validated();
        $data['training_assignment_id'] = $assignment->id;

        $log = $this->trainingLogService->createLog($data, $user->id);

        return new TrainingLogResource($log);
    }

    public function show(TrainingLog $trainingLog)
    {
        return new TrainingLogResource($trainingLog->load(['trainingAssignment']));
    }

    public function update(UpdateTrainingLogRequest $request, TrainingLog $trainingLog)
    {
        $trainingLog->update($request->validated());
        return new TrainingLogResource($trainingLog);
    }

    public function submit(TrainingLog $trainingLog)
    {
        $log = $this->trainingLogService->submitLog($trainingLog);
        return new TrainingLogResource($log);
    }

    public function review(ReviewTrainingLogRequest $request, TrainingLog $trainingLog)
    {
        $trainingLog->loadMissing('trainingAssignment.enrollment');
        $log = $this->trainingLogService->reviewLog(
            $trainingLog,
            $request->status,
            $request->supervisor_notes
        );

        return new TrainingLogResource($log);
    }

    public function destroy(TrainingLog $trainingLog)
    {
        $trainingLog->delete();
        return response()->json(['message' => 'تم حذف السجل']);
    }
}