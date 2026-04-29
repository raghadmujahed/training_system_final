<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TrainingSite extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'location',
        'phone',
        'email',
        'mobile',
        'description',
        'is_active',
        'directorate',
        'capacity',
        'site_type',
        'governing_body',
        'school_type',
        'gender',
        'gender_classification',
        'school_level',
    ];

    public function trainingRequests()
    {
        return $this->hasMany(TrainingRequest::class);
    }

    public function trainingAssignments()
    {
        return $this->hasMany(TrainingAssignment::class);
    }

    public function officialLetters()
    {
        return $this->hasMany(OfficialLetter::class, 'training_site_id');
    }

    public function weeklySchedules()
    {
        return $this->hasMany(WeeklySchedule::class);
    }
}