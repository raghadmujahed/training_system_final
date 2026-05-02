<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Enums\OfficialLetterType;

class StoreOfficialLetterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()->role?->name, ['coordinator', 'education_directorate']);
    }

    public function rules(): array
    {
        return [
            'training_request_id' => 'required|exists:training_requests,id',
            'letter_number' => 'required|string|max:255|unique:official_letters,letter_number',
            'letter_date' => 'required|date',
            'type' => 'required|in:to_directorate,to_school,to_health_ministry',
            'content' => 'required|string',
            'file_path' => 'nullable|string|max:255',
        ];
    }
}
