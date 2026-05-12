<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use App\Models\User;

class UpdateTrainingSiteRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        // Normalize empty strings to null
        if ($this->input('phone') === '') {
            $this->merge(['phone' => null]);
        }
        if ($this->input('mobile') === '') {
            $this->merge(['mobile' => null]);
        }
        if ($this->input('manager_id') === '') {
            $this->merge(['manager_id' => null]);
        }
    }

    public function authorize(): bool
    {
        $role = $this->user()?->role?->name;
        if (in_array($role, ['admin', 'education_directorate', 'ministry_of_health'], true)) {
            return true;
        }
        if (in_array($role, ['school_manager', 'principal', 'psychology_center_manager'], true)) {
            $site = $this->route('training_site');
            return $site
                && $this->user()->training_site_id
                && (int) $this->user()->training_site_id === (int) $site->id;
        }
        return false;
    }

    protected function failedAuthorization()
    {
        throw new HttpResponseException(response()->json([
            'message' => 'ليس لديك صلاحية لتعديل هذا المكان.',
        ], 403));
    }

    public function rules(): array
    {
        $trainingSite = $this->route('training_site');
        $role = $this->user()?->role?->name;

        $siteType = $this->input('site_type', $trainingSite?->site_type ?? 'school');
        $isSchool = ($siteType === 'school');

        $baseRules = [
            'name' => [
                'sometimes', 'string', 'max:255',
                Rule::unique('training_sites', 'name')->ignore($trainingSite?->id),
            ],
            'location'             => 'nullable|string|max:255',
            'phone'                => ['nullable', 'string', 'max:20', 'regex:/^02\d{7}$/'],
            'email'                => 'nullable|email|max:255',
            'mobile'               => ['nullable', 'string', 'max:20', 'regex:/^0(56|59)\d{7}$/'],
            'description'          => 'nullable|string',
            'directorate'          => 'sometimes|in:وسط,شمال,جنوب,يطا',
            'school_type'          => $isSchool ? 'sometimes|in:public,private,unrwa' : 'nullable|in:public,private,unrwa',
            'gender_classification' => 'nullable|in:boys,girls,mixed',
            'school_level'         => $isSchool ? 'sometimes|in:lower,upper,both' : 'nullable|in:lower,upper,both',
            'manager_id'           => 'sometimes|nullable|exists:users,id',
        ];

        // School managers / principals can only update limited fields
        if (in_array($role, ['school_manager', 'principal', 'psychology_center_manager'], true)) {
            return $baseRules;
        }

        // Admin / directorate users get full rule set
        return array_merge($baseRules, [
            'is_active'       => 'boolean',
            'capacity'        => 'sometimes|integer|min:1',
            'site_type'       => 'sometimes|in:school,health_center',
            'governing_body'  => 'sometimes|in:directorate_of_education,ministry_of_health,health_directorate,education_directorate',
        ]);
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            $user = $this->user();
            $role = $user?->role?->name;
            $trainingSite = $this->route('training_site');

            // Directorate restriction for education_directorate role
            if ($role === 'education_directorate' && $user->directorate) {
                $submitted = $this->input('directorate');
                if ($submitted && $submitted !== $user->directorate) {
                    $validator->errors()->add(
                        'directorate',
                        'لا يمكنك تعديل مكان تدريب تابع لمديرية أخرى. مديريتك: ' . $user->directorate
                    );
                    return;
                }
                // Also prevent editing a site that belongs to another directorate
                if ($trainingSite && $trainingSite->directorate && $trainingSite->directorate !== $user->directorate) {
                    $validator->errors()->add(
                        'directorate',
                        'لا يمكنك تعديل مكان تدريب تابع لمديرية أخرى.'
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

                $allowedManagerRoles = ['school_manager', 'principal', 'psychology_center_manager'];
                if (!in_array($manager->role?->name, $allowedManagerRoles, true)) {
                    $validator->errors()->add('manager_id', 'مدير المدرسة المحدد لا يملك دور مدير مدرسة.');
                    return;
                }

                $existingAssignment = \App\Models\TrainingSite::where('manager_id', $managerId)
                    ->where('id', '!=', $trainingSite?->id)
                    ->first();
                if ($existingAssignment) {
                    $validator->errors()->add('manager_id', 'هذا المدير مرتبط بمدرسة أخرى حالياً.');
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'name.unique'          => 'يوجد مكان تدريب بهذا الاسم مسبقاً.',
            'directorate.in'       => 'المديرية المختارة غير صحيحة.',
            'phone.regex'          => 'رقم الهاتف الأرضي غير صحيح. يجب أن يبدأ بـ 02 ويتكون من 9 أرقام.',
            'mobile.regex'         => 'رقم الجوال غير صحيح. يجب أن يبدأ بـ 056 أو 059 ويتكون من 10 أرقام.',
            'school_type.in'       => 'تصنيف المدرسة غير صحيح.',
            'school_level.in'      => 'مرحلة المدرسة غير صحيحة.',
            'capacity.min'         => 'السعة يجب أن تكون 1 على الأقل.',
        ];
    }
}