<?php

namespace App\Enums;

enum OfficialLetterType: string
{
    case TO_DIRECTORATE = 'to_directorate';
    case TO_SCHOOL = 'to_school';
    case TO_HEALTH_MINISTRY = 'to_health_ministry';

    public function label(): string
    {
        return match($this) {
            self::TO_DIRECTORATE => 'إلى المديرية',
            self::TO_SCHOOL => 'إلى المدرسة',
            self::TO_HEALTH_MINISTRY => 'إلى وزارة الصحة',
        };
    }
}