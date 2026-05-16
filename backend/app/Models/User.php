<?php

namespace App\Models;

use App\Services\TrainingTrackResolver;
use App\Support\SchoolManagerSiteResolver;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected static function booted(): void
    {
        static::saved(function (User $user) {
            if (
                $user->wasChanged('training_site_id')
                || $user->wasChanged('role_id')
            ) {
                SchoolManagerSiteResolver::syncSiteManagerId($user);
            }
        });
    }

    protected $fillable = [
        'university_id', 'name', 'email', 'password', 'status',
        'department_id', 'role_id', 'phone', 'avatar_path', 'training_site_id', 'directorate', 'major',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    // العلاقات
    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function trainingSite()
    {
        return $this->belongsTo(TrainingSite::class);
    }

    public function sectionStudents()
    {
        return $this->hasMany(SectionStudent::class, 'student_id');
    }

    public function sections()
    {
        return $this->belongsToMany(Section::class, 'section_students', 'student_id', 'section_id')
            ->withPivot('status', 'notes', 'archived_at', 'archived_period', 'training_period_id')
            ->withTimestamps();
    }
    public function hasPermission($permission)
{
    return $this->role && $this->role->permissions->contains('name', $permission);
}

    public function hasRole(string $role): bool
    {
        return $this->role?->name === $role;
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function trainingRequests()
    {
        return $this->hasMany(TrainingRequestStudent::class, 'user_id');
    }

    public function assignedTeacherRequests()
    {
        return $this->hasMany(TrainingRequestStudent::class, 'assigned_teacher_id');
    }

    public function evaluationsGiven()
    {
        return $this->hasMany(Evaluation::class, 'evaluator_id');
    }

    public function messagesSent()
    {
        return $this->hasMany(Message::class, 'sender_id');
    }

    public function conversationsParticipantOne()
    {
        return $this->hasMany(Conversation::class, 'participant_one_id');
    }

    public function conversationsParticipantTwo()
    {
        return $this->hasMany(Conversation::class, 'participant_two_id');
    }

    public function announcements()
    {
        return $this->hasMany(Announcement::class, 'user_id');
    }

    public function backups()
    {
        return $this->hasMany(Backup::class, 'user_id');
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class, 'user_id');
    }

    public function approvedAttendances()
    {
        return $this->hasMany(Attendance::class, 'approved_by');
    }

    public function tasksAssigned()
    {
        return $this->hasMany(Task::class, 'assigned_by');
    }

    public function taskSubmissions()
    {
        return $this->hasMany(TaskSubmission::class, 'user_id');
    }

    public function studentPortfolio()
    {
        return $this->hasOne(StudentPortfolio::class, 'user_id');
    }

    public function trainingProgram()
    {
        return $this->hasOne(TrainingProgram::class, 'user_id');
    }

    public function supervisorVisits()
    {
        return $this->hasMany(SupervisorVisit::class, 'supervisor_id');
    }

    public function sentOfficialLetters()
    {
        return $this->hasMany(OfficialLetter::class, 'sent_by');
    }

    public function receivedOfficialLetters()
    {
        return $this->hasMany(OfficialLetter::class, 'received_by');
    }

    public function notes()
    {
        return $this->hasMany(Note::class, 'user_id');
    }

    public function teacherSchoolAssignments()
    {
        return $this->hasMany(TeacherSchoolAssignment::class, 'teacher_id');
    }

    public function activeTeacherSchoolAssignment()
    {
        return $this->teacherSchoolAssignments()->active()->first();
    }

    public function currentSchool()
    {
        if ($this->hasRole('teacher')) {
            return $this->activeTeacherSchoolAssignment?->school;
        }
        return $this->trainingSite;
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class, 'user_id');
    }
    public function submittedWeeklySchedules()
{
    return $this->hasMany(WeeklySchedule::class, 'submitted_by');
}

