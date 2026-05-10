<?php

namespace App\Policies;

use App\Models\EvaluationTemplate;
use App\Models\User;

class EvaluationTemplatePolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role?->name, [
            'admin',
            'training_coordinator',
            'academic_supervisor',
            'teacher',
            'field_supervisor',
            'psychologist',
            'adviser',
            'school_manager',
            'principal',
            'psychology_center_manager',
        ]);
    }

    public function view(User $user, EvaluationTemplate $evaluationTemplate): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return in_array($user->role?->name, ['admin', 'training_coordinator', 'academic_supervisor', 'school_manager', 'principal']);
    }

    public function update(User $user, EvaluationTemplate $evaluationTemplate): bool
    {
        return in_array($user->role?->name, ['admin', 'training_coordinator', 'academic_supervisor', 'school_manager', 'principal']);
    }

    public function delete(User $user, EvaluationTemplate $evaluationTemplate): bool
    {
        return in_array($user->role?->name, ['admin', 'training_coordinator', 'academic_supervisor', 'school_manager', 'principal']);
    }
}
