<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SaveTaskBundleGradesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'grades' => 'required|array|min:1',
            'grades.*.user_id' => 'required|integer|exists:users,id',
            'grades.*.score' => 'nullable|numeric|min:0|max:100',
            'grades.*.feedback' => 'nullable|string|max:2000',
        ];
    }
}
