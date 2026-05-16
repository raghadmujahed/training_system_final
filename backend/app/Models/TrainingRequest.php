<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TrainingRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'requested_by',
        'book_status', 'sent_to_directorate_at', 'directorate_approved_at',
        'sent_to_school_at', 'school_approved_at', 'training_site_id',
        'status', 'requested_at' ,     'rejection_reason', 'letter_number',
        'letter_date',  'training_period_id',
        'governing_body',
        'directorate',
        'attachment_path',
        'coordinator_reviewed_at',
        'needs_edit_reason',
        'coordinator_rejection_reason',
        'batched_at',

    ];

    protected $casts = [
        'sent_to_directorate_at' => 'datetime',
        'directorate_approved_at' => 'datetime',
        'sent_to_school_at' => 'datetime',
        'school_approved_at' => 'datetime',
        'requested_at' => 'datetime',
            'rejection_reason'=> 'string',  
    'letter_date'=> 'datetime',
        'coordinator_reviewed_at' => 'datetime',
        'needs_edit_reason' => 'string',
        'coordinator_rejection_reason' => 'string',
        'batched_at' => 'datetime',
    ];

    public function requestedBy()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function trainingSite()
    {
        return $this->belongsTo(TrainingSite::class);
    }

    public function trainingPeriod()
    {
        return $this->belongsTo(TrainingPeriod::class);
    }

    public function trainingRequestStudents()
    {
        return $this->hasMany(TrainingRequestStudent::class);
    }

    public function trainingAssignments()
    {
        return $this->hasMany(TrainingAssignment::class);
    }

    public function officialLetters()
    {
        return $this->hasMany(OfficialLetter::class);
    }

    public function batches()
    {
        return $this->belongsToMany(
            TrainingRequestBatch::class,
            'training_request_batch_items',
            'training_request_id',
            'batch_id'
        )->withTimestamps();
    }
}