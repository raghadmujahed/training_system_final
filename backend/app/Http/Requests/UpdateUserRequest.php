<?php

namespace App\Http\Requests;

use App\Models\Role;
use App\Models\User;
use App\Support\AcademicMajors;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        $routeUser = $this->route('user');
        $routeUserId = $routeUser instanceof User ? $routeUser->id : (int) $routeUser;

        return $this->user()->role?->name === 'admin'
            || $this->user()->id === $routeUserId;
    }

    public function rules(): array
    {
        $routeUser = $this->route('user');
        $routeUserId = $routeUser instanceof User ? $routeUser->id : (int) $routeUser;
        $isAdmin = $this->user()->role?->name === 'admin';

        return [
            'university_id' => ['sometimes', 'nullable', 'numeric', 'digits_between:6,20', Rule::unique('users', 'university_id')->ignore($routeUserId)],
            'name' => 'sometimes|string|max:255',
            'email' => $isAdmin
                ? ['sometimes', 'required', 'email', Rule::unique('users', 'email')->ignore($routeUserId)]
                : ['prohibited'],
            'password' => 'sometimes|nullable|string|min:8',
            'status' => 'sometimes|in:active,inactive,suspended',
            'role_id' => 'sometimes|exists:roles,id',
            'department_id' => 'sometimes|nullable|exists:departments,id',
            'training_site_id' => 'sometimes|nullable|exists:training_sites,id',
            'phone' => 'sometimes|nullable|string|max:20',
            'major' => ['sometimes', 'nullable', 'string', Rule::in(AcademicMajors::all())],
            'directorate' => 'sometimes|nullable|in:وسط,شمال,جنوب,يطا',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            $routeUser = $this->route('user');
            $routeUserId = $routeUser instanceof User ? $routeUser->id : (int) $routeUser;
            $current = User::find($routeUserId);

            // أخذ القيمة من الـ request أو من المستخدم الحالي إن لم تُرسَل
            $roleId = $this->input('role_id', $current?->role_id);
            $trainingSiteId = $this->has('training_site_id')
                ? $this->input('training_site_id')
                : $current?->training_site_id;
            $departmentId = $this->has('department_id')
                ? $this->input('department_id')
                : $current?->department_id;

            if (! $roleId) {
                return;
            }

            $role = Role::find($roleId);
            if (! $role) {
                return;
            }

            // ===== 1) القسم إلزامي للمشرف الأكاديمي ورئيس القسم =====
            $rolesNeedingDepartment = ['academic_supervisor', 'head_of_department'];
            if (in_array($role->name, $rolesNeedingDepartment, true) && empty($departmentId)) {
                $label = $role->name === 'head_of_department' ? 'رئيس القسم' : 'المشرف الأكاديمي';
                $validator->errors()->add('department_id', "القسم مطلوب لـ{$label}.");
            }

            // ===== 2) موقع التدريب إلزامي للمعلم/الأخصائي ومدير المدرسة/المركز =====
            $rolesNeedingSite = ['teacher', 'psychologist', 'school_manager', 'principal', 'psychology_center_manager'];
            if (in_array($role->name, $rolesNeedingSite, true) && empty($trainingSiteId)) {
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

            // ===== 3) مدير واحد فقط لكل موقع تدريب (يستثني المستخدم الحالي) =====
            $singleManagerRoles = ['school_manager', 'principal', 'psychology_center_manager'];
            if (in_array($role->name, $singleManagerRoles, true) && $trainingSiteId) {
                $exists = User::where('role_id', $roleId)
                    ->where('training_site_id', $trainingSiteId)
                    ->where('id', '!=', $routeUserId)
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
                $email = $this->input('email', $current?->email);
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
                $email = $this->input('email', $current?->email);
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
                $email = $this->input('email', $current?->email);
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
                $universityId = $this->input('university_id', $current?->university_id);
                if (empty($universityId)) {
                    $validator->errors()->add('university_id', 'الرقم الجامعي مطلوب للطلاب.');
                } elseif (!ctype_digit((string) $universityId)) {
                    $validator->errors()->add('university_id', 'الرقم الجامعي يجب أن يحتوي على أرقام فقط.');
                }
            } else {
                // رفض فقط إذا حاول الطلب تعيين رقم جامعي لغير طالب (لا نستخدم القيمة المخزّنة عند غياب الحقل في الطلب)
                if ($this->has('university_id') && filled((string) $this->input('university_id'))) {
                    $validator->errors()->add('university_id', 'الرقم الجامعي مخصص للطلاب فقط.');
                }
            }

            // ===== 5) التخصص إلزامي ومن القائمة للطلاب والمعلمين =====
            $rolesNeedingMajor = ['student', 'teacher', 'adviser'];
            if (in_array($role->name, $rolesNeedingMajor, true)) {
                $majorRaw = $this->has('major') ? $this->input('major') : $current?->major;
                $major = AcademicMajors::normalize($majorRaw);
                if ($major === null) {
                    $validator->errors()->add('major', 'التخصص مطلوب. اختر تخصصاً صالحاً من القائمة.');
                } elseif ($role->name === 'student') {
                    $departmentId = (int) ($this->has('department_id')
                        ? $this->input('department_id')
                        : $current?->department_id);
                    if ($departmentId && ! AcademicMajors::isValidForDepartment($major, $departmentId)) {
                        $validator->errors()->add('major', 'التخصص غير مطابق للقسم المختار.');
                    }
                }
            }
        });
    }

    private function getStudentRoleId(): ?string
    {
        return (string) Role::where('name', 'student')->value('id');
    }

    public function messages(): array
    {
        return [
            'email.prohibited' => 'لا يُسمح بتغيير البريد الإلكتروني من هنا. يعدّل البريد مسؤول النظام فقط.',
        ];
    }
}