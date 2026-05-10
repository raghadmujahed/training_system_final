<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;
use App\Enums\UserStatus;
use App\Models\Role;
use App\Models\User;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->role?->name === 'admin';
    }

    public function rules(): array
    {
        $studentRoleId = $this->getStudentRoleId();

        return [
            'university_id' => 'required_if:role_id,' . $studentRoleId . '|nullable|numeric|digits_between:6,20|unique:users,university_id',
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'status' => 'required|in:active,inactive,suspended',
            'department_id' => 'required_if:role_id,' . $studentRoleId . '|nullable|exists:departments,id',
            'role_id' => 'required|exists:roles,id',
            'phone' => [
                'nullable',
                'string',
                'max:20',
                'regex:/^(\+970|970)?(05[0-9]|02)\d{7}$/'
            ],
            'major' => 'required_if:role_id,' . $studentRoleId . '|nullable|string|max:255',
            'training_site_id' => 'nullable|exists:training_sites,id',
            'directorate' => 'nullable|in:وسط,شمال,جنوب,يطا',
        ];
    }

    public function messages(): array
    {
        return [
            'university_id.required_if' => 'الرقم الجامعي مطلوب للطلاب.',
            'university_id.numeric' => 'الرقم الجامعي يجب أن يكون أرقام فقط.',
            'university_id.digits_between' => 'الرقم الجامعي يجب أن يكون بين 6 و 20 رقم.',
            'university_id.unique' => 'الرقم الجامعي مستخدم مسبقاً.',
            'major.required_if' => 'التخصص مطلوب للطلاب.',
            'email.unique' => 'البريد الإلكتروني مستخدم مسبقاً.',
            'department_id.required_if' => 'القسم مطلوب للطلاب.',
            'phone.regex' => 'رقم الهاتف غير صحيح، يرجى إدخال رقم هاتف فلسطيني صالح.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            $roleId = $this->input('role_id');
            if (! $roleId) {
                return;
            }

            $role = Role::find($roleId);
            if (! $role) {
                return;
            }

            // ===== 1) القسم (department_id) إلزامي للمشرف الأكاديمي ورئيس القسم =====
            $rolesNeedingDepartment = ['academic_supervisor', 'head_of_department'];
            if (in_array($role->name, $rolesNeedingDepartment, true) && ! $this->filled('department_id')) {
                $label = $role->name === 'head_of_department' ? 'رئيس القسم' : 'المشرف الأكاديمي';
                $validator->errors()->add('department_id', "القسم مطلوب لـ{$label}.");
            }

            // ===== 2) موقع التدريب إلزامي للمعلم/الأخصائي ومدير المدرسة/المركز =====
            $rolesNeedingSite = ['teacher', 'psychologist', 'school_manager', 'principal', 'psychology_center_manager'];
            if (in_array($role->name, $rolesNeedingSite, true) && ! $this->filled('training_site_id')) {
                $labels = [
                    'teacher' => 'المعلم المرشد',
                    'psychologist' => 'الأخصائي النفسي',
                    'school_manager' => 'مدير المدرسة',
                    'principal' => 'مدير المدرسة',
                    'psychology_center_manager' => 'مدير المركز النفسي',
                ];
                $validator->errors()->add(
                    'training_site_id',
                    "موقع التدريب مطلوب لـ{$labels[$role->name]}."
                );
            }

            // ===== 3) مدير واحد فقط لكل موقع تدريب =====
            $singleManagerRoles = ['school_manager', 'principal', 'psychology_center_manager'];
            $trainingSiteId = $this->input('training_site_id');
            if (in_array($role->name, $singleManagerRoles, true) && $trainingSiteId) {
                $exists = User::where('role_id', $roleId)
                    ->where('training_site_id', $trainingSiteId)
                    ->exists();

                if ($exists) {
                    $label = $role->name === 'psychology_center_manager'
                        ? 'مدير للمركز النفسي'
                        : 'مدير للمدرسة';
                    $validator->errors()->add(
                        'training_site_id',
                        "يوجد بالفعل {$label} مُعيَّن لهذا الموقع. لا يمكن تعيين أكثر من مدير واحد."
                    );
                }
            }

            // ===== 4) البريد الإلكتروني للطلاب يجب أن يكون من نطاق @students.hebron.edu =====
            if ($role->name === 'student') {
                $email = $this->input('email');
                if ($email && !str_ends_with(strtolower($email), '@students.hebron.edu')) {
                    $validator->errors()->add(
                        'email',
                        'يجب أن ينتهي بريد الطالب بـ @students.hebron.edu'
                    );
                }
            }

            // ===== 5) البريد الإلكتروني للدور الجامعية الداخلية يجب أن يكون من نطاق @hebron.edu =====
            $universityInternalRoles = ['training_coordinator', 'head_of_department', 'admin', 'academic_supervisor'];
            if (in_array($role->name, $universityInternalRoles, true)) {
                $email = $this->input('email');
                if ($email && !str_ends_with(strtolower($email), '@hebron.edu')) {
                    $validator->errors()->add(
                        'email',
                        'يجب أن ينتهي بريد هذا الدور بـ @hebron.edu'
                    );
                }
            }

            // ===== 6) البريد الإلكتروني لأدوار المدرسة/الحقل التعليمي يجب أن يكون من نطاق @hebron.edu.ps =====
            $schoolFieldRoles = ['school_manager', 'principal', 'teacher', 'adviser'];
            if (in_array($role->name, $schoolFieldRoles, true)) {
                $email = $this->input('email');
                if ($email && !str_ends_with(strtolower($email), '@hebron.edu.ps')) {
                    $validator->errors()->add(
                        'email',
                        'يجب أن ينتهي بريد هذا الدور بـ @hebron.edu.ps'
                    );
                }
            }

            // ===== 7) أدوار لم يتم تحديد نطاق البريد الإلكتروني لها بعد (لا يوجد تحقق محدد) =====
            // psychologist, psychology_center_manager, education_directorate, health_directorate
            // يتم تطبيق التحقق من البريد الإلكتروني العادي فقط

            // ===== 6) التحقق من الرقم الجامعي للطلاب فقط =====
            if ($role->name === 'student') {
                $universityId = $this->input('university_id');
                if (empty($universityId)) {
                    $validator->errors()->add('university_id', 'الرقم الجامعي مطلوب للطلاب.');
                } elseif (!ctype_digit((string) $universityId)) {
                    $validator->errors()->add('university_id', 'الرقم الجامعي يجب أن يحتوي على أرقام فقط.');
                }
            } else {
                // للموظفين، يجب ألا يتم إرسال الرقم الجامعي أو يجب أن يكون فارغاً
                $universityId = $this->input('university_id');
                if (!empty($universityId)) {
                    $validator->errors()->add('university_id', 'الرقم الجامعي مخصص للطلاب فقط.');
                }
            }
        });
    }

    private function getStudentRoleId(): ?string
    {
        return (string) Role::where('name', 'student')->value('id');
    }
}