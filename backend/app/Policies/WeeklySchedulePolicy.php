<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WeeklySchedule;

class WeeklySchedulePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, WeeklySchedule $weeklySchedule): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return in_array($user->role?->name, ['admin', 'teacher', 'training_coordinator', 'coordinator', 'school_manager', 'psychology_center_manager', 'principal'], true);
    }

    public function update(User $user, WeeklySchedule $weeklySchedule): bool
    {
        return $user->role?->name === 'admin'
            || $user->id === $weeklySchedule->submitted_by;
    }

    public function delete(User $user, WeeklySchedule $weeklySchedule): bool
    {
        return $this->update($user, $weeklySchedule);
    }
}
