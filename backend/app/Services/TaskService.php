<?php

namespace App\Services;

use App\Models\Notification as AppNotification;
use App\Models\Task;
use App\Models\TaskSubmission;
use App\Enums\TaskStatus;
use Illuminate\Support\Facades\Storage;

class TaskService
{
    /**
     * إشعار الطلبة المستهدفين بعد إنشاء مهمة/مهام (صف واحد لكل طالب — بدون تكرار).
     *
     * @param  iterable<int, Task>  $tasks
     */
    public function notifyStudentsForNewTasks(iterable $tasks): void
    {
        $notifiedUserIds = [];

        foreach ($tasks as $task) {
            if (! $task instanceof Task) {
                continue;
            }

            $task->loadMissing('trainingAssignment.enrollment');
            $studentId = (int) ($task->trainingAssignment?->enrollment?->user_id ?? 0);
            if ($studentId <= 0 || isset($notifiedUserIds[$studentId])) {
                continue;
            }

            $notifiedUserIds[$studentId] = true;
            $this->createTaskAssignedNotification($task, $studentId);
        }
    }

    private function createTaskAssignedNotification(Task $task, int $studentId): void
    {
        $dueLabel = $task->due_date
            ? $task->due_date->format('Y-m-d')
            : null;

        AppNotification::create([
            'user_id' => $studentId,
            'type' => 'task_assigned',
            'message' => 'تم تكليفك بمهمة جديدة: "'.$task->title.'"'.($dueLabel ? ' — موعد التسليم: '.$dueLabel : ''),
            'notifiable_type' => Task::class,
            'notifiable_id' => $task->id,
            'data' => [
                'task_id' => $task->id,
                'distribution_key' => $task->distribution_key,
                'due_date' => $dueLabel,
            ],
        ]);
    }

    public function createTask(array $data, int $assignedBy): Task
    {
        $data['assigned_by'] = $assignedBy;
        $data['status'] = TaskStatus::PENDING->value;
        $task = Task::create($data);

        $this->notifyStudentsForNewTasks(collect([$task]));

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

        $this->notifySupervisorOfSubmission($task, $submission);

        return $submission;
    }

    public function notifySupervisorOfSubmission(Task $task, TaskSubmission $submission): void
    {
        if (! $task->assigned_by) {
            return;
        }

        $submission->loadMissing('user');
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

    public function gradeSubmission(TaskSubmission $submission, float $grade, ?string $feedback = null): TaskSubmission
    {
        $submission->loadMissing('task');
        if (! $submission->task) {
            return $submission;
        }

        $submission->update([
            'score' => $grade,
            'feedback' => $feedback,
        ]);

        $submission->task->update(['status' => TaskStatus::GRADED->value]);

        $maxScore = $submission->task->grading_weight;
        $maxScore = is_numeric($maxScore) && (float) $maxScore > 0 ? (float) $maxScore : 100.0;

        // إشعار الطالب بالتقييم
        AppNotification::create([
            'user_id' => $submission->user_id,
            'type' => 'task_graded',
            'message' => "تم تقييم تسليمك للمهمة \"{$submission->task->title}\". الدرجة: {$grade} من {$maxScore}",
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