<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskSubmissionRequest;
use App\Http\Requests\UpdateTaskSubmissionRequest;
use App\Http\Requests\GradeTaskSubmissionRequest;
use App\Http\Requests\StudentUpdateTaskSubmissionRequest;
use App\Http\Resources\TaskSubmissionResource;
use App\Models\TaskSubmission;
use App\Models\Task;
use App\Services\TaskService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TaskSubmissionController extends Controller
{
    public function __construct(private readonly TaskService $taskService)
    {
        // تطبيق سياسة الصلاحيات على جميع دوال الـ Resource
        $this->authorizeResource(TaskSubmission::class, 'task_submission');
    }

    /**
     * عرض جميع تسليمات المهام (يمكن تصفيتها حسب task_id أو user_id)
     */
    public function index(Request $request)
    {
        $query = TaskSubmission::with(['task', 'user']);
        
        if ($request->has('task_id')) {
            $query->where('task_id', $request->task_id);
        }
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        
        $submissions = $query->latest()->paginate($request->per_page ?? 15);
        return TaskSubmissionResource::collection($submissions);
    }

    /**
     * تسليم مهمة (رفع ملف)
     */
    public function store(StoreTaskSubmissionRequest $request)
    {
        $data = $request->validated();

        $task = Task::with('trainingAssignment.enrollment')->findOrFail($data['task_id']);
        $studentId = $request->user()->id;
        if ($task->trainingAssignment?->enrollment?->user_id !== $studentId) {
            abort(403, 'هذه المهمة لا تخصك.');
        }

        $existing = TaskSubmission::query()
            ->where('task_id', $task->id)
            ->where('user_id', $studentId)
            ->orderByDesc('id')
            ->first();

        if ($existing?->submitted_at && ! $task->allow_resubmission) {
            abort(422, 'تم تسليم هذه المهمة مسبقاً.');
        }
        if ($existing?->submitted_at && $task->allow_resubmission) {
            abort(422, 'لإعادة التسليم استخدم تحديث التسليم.');
        }

        $filePath = $existing?->file_path;
        if ($request->hasFile('file')) {
            if ($existing?->file_path) {
                Storage::disk('public')->delete($existing->file_path);
            }
            $filePath = $request->file('file')->store('task_submissions', 'public');
        }

        $submission = TaskSubmission::updateOrCreate(
            [
                'task_id' => $task->id,
                'user_id' => $studentId,
            ],
            [
                'file_path' => $filePath,
                'notes' => array_key_exists('notes', $data) ? $data['notes'] : $existing?->notes,
                'submitted_at' => now(),
                'status' => 'submitted',
            ]
        );

        // تحديث حالة المهمة إلى "submitted" إذا كانت لا تزال pending أو in_progress
        if ($task && in_array($task->status, ['pending', 'in_progress'])) {
            $task->update(['status' => 'submitted']);
        }

        $this->taskService->notifySupervisorOfSubmission($task, $submission);

        return new TaskSubmissionResource($submission);
    }

    /**
     * عرض تسليم معين
     */
    public function show(TaskSubmission $taskSubmission)
    {
        return new TaskSubmissionResource($taskSubmission->load(['task', 'user']));
    }

    /**
     * تحديث تسليم الطالب (إعادة التسليم)
     */
    public function studentUpdate(UpdateTaskSubmissionRequest $request, TaskSubmission $taskSubmission)
    {
        // التأكد أن التسليم يخص الطالب الحالي
        if ($request->user()->id !== $taskSubmission->user_id) {
            abort(403, 'هذا التسليم لا يخصك.');
        }

        // لا يمكن تعديل التسليم بعد اعتماده، ما لم يُطلب إعادة تسليم
        $locked = $taskSubmission->submitted_at
            && ! $taskSubmission->needs_resubmission
            && in_array((string) $taskSubmission->review_status, ['graded', 'accepted'], true);
        if ($locked) {
            abort(422, 'لا يمكن تعديل التسليم بعد التقييم.');
        }

        $data = $request->validated();

        if ($request->hasFile('file')) {
            // حذف الملف القديم إن وجد
            if ($taskSubmission->file_path) {
                Storage::disk('public')->delete($taskSubmission->file_path);
            }
            $data['file_path'] = $request->file('file')->store('task_submissions', 'public');
        }

        $taskSubmission->update([
            'file_path' => $data['file_path'] ?? $taskSubmission->file_path,
            'notes' => $data['notes'] ?? $taskSubmission->notes,
            'submitted_at' => now(),
        ]);

        // تحديث حالة المهمة إلى submitted
        if ($taskSubmission->task && in_array($taskSubmission->task->status, ['pending', 'in_progress'])) {
            $taskSubmission->task->update(['status' => 'submitted']);
        }

        return new TaskSubmissionResource($taskSubmission);
    }

    /**
     * تحديث تسليم (نادراً ما يستخدم، لكن يمكن للطالب تعديل تسليمه قبل التقييم)
     */
    public function update(UpdateTaskSubmissionRequest $request, TaskSubmission $taskSubmission)
    {
        $data = $request->validated();
        
        if ($request->hasFile('file')) {
            // حذف الملف القديم إن وجد
            if ($taskSubmission->file_path) {
                Storage::disk('public')->delete($taskSubmission->file_path);
            }
            $data['file_path'] = $request->file('file')->store('task_submissions', 'public');
        }
        
        $taskSubmission->update($data);
        return new TaskSubmissionResource($taskSubmission);
    }

    /**
     * تقييم التسليم (إضافة درجة وملاحظات) – للمشرف أو المعلم
     */
    public function grade(GradeTaskSubmissionRequest $request, TaskSubmission $taskSubmission)
    {
        $this->authorize('grade', $taskSubmission);
        
        $taskSubmission->update([
            'score' => $request->grade,
            'feedback' => $request->feedback,
        ]);
        
        // تحديث حالة المهمة إلى "graded"
        $taskSubmission->task->update(['status' => 'graded']);
        
        return new TaskSubmissionResource($taskSubmission);
    }

    /**
     * حذف تسليم
     */
    public function destroy(TaskSubmission $taskSubmission)
    {
        // حذف الملف المرتبط
        if ($taskSubmission->file_path) {
            Storage::disk('public')->delete($taskSubmission->file_path);
        }
        
        $taskSubmission->delete();
        return response()->json(['message' => 'تم حذف التسليم بنجاح']);
    }
}