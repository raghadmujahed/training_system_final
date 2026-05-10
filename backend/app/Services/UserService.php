<?php

namespace App\Services;

use App\Models\User;
use App\Models\FieldSupervisorProfile;
use App\Enums\UserStatus;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class UserService
{
    public function createUser(array $data): User
    {
        return DB::transaction(function () use ($data) {
            $data['password'] = Hash::make($data['password']);
            $data['status'] = $data['status'] ?? UserStatus::ACTIVE->value;
            $user = User::create($data);
            $this->syncFieldSupervisorProfile($user);

            return $user;
        });
    }

    public function updateUser(User $user, array $data): User
    {
        if (isset($data['password']) && !empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }
        $user->update($data);
        $this->syncFieldSupervisorProfile($user->fresh(['role', 'trainingSite']));
        return $user;
    }

    public function changeStatus(User $user, string $status): User
    {
        $user->update(['status' => $status]);
        $this->syncFieldSupervisorProfile($user->fresh(['role', 'trainingSite']));
        return $user;
    }

    public function assignRole(User $user, int $roleId): User
    {
        $user->update(['role_id' => $roleId]);
        $this->syncFieldSupervisorProfile($user->fresh(['role', 'trainingSite']));
        return $user;
    }

    private function syncFieldSupervisorProfile(User $user): void
    {
        $user->loadMissing(['role', 'trainingSite', 'department']);

        $supervisorType = match ($user->role?->name) {
            'teacher' => FieldSupervisorProfile::TYPE_MENTOR_TEACHER,
            'adviser' => FieldSupervisorProfile::TYPE_SCHOOL_COUNSELOR,
            'psychologist' => FieldSupervisorProfile::TYPE_PSYCHOLOGIST,
            default => null,
        };

        if (! $supervisorType) {
            return;
        }

        FieldSupervisorProfile::updateOrCreate(
            ['user_id' => $user->id],
            [
                'supervisor_type' => $supervisorType,
                'workplace_name' => $user->trainingSite?->name ?? $user->department?->name ?? 'غير محدد',
                'workplace_type' => $supervisorType === FieldSupervisorProfile::TYPE_PSYCHOLOGIST ? 'مركز نفسي' : 'مدرسة',
                'department' => $user->department?->name,
                'phone' => $user->phone,
                'is_active' => $user->status === UserStatus::ACTIVE->value,
            ]
        );
    }
}