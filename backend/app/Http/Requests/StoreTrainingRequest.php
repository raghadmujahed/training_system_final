<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTrainingRequest extends FormRequest
{
    /**
     * Authorization handled by Policy (can:create)
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validation rules
     */
    public function rules(): array
    {
        return [
            // ❗ مهم: الطالب ما بضيف كتاب
            'letter_number' => 'nullable|string|max:255|unique:training_requests,letter_number',
            'letter_date' => 'nullable|date',

            'training_site_id' => 'required|exists:training_sites,id',
            'training_period_id' => 'required|exists:training_periods,id',

            'students' => 'required|array|min:1',

            'students.*.user_id' => 'required|exists:users,id',
            'students.*.course_id' => 'required|exists:courses,id',

            'students.*.start_date' => 'required|date',
            'students.*.end_date' => 'required|date|after:students.*.start_date',

            'students.*.notes' => 'nullable|string',

            /** مديرية التربية — مطلوبة لمسار المدارس عند إنشاء المشرف لطلبة علم النفس (يُنصح بإرسالها) */
            'directorate' => 'nullable|string|max:255',
        ];
    }

    /**
     * Custom error messages
     */
    public function messages(): array
    {
        return [
            'training_site_id.required' => 'جهة التدريب مطلوبة.',
            'training_site_id.exists' => 'جهة التدريب غير موجودة.',

            'training_period_id.required' => 'فترة التدريب مطلوبة.',

            'students.required' => 'يجب إضافة طالب واحد على الأقل.',
            'students.array' => 'تنسيق الطلاب غير صحيح.',

            'students.*.user_id.required' => 'معرّف الطالب مطلوب.',
            'students.*.user_id.exists' => 'الطالب غير موجود.',

            'students.*.course_id.required' => 'المساق مطلوب.',
            'students.*.course_id.exists' => 'المساق غير موجود.',

            'students.*.start_date.required' => 'تاريخ البداية مطلوب.',
            'students.*.end_date.required' => 'تاريخ النهاية مطلوب.',
            'students.*.end_date.after' => 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية.',
        ];
    }
}