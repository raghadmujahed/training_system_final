<?php

namespace App\Http\Requests;

use App\Models\Task;
use Illuminate\Foundation\Http\FormRequest;

class StoreTaskSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('task_id')) {
            return;
        }

        $task = $this->route('task');
        if ($task instanceof Task) {
            $this->merge(['task_id' => $task->id]);

            return;
        }

        // مسار الطالب: /student/tasks/{task}/submit — قد يصل المعامل كرقم وليس نموذجاً مربوطاً
        if (is_numeric($task)) {
            $this->merge(['task_id' => (int) $task]);
        }
    }

    public function rules(): array
    {
        return [
            'task_id' => 'required|exists:tasks,id',
            'file' => 'nullable|file|max:10240',
            'notes' => 'nullable|string|max:5000',
        ];
    }
}
