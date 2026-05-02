<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        // school_manager: fetch teachers for mentor assignment
        // training_coordinator / head_of_department: fetch students for lists & enrollment
        return in_array($user->role?->name, [
            'admin',
            'school_manager',
            'psychology_center_manager',
            'training_coordinator',
            'coordinator',
            'psychologist',
            'head_of_department',
        ], true);
    }

    public function view(User $user, User $model): bool
    {
        return $user->id === $model->id || $user->role?->name === 'admin';
    }

    public function create(User $user): bool
    {
        return $user->role?->name === 'admin';
    }

    public function update(User $user, User $model): bool
    {
        return $user->id === $model->id || $user->role?->name === 'admin';
    }

    public function delete(User $user, User $model): bool
    {
        return $user->role?->name === 'admin' && $user->id !== $model->id;
    }
}