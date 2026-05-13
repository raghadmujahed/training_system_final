<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Enums\Semester;
use Illuminate\Validation\Rule;
use App\Models\Course;
use App\Models\TrainingPeriod;
use App\Models\User;

class StoreSectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()->role?->name, ['admin', 'training_coordinator', 'coordinator', 'head_of_department']);
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('sections')->where(function ($query) {
                    // Use the active period's id server-side — never trust client input for this
                    $activePeriodId = TrainingPeriod::active()->value('id');
                    return $query->where('course_id', $this->course_id)
                        ->where('training_period_id', $activePeriodId);
                })->whereNull('archived_at')
            ],
            'academic_year' => 'required|digits:4|integer|min:2000|max:2100',
            'academic_supervisor_id' => 'required|integer|exists:users,id',
            'semester' => 'required|in:first,second,summer',
            'course_id' => 'required|exists:courses,id',
            'capacity' => 'nullable|integer|min:1|max:1000',
            'department_id' => 'nullable|exists:departments,id',
        ];
    }

    public function messages(): array
    {
        return [
            'name.unique' => 'يوجد شعبة بهذا الاسم في نفس المساق والفترة التدريبية الحالية.',
            'academic_supervisor_id.required' => 'يجب تعيين مشرف أكاديمي للشعبة',
            'academic_supervisor_id.exists' => 'المشرف الأكاديمي المحدد غير موجود',
            'course_id.exists' => 'المساق المحدد غير موجود',
            'department_id.exists' => 'القسم المحدد غير موجود',
        ];
    }

    /**
     * Configure the validator instance.
     * Add custom validation to ensure:
     * 1. There is an active training period
     * 2. Course belongs to selected department
     * 3. Supervisor belongs to selected department
     * 4. Academic year and semester match active training period
     * 5. Supervisor has academic_supervisor role
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Check for active training period
            $activePeriod = TrainingPeriod::active()->first();
            if (! $activePeriod) {
                $validator->errors()->add('training_period', 'لا توجد فترة تدريبية مفعلة حالياً، يرجى تفعيل فترة تدريبية أولاً.');
                return;
            }

            $supervisorId = $this->input('academic_supervisor_id');
            $courseId = $this->input('course_id');
            $departmentId = $this->input('department_id');
            $academicYear = $this->input('academic_year');
            $semester = $this->input('semester');

            // Validate academic year matches active period
            if ($academicYear && (int) $academicYear !== (int) $activePeriod->start_date->format('Y')) {
                $validator->errors()->add('academic_year', 'السنة الأكاديمية يجب أن تطابق سنة الفترة التدريبية المفعلة (' . $activePeriod->start_date->format('Y') . ').');
            }

            // Validate semester matches active period
            $expectedSemester = $this->resolveSemesterFromDates($activePeriod->start_date, $activePeriod->end_date);
            if ($semester && $semester !== $expectedSemester) {
                $validator->errors()->add('semester', 'الفصل الدراسي يجب أن يطابق الفترة التدريبية المفعلة (' . $this->getSemesterLabel($expectedSemester) . ').');
            }

            if (empty($supervisorId)) {
                $validator->errors()->add('academic_supervisor_id', 'يجب تعيين مشرف أكاديمي للشعبة');
                return;
            }

            // Check if user exists and has academic_supervisor role
            $supervisor = User::with(['role', 'department'])->find($supervisorId);

            if (! $supervisor) {
                $validator->errors()->add('academic_supervisor_id', 'المشرف الأكاديمي المحدد غير موجود');
                return;
            }

            if ($supervisor->role?->name !== 'academic_supervisor') {
                $validator->errors()->add('academic_supervisor_id', 'المستخدم المحدد ليس مشرفاً أكاديمياً');
                return;
            }

            // Validate course exists and get its department
            if ($courseId) {
                $course = Course::with('department')->find($courseId);
                if (! $course) {
                    $validator->errors()->add('course_id', 'المساق المحدد غير موجود');
                    return;
                }

                // Validate course belongs to selected department
                if ($departmentId && (int) $course->department_id !== (int) $departmentId) {
                    $validator->errors()->add('course_id', 'المساق المحدد لا ينتمي إلى القسم المختار.');
                    return;
                }

                // Validate supervisor belongs to same department as course
                if ($course->department_id && $supervisor->department_id) {
                    if ((int) $course->department_id !== (int) $supervisor->department_id) {
                        $validator->errors()->add('academic_supervisor_id', 'المشرف الأكاديمي يجب أن يكون من نفس قسم المساق.');
                    }
                }
            }

            // Validate supervisor belongs to selected department (if department is explicitly selected)
            if ($departmentId && $supervisor->department_id) {
                if ((int) $supervisor->department_id !== (int) $departmentId) {
                    $validator->errors()->add('academic_supervisor_id', 'المشرف الأكاديمي المحدد لا ينتمي إلى القسم المختار.');
                }
            }
        });
    }

    /**
     * Resolve semester from date range
     */
    private function resolveSemesterFromDates($startDate, $endDate): string
    {
        $startMonth = (int) $startDate->format('n');
        $endMonth = (int) $endDate->format('n');

        // Summer: June-August (6-8)
        if ($startMonth >= 6 && $startMonth <= 8) {
            return 'summer';
        }

        // Second semester: January-May (1-5)
        if ($startMonth >= 1 && $startMonth <= 5) {
            return 'second';
        }

        // First semester: September-December (9-12)
        return 'first';
    }

    /**
     * Get Arabic label for semester
     */
    private function getSemesterLabel(string $semester): string
    {
        return match ($semester) {
            'first' => 'الفصل الأول',
            'second' => 'الفصل الثاني',
            'summer' => 'الفصل الصيفي',
            default => $semester,
        };
    }
}