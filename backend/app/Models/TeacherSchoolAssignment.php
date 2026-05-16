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

        $legacyLinkedIds = User::query()
            ->whereHas('role', fn ($q) => $q->where('name', 'teacher'))
            ->whereNotNull('training_site_id')
            ->pluck('id')
            ->all();

        $excludeIds = array_unique(array_merge($assignedTeacherIds, $legacyLinkedIds));

        return User::whereHas('role', function ($query) {
                $query->where('name', 'teacher');
            })
            ->where('status', 'active')
            ->whereNotIn('id', $excludeIds)
            ->orderBy('name')
            ->get();
    }

    /**
     * مزامنة المعلمين المرتبطين سابقاً عبر users.training_site_id إلى جدول التعيينات.
     */
    public static function syncLegacyTeachersForSchool(int $schoolId, ?int $createdBy = null): int
    {
        $teachers = User::query()
            ->where('training_site_id', $schoolId)
            ->where('status', 'active')
            ->whereHas('role', fn ($q) => $q->where('name', 'teacher'))
            ->get();

        $synced = 0;

        foreach ($teachers as $teacher) {
            $hasActive = static::query()
                ->active()
                ->forTeacher($teacher->id)
                ->exists();

            if ($hasActive) {
                continue;
            }

            static::create([
                'teacher_id' => $teacher->id,
                'school_id' => $schoolId,
                'academic_year' => (string) now()->year,
                'start_date' => now()->toDateString(),
                'is_active' => true,
                'status' => 'active',
                'action_type' => 'legacy_sync',
                'notes' => 'مزامنة تلقائية من ربط الموقع السابق',
                'created_by' => $createdBy,
            ]);

            $synced++;
        }

        return $synced;
    }

    public static function formatTeacherListItem(self $assignment): ?array
    {
        $teacher = $assignment->teacher;
        if (! $teacher) {
            return null;
        }

        return [
            'id' => $teacher->id,
            'name' => $teacher->name,
            'email' => $teacher->email,
            'phone' => $teacher->phone,
            'university_id' => $teacher->university_id,
            'start_date' => $assignment->start_date?->format('Y-m-d'),
            'academic_year' => $assignment->academic_year,
            'status' => $assignment->status,
            'assignment_id' => $assignment->id,
        ];
    }

    public static function canTeacherBeAssignedToSchool($teacherId, $schoolId)
    {
        $activeAssignment = static::getActiveAssignmentForTeacher($teacherId);

        if ($activeAssignment) {
            if ((int) $activeAssignment->school_id === (int) $schoolId) {
                return ['can_assign' => false, 'message' => 'هذا المعلم مضاف بالفعل إلى مدرستك.'];
            }

            return ['can_assign' => false, 'message' => 'لا يمكن إضافة هذا المعلم لأنه مرتبط حاليًا بمدرسة أخرى.'];
        }

        $teacher = User::query()->find($teacherId);
        if ($teacher?->training_site_id) {
            if ((int) $teacher->training_site_id === (int) $schoolId) {
                return ['can_assign' => false, 'message' => 'هذا المعلم مضاف بالفعل إلى مدرستك.'];
            }

            return ['can_assign' => false, 'message' => 'لا يمكن إضافة هذا المعلم لأنه مرتبط حاليًا بمدرسة أخرى.'];
        }

        return ['can_assign' => true, 'message' => ''];
    }
}
