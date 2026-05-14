<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class ReviewTrainingLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status'           => 'required|in:approved,returned',
            'supervisor_notes' => 'required_if:status,returned|nullable|string|max:2000',
        ];
    }

    public function messages(): array
    {
        return [
            'status.required'              => 'حالة السجل اليومي مطلوبة.',
            'status.in'                    => 'حالة السجل اليومي غير صحيحة. القيم المقبولة: قبول أو إرجاع.',
            'supervisor_notes.required_if' => 'ملاحظات المشرف مطلوبة عند إرجاع السجل.',
            'supervisor_notes.max'         => 'ملاحظات المشرف يجب ألا تتجاوز 2000 حرف.',
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(
            response()->json([
                'message' => $validator->errors()->first(),
                'errors'  => $validator->errors(),
            ], 422)
        );
    }
}