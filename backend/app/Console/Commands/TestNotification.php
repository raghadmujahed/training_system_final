<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class TestNotification extends Command
{
    protected $signature = 'app:test-notification
                            {--user= : User ID to send to (defaults to first user)}
                            {--channel=email : Channel to test: email, whatsapp, or all}';

    protected $description = 'Test the NotificationService (email / whatsapp stub / multichannel)';

    public function handle(NotificationService $notif): void
    {
        $userId = $this->option('user');
        $user   = $userId ? User::findOrFail($userId) : User::first();

        if (! $user) {
            $this->error('No users found in database.');
            return;
        }

        $this->info("Sending to: {$user->name} <{$user->email}> (ID {$user->id})");

        $channel = $this->option('channel');

        if ($channel === 'email' || $channel === 'all') {
            $this->line('→ Testing EMAIL...');
            $notif->sendEmail(
                $user,
                'اختبار نظام الإشعارات',
                "مرحباً {$user->name}،\n\nهذا بريد تجريبي من نظام إدارة التدريب.\n\nإذا وصلك هذا البريد فالنظام يعمل بشكل صحيح."
            );
            $this->info('  ✓ Email dispatched (check log or inbox).');
        }

        if ($channel === 'whatsapp' || $channel === 'all') {
            $this->line('→ Testing WHATSAPP (stub)...');
            $notif->sendWhatsApp(
                $user,
                'اختبار واتساب',
                'هذه رسالة تجريبية عبر واتساب — stub فقط، راجع laravel.log'
            );
            $this->info('  ✓ WhatsApp stub logged (check storage/logs/laravel.log).');
        }

        if ($channel === 'all') {
            $this->line('→ Testing MULTICHANNEL (auto-detect by role)...');
            $notif->sendMultiChannel(
                $user,
                'اختبار متعدد القنوات',
                'هذه رسالة متعددة القنوات بناءً على دور المستخدم.'
            );
            $this->info('  ✓ MultiChannel done.');
        }

        $this->newLine();
        $this->info('Done. Check:');
        $this->line('  - MAIL_MAILER=log  →  storage/logs/laravel.log');
        $this->line('  - MAIL_MAILER=smtp →  real inbox');
        $this->line('  - WhatsApp stub    →  storage/logs/laravel.log');
    }
}
