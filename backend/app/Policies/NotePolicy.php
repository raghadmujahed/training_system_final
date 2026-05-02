<?php

namespace App\Policies;

use App\Models\Note;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class NotePolicy
{
    use HandlesAuthorization;

    /**
     * عرض قائمة الملاحظات — مسموح لكل الكادر الميداني والطلبة
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role?->name, [
            'admin',
            'academic_supervisor',
            'teacher',
            'field_supervisor',
            'psychologist',
            'school_manager',
            'training_coordinator',
            'student',
        ]);
    }

    /**
     * عرض ملاحظة واحدة
     */
    public function view(User $user, Note $note): bool
    {
        // صاحب الملاحظة
        if ($user->id === $note->user_id) return true;

        // المشرف الأكاديمي يرى ملاحظات طلابه
        if ($user->role?->name === 'academic_supervisor') {
            return $this->isSupervisorOfNoteStudent($user, $note);
        }

        // المعلم المرشد يرى ملاحظات طلابه
        if ($user->role?->name === 'teacher') {
            return $this->isMentorOfNoteStudent($user, $note);
        }

        // مدير الجهة
        if ($user->role?->name === 'school_manager') {
            return true;
        }

        // المنسق
        if ($user->role?->name === 'training_coordinator') {
            return true;
        }

        return false;
    }

    /**
     * إنشاء ملاحظة — مسموح لكل الكادر الميداني والطلبة
     */
    public function create(User $user): bool
    {
        return in_array($user->role?->name, [
            'admin',
            'academic_supervisor',
            'teacher',
            'field_supervisor',
            'psychologist',
            'school_manager',
            'training_coordinator',
            'student',
        ]);
    }

    /**
     * تعديل ملاحظة — صاحبها فقط أو المشرف الأكاديمي
     */
    public function update(User $user, Note $note): bool
    {
        if ($user->id === $note->user_id) return true;

        if ($user->role?->name === 'academic_supervisor') {
            return $this->isSupervisorOfNoteStudent($user, $note);
        }

        return $user->role?->name === 'admin';
    }

    /**
     * حذف ملاحظة — صاحبها أو المشرف الأكاديمي أو admin
     */
    public function delete(User $user, Note $note): bool
    {
        if ($user->id === $note->user_id) return true;

        if ($user->role?->name === 'academic_supervisor') {
            return $this->isSupervisorOfNoteStudent($user, $note);
        }

        return $user->role?->name === 'admin';
    }

    /**
     * استعادة ملاحظة محذوفة
     */
    public function restore(User $user, Note $note): bool
    {
        return $user->role?->name === 'admin';
    }

    /**
     * حذف نهائي
     */
    public function forceDelete(User $user, Note $note): bool
    {
        return $user->role?->name === 'admin';
    }

    // ─── Helpers ───

    private function isSupervisorOfNoteStudent(User $user, Note $note): bool
    {
        $assignment = $note->trainingAssignment;
        if (! $assignment) {
            return false;
        }
        if ((int) $assignment->academic_supervisor_id === (int) $user->id) {
            return true;
        }
        $assignment->loadMissing('enrollment.section');

        return (int) ($assignment->enrollment?->section?->academic_supervisor_id) === (int) $user->id;
    }

    private function isMentorOfNoteStudent(User $user, Note $note): bool
    {
        $assignment = $note->trainingAssignment;
        if (!$assignment) return false;
        return $assignment->teacher_id === $user->id;
    }
}
