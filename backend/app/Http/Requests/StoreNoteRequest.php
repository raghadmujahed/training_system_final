<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('user_id') && $this->user()) {
            $this->merge(['user_id' => $this->user()->id]);
        }
    }

    public function rules(): array
    {
        return [
            'user_id' => 'required|exists:users,id',
            'training_assignment_id' => 'required|exists:training_assignments,id',
            'content' => 'required|string',
        ];
    }
}