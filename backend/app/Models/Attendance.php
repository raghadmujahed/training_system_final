<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Concerns\HidesArchived;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasFactory, HidesArchived;

    protected $fillable = [
        'training_assignment_id', 'user_id', 'notes', 'field_supervisor_notes', 'date',
        'check_in', 'check_out', 'approved_by', 'approved_at', 'status', 'rejection_reason', 'periods',
        'submitted_to_manager_at', 'submitted_to_manager_by',
        'academic_note', 'academic_alert_status', 'academic_commented_at', 'visible_to_academic',
    ];

    protected $casts = [
        'date' => 'date',
        'check_in' => 'datetime:H:i:s',
        'check_out' => 'datetime:H:i:s',
        'approved_at' => 'datetime',
        'submitted_to_manager_at' => 'datetime',
        'academic_commented_at' => 'datetime',
        'visible_to_academic' => 'boolean',
    ];

    public function trainingAssignment()
    {
        return $this->belongsTo(TrainingAssignment::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
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