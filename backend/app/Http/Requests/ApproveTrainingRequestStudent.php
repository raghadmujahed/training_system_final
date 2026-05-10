<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ApproveTrainingRequestStudent extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $role = $user->role?->name;
        return in_array($role, ['education_directorate', 'school_manager', 'psychology_center_manager', 'principal', 'coordinator']);
    }

    public function rules(): array
    {
        return [
            'status' => 'required|in:approved,rejected,needs_modification',
            'rejection_reason' => 'required_if:status,rejected|nullable|string',
            'assigned_teacher_id' => 'required_if:status,approved|nullable|exists:users,id',
        ];
    }

    public function messages(): array
    {
        return [
            'rejection_reason.required_if' => 'سبب الرفض مطلوب عند رفض الطلب.',
            'assigned_teacher_id.required_if' => 'يجب تعيين معلم مرشد عند قبول الطلب.',
        ];
    }
}