<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Schema;

class StoreEvaluationTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()->role?->name, ['admin', 'training_coordinator', 'academic_supervisor', 'school_manager', 'principal']);
    }

    public function rules(): array
    {
        $hasDepartmentKey = Schema::hasColumn('evaluation_templates', 'department_key');
        $nameRule = Rule::unique('evaluation_templates', 'name')
            ->where(function ($q) use ($hasDepartmentKey) {
                $q->where('form_type', $this->input('form_type', 'evaluation'))
                    ->where('target_role', $this->input('target_role'));
                if ($hasDepartmentKey) {
                    $q->where('department_key', $this->input('department_key'));
                }
            });

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                $nameRule,
            ],
            'description' => 'nullable|string',
            'form_type' => 'required|in:evaluation,student_form',
            'target_role' => 'nullable|in:teacher,academic_supervisor,psychologist,school_manager,principal,adviser,field_supervisor,supervisor',
            'department_key' => ($hasDepartmentKey ? 'nullable|in:psychology,usool_tarbiah' : 'nullable'),
        ];
    }
}