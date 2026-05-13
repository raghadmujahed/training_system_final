<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()->role?->name, ['admin', 'coordinator', 'head_of_department']);
    }

    public function rules(): array
    {
        $sectionId = $this->route('section')?->id ?? $this->route('id');

        return [
            'name' => [
                'sometimes',
                'string',
                'max:255',
                Rule::unique('sections')->where(function ($query) {
                    return $query->where('course_id', $this->course_id)
                        ->where('academic_year', $this->academic_year)
                        ->where('semester', $this->semester);
                })->ignore($sectionId)
            ],
            'academic_year' => 'sometimes|digits:4|integer|min:2000|max:2100',
            'academic_supervisor_id' => 'required|integer|exists:users,id',
            'semester' => 'sometimes|in:first,second,summer',
            'course_id' => 'sometimes|exists:courses,id',
            'capacity' => 'nullable|integer|min:1|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'name.unique' => 'يوجد شعبة بهذا الاسم في نفس المساق والفصل الدراسي والعام الدراسي.',
            'academic_supervisor_id.required' => 'يجب تعيين مشرف أكاديمي للشعبة',
            'academic_supervisor_id.exists' => 'المشرف الأكاديمي المحدد غير موجود',
        ];
    }

    /**
     * Configure the validator instance.
     * Add custom validation to ensure the supervisor has the correct role.
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $supervisorId = $this->input('academic_supervisor_id');

            if (empty($supervisorId)) {
                $validator->errors()->add('academic_supervisor_id', 'يجب تعيين مشرف أكاديمي للشعبة');
                return;
            }

            // Check if user exists and has academic_supervisor role
            $supervisor = \App\Models\User::with('role')->find($supervisorId);

            if (! $supervisor) {
                $validator->errors()->add('academic_supervisor_id', 'المشرف الأكاديمي المحدد غير موجود');
                return;
            }

            if ($supervisor->role?->name !== 'academic_supervisor') {
                $validator->errors()->add('academic_supervisor_id', 'المستخدم المحدد ليس مشرفاً أكاديمياً');
                return;
            }

            // Validate supervisor belongs to same department as course (if course is known)
            $section   = $this->route('section');
            $courseId  = $this->input('course_id') ?? $section?->course_id;

            if ($courseId && $supervisor->department_id) {
                $courseDeptId = \App\Models\Course::where('id', $courseId)->value('department_id');
                if ($courseDeptId && (int) $courseDeptId !== (int) $supervisor->department_id) {
                    $validator->errors()->add('academic_supervisor_id', 'المشرف الأكاديمي يجب أن يكون من نفس قسم المساق.');
                }
            }
        });
    }
}