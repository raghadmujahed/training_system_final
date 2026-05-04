<?php

namespace App\Services;

use App\Models\TrainingAssignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * تحديد صلاحية وصول المشرف الميداني (دور field_supervisor) أو من يعمل بنفس الصلاحية الميدانية
 * عبر teacher_id أو الحقل الاختياري field_supervisor_id.
 */
final class FieldSupervisorAssignmentResolver
{
    /**
     * استعلام التعيينات التي يعتبر المستخدم مشرفاً ميدانياً فعلياً لها.
     */
    public static function assignmentsForFieldSupervisorUser(User $user): Builder
    {
        $uid = (int) $user->id;

        return TrainingAssignment::query()
            ->where(function ($q) use ($uid) {
                $q->where('teacher_id', $uid)
                    ->orWhere('field_supervisor_id', $uid);
            });
    }

    public static function userIsFieldSupervisorActor(User $user, TrainingAssignment $assignment): bool
    {
        $uid = (int) $user->id;

        return (int) $assignment->teacher_id === $uid
            || ($assignment->field_supervisor_id && (int) $assignment->field_supervisor_id === $uid);
    }
}
