<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAcademicTaskRequest extends FormRequest
{
    private const TASK_TYPE_ALIASES = [
        'teaching' => 'teaching_artifact',
        'portfolio' => 'portfolio_item',
        'report' => 'weekly_report',
        'counseling' => 'counseling_plan',
    ];

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $taskType = (string) $this->input('task_type', '');
        if (isset(self::TASK_TYPE_ALIASES[$taskType])) {
            $this->merge(['task_type' => self::TASK_TYPE_ALIASES[$taskType]]);
        }
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'instructions' => 'nullable|string',
            'due_date' => 'nullable|date',
            'target_type' => 'required|in:student,section,group',
            'target_ids' => 'required|array|min:1',
            'target_ids.*' => 'integer|min:1',
            'task_type' => 'required|in:general,weekly_report,daily_log,portfolio_item,lesson_critique,teaching_artifact,visit_preparation,reflection,counseling_plan,individual_session,group_guidance,case_study,behavior_plan,form_submission',
            'attachments' => 'sometimes|array',
            'attachments.*' => 'string',
            'grading_weight' => 'nullable|numeric|min:0|max:100',
            'allow_resubmission' => 'nullable|boolean',
            'is_required' => 'nullable|boolean',
            'status' => 'nullable|in:pending,in_progress,completed,submitted,graded',
        ];
    }
}
