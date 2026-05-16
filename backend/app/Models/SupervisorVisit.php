<?php

namespace App\Models;

use App\Enums\SupervisorVisitStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Concerns\HidesArchived;
use Illuminate\Database\Eloquent\Model;

class SupervisorVisit extends Model
{
    use HasFactory, HidesArchived;

    protected $fillable = [
        'training_assignment_id', 'supervisor_id', 'visit_date', 'notes',
        'rating', 'scheduled_date', 'status', 'visit_type', 'location',
        'training_track', 'template_type', 'report_data', 'positive_points',
        'needs_improvement', 'general_notes', 'completed_at'
    ];

    protected $casts = [
        'visit_date' => 'date',
        'scheduled_date' => 'date',
        'report_data' => 'array',
        'completed_at' => 'datetime',
    ];

    public function trainingAssignment()
    {
        return $this->belongsTo(TrainingAssignment::class);
    }

    public function supervisor()
    {
        return $this->belongsTo(User::class, 'supervisor_id');
    }

    public static function initialStatus(): string
    {
        return SupervisorVisitStatus::defaultForNewVisit();
    }

    public function isUpcoming(): bool
    {
        return in_array($this->status, ['planned', 'scheduled'], true);
    }
}