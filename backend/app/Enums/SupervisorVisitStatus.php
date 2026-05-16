<?php

namespace App\Enums;

enum SupervisorVisitStatus: string
{
    case PLANNED = 'planned';
    case SCHEDULED = 'scheduled';
    case COMPLETED = 'completed';
    case CANCELLED = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::PLANNED, self::SCHEDULED => 'مجدولة',
            self::COMPLETED => 'منفذة',
            self::CANCELLED => 'ملغية',
        };
    }

    /** الحالة الافتراضية عند جدولة زيارة جديدة (متوافقة مع enum قاعدة البيانات). */
    public static function defaultForNewVisit(): string
    {
        return self::PLANNED->value;
    }
}