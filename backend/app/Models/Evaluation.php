<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Concerns\HidesArchived;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Evaluation extends Model
{
    use HasFactory, HidesArchived;

    protected $fillable = [
        'training_assignment_id', 'evaluator_id', 'template_id', 'evaluation_type',
        'total_score', 'notes', 'status', 'is_final', 'strengths',
        'areas_for_improvement', 'recommendation', 'criteria_scores', 'submitted_at'
    ];

    protected $casts = [
        'is_final' => 'boolean',
        'criteria_scores' => 'array',
        'submitted_at' => 'datetime',
    ];

    public function trainingAssignment()
    {
        return $this->belongsTo(TrainingAssignment::class);
    }

    public function evaluator()
    {
        return $this->belongsTo(User::class, 'evaluator_id');
    }

    public function template()
    {
        return $this->belongsTo(EvaluationTemplate::class);
    }

    public function scores()
    {
        return $this->hasMany(EvaluationScore::class);
    }

    public function scopeVisibleToAcademicSupervisor(Builder $query, User $user): Builder
    {
        return $query->whereHas('trainingAssignment', fn (Builder $q) => $q->where('academic_supervisor_id', $user->id));
    }

    public function scopeForTrainingTrack(Builder $query, string $track): Builder
    {
        return $query->whereHas('trainingAssignment', fn (Builder $q) => $q->forTrainingTrack($track));
    }
}