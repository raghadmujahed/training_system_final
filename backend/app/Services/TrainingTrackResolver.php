<?php

namespace App\Services;

use App\Models\Department;
use App\Models\TrainingAssignment;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class TrainingTrackResolver
{
    public const USOOL_TARBIAH = 'usool_tarbiah';
    public const PSYCHOLOGY = 'psychology';

    public const USOOL_TARBIAH_SCHOOL = 'usool_tarbiah_school';
    public const PSYCHOLOGY_SCHOOL = 'psychology_school';
    public const PSYCHOLOGY_CLINIC = 'psychology_clinic';

    /** معرّفات الأقسام — تُخزّن مؤقتًا تلقائيًا */
    public static function psychologyDeptId(): ?int
    {
        return Cache::remember('dept_id:psychology', now()->addDay(), fn () => Department::where('name', self::PSYCHOLOGY)->value('id'));
    }

    public static function usoolTarbiahDeptId(): ?int
    {
        return Cache::remember('dept_id:usool_tarbiah', now()->addDay(), fn () => Department::where('name', self::USOOL_TARBIAH)->value('id'));
    }

    public function resolveForAssignment(?TrainingAssignment $assignment): ?string
    {
        if (! $assignment) {
            return null;
        }

        $siteType = strtolower((string) data_get($assignment, 'trainingSite.site_type', ''));
        $departmentId = data_get($assignment, 'enrollment.user.department_id');
        $departmentName = data_get($assignment, 'enrollment.user.department.name');

        // 1) مقارنة بمعرّف القسم (الأسرع — لا يحتاج تحميل العلاقة)
        if ($departmentId === self::psychologyDeptId()) {
            return in_array($siteType, ['health_center', 'clinic', 'center', 'psychology_center'], true)
                ? self::PSYCHOLOGY_CLINIC
                : self::PSYCHOLOGY_SCHOOL;
        }
        if ($departmentId === self::usoolTarbiahDeptId()) {
            return self::USOOL_TARBIAH_SCHOOL;
        }

        // 2) مقارنة باسم القسم (إذا لم يتوفر المعرّف)
        if ($departmentName === self::PSYCHOLOGY) {
            return in_array($siteType, ['health_center', 'clinic', 'center', 'psychology_center'], true)
                ? self::PSYCHOLOGY_CLINIC
                : self::PSYCHOLOGY_SCHOOL;
        }
        if ($departmentName === self::USOOL_TARBIAH) {
            return self::USOOL_TARBIAH_SCHOOL;
        }

        // 3) fallback: تحليل نصي
        $department = strtolower((string) $departmentName);
        $courseCode = strtolower((string) data_get($assignment, 'enrollment.section.course.code', ''));
        $courseName = strtolower((string) data_get($assignment, 'enrollment.section.course.name', ''));

        $isPsychology = $this->looksLikePsychology($department, $courseCode, $courseName);

        if ($isPsychology && in_array($siteType, ['health_center', 'clinic', 'center', 'psychology_center'], true)) {
            return self::PSYCHOLOGY_CLINIC;
        }

        if ($isPsychology) {
            return self::PSYCHOLOGY_SCHOOL;
        }

        return self::USOOL_TARBIAH_SCHOOL;
    }

    public function resolveDepartment(User $user): ?string
    {
        // 1) مقارنة بمعرّف القسم (الأسرع)
        $departmentId = $user->department_id;
        if ($departmentId === self::psychologyDeptId()) {
            return self::PSYCHOLOGY;
        }
        if ($departmentId === self::usoolTarbiahDeptId()) {
            return self::USOOL_TARBIAH;
        }

        // 2) مقارنة باسم القسم (إذا لم يتوفر المعرّف)
        $departmentName = $user->department?->name;
        if ($departmentName === self::PSYCHOLOGY) {
            return self::PSYCHOLOGY;
        }
        if ($departmentName === self::USOOL_TARBIAH) {
            return self::USOOL_TARBIAH;
        }

        // 3) fallback: تحليل نصي
        $department = strtolower((string) $departmentName);

        if ($this->looksLikePsychology($department)) {
            return self::PSYCHOLOGY;
        }

        if (str_contains($department, 'ترب') || str_contains($department, 'usool') || str_contains($department, 'educ')) {
            return self::USOOL_TARBIAH;
        }

        return null;
    }

    private function looksLikePsychology(string ...$parts): bool
    {
        $text = implode(' ', $parts);

        return str_contains($text, 'psych')
            || str_contains($text, 'علم النفس')
            || str_contains($text, 'نفسي');
    }
}
