<?php

namespace App\Services;

use App\Models\User;
use App\Models\TrainingSite;
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
            $this->syncTrainingSiteManager($user);

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
        $user = $user->fresh(['role', 'trainingSite']);
        $this->syncFieldSupervisorProfile($user);
        $this->syncTrainingSiteManager($user);
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
        $user = $user->fresh(['role', 'trainingSite']);
        $this->syncFieldSupervisorProfile($user);
        $this->syncTrainingSiteManager($user);
        return $user;
    }

    private function syncTrainingSiteManager(User $user): void
    {
        $user->loadMissing(['role', 'trainingSite']);

        $isManagerRole = in_array($user->role?->name, ['school_manager', 'principal', 'psychology_center_manager'], true);

        if (! $isManagerRole) {
            return;
        }

        // If the user has a training_site_id, make sure training_sites.manager_id points back
        if ($user->training_site_id) {
            $site = TrainingSite::find($user->training_site_id);
            if ($site && (int) $site->manager_id !== (int) $user->id) {
                $site->update(['manager_id' => $user->id]);
            }
        }
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