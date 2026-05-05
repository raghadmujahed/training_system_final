<?php

namespace App\Services\Chat;

use App\Models\TrainingAssignment;
use App\Models\User;
use Illuminate\Support\Collection;

class ChatPermissionService
{
    /**
     * Central permission gate: can userA send a message to userB?
     */
    public function canMessage(User $userA, User $userB): bool
    {
        if ($userA->id === $userB->id) {
            return false;
        }

        $roleA = $userA->role?->name;
        $roleB = $userB->role?->name;

        // Admin can message anyone
        if ($roleA === 'admin') {
            return true;
        }

        // Anyone can message admin
        if ($roleB === 'admin') {
            return true;
        }

        return match ($roleA) {
            'student'              => $this->studentCanMessage($userA, $userB),
            'academic_supervisor'  => $this->academicSupervisorCanMessage($userA, $userB),
            'field_supervisor'     => $this->fieldSupervisorCanMessage($userA, $userB),
            'training_coordinator' => $this->coordinatorCanMessage($userA, $userB),
            'head_of_department'   => $this->headOfDeptCanMessage($userA, $userB),
            default                => false,
        };
    }

    /**
     * Returns all users that the given user is allowed to chat with.
     */
    public function getAllowedChatUsers(User $user): Collection
    {
        $role = $user->role?->name;

        $adminUsers = User::whereHas('role', fn($q) => $q->where('name', 'admin'))
            ->where('id', '!=', $user->id)
            ->get();

        $allowed = match ($role) {
            'student'              => $this->getAllowedForStudent($user),
            'academic_supervisor'  => $this->getAllowedForAcademicSupervisor($user),
            'field_supervisor'     => $this->getAllowedForFieldSupervisor($user),
            'training_coordinator' => $this->getAllowedForCoordinator($user),
            'head_of_department'   => $this->getAllowedForHeadOfDept($user),
            'admin'                => User::where('id', '!=', $user->id)->get(),
            default                => collect(),
        };

        if ($role !== 'admin') {
            $allowed = $allowed->merge($adminUsers)->unique('id');
        }

        return $allowed->values();
    }

    // ─── Student ─────────────────────────────────────────────

    private function studentCanMessage(User $student, User $target): bool
    {
        $roleB = $target->role?->name;

        // assigned academic supervisor
        if ($roleB === 'academic_supervisor') {
            return $this->hasAssignment($student->id, 'academic_supervisor_id', $target->id);
        }

        // assigned field supervisor (teacher_id in assignments)
        if ($roleB === 'field_supervisor') {
            return $this->hasAssignmentFieldSupervisor($student->id, $target->id);
        }

        // training coordinator — same department only
        if ($roleB === 'training_coordinator') {
            return $this->sameDepartment($student, $target);
        }

        return false;
    }

    private function getAllowedForStudent(User $student): Collection
    {
        $assignments = $this->studentAssignments($student->id);

        $supervisorIds      = $assignments->pluck('academic_supervisor_id')->filter()->unique();
        $fieldSupervisorIds = $assignments->pluck('teacher_id')->merge($assignments->pluck('field_supervisor_id'))->filter()->unique();
        $coordinatorIds     = $assignments->pluck('coordinator_id')->filter()->unique();

        $ids = $supervisorIds
            ->merge($fieldSupervisorIds)
            ->merge($coordinatorIds)
            ->filter()
            ->unique()
            ->values();

        return User::whereIn('id', $ids)->get();
    }

    // ─── Academic Supervisor ──────────────────────────────────

    private function academicSupervisorCanMessage(User $supervisor, User $target): bool
    {
        $roleB = $target->role?->name;

        if ($roleB === 'student') {
            return $this->hasAssignment($target->id, 'academic_supervisor_id', $supervisor->id);
        }

        if ($roleB === 'field_supervisor') {
            return $this->supervisorSharesStudent($supervisor->id, $target->id);
        }

        if ($roleB === 'training_coordinator') {
            return $this->sameDepartment($supervisor, $target);
        }

        if ($roleB === 'head_of_department') {
            return $this->sameDepartment($supervisor, $target);
        }

        return false;
    }

    private function getAllowedForAcademicSupervisor(User $supervisor): Collection
    {
        $assignments = TrainingAssignment::where('academic_supervisor_id', $supervisor->id)
            ->with(['enrollment.user', 'fieldSupervisorAccount'])
            ->get();

        $studentIds     = $assignments->map(fn($a) => $a->enrollment?->user_id)->filter()->unique();
        $fieldSupIds    = $assignments->pluck('teacher_id')->merge($assignments->pluck('field_supervisor_id'))->filter()->unique();
        $coordinatorIds = $assignments->pluck('coordinator_id')->filter()->unique();

        $sameDeptUsers = User::where('department_id', $supervisor->department_id)
            ->whereHas('role', fn($q) => $q->whereIn('name', ['training_coordinator', 'head_of_department']))
            ->pluck('id');

        $ids = $studentIds
            ->merge($fieldSupIds)
            ->merge($coordinatorIds)
            ->merge($sameDeptUsers)
            ->filter()
            ->unique()
            ->values();

        return User::whereIn('id', $ids)->get();
    }

