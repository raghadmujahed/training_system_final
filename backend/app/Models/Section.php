<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Concerns\HidesArchived;
use Illuminate\Database\Eloquent\Model;

class Section extends Model
{
    use HasFactory, HidesArchived;

    protected $fillable = [
        'name', 
        'academic_year', 
        'academic_supervisor_id', 
        'semester', 
        'course_id',
        'capacity',
        'supervisor_id',
        'created_by',
        'training_period_id',
    ];

    protected $casts = [
        'capacity' => 'integer',
    ];

    public function trainingPeriod()
    {
        return $this->belongsTo(TrainingPeriod::class);
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function academicSupervisor()
    {
        return $this->belongsTo(User::class, 'academic_supervisor_id');
    }

    public function supervisor()
    {
        return $this->belongsTo(User::class, 'supervisor_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function enrollments()
    {
        return $this->hasMany(Enrollment::class);
    }

    public function students()
    {
        return $this->belongsToMany(User::class, 'section_students', 'section_id', 'student_id')
            ->withPivot('status', 'notes', 'archived_at', 'archived_period')
            ->whereNull('section_students.archived_at')
            ->withTimestamps();
    }

    public function activeStudents()
    {
        return $this->students()->wherePivot('status', 'accepted');
    }

    public function getActiveStudentsCountAttribute()
    {
        return $this->activeStudents()->count();
    }

    public function getAvailableCapacityAttribute()
    {
        return $this->capacity - $this->active_students_count;
    }

    public function hasAvailableCapacity()
    {
        return $this->available_capacity > 0;
    }
}