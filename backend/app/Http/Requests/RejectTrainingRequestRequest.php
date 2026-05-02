<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RejectTrainingRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()->role?->name, [
            'coordinator',
            'training_coordinator',
            'education_directorate',
            'school_manager',
            'psychology_center_manager',
            'academic_supervisor',
        ], true);
    }

    public function rules(): array
    {
        return [
            'rejection_reason' => 'required|string',
        ];
    }
}