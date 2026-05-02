<?php

namespace App\Http\Requests;

use App\Support\PsychologyAcademicWorkflow;
use Illuminate\Foundation\Http\FormRequest;

class SendTrainingRequestToDirectorateRequest extends FormRequest
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
            'letter_number' => 'required|string|max:255',
            'letter_date' => 'required|date',
            'content' => 'required|string',
        ];
    }
}