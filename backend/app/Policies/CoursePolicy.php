<?php

namespace App\Policies;

use App\Models\Course;
use App\Models\User;

class CoursePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Course $course): bool
    {
        if ($user->role?->name === 'head_of_department') {
            return $user->department_id
                && (int) $course->department_id === (int) $user->department_id;
        }

        return true;
    }

    public function create(User $user): bool
    {
        return in_array($user->role?->name, ['admin', 'head_of_department']);
    }

    public function update(User $user, Course $course): bool
    {
        if ($user->role?->name === 'admin') {
            return true;
        }
        if ($user->role?->name === 'head_of_department') {
            return $user->department_id
                && (int) $course->department_id === (int) $user->department_id;
        }

        return false;
    }

    public function delete(User $user, Course $course): bool
    {
        // Check if user has permission
        if (!in_array($user->role?->name, ['admin', 'head_of_department'])) {
            return false;
        }
        if ($user->role?->name === 'head_of_department') {
            if (!$user->department_id || (int) $course->department_id !== (int) $user->department_id) {
                return false;
            }
        }
        
        // Prevent deletion if course has sections (current or past)
        if ($course->sections()->count() > 0) {
            return false;
        }
        
        return true;
    }
    
    public function archive(User $user, Course $course): bool
    {
        if ($user->role?->name === 'admin') {
            return true;
        }
        if ($user->role?->name === 'head_of_department') {
            return $user->department_id
                && (int) $course->department_id === (int) $user->department_id;
        }

        return false;
    }
}
