<?php

namespace App\Services;

use App\Models\PortfolioEntry;
use App\Models\StudentEvaluation;
use App\Models\StudentPortfolio;
use App\Models\TrainingAssignment;
use App\Models\TrainingRequestStudent;

class StudentEvaluationPortfolioService
{
    private const CATEGORY = 'school_manager_evaluation';

    private const SCHOOL_FIELD_LABELS = [
        'attendance' => 'الالتزام بالدوام',
        'cooperation_with_staff' => 'التعاون مع الهيئة التعليمية',
        'professionalism' => 'الاحترافية والمهنية',
        'dealing_with_students' => 'التعامل مع الطلبة',
        'participation_in_activities' => 'المشاركة في الأنشطة',
        'school' => 'الالتزام بأنظمة المدرسة',
        'professional_ethics' => 'أخلاقيات المهنة',
        'manners' => 'السلوك والأخلاق العامة',
        'comfort' => 'القدرة على التكيف',
        'supervisor' => 'الاستجابة لتوجيهات المشرف',
    ];

    private const PSYCH_FIELD_LABELS = [
        'attendance' => 'يلتزم الطالب بالدوام وفق برنامج الدوام المحدد',
        'rules_compliance' => 'يلتزم الطالب بالأنظمة والقوانين الناظمة للعمل في المركز',
        'initiative' => 'الطالب مبادر ومشارك في الأنشطة الداعمة للعمل الإرشادي',
        'communication' => 'لديه مهارات تواصل فعال مع جميع العاملين في المركز',
        'responsibility' => 'لديه حس المسؤولية والالتزام في تنفيذ المهام المطلوبة منه',
    ];

    public static function syncToPortfolio(StudentEvaluation $evaluation): void
    {
        $evaluation->loadMissing(['student', 'evaluator.role', 'evaluator.trainingSite', 'trainingRequestStudent.trainingRequest.trainingSite']);

        $student = $evaluation->student;
        if (! $student) {
            return;
        }

        $assignmentId = self::resolveTrainingAssignmentId($evaluation);

        $portfolio = StudentPortfolio::firstOrCreate(
            ['user_id' => $student->id],
            ['training_assignment_id' => $assignmentId]
        );

        if ($assignmentId && ! $portfolio->training_assignment_id) {
            $portfolio->update(['training_assignment_id' => $assignmentId]);
        }

        $payload = self::buildPayload($evaluation);
        $title = self::buildTitle($evaluation);

        $existing = PortfolioEntry::query()
            ->where('student_portfolio_id', $portfolio->id)
            ->where('category', self::CATEGORY)
            ->get()
            ->first(function (PortfolioEntry $entry) use ($evaluation) {
                $content = self::decodeContent($entry->content);
                return (int) ($content['student_evaluation_id'] ?? 0) === (int) $evaluation->id;
            });

        if ($existing) {
            $existing->update([
                'title' => $title,
                'content' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ]);

            return;
        }

        PortfolioEntry::create([
            'student_portfolio_id' => $portfolio->id,
            'title' => $title,
            'category' => self::CATEGORY,
            'content' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    }

    /**
     * مزامنة تقييمات سابقة لم تُضف لملف الإنجاز.
     */
    public static function backfillMissingPortfolioEntries(): int
    {
        $count = 0;
        StudentEvaluation::query()
            ->with(['student', 'evaluator.role', 'evaluator.trainingSite', 'trainingRequestStudent.trainingRequest.trainingSite'])
            ->orderBy('id')
            ->chunkById(50, function ($evaluations) use (&$count) {
                foreach ($evaluations as $evaluation) {
                    $portfolio = StudentPortfolio::query()
                        ->where('user_id', $evaluation->student_id)
                        ->first();

                    if ($portfolio) {
                        $has = PortfolioEntry::query()
                            ->where('student_portfolio_id', $portfolio->id)
                            ->where('category', self::CATEGORY)
                            ->get()
                            ->contains(function (PortfolioEntry $entry) use ($evaluation) {
                                $content = self::decodeContent($entry->content);
                                return (int) ($content['student_evaluation_id'] ?? 0) === (int) $evaluation->id;
                            });
                        if ($has) {
                            continue;
                        }
                    }

                    self::syncToPortfolio($evaluation);
                    $count++;
                }
            });

        return $count;
    }

    private static function buildTitle(StudentEvaluation $evaluation): string
    {
        $role = $evaluation->evaluator?->role?->name;
        if ($role === 'psychology_center_manager') {
            return 'تقييم مدير المركز النفسي';
        }

        $siteName = $evaluation->evaluator?->trainingSite?->name
            ?? $evaluation->trainingRequestStudent?->trainingRequest?->trainingSite?->name;

        return $siteName
            ? "تقييم مدير جهة التدريب — {$siteName}"
            : 'تقييم مدير جهة التدريب';
    }

    private static function buildPayload(StudentEvaluation $evaluation): array
    {
        $role = $evaluation->evaluator?->role?->name;
        $isPsych = $role === 'psychology_center_manager';
        $labels = $isPsych ? self::PSYCH_FIELD_LABELS : self::SCHOOL_FIELD_LABELS;

        $criteria = [];
        $scores = [];
        $total = 0;
        $count = 0;

        foreach ($labels as $key => $label) {
            $value = $evaluation->{$key} ?? null;
            if ($value === null) {
                continue;
            }
            $criteria[] = ['id' => $key, 'label' => $label];
            $scores[$key] = (int) $value;
            $total += (int) $value;
            $count++;
        }

        return [
            'type' => self::CATEGORY,
            'student_evaluation_id' => $evaluation->id,
            'evaluation_date' => $evaluation->evaluation_date?->format('Y-m-d'),
            'evaluator_name' => $evaluation->evaluator?->name,
            'site_name' => $evaluation->evaluator?->trainingSite?->name
                ?? $evaluation->trainingRequestStudent?->trainingRequest?->trainingSite?->name,
            'average_rating' => $evaluation->average_rating,
            'rating_level' => $evaluation->rating_level,
            'total_score' => $total,
            'max_score' => $count * 5,
            'criteria' => $criteria,
            'scores' => $scores,
            'general_notes' => $evaluation->general_notes,
        ];
    }

    private static function resolveTrainingAssignmentId(StudentEvaluation $evaluation): ?int
    {
        $siteId = $evaluation->trainingRequestStudent?->trainingRequest?->training_site_id
            ?? $evaluation->evaluator?->training_site_id;

        $query = TrainingAssignment::query()
            ->whereHas('enrollment', fn ($q) => $q->where('user_id', $evaluation->student_id));

        if ($siteId) {
            $query->where('training_site_id', $siteId);
        }

        return $query->latest('id')->value('id');
    }

    private static function decodeContent(?string $content): array
    {
        if (! $content) {
            return [];
        }
        $decoded = json_decode($content, true);

        return is_array($decoded) ? $decoded : [];
    }
}
