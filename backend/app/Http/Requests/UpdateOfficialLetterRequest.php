<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOfficialLetterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->id === $this->route('officialLetter')->sent_by;
    }

    public function rules(): array
    {
        return [
            'content' => 'sometimes|string',
            'status' => 'sometimes|in:draft,sent_to_directorate,sent_to_school,sent_to_health_ministry,health_ministry_rejected,directorate_approved,completed,rejected',
        ];
    }
}