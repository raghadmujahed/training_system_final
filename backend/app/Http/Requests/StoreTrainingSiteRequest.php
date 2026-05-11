<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Validation\ValidationException;
use App\Models\User;
use App\Models\Role;

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
            'phone' => 'required|string|max:20|regex:/^02\d{7}$/',
            'email' => 'nullable|email|max:255',
            'mobile' => 'required|string|max:20|regex:/^0(56|59)\d{7}$/',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'directorate' => 'required|in:وسط,شمال,جنوب,يطا',
            'capacity' => 'required|integer|min:1',
            'school_type' => 'required|in:public,private,unrwa',
            'gender_classification' => 'nullable|in:boys,girls,mixed',
            'school_level' => 'required|in:lower,upper,both',
            'site_type' => 'nullable|in:school,health_center',
            'governing_body' => 'nullable|in:directorate_of_education,ministry_of_health,health_directorate,education_directorate',
            'manager_id' => 'nullable|exists:users,id',
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

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            $managerId = $this->input('manager_id');
            
            if ($managerId) {
                $manager = User::find($managerId);
                
                if (!$manager) {
                    $validator->errors()->add('manager_id', 'المستخدم المحدد غير موجود');
                    return;
                }
                
                // Check if user has school_manager role
                $schoolManagerRole = Role::whereIn('name', ['school_manager', 'principal'])->first();
                if ((!$schoolManagerRole || $manager->role_id !== $schoolManagerRole->id) && !in_array($manager->role?->name, ['school_manager', 'principal'], true)) {
                    $validator->errors()->add('manager_id', 'مدير المدرسة يجب أن يكون حساباً موجوداً بدور مدير مدرسة');
                    return;
                }
                
                // Check if manager is already linked to another school
                $existingAssignment = \App\Models\TrainingSite::where('manager_id', $managerId)->first();
                if ($existingAssignment) {
                    $validator->errors()->add('manager_id', 'هذا المدير مرتبط بمدرسة أخرى حالياً');
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'phone.required' => 'رقم الهاتف مطلوب ويجب أن يكون صحيحاً',
            'phone.regex' => 'رقم الهاتف الأرضي غير صحيح. يجب أن يتكون من 9 أرقام ويبدأ بـ 02',
            'mobile.required' => 'رقم المحمول مطلوب ويجب أن يكون صحيحاً',
            'mobile.regex' => 'رقم المحمول غير صحيح. يجب أن يتكون من 10 أرقام ويبدأ بـ 056 أو 059',
            'school_type.required' => 'تصنيف المدرسة مطلوب',
            'school_level.required' => 'المرحلة الدراسية مطلوبة',
        ];
    }
}