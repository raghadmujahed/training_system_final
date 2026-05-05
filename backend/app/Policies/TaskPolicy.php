<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Task;

class TaskPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role?->name, [
            'admin',
            'academic_supervisor',
            'teacher',
            'adviser',
            'psychologist',
            'field_supervisor',
            'student',
        ], true);
    }

    public function view(User $user, Task $task): bool
    {
        if ($user->id === $task->assigned_by) return true;
        if ($user->id === $task->trainingAssignment->teacher_id) return true;
        if ($user->id === $task->trainingAssignment->academic_supervisor_id) return true;
        if ($user->id === $task->trainingAssignment->enrollment->user_id) return true;
        return $user->role?->name === 'admin';
    }

    public function create(User $user): bool
    {
        return in_array($user->role?->name, [
            'academic_supervisor',
            'teacher',
            'adviser',
            'psychologist',
            'field_supervisor',
        ]);
    }

    public function update(User $user, Task $task): bool
    {
        return $user->id === $task->assigned_by;
    }

    public function delete(User $user, Task $task): bool
    {
        return $user->id === $task->assigned_by || $user->role?->name === 'admin';
    }
}