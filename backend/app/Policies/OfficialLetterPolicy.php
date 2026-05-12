<?php

namespace App\Policies;

use App\Models\User;
use App\Models\OfficialLetter;

class OfficialLetterPolicy
{
    public function view(User $user, OfficialLetter $letter): bool
    {
        if ($user->role?->name === 'admin') return true;
        if ($user->id === $letter->sent_by) return true;
        if ($user->id === $letter->received_by) return true;
        if ($user->role?->name === 'education_directorate' && $letter->type === 'to_directorate') return true;
        if (in_array($user->role?->name, ['school_manager', 'psychology_center_manager', 'principal'], true) && $letter->type === 'to_school') {
            if (! $user->training_site_id || ! $letter->training_site_id) {
                return true;
            }

            return (int) $letter->training_site_id === (int) $user->training_site_id;
        }
        return false;
    }

    public function create(User $user): bool
    {
        return in_array($user->role?->name, ['coordinator', 'education_directorate']);
    }

    public function send(User $user, OfficialLetter $letter): bool
    {
        return $user->id === $letter->sent_by && $letter->status === 'draft';
    }

    public function receive(User $user, OfficialLetter $letter): bool
    {
        if ($letter->status !== 'sent_to_school') {
            return false;
        }

        if (in_array($user->role?->name, ['school_manager', 'psychology_center_manager', 'principal'], true) && $letter->type === 'to_school') {
            return true;
        }

        return $user->id === $letter->received_by;
    }

    public function approve(User $user, OfficialLetter $letter): bool
    {
        if ($user->role?->name === 'admin') {
            return true;
        }
        // مديرية التربية يمكنها الموافقة/رفض الكتب الموجهة لها
        if ($user->role?->name === 'education_directorate' && $letter->type === 'to_directorate') {
            return true;
        }
        // مدير المدرسة يمكنه الموافقة/رفض الكتب الموجهة لمدرسته
        if (in_array($user->role?->name, ['school_manager', 'principal', 'psychology_center_manager'], true) && $letter->type === 'to_school') {
            if (! $user->training_site_id || ! $letter->training_site_id) {
                return true;
            }
            return (int) $letter->training_site_id === (int) $user->training_site_id;
        }
        return false;
    }
}