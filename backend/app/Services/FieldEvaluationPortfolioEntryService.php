<?php

namespace App\Services;

use App\Models\FieldEvaluation;
use App\Models\PortfolioEntry;
use App\Models\StudentPortfolio;

/**
 * يضيف نسخة التقييم الميداني (المرشد التربوي) إلى ملف إنجاز الطالب بعد الإرسال النهائي.
 */
final class FieldEvaluationPortfolioEntryService
{
    public function syncCounselorFieldEvaluation(FieldEvaluation $evaluation): void
    {
        $evaluation->loadMissing([
            'template',
            'student',
            'trainingAssignment.trainingSite',
            'fieldSupervisor',
        ]);

        if (! $evaluation->is_final) {
            return;
        }

        $applies = $evaluation->template?->applies_to;
        if (! in_array($applies, ['school_counselor'], true)) {
            return;
        }

        $studentId = (int) $evaluation->student_id;
        if ($studentId <= 0) {
            return;
        }

        $portfolio = StudentPortfolio::query()->firstOrCreate(
            ['user_id' => $studentId],
            ['training_assignment_id' => $evaluation->training_assignment_id]
        );

        $assignment = $evaluation->trainingAssignment;
        $siteName = $assignment?->trainingSite?->name;

        $payload = [
            'type' => 'counselor_field_evaluation',
            'field_evaluation_id' => $evaluation->id,
            'template_name' => $evaluation->template?->name,
            'student_name' => $evaluation->student?->name,
            'school_name' => $siteName,
            'total_score' => $evaluation->total_score,
            'grade' => $evaluation->grade,
            'grade_label' => $evaluation->grade_label,
            'supervisor_name' => $evaluation->supervisor_name,
            'evaluation_date' => $evaluation->evaluation_date?->format('Y-m-d'),
            'general_notes' => $evaluation->general_notes,
            'scores' => $evaluation->scores ?? [],
            'criteria' => $evaluation->template?->criteria ?? [],
            'submitted_at' => $evaluation->submitted_at?->toIso8601String(),
        ];

        $code = 'field_eval_counselor_'.$evaluation->id;

        $entry = PortfolioEntry::query()->firstOrNew([
            'student_portfolio_id' => $portfolio->id,
            'code' => $code,
        ]);

        $entry->fill([
            'title' => 'نموذج تقييم المرشد/ المدرب (نموذج 9) — التقييم الميداني',
            'category' => 'counselor_field_evaluation',
            'content' => json_encode($payload, JSON_UNESCAPED_UNICODE) ?: '{}',
            'review_status' => 'reviewed',
        ]);

        $entry->save();
    }

    /**
     * يضيف تقرير الزيارة الصفية (نموذج 6) لملف إنجاز الطالب بعد الإرسال النهائي.
     */
    public function syncMentorClassroomVisitEvaluation(FieldEvaluation $evaluation): void
    {
        $evaluation->loadMissing([
            'template',
            'student',
            'trainingAssignment.trainingSite',
            'fieldSupervisor',
        ]);

        if (! $evaluation->is_final) {
            return;
        }

        if ($evaluation->template?->code !== 'classroom_visit_form_6') {
            return;
        }

        $studentId = (int) $evaluation->student_id;
        if ($studentId <= 0) {
            return;
        }

        $portfolio = StudentPortfolio::query()->firstOrCreate(
            ['user_id' => $studentId],
            ['training_assignment_id' => $evaluation->training_assignment_id]
        );

        $assignment = $evaluation->trainingAssignment;
        $siteName = $assignment?->trainingSite?->name;

        $payload = [
            'type' => 'mentor_classroom_visit',
            'form_number' => 6,
            'field_evaluation_id' => $evaluation->id,
            'template_name' => $evaluation->template?->name,
            'student_name' => $evaluation->student?->name,
            'school_name' => $siteName,
            'supervisor_name' => $evaluation->supervisor_name,
            'evaluation_date' => $evaluation->evaluation_date?->format('Y-m-d'),
            'general_notes' => $evaluation->general_notes,
            'form_context' => $evaluation->form_context ?? [],
            'scores' => $evaluation->scores ?? [],
            'criteria' => $evaluation->template?->criteria ?? [],
            'submitted_at' => $evaluation->submitted_at?->toIso8601String(),
        ];

        $code = 'field_eval_classroom_visit_'.$evaluation->id;

        $entry = PortfolioEntry::query()->firstOrNew([
            'student_portfolio_id' => $portfolio->id,
            'code' => $code,
        ]);

        $entry->fill([
            'title' => 'تقرير زيارة صفية — مساق التربية العملية (نموذج 6)',
            'category' => 'mentor_classroom_visit',
            'content' => json_encode($payload, JSON_UNESCAPED_UNICODE) ?: '{}',
            'review_status' => 'reviewed',
        ]);

        $entry->save();
    }

    /**
     * يضيف تقييم مشرف المؤسسة (٢٠ معيارًا) إلى ملف إنجاز الطالب بعد الإرسال النهائي.
     */
    public function syncPsychologistInstitutionEvaluation(FieldEvaluation $evaluation): void
    {
        $evaluation->loadMissing([
            'template',
            'student',
            'trainingAssignment.trainingSite',
            'fieldSupervisor',
        ]);

        if (! $evaluation->is_final) {
            return;
        }

        if ($evaluation->template?->code !== 'psychologist_institution_evaluation') {
            return;
        }

        $studentId = (int) $evaluation->student_id;
        if ($studentId <= 0) {
            return;
        }

        $portfolio = StudentPortfolio::query()->firstOrCreate(
            ['user_id' => $studentId],
            ['training_assignment_id' => $evaluation->training_assignment_id]
        );

        $assignment = $evaluation->trainingAssignment;
        $siteName = $assignment?->trainingSite?->name;

        $payload = [
            'type' => 'psychologist_institution_evaluation',
            'field_evaluation_id' => $evaluation->id,
            'template_name' => $evaluation->template?->name,
            'student_name' => $evaluation->student?->name,
            'institution_name' => $siteName,
            'total_score' => $evaluation->total_score,
            'grade' => $evaluation->grade,
            'grade_label' => $evaluation->grade_label,
            'supervisor_name' => $evaluation->supervisor_name,
            'evaluation_date' => $evaluation->evaluation_date?->format('Y-m-d'),
            'areas_for_improvement' => $evaluation->areas_for_improvement,
            'strengths' => $evaluation->strengths,
            'general_notes' => $evaluation->general_notes,
            'scores' => $evaluation->scores ?? [],
            'criteria' => $evaluation->template?->criteria ?? [],
            'submitted_at' => $evaluation->submitted_at?->toIso8601String(),
        ];

        $code = 'field_eval_psych_institution_'.$evaluation->id;

        $entry = PortfolioEntry::query()->firstOrNew([
            'student_portfolio_id' => $portfolio->id,
            'code' => $code,
        ]);

        $entry->fill([
            'title' => 'معايير تقييم أداء الطالب المتدرب — مشرف المؤسسة',
            'category' => 'psychologist_institution_evaluation',
            'content' => json_encode($payload, JSON_UNESCAPED_UNICODE) ?: '{}',
            'review_status' => 'reviewed',
        ]);

        $entry->save();
    }
}
