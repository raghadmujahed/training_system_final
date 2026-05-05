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
        // يمكن للطالب تعديل تسليمه فقط إذا لم يتم تقييمه بعد
        return $user->id === $submission->user_id && is_null($submission->grade);
    }

    public function delete(User $user, TaskSubmission $submission): bool
    {
        // يمكن للأدمن فقط حذف التسليمات (أو الطالب قبل التقييم)
        return $user->role?->name === 'admin' || ($user->id === $submission->user_id && is_null($submission->grade));
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