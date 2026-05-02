<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Notification as NotificationFacade;

class NotificationService
{
    public function sendToUser(User $user, string $type, string $message, array $data = [], ?string $notifiableType = null, ?int $notifiableId = null): Notification
    {
        return Notification::create([
            'user_id' => $user->id,
            'type' => $type,
            'message' => $message,
            'data' => $data,
            'notifiable_type' => $notifiableType ?? get_class($user),
            'notifiable_id' => $notifiableId ?? $user->id,
        ]);
    }

    public function sendToRole(string $roleName, string $type, string $message, array $data = [])
    {
        $users = User::whereHas('role', function ($q) use ($roleName) {
            $q->where('name', $roleName);
        })->get();

        foreach ($users as $user) {
            $this->sendToUser($user, $type, $message, $data);
        }
    }

    public function markAsRead(Notification $notification): Notification
    {
        $notification->update(['read_at' => now()]);
        return $notification;
    }
}