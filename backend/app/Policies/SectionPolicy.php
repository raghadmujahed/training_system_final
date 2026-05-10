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
        // Admin can view any section
        if ($user->role?->name === 'admin') {
            return true;
        }

        // Head of Department can only view sections from their own department
        if ($user->role?->name === 'head_of_department') {
            return $user->department_id
                && $section->course
                && (int) $section->course->department_id === (int) $user->department_id;
        }

        // Coordinator and academic supervisor can view sections they have access to
        return in_array($user->role?->name, ['training_coordinator', 'academic_supervisor']);
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
        // Admin can update any section
        if ($user->role?->name === 'admin') {
            return true;
        }

        // Head of Department can only update sections from their own department
        if ($user->role?->name === 'head_of_department') {
            return $user->department_id
                && $section->course
                && (int) $section->course->department_id === (int) $user->department_id;
        }

        // Coordinator can update sections
        return $user->role?->name === 'training_coordinator';
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Section $section): bool
    {
        // Admin can delete any section
        if ($user->role?->name === 'admin') {
            return true;
        }

        // Head of Department can only delete sections from their own department
        if ($user->role?->name === 'head_of_department') {
            return $user->department_id
                && $section->course
                && (int) $section->course->department_id === (int) $user->department_id;
        }

        // Coordinator can delete sections
        return $user->role?->name === 'training_coordinator';
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Section $section): bool
    {
        // Admin can restore any section
        if ($user->role?->name === 'admin') {
            return true;
        }

        // Head of Department can only restore sections from their own department
        if ($user->role?->name === 'head_of_department') {
            return $user->department_id
                && $section->course
                && (int) $section->course->department_id === (int) $user->department_id;
        }

        // Coordinator can restore sections
        return $user->role?->name === 'training_coordinator';
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Section $section): bool
    {
        return in_array($user->role?->name, ['admin', 'training_coordinator']);
    }
}
