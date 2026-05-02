<?php

namespace App\Support;

use App\Models\Department;
use App\Models\Enrollment;
use App\Models\TrainingRequest;
use App\Models\TrainingSite;
use App\Models\User;
use App\Services\TrainingTrackResolver;
use Illuminate\Validation\ValidationException;

/**
 * فصل منطق التدريب لقسم علم النفس: المشرف الأكاديمي يملك إنشاء الطلبات والدفعات
 * (دون تغيير سير أصول التربية عند المنسق).
 */
final class PsychologyAcademicWorkflow
{
    public static function departmentIsPsychology(?int $departmentId): bool
    {
        if ($departmentId === null) {
            return false;
        }

        return $departmentId === TrainingTrackResolver::psychologyDeptId();
    }

    public static function userHasPsychologyDepartment(?User $user): bool
    {
        return self::departmentIsPsychology($user?->department_id);
    }

    public static function isPsychologyAcademicSupervisor(?User $user): bool
    {
        return $user?->role?->name === 'academic_supervisor'
            && self::userHasPsychologyDepartment($user);
    }

    public static function isOrchestratedByPsychologySupervisor(TrainingRequest $request): bool
    {
        $request->loadMissing('requestedBy');
        $by = $request->requestedBy;

        return $by && self::isPsychologyAcademicSupervisor($by);
    }

    public static function isPsychologyCoordinator(?User $user): bool
    {
        return in_array($user?->role?->name, ['coordinator', 'training_coordinator'], true)
            && self::userHasPsychologyDepartment($user);
    }

    /**
     * @param  array<int, array{user_id: int, course_id: int, ...}>  $studentRows
     */
    public static function assertSupervisorOverseesPsychologyStudents(User $supervisor, array $studentRows): void
    {
        if (! self::isPsychologyAcademicSupervisor($supervisor)) {
            return;
        }

        foreach ($studentRows as $i => $row) {
            $studentId = (int) ($row['user_id'] ?? 0);
            if (! $studentId) {
                throw ValidationException::withMessages([
                    "students.$i.user_id" => ['معرّف الطالب غير صالح.'],
                ]);
            }

            $student = User::query()->find($studentId);
            if (! $student || ! self::userHasPsychologyDepartment($student)) {
                throw ValidationException::withMessages([
                    "students.$i.user_id" => ['هذا المسار يقتصر على طلبة قسم علم النفس.'],
                ]);
            }

            $courseId = (int) ($row['course_id'] ?? 0);
            $supervised = Enrollment::query()
                ->where('user_id', $studentId)
                ->when($courseId > 0, fn ($q) => $q->whereHas('section.course', fn ($c) => $c->where('id', $courseId)))
                ->whereHas('section', function ($q) use ($supervisor) {
                    $q->where('academic_supervisor_id', $supervisor->id);
                })
                ->exists();

            if (! $supervised) {
                throw ValidationException::withMessages([
                    "students.$i.user_id" => ['لا يمكن إنشاء طلب إلا لطالب تشرف على شعبه مباشرة وبمساق مطابق للتسجيل.'],
                ]);
            }
        }
    }

    public static function assertTrainingSiteMatchesPsychologyTrack(int $trainingSiteId, User $supervisor): void
    {
        if (! self::isPsychologyAcademicSupervisor($supervisor)) {
            return;
        }

        $site = TrainingSite::query()->findOrFail($trainingSiteId);
        $type = strtolower((string) $site->site_type);

        if (! in_array($type, ['school', 'health_center'], true)) {
            throw ValidationException::withMessages([
                'training_site_id' => ['نوع جهة التدريب غير مدعوم لهذا المسار.'],
            ]);
        }
    }
}
