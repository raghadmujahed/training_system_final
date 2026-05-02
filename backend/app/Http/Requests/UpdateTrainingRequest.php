<?php

namespace App\Http\Requests;

use App\Support\PsychologyAcademicWorkflow;
use Illuminate\Foundation\Http\FormRequest;

class UpdateTrainingRequest extends FormRequest
{
    public function authorize(): bool
    {
        $u = $this->user();

        return in_array($u->role?->name, ['coordinator', 'training_coordinator'], true)
            || PsychologyAcademicWorkflow::isPsychologyAcademicSupervisor($u);
    }

    public function rules(): array
    {
        return [
            'letter_number' => 'sometimes|string|max:255|unique:training_requests,letter_number,' . $this->route('training_request'),
            'letter_date' => 'sometimes|date',
            'training_site_id' => 'sometimes|exists:training_sites,id',
            'training_period_id' => 'sometimes|exists:training_periods,id',
        ];
    }
}