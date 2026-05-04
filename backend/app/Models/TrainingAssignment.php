<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Concerns\HidesArchived;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class TrainingAssignment extends Model
{
    use HasFactory, HidesArchived;

    protected $fillable = [
        'enrollment_id', 'training_request_id', 'training_request_student_id',
        'training_site_id', 'training_period_id', 'teacher_id', 'field_supervisor_id',
        'academic_supervisor_id', 'coordinator_id', 'status', 'academic_status',
        'academic_status_note', 'academic_status_updated_by',
        'academic_status_updated_at', 'start_date', 'end_date'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'academic_status_updated_at' => 'datetime',
    ];

    public function enrollment()
    {
        return $this->belongsTo(Enrollment::class);
    }

    public function trainingRequest()
    {
        return $this->belongsTo(TrainingRequest::class);
    }

    public function trainingRequestStudent()
    {
        return $this->belongsTo(TrainingRequestStudent::class);
    }

    public function trainingSite()
    {
        return $this->belongsTo(TrainingSite::class);
    }

    public function trainingPeriod()
    {
        return $this->belongsTo(TrainingPeriod::class);
    }

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    /**
     * حساب المشرف الميداني (دور field_supervisor) عند التعيين الصريح من جهة التدريب.
     */
    public function fieldSupervisorAccount()
    {
        return $this->belongsTo(User::class, 'field_supervisor_id');
    }

    public function academicSupervisor()
    {
        return $this->belongsTo(User::class, 'academic_supervisor_id');
    }

    public function coordinator()
    {
        return $this->belongsTo(User::class, 'coordinator_id');
    }

    public function academicStatusUpdatedBy()
    {
        return $this->belongsTo(User::class, 'academic_status_updated_by');
    }

    public function academicStatusHistories()
    {
        return $this->hasMany(AcademicSupervisionStatusHistory::class);
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

 public function trainingLogs()
{
    return $this->hasMany(TrainingLog::class);
}

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    public function evaluations()
    {
        return $this->hasMany(Evaluation::class);
    }

    public function supervisorVisits()
    {
        return $this->hasMany(SupervisorVisit::class);
    }

    public function studentPortfolio()
    {
        return $this->hasOne(StudentPortfolio::class);
    }

    // ─── علاقات المشرف الميداني ───

    /**
     * التقارير اليومية المرتبطة بهذا التعيين
     */
    public function dailyReports()
    {
        return $this->hasMany(DailyReport::class);
    }

    /**
     * التقييمات الميدانية المرتبطة بهذا التعيين
     */
    public function fieldEvaluations()
    {
        return $this->hasMany(FieldEvaluation::class);
    }

    /**
     * المشرف الميداني (المعلم المرشد)
     */
    public function fieldSupervisor()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function scopeForAcademicSupervisor(Builder $query, User $user): Builder
    {
        return $query->where('academic_supervisor_id', $user->id);
    }

    public function scopeForTrainingTrack(Builder $query, string $track): Builder
    {
        $track = strtolower($track);

        if ($track === 'psychology_clinic') {
            return $query->whereHas('trainingSite', fn (Builder $q) => $q->whereIn('site_type', ['health_center', 'clinic']));
        }

        if ($track === 'psychology_school') {
            return $query
                ->whereHas('trainingSite', fn (Builder $q) => $q->where('site_type', 'school'))
                ->whereHas('enrollment.user.department', function (Builder $departmentQuery) {
                    $departmentQuery->where('name', 'like', '%psych%')
                        ->orWhere('name', 'like', '%علم النفس%');
                });
        }

        return $query->whereHas('trainingSite', fn (Builder $q) => $q->where('site_type', 'school'));
    }
}