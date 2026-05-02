<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTrainingSiteRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (! $this->filled('capacity')) {
            $this->merge(['capacity' => 3]);
        }
    }

    public function authorize(): bool
    {
        return in_array($this->user()->role?->name, [
            'admin',
            'education_directorate',
            'ministry_of_health',
        ]);
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255|unique:training_sites,name',
            'location' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'mobile' => 'nullable|string|max:20',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'directorate' => 'required|in:وسط,شمال,جنوب,يطا',
            'capacity' => 'required|integer|min:1',
            'school_type' => 'required|in:public,private',
            'gender_classification' => 'nullable|in:boys,girls,mixed',
            'school_level' => 'nullable|in:lower,upper',
            'site_type' => 'nullable|in:school,health_center',
            'governing_body' => 'nullable|in:directorate_of_education,ministry_of_health,health_directorate,education_directorate',
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => 'اسم المدرسة',
            'location' => 'موقع المدرسة',
            'phone' => 'رقم الهاتف',
            'email' => 'البريد الإلكتروني',
            'mobile' => 'رقم المحمول',
            'directorate' => 'المديرية',
            'capacity' => 'السعة',
            'school_type' => 'نوع المدرسة',
            'gender_classification' => 'تصنيف المدرسة',
            'school_level' => 'مرحلة المدرسة',
        ];
    }
}