<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FieldEvaluationTemplate extends Model
{
    use HasFactory;

    protected $table = 'field_evaluation_templates';

    protected $fillable = [
        'name',
        'code',
        'applies_to',
        'criteria',
        'total_score',
        'score_ranges',
        'allow_draft',
        'is_active',
    ];

    protected $casts = [
        'criteria' => 'array',
        'score_ranges' => 'array',
        'allow_draft' => 'boolean',
        'is_active' => 'boolean',
    ];

    const TYPE_MENTOR_TEACHER = 'mentor_teacher';
    const TYPE_SCHOOL_COUNSELOR = 'school_counselor';
    const TYPE_PSYCHOLOGIST = 'psychologist';

    /**
     * توحيد نوع المشرف الميداني مع قيم applies_to في القوالب (clinical → psychologist).
     */
    public static function normalizedSupervisorType(?string $type): string
    {
        return match ($type) {
            self::TYPE_SCHOOL_COUNSELOR => self::TYPE_SCHOOL_COUNSELOR,
            self::TYPE_PSYCHOLOGIST, 'clinical_psychologist' => self::TYPE_PSYCHOLOGIST,
            default => self::TYPE_MENTOR_TEACHER,
        };
    }

    /**
     * مجموع الدرجة من 100 بناءً على أوزان المحاور ودرجة كل محور على سلم المعايير.
     * scores: [criterion_id => درجة على السلم]
     */
    public function weightedTotalFromScores(array $scores): int
    {
        $criteria = $this->criteria ?? [];
        if ($criteria === []) {
            return (int) round(array_sum($scores));
        }

        $total = 0.0;
        foreach ($criteria as $c) {
            $id = $c['id'] ?? null;
            if (! $id) {
                continue;
            }
            $raw = (float) ($scores[$id] ?? $scores[(string) $id] ?? 0);
            $weight = (float) ($c['weight'] ?? 0);
            $scale = $c['scale'] ?? [1, 2, 3, 4, 5];
            if (! is_array($scale) || $scale === []) {
                continue;
            }
            $maxScale = (float) max($scale);
            $minScale = (float) min($scale);
            if ($maxScale <= $minScale) {
                continue;
            }
            $norm = ($raw - $minScale) / ($maxScale - $minScale);
            $norm = max(0.0, min(1.0, $norm));
            $total += $norm * $weight;
        }

        return (int) round($total);
    }

    /**
     * نطاق: القوالب النشطة
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * نطاق: القوالب لنوع معين
     */
    public function scopeForType($query, string $type)
    {
        return $query->where(function($q) use ($type) {
            $q->where('applies_to', $type)
              ->orWhere('applies_to', 'all');
        });
    }

    /**
     * التقييمات المستخدمة لهذا القالب
     */
    public function fieldEvaluations()
    {
        return $this->hasMany(FieldEvaluation::class, 'template_id');
    }

    /**
     * حساب الدرجة النهائية
     */
    public function calculateGrade(int $totalScore): array
    {
        $ranges = $this->score_ranges ?? $this->getDefaultScoreRanges();
        
        foreach ($ranges as $grade => $range) {
            if ($totalScore >= $range['min']) {
                return [
                    'grade' => $grade,
                    'label' => $range['label'],
                    'color' => $range['color'] ?? 'gray',
                ];
            }
        }

        return [
            'grade' => 'fail',
            'label' => 'ضعيف',
            'color' => 'red',
        ];
    }

    /**
     * نطاقات الدرجات الافتراضية
     */
    private function getDefaultScoreRanges(): array
    {
        return [
            'excellent' => ['min' => 90, 'label' => 'ممتاز', 'color' => 'green'],
            'very_good' => ['min' => 80, 'label' => 'جيد جداً', 'color' => 'blue'],
            'good' => ['min' => 70, 'label' => 'جيد', 'color' => 'yellow'],
            'pass' => ['min' => 60, 'label' => 'مقبول', 'color' => 'orange'],
        ];
    }

    /**
     * الحصول على القالب الافتراضي حسب النوع
     */
    public static function getDefaultForType(string $type): ?self
    {
        $normalized = self::normalizedSupervisorType($type);

        return self::active()
            ->forType($normalized)
            ->orderBy('code')
            ->first();
    }
}
