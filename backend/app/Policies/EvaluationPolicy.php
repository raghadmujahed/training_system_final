<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Evaluation;

class EvaluationPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role?->name, [
            'admin',
            'academic_supervisor',
            'teacher',
            'field_supervisor',
            'psychologist',
            'adviser',
            'school_manager',
            'psychology_center_manager',
            'student',
        ], true);
    }

    public function view(User $user, Evaluation $evaluation): bool
    {
        if ($user->role?->name === 'admin') return true;
        if ($user->id === $evaluation->evaluator_id) return true;
        if ($user->id === $evaluation->trainingAssignment->academic_supervisor_id) return true;
        if ($user->id === $evaluation->trainingAssignment->teacher_id) {
            return true;
        }
        if ($evaluation->trainingAssignment->field_supervisor_id
            && (int) $user->id === (int) $evaluation->trainingAssignment->field_supervisor_id) {
            return true;
        }
        if ($user->id === $evaluation->trainingAssignment->enrollment->user_id) {
            return true;
        }

        return false;
    }

    public function create(User $user): bool
    {
        return in_array($user->role?->name, [
            'teacher',
            'academic_supervisor',
            'school_manager',
            'psychology_center_manager',
            'field_supervisor',
            'psychologist',
            'adviser',
        ], true);
    }

    public function update(User $user, Evaluation $evaluation): bool
    {
        return $user->id === $evaluation->evaluator_id && is_null($evaluation->approved_at);
    }
}