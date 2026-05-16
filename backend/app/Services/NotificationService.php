<?php

namespace App\Services;

use App\Mail\SystemMessage;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification as NotificationFacade;

class NotificationService
{
    public function __construct(
        private WhatsAppNotificationService $whatsApp = new WhatsAppNotificationService(),
    ) {}

    // ─── Existing DB notification methods (unchanged) ────────────────────────

    public function sendToUser(User $user, string $type, string $message, array $data = [], ?string $notifiableType = null, ?int $notifiableId = null): Notification
    {
        return Notification::create([
            'user_id'         => $user->id,
            'type'            => $type,
            'title'           => Str::limit((string) ($data['title'] ?? $message), 255),
            'message'         => $message,
            'content'         => $data['content'] ?? $message,
            'data'            => $data,
            'notifiable_type' => $notifiableType ?? get_class($user),
            'notifiable_id'   => $notifiableId ?? $user->id,
        ]);
    }

    public function sendToRole(string $roleName, string $type, string $message, array $data = []): void
    {
        $users = User::whereHas('role', fn($q) => $q->where('name', $roleName))->get();
        foreach ($users as $user) {
            $this->sendToUser($user, $type, $message, $data);
        }
    }

    public function markAsRead(Notification $notification): Notification
    {
        $notification->update(['read_at' => now()]);
        return $notification;
    }

    // ─── Email channel ────────────────────────────────────────────────────────

    /**
     * Send an email notification to a user.
     * Silently logs on failure so it never breaks the calling flow.
     */
    public function sendEmail(User $user, string $subject, string $body): void
    {
        if (empty($user->email)) {
            Log::warning('[Email] Skipped — user has no email', ['user_id' => $user->id]);
            return;
        }

        try {
            Mail::to($user->email)
                ->send(new SystemMessage($subject, $body, $user->name ?? ''));
        } catch (\Throwable $e) {
            Log::error('[Email] Failed to send', [
                'user_id' => $user->id,
                'email'   => $user->email,
                'subject' => $subject,
                'error'   => $e->getMessage(),
            ]);
        }
    }

    // ─── WhatsApp channel (stub) ──────────────────────────────────────────────

    /**
     * Send a WhatsApp notification (currently logged only — stub).
     */
    public function sendWhatsApp(User $user, string $subject, string $message): void
    {
        $this->whatsApp->send($user, $subject, $message);
    }

    // ─── Multi-channel ────────────────────────────────────────────────────────

    /**
     * Send via all requested channels.
     *
     * Usage:
     *   $notif->sendMultiChannel($user, 'Subject', 'Body', ['email', 'whatsapp']);
     *
     * Role-based defaults (can be extended):
     *   student      → email
     *   supervisor   → email  (+ whatsapp when ready)
     *   head         → email  (+ whatsapp when ready)
     */
    public function sendMultiChannel(User $user, string $subject, string $message, ?array $channels = null): void
    {
        $channels ??= $this->defaultChannelsForUser($user);

        if (in_array('email', $channels)) {
            $this->sendEmail($user, $subject, $message);
        }

        if (in_array('whatsapp', $channels)) {
            $this->sendWhatsApp($user, $subject, $message);
        }
    }

    // ─── Role-based channel resolver (extend when needed) ────────────────────

    private function defaultChannelsForUser(User $user): array
    {
        $role = $user->role?->name ?? '';

        return match (true) {
            in_array($role, ['head_of_department']) => ['email'],   // whatsapp-ready future
            in_array($role, ['supervisor', 'academic_supervisor', 'field_supervisor']) => ['email'],
            default => ['email'],  // students + others → email only
        };
    }
}