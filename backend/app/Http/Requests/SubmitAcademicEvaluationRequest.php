<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmitAcademicEvaluationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'criteria_scores' => 'required|array|min:1',
            'criteria_scores.*.criterion' => 'required|string|max:255',
            'criteria_scores.*.score' => 'required|numeric|min:0',
            'criteria_scores.*.max_score' => 'nullable|numeric|min:0',
            'criteria_scores.*.weight' => 'nullable|numeric|min:0|max:100',
            'criteria_scores.*.is_required' => 'nullable|boolean',
            'notes' => 'required|string',
            'strengths' => 'required|string',
            'areas_for_improvement' => 'required|string',
            'recommendation' => 'required|string|max:255',
            'total_score' => 'required|numeric|min:0',
        ];
    }
}
