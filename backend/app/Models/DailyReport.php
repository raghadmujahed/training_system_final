<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Concerns\HidesArchived;
use Illuminate\Database\Eloquent\Model;

class DailyReport extends Model
{
    use HasFactory, HidesArchived;

    protected $fillable = [
        'student_id',
        'field_supervisor_id',
        'training_assignment_id',
        'template_id',
        'report_date',
        'data',
        'student_notes',
        'supervisor_notes',
        'status',
        'submitted_at',
        'reviewed_at',
    ];

    protected $casts = [
        'report_date' => 'date',
        'data' => 'array',
        'reviewed_at' => 'datetime',
        'submitted_at' => 'datetime',
    ];

    const STATUS_DRAFT = 'draft';
    const STATUS_SUBMITTED = 'submitted';
    const STATUS_REVIEWED = 'reviewed';
    const STATUS_RETURNED = 'returned';

    // Aliases kept for backward compatibility with FieldSupervisorController calls
    const STATUS_UNDER_REVIEW = 'submitted';
    const STATUS_CONFIRMED = 'reviewed';

    /**
     * الطالب
     */
    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * المشرف الميداني
     */
    public function fieldSupervisor()
    {
        return $this->belongsTo(User::class, 'field_supervisor_id');
    }

    /**
     * التعيين التدريبي
     */
    public function trainingAssignment()
    {
        return $this->belongsTo(TrainingAssignment::class);
    }

    /**
     * قالب التقرير
     */
    public function template()
    {
        return $this->belongsTo(DailyReportTemplate::class, 'template_id');
    }

    /**
     * من قام بالمراجعة
     */
    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /**
     * المرفقات
     */
    public function attachments()
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    /**
     * نطاق: بحسب الحالة
     */
    public function scopeWithStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * نطاق: تقارير اليوم
     */
    public function scopeToday($query)
    {
        return $query->whereDate('report_date', today());
    }

    /**
     * نطاق: تقارير طالب معين
     */
    public function scopeForStudent($query, int $studentId)
    {
        return $query->where('student_id', $studentId);
    }

    /**
     * نطاق: تقارير مشرف معين
     */
    public function scopeForSupervisor($query, int $supervisorId)
    {
        return $query->where('field_supervisor_id', $supervisorId);
    }

    /**
     * نطاق: بحاجة للمراجعة
     */
    public function scopePendingReview($query)
    {
        return $query->where('status', self::STATUS_SUBMITTED);
    }

    /**
     * تأكيد التقرير
     */
    public function confirm(int $reviewerId, ?string $comment = null): void
    {
        $this->update([
            'status' => self::STATUS_REVIEWED,
            'supervisor_notes' => $comment,
            'reviewed_at' => now(),
        ]);
    }

    /**
     * إعادة التقرير للتعديل
     */
    public function returnForEdit(int $reviewerId, string $comment): void
    {
        $this->update([
            'status' => self::STATUS_RETURNED,
            'supervisor_notes' => $comment,
            'reviewed_at' => now(),
        ]);
    }

    /**
     * الحصول على الحالة بالعربية
     */
    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            self::STATUS_DRAFT => 'مسودة',
            self::STATUS_SUBMITTED => 'مُرسل',
            self::STATUS_REVIEWED => 'مُعتمد',
            self::STATUS_RETURNED => 'مُعاد للتعديل',
            default => $this->status,
        };
    }

    /**
     * الحصول على لون الحالة
     */
    public function getStatusColorAttribute(): string
    {
        return match($this->status) {
            self::STATUS_REVIEWED => 'green',
            self::STATUS_RETURNED => 'red',
            self::STATUS_SUBMITTED => 'blue',
            self::STATUS_DRAFT => 'gray',
            default => 'gray',
        };
    }
}
