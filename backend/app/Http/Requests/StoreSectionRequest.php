<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Enums\Semester;
use Illuminate\Validation\Rule;

class StoreSectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()->role?->name, ['admin', 'coordinator', 'head_of_department']);
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('sections')->where(function ($query) {
                    return $query->where('course_id', $this->course_id)
                        ->where('academic_year', $this->academic_year)
                        ->where('semester', $this->semester);
                })
            ],
            'academic_year' => 'required|digits:4|integer|min:2000|max:2100',
            'academic_supervisor_id' => 'required|integer|exists:users,id',
            'semester' => 'required|in:first,second,summer',
            'course_id' => 'required|exists:courses,id',
            'capacity' => 'nullable|integer|min:1|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'name.unique' => 'يوجد شعبة بهذا الاسم في نفس المساق والفصل الدراسي والعام الدراسي.',
            'academic_supervisor_id.required' => 'يجب اختيار مشرف أكاديمي للشعبة',
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
                $validator->errors()->add('academic_supervisor_id', 'يجب اختيار مشرف أكاديمي للشعبة');
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
            }
        });
    }
}