<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Contracts\Validation\Validator;
use App\Models\User;
use App\Models\Role;

class UpdateTrainingSiteRequest extends FormRequest
{
    public function authorize(): bool
    {
        $role = $this->user()->role?->name;
        if (in_array($role, ['admin', 'education_directorate', 'ministry_of_health'], true)) {
            return true;
        }
        if (in_array($role, ['school_manager', 'principal', 'psychology_center_manager'])) {
            $site = $this->route('training_site');

            return $site
                && $this->user()->training_site_id
                && (int) $this->user()->training_site_id === (int) $site->id;
        }

        return false;
    }

    public function rules(): array
    {
        $trainingSite = $this->route('training_site');
        $role = $this->user()->role?->name;

        if (in_array($role, ['school_manager', 'principal', 'psychology_center_manager'])) {
            return [
                'name' => [
                    'sometimes',
                    'string',
                    'max:255',
                    Rule::unique('training_sites', 'name')->ignore($trainingSite?->id),
                ],
                'location' => 'nullable|string|max:255',
                'phone' => ['sometimes', 'string', 'max:20', 'regex:/^(\+970|970)?(02|05[0-9])\d{6,7}$/'],
                'email' => 'nullable|email|max:255',
                'mobile' => ['sometimes', 'string', 'max:20', 'regex:/^(\+970|970)?(05[0-9])\d{7}$/'],
                'description' => 'nullable|string',
                'directorate' => 'sometimes|in:وسط,شمال,جنوب,يطا',
                'school_type' => 'sometimes|in:public,private,unrwa',
                'gender_classification' => 'nullable|in:boys,girls,mixed',
                'school_level' => 'sometimes|in:lower,upper,both',
                'manager_id' => 'sometimes|nullable|exists:users,id',
            ];
        }

        return [
            'name' => [
                'sometimes',
                'string',
                'max:255',
                Rule::unique('training_sites', 'name')->ignore($trainingSite?->id),
            ],
            'location' => 'nullable|string|max:255',
            'phone' => ['sometimes', 'string', 'max:20', 'regex:/^(\+970|970)?(02|05[0-9])\d{6,7}$/'],
            'email' => 'nullable|email|max:255',
            'mobile' => ['sometimes', 'string', 'max:20', 'regex:/^(\+970|970)?(05[0-9])\d{7}$/'],
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'capacity' => 'sometimes|integer|min:1',
            'directorate' => 'sometimes|in:وسط,شمال,جنوب,يطا',
            'school_type' => 'sometimes|in:public,private,unrwa',
            'gender_classification' => 'nullable|in:boys,girls,mixed',
            'school_level' => 'sometimes|in:lower,upper,both',
            'site_type' => 'sometimes|in:school,health_center',
            'governing_body' => 'sometimes|in:directorate_of_education,ministry_of_health,health_directorate,education_directorate',
            'manager_id' => 'sometimes|nullable|exists:users,id',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            $managerId = $this->input('manager_id');
            $trainingSite = $this->route('training_site');
            
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
                
                // Check if manager is already linked to another school (exclude current school)
                $existingAssignment = \App\Models\TrainingSite::where('manager_id', $managerId)
                    ->where('id', '!=', $trainingSite?->id)
                    ->first();
                if ($existingAssignment) {
                    $validator->errors()->add('manager_id', 'هذا المدير مرتبط بمدرسة أخرى حالياً');
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'phone.regex' => 'رقم الهاتف يجب أن يكون صحيحاً (مثال: 022222222 أو +97022222222)',
            'mobile.regex' => 'رقم المحمول يجب أن يكون صحيحاً (مثال: 0591234567 أو +970591234567)',
            'school_type.required' => 'تصنيف المدرسة مطلوب',
            'school_level.required' => 'المرحلة الدراسية مطلوبة',
        ];
    }
}