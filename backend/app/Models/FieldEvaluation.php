<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Concerns\HidesArchived;
use Illuminate\Database\Eloquent\Model;

class FieldEvaluation extends Model
{
    use HasFactory, HidesArchived;

    protected $fillable = [
        'student_id',
        'field_supervisor_id',
        'training_assignment_id',
        'template_id',
        'scores',
        'total_score',
        'grade',
        'general_notes',
        'strengths',
        'areas_for_improvement',
        'status',
        'is_final',
        'submitted_at',
    ];

    protected $casts = [
        'scores' => 'array',
        'is_final' => 'boolean',
        'submitted_at' => 'datetime',
    ];

    const STATUS_DRAFT = 'draft';
    const STATUS_SUBMITTED = 'submitted';
    const STATUS_REVIEWED = 'reviewed';

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
     * قالب التقييم
     */
    public function template()
    {
        return $this->belongsTo(FieldEvaluationTemplate::class, 'template_id');
    }

    /**
     * نطاق: بحسب الحالة
     */
    public function scopeWithStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * نطاق: تقييمات طالب معين
     */
    public function scopeForStudent($query, int $studentId)
    {
        return $query->where('student_id', $studentId);
    }

    /**
     * نطاق: تقييمات مشرف معين
     */
    public function scopeForSupervisor($query, int $supervisorId)
    {
        return $query->where('field_supervisor_id', $supervisorId);
    }

    /**
     * نطاق: نهائي
     */
    public function scopeFinal($query)
    {
        return $query->where('is_final', true);
    }

    /**
     * إرسال التقييم النهائي
     */
    public function submit(): void
    {
        $template = $this->template;

        $scores = $this->scores ?? [];
        $totalScore = $template
            ? $template->weightedTotalFromScores($scores)
            : (int) round(array_sum($scores));

        $gradeInfo = $template ? $template->calculateGrade($totalScore) :
            ['grade' => null, 'label' => null];

        $this->update([
            'status' => self::STATUS_SUBMITTED,
            'is_final' => true,
            'total_score' => $totalScore,
            'grade' => $gradeInfo['grade'],
            'submitted_at' => now(),
        ]);
    }

    /**
     * حفظ مسودة
     */
    public function saveDraft(array $scores, ?string $notes = null): void
    {
        $this->update([
            'scores' => $scores,
            'general_notes' => $notes,
            'status' => self::STATUS_DRAFT,
        ]);
    }

    /**
     * التحقق إذا كان قابل للتعديل
     */
    public function isEditable(): bool
    {
        if ($this->is_final) {
            return false;
        }
        $s = $this->status;

        return $s === null || $s === '' || $s === self::STATUS_DRAFT;
    }

    /**
     * الحصول على الحالة بالعربية
     */
    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            self::STATUS_DRAFT => 'مسودة',
            self::STATUS_SUBMITTED => 'مُرسل',
            self::STATUS_REVIEWED => 'مُراجع',
            default => $this->status,
        };
    }

    /**
     * الحصول على الدرجة بالعربية
     */
    public function getGradeLabelAttribute(): ?string
    {
        if (!$this->grade) return null;
        
        $ranges = $this->template?->score_ranges ?? [];
        return $ranges[$this->grade]['label'] ?? $this->grade;
    }
}