    // ─── Field Supervisor ─────────────────────────────────────

    private function fieldSupervisorCanMessage(User $fieldSup, User $target): bool
    {
        $roleB = $target->role?->name;

        if ($roleB === 'student') {
            return $this->hasAssignmentFieldSupervisor($target->id, $fieldSup->id);
        }

        if ($roleB === 'academic_supervisor') {
            return $this->supervisorSharesStudent($target->id, $fieldSup->id);
        }

        if ($roleB === 'training_coordinator') {
            return true; // field supervisors can always reach coordinator
        }

        return false;
    }

    private function getAllowedForFieldSupervisor(User $fieldSup): Collection
    {
        $assignments = TrainingAssignment::where(fn($q) => $q
            ->where('teacher_id', $fieldSup->id)
            ->orWhere('field_supervisor_id', $fieldSup->id)
        )->with('enrollment.user')->get();

        $studentIds    = $assignments->map(fn($a) => $a->enrollment?->user_id)->filter()->unique();
        $acSupIds      = $assignments->pluck('academic_supervisor_id')->filter()->unique();
        $coordinators  = User::whereHas('role', fn($q) => $q->where('name', 'training_coordinator'))->pluck('id');

        $ids = $studentIds->merge($acSupIds)->merge($coordinators)->filter()->unique()->values();

        return User::whereIn('id', $ids)->get();
    }

    // ─── Training Coordinator ─────────────────────────────────

    private function coordinatorCanMessage(User $coordinator, User $target): bool
    {
        $roleB = $target->role?->name;

        $sameDeptRoles = ['student', 'academic_supervisor', 'field_supervisor', 'head_of_department'];

        if (in_array($roleB, $sameDeptRoles)) {
            return $this->sameDepartment($coordinator, $target);
        }

        if ($roleB === 'training_coordinator') {
            return $this->sameDepartment($coordinator, $target);
        }

        return false;
    }

    private function getAllowedForCoordinator(User $coordinator): Collection
    {
        return User::where('department_id', $coordinator->department_id)
            ->where('id', '!=', $coordinator->id)
            ->get();
    }

    // ─── Head of Department ───────────────────────────────────

    private function headOfDeptCanMessage(User $head, User $target): bool
    {
        $roleB = $target->role?->name;

        $allowedRoles = ['academic_supervisor', 'field_supervisor', 'training_coordinator', 'student'];

        if (in_array($roleB, $allowedRoles)) {
            return $this->sameDepartment($head, $target);
        }

        return false;
    }

    private function getAllowedForHeadOfDept(User $head): Collection
    {
        return User::where('department_id', $head->department_id)
            ->where('id', '!=', $head->id)
            ->whereHas('role', fn($q) => $q->whereIn('name', [
                'academic_supervisor', 'field_supervisor', 'training_coordinator', 'student',
            ]))
            ->get();
    }

    // ─── Helpers ──────────────────────────────────────────────

    private function studentAssignments(int $studentId)
    {
        return TrainingAssignment::whereHas('enrollment', fn($q) => $q->where('user_id', $studentId))
            ->get();
    }

    private function hasAssignment(int $studentId, string $supervisorColumn, int $supervisorId): bool
    {
        return TrainingAssignment::whereHas('enrollment', fn($q) => $q->where('user_id', $studentId))
            ->where($supervisorColumn, $supervisorId)
            ->exists();
    }

    private function hasAssignmentFieldSupervisor(int $studentId, int $fieldSupId): bool
    {
        return TrainingAssignment::whereHas('enrollment', fn($q) => $q->where('user_id', $studentId))
            ->where(fn($q) => $q
                ->where('teacher_id', $fieldSupId)
                ->orWhere('field_supervisor_id', $fieldSupId)
            )
            ->exists();
    }

    private function supervisorSharesStudent(int $academicSupId, int $fieldSupId): bool
    {
        return TrainingAssignment::where('academic_supervisor_id', $academicSupId)
            ->where(fn($q) => $q
                ->where('teacher_id', $fieldSupId)
                ->orWhere('field_supervisor_id', $fieldSupId)
            )
            ->exists();
    }

    private function sameDepartment(User $userA, User $userB): bool
    {
        if (! $userA->department_id || ! $userB->department_id) {
            return false;
        }
        return $userA->department_id === $userB->department_id;
    }
}
