<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Enums\AttendanceStatus;

class StoreAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // سيتم التحكم عبر Policy لاحقاً
    }

    public function rules(): array
    {
        return [
            'training_assignment_id' => 'required|exists:training_assignments,id',
            'date' => 'required|date',
            'check_in' => 'nullable|date_format:H:i',
            'check_out' => ['nullable', 'date_format:H:i', function ($attr, $value, $fail) {
                if ($value && $this->check_in && $value <= $this->check_in) {
                    $fail('ساعة المغادرة يجب أن تكون بعد ساعة الحضور.');
                }
            }],
            'status' => 'required|in:present,absent,late',
            'periods' => 'nullable|integer|min:0|max:20',
            'notes' => 'nullable|string',
        ];
    }
}