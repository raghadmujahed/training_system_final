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
    } elseif (!in_array($user->role?->name, ['admin', 'coordinator'], true)) {
        // أي دور غير معروف لا يُعطى بيانات
        $query->whereRaw('1 = 0');
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

    public function show(Request $request, TrainingLog $trainingLog)
    {
        $user = $request->user();
        $trainingLog->loadMissing('trainingAssignment.enrollment');
        $assignment = $trainingLog->trainingAssignment;

        $isOwner = $assignment && $assignment->enrollment?->user_id === $user->id;
        $isFieldActor = $assignment && (
            (int) $assignment->teacher_id === (int) $user->id
            || ($assignment->field_supervisor_id && (int) $assignment->field_supervisor_id === (int) $user->id)
        );
        $isAcademic = in_array($user->role?->name, ['academic_supervisor', 'admin', 'coordinator'], true);

        if (!$isOwner && !$isFieldActor && !$isAcademic) {
            return response()->json(['message' => 'لا تملك صلاحية عرض هذا السجل'], 403);
        }

        return new TrainingLogResource($trainingLog->load(['trainingAssignment.enrollment.user']));
    }

    public function update(UpdateTrainingLogRequest $request, TrainingLog $trainingLog)
    {
        $user = $request->user();
        $trainingLog->loadMissing('trainingAssignment.enrollment');
        $assignment = $trainingLog->trainingAssignment;

        $isOwner = $assignment && $assignment->enrollment?->user_id === $user->id;
        if (!$isOwner) {
            return response()->json(['message' => 'لا تملك صلاحية تعديل هذا السجل'], 403);
        }

        $trainingLog->update($request->validated());
        return new TrainingLogResource($trainingLog);
    }

    public function submit(Request $request, TrainingLog $trainingLog)
    {
        $user = $request->user();
        $trainingLog->loadMissing('trainingAssignment.enrollment');
        $assignment = $trainingLog->trainingAssignment;

        $isOwner = $assignment && $assignment->enrollment?->user_id === $user->id;
        if (!$isOwner) {
            return response()->json(['message' => 'لا تملك صلاحية إرسال هذا السجل'], 403);
        }

        $log = $this->trainingLogService->submitLog($trainingLog);
        return new TrainingLogResource($log);
    }

    public function review(ReviewTrainingLogRequest $request, TrainingLog $trainingLog)
    {
        try {
            $user = $request->user();
            $trainingLog->loadMissing('trainingAssignment.enrollment');

            // التحقق من أن المستخدم هو المعلم المرشد أو المشرف الميداني لهذا السجل
            $assignment = $trainingLog->trainingAssignment;
            if (!$assignment) {
                return response()->json(['message' => 'لا تملك صلاحية مراجعة هذا السجل'], 403);
            }

            $uid = (int) $user->id;
            $isFieldActor = (int) $assignment->teacher_id === $uid
                || ($assignment->field_supervisor_id && (int) $assignment->field_supervisor_id === $uid);

            if (!$isFieldActor) {
                return response()->json(['message' => 'لا تملك صلاحية مراجعة هذا السجل'], 403);
            }

            $log = $this->trainingLogService->reviewLog(
                $trainingLog,
                $request->status,
                $request->supervisor_notes
            );

            $log->load('trainingAssignment.enrollment.user');

            $message = $request->status === 'approved'
                ? 'تمت مراجعة السجل اليومي بنجاح'
                : 'تم إرجاع السجل اليومي للطالب';

            return (new TrainingLogResource($log))
                ->additional(['message' => $message]);
        } catch (\Illuminate\Database\QueryException $e) {
            \Log::error('TrainingLog review DB error: ' . $e->getMessage());
            return response()->json([
                'message' => 'حدث خطأ أثناء حفظ المراجعة، يرجى المحاولة مرة أخرى.',
            ], 500);
        } catch (\Exception $e) {
            \Log::error('TrainingLog review error: ' . $e->getMessage());
            return response()->json([
                'message' => 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى.',
            ], 500);
        }
    }

    public function destroy(Request $request, TrainingLog $trainingLog)
    {
        $user = $request->user();
        $trainingLog->loadMissing('trainingAssignment.enrollment');
        $assignment = $trainingLog->trainingAssignment;

        $isOwner = $assignment && $assignment->enrollment?->user_id === $user->id;
        $isAdmin = in_array($user->role?->name, ['admin', 'coordinator'], true);

        if (!$isOwner && !$isAdmin) {
            return response()->json(['message' => 'لا تملك صلاحية حذف هذا السجل'], 403);
        }

        $trainingLog->delete();
        return response()->json(['message' => 'تم حذف السجل']);
    }
}