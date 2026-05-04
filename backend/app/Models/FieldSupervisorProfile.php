<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FieldSupervisorProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'supervisor_type',
        'workplace_name',
        'workplace_type',
        'department',
        'phone',
        'address',
        'preferences',
        'is_active',
    ];

    protected $casts = [
        'preferences' => 'array',
        'is_active' => 'boolean',
    ];

    /**
     * أنواع المشرفين الميدانيين
     */
    const TYPE_MENTOR_TEACHER = 'mentor_teacher';
    const TYPE_SCHOOL_COUNSELOR = 'school_counselor';
    const TYPE_PSYCHOLOGIST = 'psychologist';

    /**
     * المستخدم المرتبط
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * الطلاب المرتبطين بهذا المشرف
     */
    public function assignedStudents()
    {
        return $this->belongsToMany(
            User::class,
            'training_assignments',
            'teacher_id', // المشرف الميداني يكون teacher في TrainingAssignment
            'student_id'
        )->wherePivot('status', 'ongoing');
    }

    /**
     * التعيينات التدريبية
     */
    public function trainingAssignments()
    {
        return $this->hasMany(TrainingAssignment::class, 'teacher_id');
    }

    /**
     * التقارير اليومية المرسلة للمراجعة
     */
    public function dailyReports()
    {
        return $this->hasMany(DailyReport::class, 'field_supervisor_id');
    }

    /**
     * التقييمات الميدانية
     */
    public function fieldEvaluations()
    {
        return $this->hasMany(FieldEvaluation::class, 'field_supervisor_id');
    }

    /**
     * الحصول على اسم النوع بالعربية
     */
    public function getTypeLabelAttribute(): string
    {
        return match($this->supervisor_type) {
            self::TYPE_MENTOR_TEACHER => 'المعلم المرشد',
            self::TYPE_SCHOOL_COUNSELOR => 'المرشد التربوي',
            self::TYPE_PSYCHOLOGIST, 'clinical_psychologist' => 'الأخصائي النفسي / المؤسسة',
            default => 'مشرف ميداني',
        };
    }

    /**
     * التحقق إذا كان المعلم المرشد
     */
    public function isMentorTeacher(): bool
    {
        return $this->supervisor_type === self::TYPE_MENTOR_TEACHER;
    }

    /**
     * التحقق إذا كان المرشد التربوي
     */
    public function isSchoolCounselor(): bool
    {
        return $this->supervisor_type === self::TYPE_SCHOOL_COUNSELOR;
    }

    /**
     * التحقق إذا كان الأخصائي النفسي
     */
    public function isPsychologist(): bool
    {
        return $this->supervisor_type === self::TYPE_PSYCHOLOGIST;
    }
}
