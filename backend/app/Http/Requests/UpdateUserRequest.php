<?php

namespace App\Http\Requests;

use App\Models\Role;
use App\Models\User;
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

        return [
            'university_id' => ['sometimes', 'nullable', 'numeric', 'digits_between:6,20', Rule::unique('users', 'university_id')->ignore($routeUserId)],
            'name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($routeUserId)],
            'password' => 'sometimes|nullable|string|min:8',
            'status' => 'sometimes|in:active,inactive,suspended',
            'role_id' => 'sometimes|exists:roles,id',
            'department_id' => 'sometimes|nullable|exists:departments,id',
            'training_site_id' => 'sometimes|nullable|exists:training_sites,id',
            'phone' => 'sometimes|nullable|string|max:20',
            'major' => 'sometimes|nullable|string|max:255',
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
            $rolesNeedingSite = ['teacher', 'psychologist', 'school_manager', 'psychology_center_manager'];
            if (in_array($role->name, $rolesNeedingSite, true) && empty($trainingSiteId)) {
                $labels = [
                    'teacher' => 'المعلم المرشد',
                    'psychologist' => 'الأخصائي النفسي',
                    'school_manager' => 'مدير المدرسة',
                    'psychology_center_manager' => 'مدير المركز النفسي',
                ];
                $validator->errors()->add(
                    'training_site_id',
                    "موقع التدريب مطلوب لـ{$labels[$role->name]}."
                );
            }

            // ===== 3) مدير واحد فقط لكل موقع تدريب (يستثني المستخدم الحالي) =====
            $singleManagerRoles = ['school_manager', 'psychology_center_manager'];
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
                $email = $this->input('email');
                if ($email && !str_ends_with(strtolower($email), '@students.hebron.edu')) {
                    $validator->errors()->add(
                        'email',
                        'البريد الإلكتروني للطلاب يجب أن ينتهي بـ @students.hebron.edu'
                    );
                }
            }

            // ===== 5) التخصص إلزامي للطلاب =====
            if ($role->name === 'student') {
                $major = $this->input('major', $current?->major);
                if (empty($major)) {
                    $validator->errors()->add('major', 'التخصص مطلوب للطلاب.');
                }
            }
        });
    }

    private function getStudentRoleId(): ?string
    {
        return (string) Role::where('name', 'student')->value('id');
    }
}