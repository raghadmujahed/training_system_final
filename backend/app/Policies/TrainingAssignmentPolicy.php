<?php

namespace App\Policies;

use App\Models\User;
use App\Models\TrainingAssignment;
use App\Services\FieldSupervisorAssignmentResolver;

class TrainingAssignmentPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, TrainingAssignment $assignment): bool
    {
        if ($user->role?->name === 'admin') {
            return true;
        }
        if ($user->role?->name === 'academic_supervisor') {
            return app(\App\Services\AcademicSupervisorStudentService::class)
                ->supervisedAssignmentsBaseQuery($user)
                ->whereKey($assignment->getKey())
                ->exists();
        }
        if ($user->id === $assignment->teacher_id) {
            return true;
        }
        if ($user->id === $assignment->academic_supervisor_id) {
            return true;
        }
        if (in_array($user->role?->name, ['field_supervisor', 'psychologist'], true)) {
            return FieldSupervisorAssignmentResolver::userIsFieldSupervisorActor($user, $assignment);
        }
        if ($user->id === $assignment->coordinator_id) return true;
        if ($user->id === $assignment->enrollment->user_id) {
            return true;
        }
        if (in_array($user->role?->name, ['school_manager', 'psychology_center_manager']) && $user->training_site_id
            && (int) $assignment->training_site_id === (int) $user->training_site_id) {
            return true;
        }

        return false;
    }

    public function update(User $user, TrainingAssignment $assignment): bool
    {
        return in_array($user->role?->name, ['admin', 'coordinator', 'training_coordinator', 'academic_supervisor']);
    }
}