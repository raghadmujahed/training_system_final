<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class WorkflowInstance extends Model
{
    use HasFactory;

    protected $fillable = [
        'workflow_template_id',
        'model_type',
        'model_id',
        'status',
        'current_step_id',
        'initiated_by',
        'current_step',
        'completed_at',
    ];

    public function model(): MorphTo
    {
        return $this->morphTo();
    }

    public function template()
    {
        return $this->belongsTo(WorkflowTemplate::class);
    }

    public function currentStep()
    {
        return $this->belongsTo(WorkflowStep::class, 'current_step_id');
    }

    public function approvals()
    {
        return $this->hasMany(WorkflowApproval::class);
    }
}