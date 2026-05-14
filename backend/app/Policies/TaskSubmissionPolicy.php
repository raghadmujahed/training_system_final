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
        // يمكن للطالب صاحب التسليم، أو المعلم، أو المشرف، أو الأدمن
        return $user->id === $submission->user_id
            || in_array($user->role?->name, [
                'admin',
                'academic_supervisor',
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
        // يمكن للمعلم أو المشرف الأكاديمي أو الأدمن تقييم التسليم
        return in_array($user->role?->name, [
            'admin',
            'academic_supervisor',
            'teacher',
            'adviser',
            'psychologist',
            'field_supervisor',
        ]);
    }
}