<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()->role?->name, ['admin', 'head_of_department']);
    }

    public function rules(): array
    {
        return [
            'code' => 'required|string|max:255|unique:courses',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'credit_hours' => 'required|integer|min:1|max:6',
            'training_hours' => 'required|integer|min:1|max:500',
            'type' => 'required|in:practical,theoretical,both',
            'department_id' => 'required|exists:departments,id',
        ];
    }

    public function messages(): array
    {
        return [
            'code.required' => 'كود المساق مطلوب.',
            'code.unique' => 'كود المساق مستخدم مسبقاً.',
            'name.required' => 'اسم المساق مطلوب.',
            'credit_hours.required' => 'عدد الساعات الجامعية مطلوب.',
            'credit_hours.min' => 'عدد الساعات الجامعية يجب أن يكون 1 على الأقل.',
            'credit_hours.max' => 'عدد الساعات الجامعية يجب ألا يتجاوز 6 ساعات.',
            'training_hours.required' => 'عدد الساعات التدريبية مطلوب.',
            'training_hours.min' => 'عدد الساعات التدريبية يجب أن يكون أكبر من صفر.',
            'training_hours.max' => 'عدد الساعات التدريبية يجب ألا يتجاوز 500 ساعة.',
            'type.required' => 'نوع المساق مطلوب.',
            'department_id.required' => 'القسم مطلوب.',
            'department_id.exists' => 'القسم المحدد غير موجود.',
        ];
    }

    protected function prepareForValidation(): void
    {
        // If head_of_department, automatically set their department_id
        if ($this->user()->role?->name === 'head_of_department' && $this->user()->department_id) {
            $this->merge([
                'department_id' => $this->user()->department_id,
            ]);
        }

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
}