<?php

namespace App\Policies;

use App\Models\Backup;
use App\Models\User;

class BackupPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->role?->name === 'admin';
    }

    public function view(User $user, Backup $backup): bool
    {
        return $user->role?->name === 'admin';
    }

    public function create(User $user): bool
    {
        return $user->role?->name === 'admin';
    }

    public function update(User $user, Backup $backup): bool
    {
        return $user->role?->name === 'admin';
    }

    public function delete(User $user, Backup $backup): bool
    {
        return $user->role?->name === 'admin';
    }

    public function restore(User $user, Backup $backup): bool
    {
        return $user->role?->name === 'admin';
    }

    public function download(User $user, Backup $backup): bool
    {
        return $user->role?->name === 'admin';
    }

    public function forceDelete(User $user, Backup $backup): bool
    {
        return $user->role?->name === 'admin';
    }
}
