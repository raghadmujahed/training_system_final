<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()->role?->name, ['admin', 'head_of_department']);
    }

    protected function prepareForValidation(): void
    {
        foreach (['credit_hours', 'training_hours'] as $key) {
            $v = $this->input($key);
            if ($v === '' || $v === null) {
                continue;
            }
            if (is_numeric($v)) {
                $this->merge([$key => (int) $v]);
            }
        }
    }

    public function messages(): array
    {
        return [
            'code.unique' => 'كود المساق مستخدم مسبقاً.',
            'credit_hours.min' => 'عدد الساعات الجامعية يجب أن يكون 1 على الأقل.',
            'credit_hours.max' => 'عدد الساعات الجامعية يجب ألا يتجاوز 6 ساعات.',
            'training_hours.min' => 'عدد الساعات التدريبية يجب أن يكون أكبر من صفر.',
            'training_hours.max' => 'عدد الساعات التدريبية يجب ألا يتجاوز 500 ساعة.',
            'department_id.exists' => 'القسم المحدد غير موجود.',
        ];
    }

    public function rules(): array
    {
        $course = $this->route('course');
        $courseId = is_object($course) ? $course->id : $course;
        return [
            'code' => 'sometimes|string|max:255|unique:courses,code,' . $courseId,
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'credit_hours' => 'sometimes|integer|min:1|max:6',
            'training_hours' => 'sometimes|integer|min:1|max:500',
            'type' => 'sometimes|in:practical,theoretical,both',
            'department_id' => 'sometimes|exists:departments,id',
        ];
    }
}