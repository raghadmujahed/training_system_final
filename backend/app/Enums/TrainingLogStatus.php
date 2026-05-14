<?php

namespace App\Enums;

enum TrainingLogStatus: string
{
    case DRAFT     = 'draft';
    case SUBMITTED = 'submitted';
    case REVIEWED  = 'reviewed';   // legacy value — kept for backward compatibility
    case APPROVED  = 'approved';
    case RETURNED  = 'returned';

    public function label(): string
    {
        return match($this) {
            self::DRAFT     => 'مسودة',
            self::SUBMITTED => 'مُقدَّم',
            self::REVIEWED  => 'تمت المراجعة',
            self::APPROVED  => 'معتمد',
            self::RETURNED  => 'مُعاد للطالب',
        };
    }
}