<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ApproveTrainingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()->role?->name, ['education_directorate', 'school_manager', 'psychology_center_manager', 'principal']);
    }

    public function rules(): array
    {
        return [
            'status' => 'required|in:approved,rejected',
            'rejection_reason' => 'required_if:status,rejected|nullable|string',
            // للمدرسة فقط: يمكن تعيين معلمين لكل طالب في كتاب منفصل
            'students' => 'required_if:role,school_manager|required_if:role,psychology_center_manager|array',
            'students.*.id' => 'required_with:students|exists:training_request_students,id',
            'students.*.assigned_teacher_id' => 'required_with:students|exists:users,id',
        ];
    }

    public function messages(): array
    {
        return [
            'status.required' => 'يجب تحديد حالة الموافقة (مقبول/مرفوض).',
            'rejection_reason.required_if' => 'سبب الرفض مطلوب عند رفض الطلب.',
        ];
    }
}