<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\PortfolioEntry;
use App\Models\StudentEForm;
use App\Models\StudentPortfolio;
use App\Models\TrainingAssignment;
use App\Models\User;

class StudentEFormAcademicReviewService
{
    public const PORTFOLIO_TITLES = [
        'weekly_full_report' => 'التقرير الأسبوعي',
        'weekly_brief_report' => 'التقرير الأسبوعي المختصر',
        'weekly_reflection' => 'التأمل الأسبوعي',
        'learning_experience_review' => 'مراجعة خبرة تعلمية',
        'field_visit_summary' => 'ملخص زيارة ميدانية',
        'classes_count' => 'عدد الحصص',
        'daily_tasks_report' => 'تقرير المهام والأعمال اليومية',
    ];

    public function applyReview(StudentEForm $eform, User $supervisor, string $note, bool $needsDiscussion): StudentEForm
    {
        $eform->update([
            'academic_note' => $note,
            'needs_discussion' => $needsDiscussion,
            'academic_supervisor_id' => $supervisor->id,
            'academic_reviewed_at' => now(),
            'status' => 'reviewed',
        ]);

        $this->syncNoteToPortfolio($eform->fresh(), $supervisor, $note, $needsDiscussion);

        return $eform->fresh();
    }

    public function syncNoteToPortfolio(StudentEForm $eform, User $supervisor, string $note, bool $needsDiscussion): ?PortfolioEntry
    {
        $assignment = TrainingAssignment::whereHas(
            'enrollment',
            fn ($q) => $q->where('user_id', $eform->user_id)
        )->latest('id')->first();

        $portfolio = StudentPortfolio::query()
            ->where('user_id', $eform->user_id)
            ->when($assignment, function ($q) use ($assignment) {
                $q->where(function ($sub) use ($assignment) {
                    $sub->where('training_assignment_id', $assignment->id)
                        ->orWhereNull('training_assignment_id')
                        ->orWhereHas('trainingAssignment', fn ($ta) => $ta->where('enrollment_id', $assignment->enrollment_id));
                });
            })
            ->orderByDesc('updated_at')
            ->first();

        if (! $portfolio) {
            if (! $assignment) {
                return null;
            }
            $portfolio = StudentPortfolio::create([
                'user_id' => $eform->user_id,
                'training_assignment_id' => $assignment->id,
            ]);
        } elseif ($assignment && ! $portfolio->training_assignment_id) {
            $portfolio->update(['training_assignment_id' => $assignment->id]);
        }

        $code = 'eform:' . $eform->id;
        $title = trim((string) ($eform->title ?: ''));
        if ($title === '') {
            $title = self::PORTFOLIO_TITLES[$eform->form_key] ?? $eform->form_key;
        }

        $entry = PortfolioEntry::query()
            ->where('student_portfolio_id', $portfolio->id)
            ->where('code', $code)
            ->first();

        if (! $entry) {
            $entry = PortfolioEntry::query()
                ->where('student_portfolio_id', $portfolio->id)
                ->where('title', $title)
                ->where(function ($q) use ($code) {
                    $q->whereNull('code')->orWhere('code', $code);
                })
                ->orderByDesc('id')
                ->first();
        }

        $reviewStatus = $needsDiscussion ? 'needs_edit' : 'reviewed';
        $payload = [
            'reviewer_note' => $note,
            'reviewed_by' => $supervisor->id,
            'reviewed_at' => now(),
            'review_status' => $reviewStatus,
            'code' => $code,
        ];

        if ($entry) {
            $entry->update($payload);
        } else {
            $entry = PortfolioEntry::create(array_merge($payload, [
                'student_portfolio_id' => $portfolio->id,
                'title' => $title,
                'category' => $eform->form_key,
                'content' => $this->portfolioContentSummary($eform),
            ]));
        }

        $eform->loadMissing('user');
        $student = $eform->user;
        if ($student) {
            Notification::create([
                'user_id' => $student->id,
                'type' => 'eform_academic_note',
                'message' => "أضاف المشرف الأكاديمي ملاحظة على: {$title}",
                'notifiable_type' => PortfolioEntry::class,
                'notifiable_id' => $entry->id,
                'data' => [
                    'supervisor_name' => $supervisor->name,
                    'entry_title' => $title,
                    'comment' => $note,
                    'form_key' => $eform->form_key,
                    'eform_id' => $eform->id,
                ],
            ]);
        }

        return $entry;
    }

    private function portfolioContentSummary(StudentEForm $eform): ?string
    {
        $submitted = optional($eform->submitted_at)?->toDateString()
            ?? optional($eform->updated_at)?->toDateString();

        if (! $submitted) {
            return null;
        }

        return "نموذج إلكتروني مُقدّم بتاريخ {$submitted}";
    }
}
