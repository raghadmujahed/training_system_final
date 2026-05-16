<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\PortfolioEntry;
use App\Models\StudentEForm;
use App\Models\StudentPortfolio;
use App\Models\TrainingAssignment;
use App\Models\TrainingLog;
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

    /**
     * يحفظ الملاحظة في portfolio_entries (ومزامنة اختيارية مع training_logs) — بدون أعمدة جديدة على student_eforms.
     */
    public function applyReview(StudentEForm $eform, User $supervisor, string $note, bool $needsDiscussion): PortfolioEntry
    {
        if ($eform->status !== 'draft') {
            $eform->update(['status' => 'reviewed']);
        }

        $entry = $this->syncNoteToPortfolio($eform, $supervisor, $note, $needsDiscussion);
        $this->syncLinkedTrainingLog($eform, $note, $needsDiscussion);

        return $entry;
    }

    /**
     * @return array<int, PortfolioEntry> مفتاحه eform id
     */
    public function portfolioReviewsByEformId(int $userId): array
    {
        $portfolio = $this->findPortfolioForUser($userId);
        if (! $portfolio) {
            return [];
        }

        $entries = PortfolioEntry::query()
            ->where('student_portfolio_id', $portfolio->id)
            ->where('code', 'like', 'eform:%')
            ->get();

        $map = [];
        foreach ($entries as $entry) {
            $code = (string) $entry->code;
            if (preg_match('/^eform:(\d+)$/', $code, $m)) {
                $map[(int) $m[1]] = $entry;
            }
        }

        return $map;
    }

    public function eformReviewPayload(?PortfolioEntry $entry): array
    {
        if (! $entry || ! filled($entry->reviewer_note)) {
            return [
                'academic_note' => null,
                'supervisor_comment' => null,
                'needs_discussion' => false,
                'academic_reviewed_at' => null,
                'has_review' => false,
            ];
        }

        return [
            'academic_note' => $entry->reviewer_note,
            'supervisor_comment' => $entry->reviewer_note,
            'needs_discussion' => $entry->review_status === 'needs_edit',
            'academic_reviewed_at' => $entry->reviewed_at?->toDateTimeString(),
            'has_review' => true,
        ];
    }

    public function syncNoteToPortfolio(StudentEForm $eform, User $supervisor, string $note, bool $needsDiscussion): PortfolioEntry
    {
        $portfolio = $this->findPortfolioForUser((int) $eform->user_id);
        $assignment = TrainingAssignment::whereHas(
            'enrollment',
            fn ($q) => $q->where('user_id', $eform->user_id)
        )->latest('id')->first();

        if (! $portfolio) {
            abort_unless($assignment, 404, 'لا يوجد تعيين تدريبي للطالب.');
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

        return $entry->fresh();
    }

    private function syncLinkedTrainingLog(StudentEForm $eform, string $note, bool $needsDiscussion): void
    {
        $assignment = TrainingAssignment::whereHas(
            'enrollment',
            fn ($q) => $q->where('user_id', $eform->user_id)
        )->latest('id')->first();

        if (! $assignment) {
            return;
        }

        $logDate = optional($eform->submitted_at ?? $eform->created_at)?->toDateString();
        if (! $logDate) {
            return;
        }

        $log = TrainingLog::withArchived()
            ->where('training_assignment_id', $assignment->id)
            ->whereDate('log_date', $logDate)
            ->first();

        if (! $log) {
            return;
        }

        $log->update([
            'academic_review_status' => 'reviewed',
            'academic_note' => $note,
            'needs_discussion' => $needsDiscussion,
            'academic_reviewed_at' => now(),
        ]);
    }

    private function findPortfolioForUser(int $userId): ?StudentPortfolio
    {
        $assignment = TrainingAssignment::whereHas(
            'enrollment',
            fn ($q) => $q->where('user_id', $userId)
        )->latest('id')->first();

        return StudentPortfolio::query()
            ->where('user_id', $userId)
            ->when($assignment, function ($q) use ($assignment) {
                $q->where(function ($sub) use ($assignment) {
                    $sub->where('training_assignment_id', $assignment->id)
                        ->orWhereNull('training_assignment_id')
                        ->orWhereHas('trainingAssignment', fn ($ta) => $ta->where('enrollment_id', $assignment->enrollment_id));
                });
            })
            ->orderByDesc('updated_at')
            ->first();
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

    /**
     * بعد تعديل الطالب وإعادة الإرسال: مسح ملاحظة المشرف وتحديث محتوى المدخل المرتبط.
     */
    public function onStudentResubmit(StudentEForm $eform, ?array $payload = null): ?PortfolioEntry
    {
        $portfolio = $this->findPortfolioForUser((int) $eform->user_id);
        if (! $portfolio) {
            return null;
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
                ->where(function ($q) use ($title) {
                    $q->where('title', $title)
                        ->orWhere('title', 'like', $title . '%');
                })
                ->orderByDesc('id')
                ->first();
        }

        $payload = $payload ?? (is_array($eform->payload) ? $eform->payload : []);
        $content = count($payload) > 0
            ? json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
            : $this->portfolioContentSummary($eform);

        if ($entry) {
            $entry->update([
                'code' => $code,
                'category' => $eform->form_key,
                'title' => $title,
                'content' => $content,
                'reviewer_note' => null,
                'review_status' => 'pending',
                'reviewed_by' => null,
                'reviewed_at' => null,
                'academic_rating' => null,
            ]);
        }

        $this->clearLinkedTrainingLogAcademicNote($eform);

        return $entry?->fresh();
    }

    private function clearLinkedTrainingLogAcademicNote(StudentEForm $eform): void
    {
        $assignment = TrainingAssignment::whereHas(
            'enrollment',
            fn ($q) => $q->where('user_id', $eform->user_id)
        )->latest('id')->first();

        if (! $assignment) {
            return;
        }

        $logDate = optional($eform->submitted_at ?? $eform->created_at)?->toDateString();
        if (! $logDate) {
            return;
        }

        $log = TrainingLog::withArchived()
            ->where('training_assignment_id', $assignment->id)
            ->whereDate('log_date', $logDate)
            ->first();

        if (! $log) {
            return;
        }

        $log->update([
            'academic_note' => null,
            'needs_discussion' => false,
            'academic_review_status' => 'pending',
            'academic_reviewed_at' => null,
        ]);
    }
}
