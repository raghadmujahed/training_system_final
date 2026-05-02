<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Concerns\HidesArchived;
use Illuminate\Database\Eloquent\Model;

class Enrollment extends Model
{
    use HasFactory, HidesArchived;

    protected $fillable = ['user_id', 'section_id', 'academic_year', 'semester', 'status', 'final_grade'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function trainingAssignments()
    {
        return $this->hasMany(TrainingAssignment::class);
    }

    /**
     * Latest placement used for supervisor roster & dashboards when multiple rows exist.
     */
    public function latestTrainingAssignment()
    {
        return $this->hasOne(TrainingAssignment::class)->latestOfMany();
    }
}