<?php

namespace App\Policies;

use App\Models\Notification;
use App\Models\User;

class NotificationPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Notification $notification): bool
    {
        if ((int) $notification->user_id === (int) $user->id) {
            return true;
        }

        $types = [User::class, 'App\Models\User'];

        return $notification->notifiable_id
            && (int) $notification->notifiable_id === (int) $user->id
            && $notification->notifiable_type
            && in_array($notification->notifiable_type, $types, true);
    }

    public function update(User $user, Notification $notification): bool
    {
        return $this->view($user, $notification);
    }

    public function delete(User $user, Notification $notification): bool
    {
        return $this->update($user, $notification);
    }
}
