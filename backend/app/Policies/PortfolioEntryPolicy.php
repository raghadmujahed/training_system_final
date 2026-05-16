<?php

namespace App\Policies;

use App\Models\PortfolioEntry;
use App\Models\TrainingAssignment;
use App\Models\User;

class PortfolioEntryPolicy
{
    public function viewAny(User $user): bool
    {
        return true; // يمكن للجميع عرض القوائم، لكن سيتم تصفيتها حسب الصلاحية
    }

    public function view(User $user, PortfolioEntry $entry): bool
    {
        $entry->loadMissing('studentPortfolio');

        if ($user->id === $entry->studentPortfolio->user_id || $user->role?->name === 'admin') {
            return true;
        }

        if ($user->role?->name === 'academic_supervisor') {
            $studentId = (int) $entry->studentPortfolio->user_id;

            return TrainingAssignment::query()
                ->where('academic_supervisor_id', $user->id)
                ->whereHas('enrollment', fn ($q) => $q->where('user_id', $studentId))
                ->exists();
        }

        return false;
    }

    public function create(User $user): bool
    {
        // يمكن لأي مستخدم مسجل الدخول إنشاء مدخل (سيتم ربطه بملفه)
        return true;
    }

    public function update(User $user, PortfolioEntry $entry): bool
    {
        // فقط مالك المدخل أو الأدمن يمكنه التعديل
        return $user->id === $entry->studentPortfolio->user_id || $user->role?->name === 'admin';
    }

    public function delete(User $user, PortfolioEntry $entry): bool
    {
        return $this->update($user, $entry);
    }
}