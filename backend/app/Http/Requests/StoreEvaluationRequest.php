<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEvaluationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'training_assignment_id' => 'required|exists:training_assignments,id',
            'template_id' => 'nullable|exists:evaluation_templates,id',
            'evaluation_type' => 'nullable|string',
            'scores' => 'required|array',
            'scores.*.item_id' => 'required',
            'scores.*.score' => 'nullable|numeric|min:0',
            'scores.*.response_text' => 'nullable|string',
            'scores.*.file' => 'nullable|file',
            'notes' => 'nullable|string',
        ];
    }
}