<?php

namespace App\Services;

use App\Models\Evaluation;
use App\Models\EvaluationScore;
use App\Models\EvaluationItem;
use App\Models\TrainingAssignment;
use App\Models\StudentPortfolio;
use App\Models\PortfolioEntry;
use Illuminate\Support\Facades\DB;

class EvaluationService
{
    /**
     * إنشاء تقييم جديد (من مقيم: معلم مرشد، مشرف أكاديمي، مدير مدرسة)
     */
    public function createEvaluation(array $data, int $evaluatorId): Evaluation
    {
        return DB::transaction(function () use ($data, $evaluatorId) {
            // حساب total_score من الأصناف التي تحمل score
            $totalScore = 0;
            foreach ($data['scores'] as $scoreItem) {
                if (isset($scoreItem['score'])) {
                    $totalScore += $scoreItem['score'];
                }
            }

            $evaluation = Evaluation::create([
                'training_assignment_id' => $data['training_assignment_id'],
                'evaluator_id' => $evaluatorId,
                'template_id' => $data['template_id'] ?? null,
                'evaluation_type' => $data['evaluation_type'] ?? null,
                'total_score' => $totalScore,
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($data['scores'] as $scoreItem) {
                $safeScore = isset($scoreItem['score']) && $scoreItem['score'] !== null
                    ? $scoreItem['score']
                    : 0;

                EvaluationScore::create([
                    'evaluation_id' => $evaluation->id,
                    'item_id' => $scoreItem['item_id'],
                    'score' => $safeScore,
                    'response_text' => $scoreItem['response_text'] ?? null,
                    'file_path' => $scoreItem['file_path'] ?? null,
                ]);
            }

            // إضافة التقييم لملف إنجاز الطالب
            $this->addEvaluationToPortfolio($evaluation);

            return $evaluation->load('scores');
        });
    }

    /**
     * تحديث تقييم (إضافة ملاحظات أو تعديل درجات - فقط إذا لم يُعتمد بعد)
     */
    public function updateEvaluation(Evaluation $evaluation, array $data): Evaluation
    {
        return DB::transaction(function () use ($evaluation, $data) {
            if (isset($data['notes'])) {
                $evaluation->update(['notes' => $data['notes']]);
            }

            if (isset($data['scores'])) {
                foreach ($data['scores'] as $scoreData) {
                    $score = EvaluationScore::where('evaluation_id', $evaluation->id)
                        ->where('item_id', $scoreData['item_id'])
                        ->first();
                    if ($score) {
                        $safeScore = isset($scoreData['score']) && $scoreData['score'] !== null
                            ? $scoreData['score']
                            : 0;

                        $score->update([
                            'score' => $safeScore,
                            'response_text' => $scoreData['response_text'] ?? $score->response_text,
                        ]);
                    }
                }
                // إعادة حساب total_score
                $total = EvaluationScore::where('evaluation_id', $evaluation->id)->sum('score');
                $evaluation->update(['total_score' => $total]);
            }

            return $evaluation->fresh();
        });
    }

    /**
     * جلب تقييمات الطالب لتدريب معين
     */
    public function getStudentEvaluations(int $trainingAssignmentId): array
    {
        $evaluations = Evaluation::with(['template', 'scores.item'])
            ->where('training_assignment_id', $trainingAssignmentId)
            ->get();

        $result = [
            'academic_supervisor' => null,
            'school_mentor' => null,
            'school_principal' => null,
            'psychologist' => null,
        ];

        foreach ($evaluations as $eval) {
            $role = $eval->evaluator->role->name;
            switch ($role) {
                case 'academic_supervisor':
                    $result['academic_supervisor'] = $eval;
                    break;
                case 'teacher':
                    $result['school_mentor'] = $eval;
                    break;
                case 'school_manager':
                case 'principal':
                    $result['school_principal'] = $eval;
                    break;
                case 'psychologist':
                    $result['psychologist'] = $eval;
                    break;
            }
        }
        return $result;
    }

    /**
     * إضافة التقييم كمدخل في ملف إنجاز الطالب
     */
    protected function addEvaluationToPortfolio(Evaluation $evaluation): void
    {
        $assignment = TrainingAssignment::with('enrollment.user')->find($evaluation->training_assignment_id);
        if (! $assignment) {
            return;
        }

        $student = $assignment->enrollment?->user;
        if (! $student) {
            return;
        }

        // تأكد من وجود ملف إنجاز للطالب
        $portfolio = StudentPortfolio::firstOrCreate(
            ['user_id' => $student->id],
            ['training_assignment_id' => $assignment->id]
        );

        // بناء عنوان ومحتوى المدخل
        $evalType = $evaluation->evaluation_type ?? 'general';
        $typeLabels = [
            'education_school' => 'تقييم مدير المدرسة (أصول التربية)',
            'psychology_school' => 'تقييم مدير المدرسة (علم النفس)',
            'general' => 'تقييم مدير المدرسة',
        ];
        $title = $typeLabels[$evalType] ?? 'تقييم مدير المدرسة';

        // بناء محتوى مفصل من الدرجات
        $scoresData = [];
        foreach ($evaluation->scores as $score) {
            $scoresData[$score->item_id] = [
                'score' => $score->score,
                'response_text' => $score->response_text,
            ];
        }

        $content = json_encode([
            'evaluation_id' => $evaluation->id,
            'evaluation_type' => $evalType,
            'total_score' => $evaluation->total_score,
            'notes' => $evaluation->notes,
            'scores' => $scoresData,
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

        PortfolioEntry::create([
            'student_portfolio_id' => $portfolio->id,
            'title' => $title,
            'content' => $content,
        ]);
    }
}