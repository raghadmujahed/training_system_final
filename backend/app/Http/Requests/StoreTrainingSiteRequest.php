<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use App\Models\User;
use App\Models\Role;

class StoreTrainingSiteRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (! $this->filled('capacity')) {
            $this->merge(['capacity' => 3]);
        }

        // Normalize empty phone/mobile to null so nullable rules apply correctly
        if ($this->input('phone') === '') {
            $this->merge(['phone' => null]);
        }
        if ($this->input('mobile') === '') {
            $this->merge(['mobile' => null]);
        }
        if ($this->input('manager_id') === '') {
            $this->merge(['manager_id' => null]);
        }

        // Force-overwrite directorate for directorate users — they cannot submit a different one
        $user = $this->user();
        $role = $user?->role?->name;
        if (in_array($role, ['education_directorate', 'health_directorate'], true) && $user->directorate) {
            $this->merge(['directorate' => $user->directorate]);
        }
    }

    public function authorize(): bool
    {
        $role = $this->user()?->role?->name;
        return in_array($role, [
            'admin',
            'education_directorate',
            'ministry_of_health',
        ], true);
    }

    protected function failedAuthorization()
    {
        throw new HttpResponseException(response()->json([
            'message' => 'ليس لديك صلاحية لإضافة مكان تدريب.',
        ], 403));
    }

    public function rules(): array
    {
        $isSchool = ($this->input('site_type', 'school') === 'school');

        return [
            'name'                => 'required|string|max:255|unique:training_sites,name',
            'location'            => 'nullable|string|max:255',
            'phone'               => ['nullable', 'string', 'max:20', 'regex:/^02\d{7}$/'],
            'email'               => 'nullable|email|max:255',
            'mobile'              => ['nullable', 'string', 'max:20', 'regex:/^0(56|59)\d{7}$/'],
            'description'         => 'nullable|string',
            'is_active'           => 'boolean',
            'directorate'         => 'required|in:وسط,شمال,جنوب,يطا',
            'capacity'            => 'required|integer|min:1',
            'site_type'           => 'nullable|in:school,health_center',
            'governing_body'      => 'nullable|in:directorate_of_education,ministry_of_health,health_directorate,education_directorate',
            'school_type'         => $isSchool ? 'required|in:public,private,unrwa' : 'nullable|in:public,private,unrwa',
            'gender_classification' => 'nullable|in:boys,girls,mixed',
            'school_level'        => $isSchool ? 'required|in:lower,upper,both' : 'nullable|in:lower,upper,both',
            'manager_id'          => 'nullable|exists:users,id',
        ];
    }

    public function attributes(): array
    {
        return [
            'name'                 => 'اسم مكان التدريب',
            'location'             => 'الموقع',
            'phone'                => 'رقم الهاتف',
            'email'                => 'البريد الإلكتروني',
            'mobile'               => 'رقم المحمول',
            'directorate'          => 'المديرية',
            'capacity'             => 'السعة',
            'school_type'          => 'تصنيف المدرسة',
            'gender_classification' => 'تصنيف الطلاب',
            'school_level'         => 'مرحلة المدرسة',
            'manager_id'           => 'مدير المدرسة',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            $user = $this->user();
            $role = $user?->role?->name;

            // Directorate restriction: must be linked to a directorate
            if (in_array($role, ['education_directorate', 'health_directorate'], true)) {
                if (empty($user->directorate)) {
                    $validator->errors()->add(
                        'directorate',
                        'لم يتم ربط حسابك بمديرية، يرجى التواصل مع مدير النظام'
                    );
                    return;
                }
                // Prevent any submitted directorate that differs from user's own
                $submitted = $this->input('directorate');
                if ($submitted && $submitted !== $user->directorate) {
                    $validator->errors()->add(
                        'directorate',
                        'لا تملك صلاحية إدارة أماكن تدريب خارج مديريتك. مديريتك: ' . $user->directorate
                    );
                    return;
                }
            }

            // Manager validation
            $managerId = $this->input('manager_id');
            if ($managerId) {
                $manager = User::find($managerId);

                if (!$manager) {
                    $validator->errors()->add('manager_id', 'مدير المدرسة المحدد غير موجود.');
                    return;
                }

                $managerRoleName = $manager->role?->name;
                $allowedManagerRoles = ['school_manager', 'principal', 'psychology_center_manager'];
                if (!in_array($managerRoleName, $allowedManagerRoles, true)) {
                    $validator->errors()->add('manager_id', 'مدير المدرسة المحدد لا يملك دور مدير مدرسة.');
                    return;
                }

                $existingAssignment = \App\Models\TrainingSite::where('manager_id', $managerId)->first();
                if ($existingAssignment) {
                    $validator->errors()->add('manager_id', 'هذا المدير مرتبط بمدرسة أخرى حالياً.');
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'name.required'        => 'اسم مكان التدريب مطلوب.',
            'name.unique'          => 'يوجد مكان تدريب بهذا الاسم مسبقاً.',
            'directorate.required' => 'المديرية مطلوبة.',
            'directorate.in'       => 'المديرية المختارة غير صحيحة.',
            'phone.regex'          => 'رقم الهاتف الأرضي غير صحيح. يجب أن يبدأ بـ 02 ويتكون من 9 أرقام.',
            'mobile.regex'         => 'رقم الجوال غير صحيح. يجب أن يبدأ بـ 056 أو 059 ويتكون من 10 أرقام.',
            'school_type.required' => 'تصنيف المدرسة مطلوب.',
            'school_type.in'       => 'تصنيف المدرسة غير صحيح.',
            'school_level.required' => 'مرحلة المدرسة مطلوبة.',
            'school_level.in'      => 'مرحلة المدرسة غير صحيحة.',
            'capacity.required'    => 'السعة الاستيعابية مطلوبة.',
            'capacity.min'         => 'السعة يجب أن تكون 1 على الأقل.',
        ];
    }
}