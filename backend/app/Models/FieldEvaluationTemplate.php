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
     * scores: [criterion_id => درجة على السلم] أو لبنود text_pair: [criterion_id => ['positive' => '', 'development' => '']]
     *
     * يعيد null عندما يكون القالب وصفياً بالكامل (لا بند رقمي).
     */
    public function weightedTotalFromScores(array $scores): ?int
    {
        $criteria = $this->criteria ?? [];
        if ($criteria === []) {
            $sum = 0.0;
            foreach ($scores as $v) {
                if (is_numeric($v)) {
                    $sum += (float) $v;
                }
            }

            return (int) round($sum);
        }

        $total = 0.0;
        $hadNumericCriterion = false;
        foreach ($criteria as $c) {
            if (($c['response_type'] ?? '') === 'text_pair') {
                continue;
            }

            $id = $c['id'] ?? null;
            if (! $id) {
                continue;
            }
            $hadNumericCriterion = true;
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

        if (! $hadNumericCriterion) {
            return null;
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

        if ($normalized === self::TYPE_SCHOOL_COUNSELOR) {
            $counselor = self::active()
                ->where('applies_to', self::TYPE_SCHOOL_COUNSELOR)
                ->where('code', 'counselor_evaluation')
                ->first();
            if ($counselor) {
                return $counselor;
            }
        }

        if ($normalized === self::TYPE_MENTOR_TEACHER) {
            $visit = self::active()
                ->where('applies_to', self::TYPE_MENTOR_TEACHER)
                ->where('code', 'classroom_visit_form_6')
                ->first();
            if ($visit) {
                return $visit;
            }
        }

        if ($normalized === self::TYPE_PSYCHOLOGIST) {
            $psych = self::active()
                ->where('applies_to', self::TYPE_PSYCHOLOGIST)
                ->where('code', 'psychologist_institution_evaluation')
                ->first();
            if ($psych) {
                return $psych;
            }
        }

        return self::active()
            ->forType($normalized)
            ->orderBy('code')
            ->first();
    }

    /**
     * بنود نموذج 9 الرسمي — ٢٠ مؤشرًا (سلم 1–5، وزن 5 لكل بند).
     *
     * @return array<int, array{id: string, label: string, description: string, weight: int, scale: array<int, int>}>
     */
    public static function officialCounselorEvaluationCriteria(): array
    {
        return [
            ['id' => 'counselor_ce_01', 'label' => 'القدرة على وضع خطة إرشادية متكاملة', 'description' => '', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
            ['id' => 'counselor_ce_02', 'label' => 'القدرة على تطبيق جلسات توجيه جمعي', 'description' => '', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
            ['id' => 'counselor_ce_03', 'label' => 'القدرة على تطبيق جلسات إرشاد فردي', 'description' => '', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
            ['id' => 'counselor_ce_04', 'label' => 'القدرة على تطبيق جلسات إرشاد جماعي', 'description' => '', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
            ['id' => 'counselor_ce_05', 'label' => 'القدرة على بناء علاقة إرشادية إيجابية مع عناصر المدرسة', 'description' => '', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
            ['id' => 'counselor_ce_06', 'label' => 'القدرة على بناء علاقة إرشادية ناجحة أثناء الجلسات الإرشادية', 'description' => '', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
            ['id' => 'counselor_ce_07', 'label' => 'القدرة على بناء علاقة إرشادية ناجحة مع المسترشدين', 'description' => '', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
            ['id' => 'counselor_ce_08', 'label' => 'القدرة على توظيف مفاهيم النظريات الإرشادية في العمل الإرشادي', 'description' => '', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
            ['id' => 'counselor_ce_09', 'label' => 'القدرة على المبادرة في طرح الأفكار أثناء التدريب', 'description' => '', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
            ['id' => 'counselor_ce_10', 'label' => 'مدى الاستعداد لتقبل التوجيهات والإرشادات من المرشد/ة', 'description' => '', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
            ['id' => 'counselor_ce_11', 'label' => 'القدرة على بناء علاقة إيجابية مع عناصر المدرسة', 'description' => '', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
            ['id' => 'counselor_ce_12', 'label' => 'القدرة على إدارة جلسات الإرشاد الجماعي', 'description' => '', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
            ['id' => 'counselor_ce_13', 'label' => 'مدى الالتزام بأنظمة وقوانين المدرسة', 'description' => '', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
            ['id' => 'counselor_ce_14', 'label' => 'القدرة على التعامل مع مشكلات المسترشدين بأنواعها المختلفة', 'description' => '', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
            ['id' => 'counselor_ce_15', 'label' => 'مدى الالتزام بتعليمات المرشد/ة وتطبيقها', 'description' => '', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
            ['id' => 'counselor_ce_16', 'label' => 'مدى الالتزام بأوقات الحضور والمغادرة', 'description' => '', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
            ['id' => 'counselor_ce_17', 'label' => 'مدى الالتزام بأخلاقيات مهنة الإرشاد', 'description' => '', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
            ['id' => 'counselor_ce_18', 'label' => 'القدرة على جمع وتحليل البيانات الخاصة بالعمل الإرشادي', 'description' => '', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
            ['id' => 'counselor_ce_19', 'label' => 'القدرة على التواصل الإنساني مع جميع عناصر العملية الإرشادية', 'description' => '', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
            ['id' => 'counselor_ce_20', 'label' => 'القدرة على التكامل بين الإطار النظري والتطبيقي أثناء التدريب', 'description' => '', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
        ];
    }

    /**
     * مزامنة قالب counselor_evaluation في قاعدة البيانات (نموذج 9 — ٢٠ بندًا).
     */
    public static function syncOfficialCounselorEvaluationTemplate(): void
    {
        $scoreRanges = [
            'excellent' => ['min' => 90, 'label' => 'ممتاز', 'color' => 'green'],
            'very_good' => ['min' => 80, 'label' => 'جيد جداً', 'color' => 'blue'],
            'good' => ['min' => 70, 'label' => 'جيد', 'color' => 'yellow'],
            'pass' => ['min' => 60, 'label' => 'مقبول', 'color' => 'orange'],
            'fail' => ['min' => 0, 'label' => 'ضعيف', 'color' => 'red'],
        ];

        self::query()->updateOrCreate(
            ['code' => 'counselor_evaluation'],
            [
                'name' => 'نموذج تقييم المرشد/ المدرب (نموذج 9)',
                'applies_to' => self::TYPE_SCHOOL_COUNSELOR,
                'criteria' => self::officialCounselorEvaluationCriteria(),
                'total_score' => 100,
                'score_ranges' => $scoreRanges,
                'allow_draft' => true,
                'is_active' => true,
            ]
        );
    }

    /**
     * محاور نموذج 6 — تقرير زيارة صفية (ملاحظات وصفية لكل محور).
     *
     * @return array<int, array<string, mixed>>
     */
    public static function officialMentorClassroomVisitForm6Criteria(): array
    {
        $pair = static function (string $id, string $label): array {
            return [
                'id' => $id,
                'label' => $label,
                'response_type' => 'text_pair',
                'positive_key' => 'positive',
                'development_key' => 'development',
                'positive_label' => 'الأمور الإيجابية',
                'development_label' => 'الأمور التي بحاجة إلى تطوير',
            ];
        };

        return [
            $pair('cv6_content', 'المحتوى التعليمي'),
            $pair('cv6_planning', 'التخطيط للتدريس'),
            $pair('cv6_methods', 'طرائق التدريس'),
            $pair('cv6_aids', 'الوسائل التعليمية والتكنولوجية'),
            $pair('cv6_management', 'الإدارة الصفية'),
            $pair('cv6_assessment', 'التقويم التربوي'),
            $pair('cv6_ethics', 'أخلاقيات المهنة'),
        ];
    }

    /**
     * نموذج 6 للمعلم المرشد — تقرير زيارة صفية / مساق التربية العملية.
     */
    public static function syncOfficialMentorClassroomVisitForm6Template(): void
    {
        self::query()->updateOrCreate(
            ['code' => 'classroom_visit_form_6'],
            [
                'name' => 'تقرير زيارة صفية — مساق التربية العملية (نموذج 6)',
                'applies_to' => self::TYPE_MENTOR_TEACHER,
                'criteria' => self::officialMentorClassroomVisitForm6Criteria(),
                'total_score' => 0,
                'score_ranges' => [],
                'allow_draft' => true,
                'is_active' => true,
            ]
        );
    }

    /**
     * معايير تقييم أداء الطالب المتدرب في المصحات/المؤسسات النفسية — مشرف المؤسسة (٢٠ معيارًا، سلم 1–5).
     *
     * @return array<int, array{id: string, label: string, description: string, weight: int, scale: array<int, int>}>
     */
    public static function officialPsychologistInstitutionEvaluationCriteria(): array
    {
        $w = static fn (string $id, string $label): array => [
            'id' => $id,
            'label' => $label,
            'description' => '',
            'weight' => 5,
            'scale' => [1, 2, 3, 4, 5],
        ];

        return [
            $w('psych_ie_01', 'بنى خطة لتنفيذ المهام المطلوبة منه بطريقة سليمة'),
            $w('psych_ie_02', 'قام بتنفيذ المهمات المطلوبة منه كما خطط لها وعمل على توثيقها في ملف الإنجاز'),
            $w('psych_ie_03', 'اهتم بملاحظات مشرف المؤسسة واستفاد منها'),
            $w('psych_ie_04', 'قادر على استخدام أدوات جمع المعلومات ويوظفها بشكل مناسب في عملية التشخيص'),
            $w('psych_ie_05', 'استخدم أساليب التدخل المناسبة أثناء الجلسات الإرشادية'),
            $w('psych_ie_06', 'طبق مهارات الإرشاد المختلفة بشكل مناسب أثناء جلسات الإرشاد مع المنتفعين'),
            $w('psych_ie_07', 'استخدم الطالب المتدرب لغة التواصل المناسبة أثناء الجلسات الإرشادية'),
            $w('psych_ie_08', 'يتقبل النقد البناء ويوظفه لتطوير شخصيته ومهاراته المهنية'),
            $w('psych_ie_09', 'التزم الطالب بأخلاقيات ممارسة مهنة الإرشاد النفسي'),
            $w('psych_ie_10', 'التزم الطالب بمواعيد التدريب وأوقات الحضور والمغادرة'),
            $w('psych_ie_11', 'القدرة على تدوين الجلسات النفسية والتوثيق بطريقة مهنية'),
            $w('psych_ie_12', 'القدرة على المبادرة في طرح الأفكار أثناء التدريب'),
            $w('psych_ie_13', 'لديه المقدرة على الربط بين الجانب النظري والعملي'),
            $w('psych_ie_14', 'لديه المقدرة على جمع المعلومات من مصادرها المتعددة'),
            $w('psych_ie_15', 'قادر على تحمل المسؤولية والقيام بما يسند إليه من أعمال'),
            $w('psych_ie_16', 'العمل في حدود أهداف وبرامج المؤسسة'),
            $w('psych_ie_17', 'التمكن من تطبيق الاختبارات والمقاييس وتصحيحها وتفسير درجاتها'),
            $w('psych_ie_18', 'التمكن من كتابة التقارير النفسية وتوثيقها'),
            $w('psych_ie_19', 'قادر على بناء علاقة مهنية مع طاقم العمل في المؤسسة'),
            $w('psych_ie_20', 'الالتزام بتعليمات المؤسسة وأنظمتها ولوائحها'),
        ];
    }

    /**
     * قالب تقييم مشرف المؤسسة للتدريب النفسي/المؤسسي (النموذج الرسمي — ٢٠ بندًا).
     */
    public static function syncOfficialPsychologistInstitutionEvaluationTemplate(): void
    {
        $scoreRanges = [
            'excellent' => ['min' => 90, 'label' => 'ممتاز', 'color' => 'green'],
            'very_good' => ['min' => 80, 'label' => 'جيد جداً', 'color' => 'blue'],
            'good' => ['min' => 70, 'label' => 'جيد', 'color' => 'yellow'],
            'pass' => ['min' => 60, 'label' => 'مقبول', 'color' => 'orange'],
            'fail' => ['min' => 0, 'label' => 'ضعيف', 'color' => 'red'],
        ];

        self::query()->updateOrCreate(
            ['code' => 'psychologist_institution_evaluation'],
            [
                'name' => 'معايير تقييم أداء الطالب المتدرب في المصحات النفسية / خاص بمشرف المؤسسة',
                'applies_to' => self::TYPE_PSYCHOLOGIST,
                'criteria' => self::officialPsychologistInstitutionEvaluationCriteria(),
                'total_score' => 100,
                'score_ranges' => $scoreRanges,
                'allow_draft' => true,
                'is_active' => true,
            ]
        );
    }
}
