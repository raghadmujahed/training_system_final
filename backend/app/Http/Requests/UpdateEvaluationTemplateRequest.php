<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Schema;

class UpdateEvaluationTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()->role?->name, ['admin', 'training_coordinator', 'academic_supervisor', 'school_manager']);
    }

    public function rules(): array
    {
        $templateId = (int) $this->route('evaluation_template')?->id;
        $hasDepartmentKey = Schema::hasColumn('evaluation_templates', 'department_key');
        $nameRule = Rule::unique('evaluation_templates', 'name')
            ->ignore($templateId)
            ->where(function ($q) use ($hasDepartmentKey) {
                $q->where('form_type', $this->input('form_type', $this->route('evaluation_template')?->form_type))
                    ->where('target_role', $this->input('target_role', $this->route('evaluation_template')?->target_role));
                if ($hasDepartmentKey) {
                    $q->where('department_key', $this->input('department_key', $this->route('evaluation_template')?->department_key));
                }
            });
        return [
            'name' => [
                'sometimes',
                'string',
                'max:255',
                $nameRule,
            ],
            'description' => 'nullable|string',
            'form_type' => 'sometimes|in:evaluation,student_form',
            'target_role' => 'nullable|in:teacher,academic_supervisor,psychologist,school_manager,adviser,field_supervisor,supervisor',
            'department_key' => ($hasDepartmentKey ? 'nullable|in:psychology,usool_tarbiah' : 'nullable'),
        ];
    }
}