<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()->role?->name, ['admin', 'coordinator', 'training_coordinator'], true);
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'status' => 'nullable|in:draft,active,archived',
            'published_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after_or_equal:published_at',
            'all_students' => 'nullable|boolean',
            'target_type' => 'nullable|in:all_students,sections,student',
            'section_ids' => 'nullable|array|min:1',
            'section_ids.*' => 'integer|exists:sections,id',
            'student_id' => 'nullable|integer|exists:users,id',
            'target_roles' => 'nullable|array',
            'target_roles.*' => 'exists:roles,id',
            'target_users' => 'nullable|array',
            'target_users.*' => 'exists:users,id',
            'target_departments' => 'nullable|array',
            'target_departments.*' => 'exists:departments,id',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $targetType = $this->input('target_type', 'all_students');

            if ($targetType === 'sections' && empty($this->input('section_ids'))) {
                $validator->errors()->add('section_ids', 'يرجى اختيار شعبة واحدة على الأقل');
            }

            if ($targetType === 'student' && !$this->input('student_id')) {
                $validator->errors()->add('student_id', 'يرجى اختيار الطالب المستهدف');
            }
        });
    }

    public function messages(): array
    {
        return [
            'title.required' => 'عنوان الإعلان مطلوب',
            'content.required' => 'محتوى الإعلان مطلوب',
            'target_type.in' => 'نوع الفئة المستهدفة غير صالح',
            'section_ids.min' => 'يرجى اختيار شعبة واحدة على الأقل',
            'section_ids.*.exists' => 'إحدى الشعب المختارة غير موجودة',
            'student_id.exists' => 'الطالب المختار غير موجود',
        ];
    }
}