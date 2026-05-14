<?php

namespace App\Services;

use App\Models\Notification as AppNotification;
use App\Models\Task;
use App\Models\TaskSubmission;
use App\Enums\TaskStatus;
use Illuminate\Support\Facades\Storage;

class TaskService
{
    public function createTask(array $data, int $assignedBy): Task
    {
        $data['assigned_by'] = $assignedBy;
        $data['status'] = TaskStatus::PENDING->value;
        $task = Task::create($data);

        // إشعار الطالب المعني (عن طريق training_assignment.enrollment.user_id)
        $task->loadMissing('trainingAssignment.enrollment');
        $studentId = $task->trainingAssignment?->enrollment?->user_id;
        if ($studentId) {
            AppNotification::create([
                'user_id' => $studentId,
                'type' => 'task_assigned',
                'message' => "تم تكليفك بمهمة جديدة: \"{$task->title}\"" . ($task->due_date ? " — موعد التسليم: {$task->due_date}" : ''),
                'notifiable_type' => Task::class,
                'notifiable_id' => $task->id,
                'data' => [
                    'task_id' => $task->id,
                    'due_date' => $task->due_date,
                ],
            ]);
        }

        return $task;
    }

    public function updateTask(Task $task, array $data): Task
    {
        $task->update($data);
        return $task;
    }

    public function submitTask(Task $task, int $userId, array $submissionData): TaskSubmission
    {
        // رفع الملف إذا وُجد
        $filePath = null;
        if (isset($submissionData['file']) && $submissionData['file']->isValid()) {
            $filePath = $submissionData['file']->store('task_submissions', 'public');
        }

        $submission = TaskSubmission::create([
            'task_id' => $task->id,
            'user_id' => $userId,
            'file_path' => $filePath,
            'notes' => $submissionData['notes'] ?? null,
            'submitted_at' => now(),
        ]);

        // تحديث حالة المهمة إلى submitted إذا لم تكن مقيمة
        if ($task->status !== TaskStatus::GRADED->value) {
            $task->update(['status' => TaskStatus::SUBMITTED->value]);
        }

        // إشعار من كلّف المهمة بأن الطالب رفع التسليم
        if ($task->assigned_by) {
            $studentName = $submission->user?->name ?? 'الطالب';
            AppNotification::create([
                'user_id' => $task->assigned_by,
                'type' => 'task_submitted',
                'message' => "قام {$studentName} بتسليم المهمة \"{$task->title}\".",
                'notifiable_type' => Task::class,
                'notifiable_id' => $task->id,
                'data' => [
                    'task_id' => $task->id,
                    'submission_id' => $submission->id,
                ],
            ]);
        }

        return $submission;
    }

    public function gradeSubmission(TaskSubmission $submission, float $grade, ?string $feedback = null): TaskSubmission
    {
        $submission->update([
            'score' => $grade,
            'feedback' => $feedback,
        ]);

        // تحديث حالة المهمة إلى graded
        $submission->task->update(['status' => TaskStatus::GRADED->value]);

        // إشعار الطالب بالتقييم
        AppNotification::create([
            'user_id' => $submission->user_id,
            'type' => 'task_graded',
            'message' => "تم تقييم تسليمك للمهمة \"{$submission->task->title}\". الدرجة: {$grade}",
            'notifiable_type' => Task::class,
            'notifiable_id' => $submission->task_id,
            'data' => [
                'task_id' => $submission->task_id,
                'submission_id' => $submission->id,
                'grade' => $grade,
            ],
        ]);

        return $submission;
    }
}