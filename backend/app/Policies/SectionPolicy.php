<?php

namespace App\Policies;

use App\Models\Section;
use App\Models\User;

class SectionPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role?->name, ['admin', 'training_coordinator', 'head_of_department', 'academic_supervisor']);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Section $section): bool
    {
        return in_array($user->role?->name, ['admin', 'training_coordinator', 'head_of_department', 'academic_supervisor']);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return in_array($user->role?->name, ['admin', 'training_coordinator', 'head_of_department']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Section $section): bool
    {
        return in_array($user->role?->name, ['admin', 'training_coordinator', 'head_of_department']);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Section $section): bool
    {
        return in_array($user->role?->name, ['admin', 'training_coordinator', 'head_of_department']);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Section $section): bool
    {
        return in_array($user->role?->name, ['admin', 'training_coordinator', 'head_of_department']);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Section $section): bool
    {
        return in_array($user->role?->name, ['admin', 'training_coordinator']);
    }
}
