<?php

namespace App\Http\Controllers\Api\Chat;

use App\Http\Controllers\Controller;
use App\Models\TrainingAssignment;
use App\Models\User;
use App\Services\Chat\ChatPermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserProfileController extends Controller
{
    public function __construct(private ChatPermissionService $permissions) {}

    /**
     * GET /api/chat/user-profile/{id}
     * Returns profile info for a chat participant, scoped to visible fields by role.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $viewer = $request->user();
        $target = User::with(['role', 'department', 'trainingSite', 'fieldSupervisorProfile'])
            ->findOrFail($id);

        // Viewer must be allowed to chat with this user (or admin)
        if ($viewer->role?->name !== 'admin' && ! $this->permissions->canMessage($viewer, $target)) {
            return response()->json(['success' => false, 'message' => 'غير مسموح'], 403);
        }

        $role = $target->role?->name;

        $profile = [
            'id'         => $target->id,
            'name'       => $target->name,
            'email'      => $target->email,
            'phone'      => $target->phone,
            'role'       => $role,
            'role_label' => $this->roleLabel($role),
            'department' => $target->department?->name,
            'status'     => $target->status,
        ];

        // ─── Role-specific fields ────────────────────────────
        switch ($role) {
            case 'student':
                $profile = array_merge($profile, $this->studentFields($target));
                break;

            case 'academic_supervisor':
                $profile = array_merge($profile, $this->academicSupervisorFields($target));
                break;

            case 'field_supervisor':
                $profile = array_merge($profile, $this->fieldSupervisorFields($target));
                break;

            case 'teacher':
            case 'adviser':
            case 'psychologist':
                $profile = array_merge($profile, $this->fieldStaffFields($target));
                break;

            case 'training_coordinator':
                $profile = array_merge($profile, $this->coordinatorFields($target));
                break;

            case 'head_of_department':
                $profile = array_merge($profile, $this->headOfDeptFields($target));
                break;

            case 'school_manager':
            case 'psychology_center_manager':
                $profile = array_merge($profile, $this->managerFields($target));
                break;
        }

        return response()->json(['success' => true, 'data' => $profile]);
    }

    // ─── Student ──────────────────────────────────────────────

    private function studentFields(User $user): array
    {
        $assignment = $user->currentTrainingAssignment();
        $enrollment = $user->currentEnrollment();

        return [
            'university_id'       => $user->university_id,
            'major'               => $user->major,
            'training_site'       => $assignment?->trainingSite?->name,
            'training_period'     => $assignment?->trainingPeriod?->name ?? null,
            'academic_supervisor' => $assignment?->academicSupervisor?->name ?? null,
            'field_supervisor'    => $assignment?->teacher?->name ?? $assignment?->fieldSupervisorAccount?->name ?? null,
            'course'              => $enrollment?->section?->course?->name ?? null,
            'section'             => $enrollment?->section?->name ?? null,
            'assignment_status'   => $assignment?->status ?? null,
        ];
    }

    // ─── Academic Supervisor ──────────────────────────────────

    private function academicSupervisorFields(User $user): array
    {
        $studentCount = TrainingAssignment::where('academic_supervisor_id', $user->id)->count();

        return [
            'university_id'  => $user->university_id,
            'student_count'  => $studentCount,
            'training_site'  => $user->trainingSite?->name,
        ];
    }

    // ─── Field Supervisor ─────────────────────────────────────

    private function fieldSupervisorFields(User $user): array
    {
        $profile = $user->fieldSupervisorProfile;
        $studentCount = TrainingAssignment::where('field_supervisor_id', $user->id)->count();

        return [
            'supervisor_type'  => $profile?->supervisor_type,
            'specialization'   => $profile?->specialization,
            'governing_body'   => $profile?->governing_body,
            'training_site'    => $user->trainingSite?->name,
            'student_count'    => $studentCount,
            'directorate'      => $user->directorate,
        ];
    }

    // ─── Field Staff (teacher/adviser/psychologist) ───────────

    private function fieldStaffFields(User $user): array
    {
        $studentCount = TrainingAssignment::where('teacher_id', $user->id)->count();

        return [
            'university_id' => $user->university_id,
            'training_site' => $user->trainingSite?->name,
            'student_count' => $studentCount,
        ];
    }

    // ─── Coordinator ──────────────────────────────────────────

    private function coordinatorFields(User $user): array
    {
        return [
            'university_id' => $user->university_id,
            'directorate'   => $user->directorate,
        ];
    }

    // ─── Head of Department ───────────────────────────────────

    private function headOfDeptFields(User $user): array
    {
        return [
            'university_id' => $user->university_id,
        ];
    }

    // ─── Manager (school / psychology center) ─────────────────

    private function managerFields(User $user): array
    {
        return [
            'training_site' => $user->trainingSite?->name,
            'directorate'   => $user->directorate,
        ];
    }

    // ─── Helpers ──────────────────────────────────────────────

    private function roleLabel(?string $role): string
    {
        return match ($role) {
            'student'                    => 'طالب',
            'academic_supervisor'        => 'مشرف أكاديمي',
            'field_supervisor'           => 'مشرف ميداني',
            'teacher'                    => 'معلم مرشد',
            'adviser'                    => 'مرشد تربوي',
            'psychologist'               => 'أخصائي نفسي',
            'training_coordinator'       => 'منسق تدريب',
            'head_of_department'         => 'رئيس قسم',
            'school_manager'             => 'مدير جهة التدريب',
            'psychology_center_manager'  => 'مدير المركز النفسي',
            'admin'                      => 'مدير النظام',
            default                      => $role ?? 'مستخدم',
        };
    }
}
