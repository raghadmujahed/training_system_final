<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTrainingLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // سيتم التحكم عبر Policy لاحقاً
    }

    public function rules(): array
    {
        $rules = [
            'status' => 'sometimes|in:draft,submitted,reviewed,approved,returned',
            'supervisor_notes' => 'nullable|string',
            'student_reflection' => 'nullable|string',
        ];

        if ($this->user()?->role?->name === 'student') {
            $rules['log_date'] = 'sometimes|date';
            $rules['start_time'] = 'nullable|date_format:H:i';
            $rules['end_time'] = 'nullable|date_format:H:i';
            $rules['activities_performed'] = 'sometimes|string';
        }

        return $rules;
    }
}