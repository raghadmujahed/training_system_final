<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TeacherSchoolAssignment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'teacher_id',
        'school_id',
        'academic_year',
        'start_date',
        'end_date',
        'is_active',
        'status',
        'action_type',
        'reason',
        'notes',
        'created_by',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
        'approved_at' => 'datetime',
    ];

    // Relationships
    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function school()
    {
        return $this->belongsTo(TrainingSite::class, 'school_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true)->where('status', 'active');
    }

    public function scopeForTeacher($query, $teacherId)
    {
        return $query->where('teacher_id', $teacherId);
    }

    public function scopeForSchool($query, $schoolId)
    {
        return $query->where('school_id', $schoolId);
    }

    public function scopeForAcademicYear($query, $academicYear)
    {
        return $query->where('academic_year', $academicYear);
    }

    public function scopeCurrent($query)
    {
        return $query->active()
            ->where(function ($q) {
                $q->whereNull('end_date')
                  ->orWhere('end_date', '>=', now());
            });
    }

    // Helper methods
    public function isActiveAssignment()
    {
        return $this->is_active && $this->status === 'active' && 
               (!$this->end_date || $this->end_date >= now());
    }

    public function endAssignment($endDate, $reason = null, $notes = null)
    {
        $this->update([
            'end_date' => $endDate,
            'is_active' => false,
            'status' => 'ended',
            'action_type' => 'end_assignment',
            'reason' => $reason,
            'notes' => $notes,
        ]);
    }

    public static function getActiveAssignmentForTeacher($teacherId)
    {
        return static::active()
            ->forTeacher($teacherId)
            ->with(['school', 'teacher'])
            ->first();
    }

    public static function getActiveTeachersForSchool($schoolId)
    {
        return static::active()
            ->forSchool($schoolId)
            ->with(['teacher' => function ($query) {
                $query->whereHas('role', function ($q) {
                    $q->where('name', 'teacher');
                });
            }])
            ->get()
            ->map(function ($assignment) {
                return $assignment->teacher;
            })
            ->filter();
    }

    public static function getTeachersWithoutActiveAssignment()
    {
        $assignedTeacherIds = static::active()
            ->pluck('teacher_id')
            ->toArray();

        return User::whereHas('role', function ($query) {
                $query->where('name', 'teacher');
            })
            ->whereNotIn('id', $assignedTeacherIds)
            ->get();
    }

    public static function canTeacherBeAssignedToSchool($teacherId, $schoolId)
    {
        $activeAssignment = static::getActiveAssignmentForTeacher($teacherId);
        
        if (!$activeAssignment) {
            return ['can_assign' => true, 'message' => ''];
        }

        if ($activeAssignment->school_id == $schoolId) {
            return ['can_assign' => false, 'message' => 'هذا المعلم مضاف بالفعل إلى مدرستك.'];
        }

        return ['can_assign' => false, 'message' => 'لا يمكن إضافة هذا المعلم لأنه مرتبط حاليًا بمدرسة أخرى.'];
    }
}
