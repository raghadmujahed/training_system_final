<?php

namespace App\Policies;

use App\Models\User;
use App\Models\TaskSubmission;

class TaskSubmissionPolicy
{
    public function viewAny(User $user): bool
    {
        // يمكن للمشرف الأكاديمي والمعلم والأدمن رؤية كل التسليمات
        return in_array($user->role?->name, [
            'admin',
            'academic_supervisor',
            'teacher',
            'adviser',
            'psychologist',
            'field_supervisor',
        ]);
    }

    public function view(User $user, TaskSubmission $submission): bool
    {
        // يمكن للطالب صاحب التسليم
        if ($user->id === $submission->user_id) {
            return true;
        }
        
        // للمشرف الأكاديمي: يرى فقط تسليمات المهام التي أسندها
        if ($user->role?->name === 'academic_supervisor') {
            return $submission->task && $submission->task->assigned_by === $user->id;
        }
        
        // للأدمن والمعلمين الآخرين
        return in_array($user->role?->name, [
            'admin',
            'teacher',
            'adviser',
            'psychologist',
            'field_supervisor',
        ]);
    }

    public function create(User $user): bool
    {
        // يمكن لأي مستخدم مسجل الدخول إنشاء تسليم (سيتم ربطه به)
        return true;
    }

    public function update(User $user, TaskSubmission $submission): bool
    {
        if ($user->id !== $submission->user_id) {
            return false;
        }
        if (! $submission->submitted_at) {
            return true;
        }
        if ($submission->needs_resubmission) {
            return true;
        }

        return ! in_array((string) $submission->review_status, ['graded', 'accepted'], true);
    }

    public function delete(User $user, TaskSubmission $submission): bool
    {
        return $user->role?->name === 'admin'
            || ($user->id === $submission->user_id && ! $submission->submitted_at);
    }

    public function grade(User $user, TaskSubmission $submission): bool
    {
        // للأدمن دائماً
        if ($user->role?->name === 'admin') {
            return true;
        }
        
        // للمشرف الأكاديمي: يقيّم فقط تسليمات المهام التي أسندها
        if ($user->role?->name === 'academic_supervisor') {
            return $submission->task && $submission->task->assigned_by === $user->id;
        }
        
        // للمعلمين الآخرين
        return in_array($user->role?->name, [
            'teacher',
            'adviser',
            'psychologist',
            'field_supervisor',
        ]);
    }
}