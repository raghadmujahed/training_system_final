<?php

namespace App\Services;

use App\Models\User;
use App\Services\Contracts\NotificationChannelInterface;
use Illuminate\Support\Facades\Log;

/**
 * WhatsApp notification channel — STUB ONLY.
 *
 * Future integration options:
 *  - whatsapp-web.js (Node.js microservice via HTTP)
 *  - WhatsApp Business Cloud API (Meta)
 *
 * To activate: implement send() and bind this class in AppServiceProvider.
 */
class WhatsAppNotificationService implements NotificationChannelInterface
{
    public function send(User $user, string $subject, string $message): void
    {
        // TODO: integrate with WhatsApp Business API or whatsapp-web.js
        Log::channel('stack')->info('[WhatsApp STUB] Would send to user', [
            'user_id' => $user->id,
            'phone'   => $user->phone ?? 'N/A',
            'subject' => $subject,
            'message' => $message,
        ]);
    }
}