public function enrollments()
{
    return $this->hasMany(Enrollment::class);
}

    /**
     * آخر تسجيل شعبة للطالب مع العلاقات اللازمة.
     * يتجاهل التسجيلات في الشعب المؤرشفة.
     */
    public function currentEnrollment(): ?Enrollment
    {
        return $this->enrollments()
            ->whereHas('section', function ($q) {
                $q->whereNull('archived_at');
            })
            ->with(['section.course'])
            ->latest('id')
            ->first();
    }

    /**
     * تحديد مسار الطالب بناءً على role + section/course/department.
     */
    public function resolveStudentTrack(): ?string
    {
        if ($this->role?->name !== 'student') {
            return null;
        }

        // 1) مقارنة بمعرّف القسم (الأسرع — لا يحتاج تحميل العلاقة)
        $departmentId = $this->department_id;
        if ($departmentId === TrainingTrackResolver::psychologyDeptId()) {
            return 'psychology';
        }
        if ($departmentId === TrainingTrackResolver::usoolTarbiahDeptId()) {
            return 'education';
        }

        // 2) مقارنة باسم القسم (إذا لم يتوفر المعرّف)
        $departmentName = $this->department?->name;
        if ($departmentName === 'psychology') {
            return 'psychology';
        }
        if ($departmentName === 'usool_tarbiah') {
            return 'education';
        }

        // 3) fallback: تحليل نصي في حال عدم وجود قسم
        $enrollment = $this->currentEnrollment();
        $courseCode = strtolower((string) data_get($enrollment, 'section.course.code', ''));
        $courseName = strtolower((string) data_get($enrollment, 'section.course.name', ''));
        $deptLower = strtolower((string) $departmentName);

        if (
            str_contains($courseCode, 'psyc') ||
            str_contains($courseName, 'نفسي') ||
            str_contains($courseName, 'نفس') ||
            str_contains($deptLower, 'psych') ||
            str_contains($deptLower, 'نفس')
        ) {
            return 'psychology';
        }

        if (
            str_contains($courseCode, 'educ') ||
            str_contains($courseName, 'تربية') ||
            str_contains($courseName, 'تربيه') ||
            str_contains($courseName, 'اصول') ||
            str_contains($courseName, 'أصول') ||
            str_contains($deptLower, 'usool') ||
            str_contains($deptLower, 'tarb') ||
            str_contains($deptLower, 'تربية') ||
            str_contains($deptLower, 'تربيه') ||
            str_contains($deptLower, 'اصول') ||
            str_contains($deptLower, 'أصول')
        ) {
            return 'education';
        }

        return null;
    }

    /**
     * أحدث تعيين تدريبي مرتبط بتسجيل الطالب (للجدول، السجل، المهام).
     * يتجاهل التعيينات في الشعب المؤرشفة.
     */
    public function currentTrainingAssignment(): ?TrainingAssignment
    {
        // Get latest enrollment in non-archived section
        $enrollment = $this->enrollments()
            ->whereHas('section', function ($q) {
                $q->whereNull('archived_at');
            })
            ->latest('id')
            ->first();

        if (! $enrollment) {
            return null;
        }

        return $enrollment->trainingAssignments()
            ->with(['trainingSite', 'teacher', 'trainingPeriod'])
            ->latest('id')
            ->first();
    }

    // ─── علاقات المشرف الميداني ───

    /**
     * المشرف الميداني: ملف التعريف
     */
    public function fieldSupervisorProfile()
    {
        return $this->hasOne(FieldSupervisorProfile::class);
    }

    /**
     * المشرف الميداني: التقارير اليومية للمراجعة
     */
    public function dailyReportsToReview()
    {
        return $this->hasMany(DailyReport::class, 'field_supervisor_id');
    }

    /**
     * المشرف الميداني: التقييمات الميدانية
     */
    public function fieldEvaluationsGiven()
    {
        return $this->hasMany(FieldEvaluation::class, 'field_supervisor_id');
    }

    /**
     * الطالب: التقارير اليومية المرفوعة
     */
    public function dailyReports()
    {
        return $this->hasMany(DailyReport::class, 'student_id');
    }

    /**
     * الطالب: التقييمات الميدانية المستلمة
     */
    public function fieldEvaluations()
    {
        return $this->hasMany(FieldEvaluation::class, 'student_id');
    }

    /**
     * التحقق إذا كان المستخدم مشرف ميداني
     */
    public function isFieldSupervisor(): bool
    {
        return $this->fieldSupervisorProfile()->exists();
    }

    /**
     * الحصول على نوع المشرف الميداني
     */
    public function getFieldSupervisorType(): ?string
    {
        return $this->fieldSupervisorProfile?->supervisor_type;
    }

    /**
     * رابط الصورة العامة تحت ‎/storage‎ (يعتمد APP_URL أو رؤوس البروكسي على الإنتاج).
     */
    public function publicAvatarUrl(): ?string
    {
        if (! $this->avatar_path) {
            return null;
        }

        $path = ltrim(str_replace('\\', '/', $this->avatar_path), '/');
        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }

        return rtrim(static::publicAssetBaseUrl(), '/').'/api/avatars/'.$path;
    }

    public static function publicAssetBaseUrl(): string
    {
        $configured = rtrim((string) config('app.url'), '/');
        if ($configured !== '' && ! preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#i', $configured)) {
            return $configured;
        }

        if (! app()->runningInConsole() && request()) {
            $scheme = request()->header('X-Forwarded-Proto') ?: request()->getScheme();
            $host = request()->header('X-Forwarded-Host') ?: request()->getHost();
            $port = request()->header('X-Forwarded-Port');

            if ($host && str_contains($host, ':')) {
                return "{$scheme}://{$host}";
            }

            $defaultPort = $scheme === 'https' ? 443 : 80;
            if ($port && (int) $port !== $defaultPort) {
                return "{$scheme}://{$host}:{$port}";
            }

            return "{$scheme}://{$host}";
        }

        return $configured !== '' ? $configured : 'http://localhost:8000';
    }
}
