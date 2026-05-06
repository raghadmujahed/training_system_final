<?php

namespace App\Services\Contracts;

use App\Models\User;

interface NotificationChannelInterface
{
    /**
     * Send a notification message to a user via this channel.
     */
    public function send(User $user, string $subject, string $message): void;
}
