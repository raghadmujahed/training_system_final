<?php

namespace App\Policies;

use App\Models\Enrollment;
use App\Models\User;

class EnrollmentPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role?->name, ['admin', 'head_of_department', 'coordinator', 'academic_supervisor']);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Enrollment $enrollment): bool
    {
        if ($user->role?->name === 'admin') {
            return true;
        }
        
        if ($user->role?->name === 'head_of_department') {
            return $user->department_id
                && $enrollment->section
                && $enrollment->section->course
                && (int) $enrollment->section->course->department_id === (int) $user->department_id;
        }
        
        return in_array($user->role?->name, ['coordinator', 'academic_supervisor']);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return in_array($user->role?->name, ['admin', 'head_of_department', 'coordinator']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Enrollment $enrollment): bool
    {
        if ($user->role?->name === 'admin') {
            return true;
        }
        
        if ($user->role?->name === 'head_of_department') {
            return $user->department_id
                && $enrollment->section
                && $enrollment->section->course
                && (int) $enrollment->section->course->department_id === (int) $user->department_id;
        }
        
        return in_array($user->role?->name, ['coordinator', 'academic_supervisor']);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Enrollment $enrollment): bool
    {
        if ($user->role?->name === 'admin') {
            return true;
        }
        
        if ($user->role?->name === 'head_of_department') {
            return $user->department_id
                && $enrollment->section
                && $enrollment->section->course
                && (int) $enrollment->section->course->department_id === (int) $user->department_id;
        }
        
        return $user->role?->name === 'coordinator';
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Enrollment $enrollment): bool
    {
        return in_array($user->role?->name, ['admin', 'head_of_department']);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Enrollment $enrollment): bool
    {
        return in_array($user->role?->name, ['admin']);
    }
}
