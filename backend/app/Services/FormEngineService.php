<?php

namespace App\Services;

use App\Models\FormAuditLog;
use App\Models\FormInstance;
use App\Models\FormReview;
use App\Models\FormTemplate;
use App\Models\Notification;
use App\Models\TrainingAssignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class FormEngineService
{
    public function ensureInstancesFor(User $user): Collection
    {
        $assignments = $this->assignmentsForUser($user);
        $instances = new Collection();

        foreach ($assignments as $assignment) {
            foreach (FormTemplate::active()->orderBy('sort_order')->get() as $template) {
                if (! $this->templateAppliesToAssignment($template, $assignment)) {
                    continue;
                }

                $owner = $this->resolveOwner($template, $assignment);
                if (! $owner || ! $this->userCanSeeTemplate($user, $template, $assignment, $owner)) {
                    continue;
                }

                $instances->push($this->ensureInstance($template, $assignment, $owner));
            }
        }

        return $instances->unique('id')->values();
    }

    public function submit(FormInstance $instance, User $user, array $payload): FormInstance
    {
        $this->assertCanFill($instance, $user);

        return DB::transaction(function () use ($instance, $user, $payload) {
            $template = $instance->template;
            $reviewChain = $template->review_chain ?: $template->review_roles ?: [];
            $requiresReview = $template->requires_review || count($reviewChain) > 0;
            $status = $requiresReview ? FormInstance::STATUS_PENDING_REVIEW : FormInstance::STATUS_APPROVED;

            $instance->update([
                'payload' => $payload,
                'status' => $status,
                'submitted_at' => now(),
                'submitted_by' => $user->id,
                'approved_at' => $requiresReview ? null : now(),
                'current_review_step' => $requiresReview ? 1 : 0,
                'current_reviewer_id' => $requiresReview ? $this->resolveReviewerId($instance, $reviewChain[0] ?? null) : null,
            ]);

            $this->createReviewRows($instance, $reviewChain);
            $this->audit($instance, $user, 'submitted', 'تم إرسال النموذج.');
            $this->notifyCurrentReviewer($instance);

            return $instance->fresh(['template', 'owner', 'subject', 'reviews.reviewer', 'auditLogs.user']);
        });
    }

    public function review(FormInstance $instance, User $user, string $decision, ?string $comment = null): FormInstance
    {
        abort_unless(in_array($decision, ['approved', 'returned'], true), 422, 'قرار المراجعة غير صحيح.');

        return DB::transaction(function () use ($instance, $user, $decision, $comment) {
            $review = $instance->reviews()
                ->where('step', $instance->current_review_step)
                ->where('status', 'pending')
                ->firstOrFail();

            abort_unless($this->userMatchesReviewer($user, $review, $instance), 403, 'غير مصرح لك بمراجعة هذا النموذج.');

            $review->update([
                'status' => $decision,
                'reviewer_id' => $user->id,
                'comment' => $comment,
                'reviewed_at' => now(),
            ]);

            if ($decision === 'returned') {
                $instance->update([
                    'status' => FormInstance::STATUS_RETURNED,
                    'current_reviewer_id' => null,
                ]);
                $this->audit($instance, $user, 'returned', $comment ?: 'تمت إعادة النموذج للتعديل.');
                $this->notifyOwner($instance, 'تمت إعادة نموذج "' . $instance->template->title_ar . '" للتعديل.');

                return $instance->fresh(['template', 'owner', 'subject', 'reviews.reviewer', 'auditLogs.user']);
            }

            $nextReview = $instance->reviews()
                ->where('step', '>', $review->step)
                ->where('status', 'pending')
                ->orderBy('step')
                ->first();

            if ($nextReview) {
                $instance->update([
                    'status' => FormInstance::STATUS_PENDING_REVIEW,
                    'current_review_step' => $nextReview->step,
                    'current_reviewer_id' => $this->resolveReviewerId($instance, $nextReview->reviewer_role),
                ]);
                $this->notifyCurrentReviewer($instance);
            } else {
                $instance->update([
                    'status' => FormInstance::STATUS_APPROVED,
                    'approved_at' => now(),
                    'current_reviewer_id' => null,
                ]);
                $this->notifyOwner($instance, 'تم اعتماد نموذج "' . $instance->template->title_ar . '".');
            }

            $this->audit($instance, $user, 'approved', $comment ?: 'تمت الموافقة على النموذج.');

            return $instance->fresh(['template', 'owner', 'subject', 'reviews.reviewer', 'auditLogs.user']);
        });
    }

    public function userCanViewInstance(User $user, FormInstance $instance): bool
    {
        $role = $user->role?->name;

        if ($role === 'admin') {
            return true;
        }

        if ($user->id === $instance->owner_user_id || $user->id === $instance->subject_user_id || $user->id === $instance->current_reviewer_id) {
            return true;
        }

        $assignment = $instance->trainingAssignment;
        if (! $assignment) {
            return in_array($role, $instance->visibility_roles ?? [], true);
        }

        return match ($role) {
            'field_supervisor' => FieldSupervisorAssignmentResolver::userIsFieldSupervisorActor($user, $assignment),
            'teacher', 'adviser', 'psychologist' => (int) $assignment->teacher_id === (int) $user->id,
            'academic_supervisor' => (int) $assignment->academic_supervisor_id === (int) $user->id,
            'school_manager', 'psychology_center_manager' => $user->training_site_id && (int) $assignment->training_site_id === (int) $user->training_site_id,
            'coordinator', 'training_coordinator' => (int) $assignment->coordinator_id === (int) $user->id,
            default => false,
        };
    }

    private function assignmentsForUser(User $user): Collection
    {
        $role = $user->role?->name;

        return TrainingAssignment::query()
            ->with(['enrollment.user.department', 'enrollment.section.course.department', 'trainingSite', 'teacher', 'fieldSupervisorAccount', 'academicSupervisor'])
            ->when($role === 'student', fn ($q) => $q->whereHas('enrollment', fn ($qq) => $qq->where('user_id', $user->id)))
            ->when($role === 'field_supervisor', fn ($q) => FieldSupervisorAssignmentResolver::assignmentsForFieldSupervisorUser($user))
            ->when(in_array($role, ['teacher', 'adviser', 'psychologist'], true), fn ($q) => $q->where('teacher_id', $user->id))
            ->when($role === 'academic_supervisor', fn ($q) => $q->where('academic_supervisor_id', $user->id))
            ->when(in_array($role, ['school_manager', 'psychology_center_manager'], true) && $user->training_site_id, fn ($q) => $q->where('training_site_id', $user->training_site_id))
            ->when(in_array($role, ['coordinator', 'training_coordinator'], true), fn ($q) => $q->where('coordinator_id', $user->id))
            ->get();
    }

    private function ensureInstance(FormTemplate $template, TrainingAssignment $assignment, User $owner): FormInstance
    {
        return FormInstance::firstOrCreate(
            [
                'form_template_id' => $template->id,
                'training_assignment_id' => $assignment->id,
                'owner_user_id' => $owner->id,
            ],
            [
                'subject_user_id' => $assignment->enrollment?->user_id,
                'owner_type' => $template->owner_type,
                'status' => FormInstance::STATUS_NOT_STARTED,
                'visibility_roles' => $template->visible_to_roles ?? [],
                'available_at' => now(),
                'due_at' => $this->calculateDueAt($template, $assignment),
            ]
        );
    }

    private function resolveOwner(FormTemplate $template, TrainingAssignment $assignment): ?User
    {
        return match ($template->owner_type) {
            'student' => $assignment->enrollment?->user,
            'field_supervisor' => $assignment->fieldSupervisorAccount ?? $assignment->teacher,
            'academic_supervisor' => $assignment->academicSupervisor,
            'institution_manager' => User::where('training_site_id', $assignment->training_site_id)
                ->whereHas('role', fn ($q) => $q->whereIn('name', ['school_manager', 'psychology_center_manager']))
                ->first(),
            default => null,
        };
    }

    private function templateAppliesToAssignment(FormTemplate $template, TrainingAssignment $assignment): bool
    {
        $track = $this->resolveTrack($assignment);
        $department = $assignment->enrollment?->user?->department?->name
            ?: $assignment->enrollment?->section?->course?->department?->name;
        $siteType = $assignment->trainingSite?->site_type;
        $courseId = $assignment->enrollment?->section?->course?->id;
        $courseCode = $assignment->enrollment?->section?->course?->code;

        return $this->matchesScope($template->training_track_scope, $track)
            && $this->matchesScope($template->department_scope, $department)
            && $this->matchesScope($template->site_type_scope, $siteType)
            && $this->matchesCourseScope($template->course_scope, $courseId, $courseCode);
    }

    private function userCanSeeTemplate(User $user, FormTemplate $template, TrainingAssignment $assignment, User $owner): bool
    {
        if ($user->role?->name === 'admin') {
            return true;
        }

        if ($user->id === $owner->id) {
            return true;
        }

        return in_array($user->role?->name, $template->visible_to_roles ?? [], true)
            && $this->userCanViewAssignment($user, $assignment);
    }

    private function userCanViewAssignment(User $user, TrainingAssignment $assignment): bool
    {
        return match ($user->role?->name) {
            'student' => (int) $assignment->enrollment?->user_id === (int) $user->id,
            'field_supervisor' => FieldSupervisorAssignmentResolver::userIsFieldSupervisorActor($user, $assignment),
            'teacher', 'adviser', 'psychologist' => (int) $assignment->teacher_id === (int) $user->id,
            'academic_supervisor' => (int) $assignment->academic_supervisor_id === (int) $user->id,
            'school_manager', 'psychology_center_manager' => $user->training_site_id && (int) $assignment->training_site_id === (int) $user->training_site_id,
            'coordinator', 'training_coordinator' => (int) $assignment->coordinator_id === (int) $user->id,
            default => false,
        };
    }

    private function resolveTrack(TrainingAssignment $assignment): string
    {
        $siteType = $assignment->trainingSite?->site_type;
        $department = strtolower((string) ($assignment->enrollment?->user?->department?->name
            ?: $assignment->enrollment?->section?->course?->department?->name));

        $isPsychology = str_contains($department, 'psych') || str_contains($department, 'نفس');

        if ($isPsychology && in_array($siteType, ['clinic', 'health_center'], true)) {
            return 'psychology_clinic';
        }

        if ($isPsychology) {
            return 'psychology_school';
        }

        return 'usool_tarbiah_school';
    }

    private function matchesScope(?array $scope, ?string $value): bool
    {
        if (!$scope || count($scope) === 0) {
            return true;
        }

        return $value !== null && in_array($value, $scope, true);
    }

    private function matchesCourseScope(?array $scope, ?int $courseId, ?string $courseCode): bool
    {
        if (!$scope || count($scope) === 0) {
            return true;
        }

        return in_array((string) $courseId, array_map('strval', $scope), true)
            || ($courseCode && in_array($courseCode, $scope, true));
    }

    private function calculateDueAt(FormTemplate $template, TrainingAssignment $assignment): ?\Carbon\Carbon
    {
        return match ($template->due_rule_type) {
            'end_of_first_week' => $assignment->start_date?->copy()->addDays(7)->endOfDay(),
            'weekly' => now()->endOfWeek(),
            'end_of_training' => $assignment->end_date?->copy()->endOfDay(),
            'custom_date' => isset($template->custom_due_config['date']) ? \Carbon\Carbon::parse($template->custom_due_config['date']) : null,
            default => null,
        };
    }

    private function assertCanFill(FormInstance $instance, User $user): void
    {
        abort_unless((int) $instance->owner_user_id === (int) $user->id || $user->role?->name === 'admin', 403, 'غير مصرح بتعبئة هذا النموذج.');

        if (in_array($instance->status, [FormInstance::STATUS_APPROVED, FormInstance::STATUS_FINALIZED], true) && $instance->template->lock_after_approval) {
            abort(422, 'لا يمكن تعديل النموذج بعد اعتماده.');
        }

        if ($instance->status === FormInstance::STATUS_SUBMITTED && $instance->template->lock_after_submit) {
            abort(422, 'لا يمكن تعديل النموذج بعد إرساله.');
        }
    }

    private function createReviewRows(FormInstance $instance, array $reviewChain): void
    {
        if (count($reviewChain) === 0) {
            return;
        }

        $instance->reviews()->delete();
        foreach (array_values($reviewChain) as $index => $role) {
            $instance->reviews()->create([
                'step' => $index + 1,
                'reviewer_role' => $role,
                'reviewer_id' => $this->resolveReviewerId($instance, $role),
                'status' => 'pending',
            ]);
        }
    }

    private function resolveReviewerId(FormInstance $instance, ?string $role): ?int
    {
        $assignment = $instance->trainingAssignment;
        if (!$assignment || !$role) {
            return null;
        }

        return match ($role) {
            'field_supervisor' => $assignment->field_supervisor_id ?: $assignment->teacher_id,
            'teacher', 'adviser', 'psychologist' => $assignment->teacher_id,
            'academic_supervisor' => $assignment->academic_supervisor_id,
            'institution_manager', 'school_manager', 'psychology_center_manager' => User::where('training_site_id', $assignment->training_site_id)
                ->whereHas('role', fn ($q) => $q->whereIn('name', ['school_manager', 'psychology_center_manager']))
                ->value('id'),
            'student' => $assignment->enrollment?->user_id,
            default => null,
        };
    }

    private function userMatchesReviewer(User $user, FormReview $review, FormInstance $instance): bool
    {
        if ($user->role?->name === 'admin') {
            return true;
        }

        if ($review->reviewer_id) {
            return (int) $review->reviewer_id === (int) $user->id;
        }

        return in_array($user->role?->name, [$review->reviewer_role], true)
            && $this->userCanViewInstance($user, $instance);
    }

    private function notifyCurrentReviewer(FormInstance $instance): void
    {
        if (!$instance->current_reviewer_id) {
            return;
        }

        Notification::create([
            'user_id' => $instance->current_reviewer_id,
            'type' => 'form_pending_review',
            'message' => 'يوجد نموذج بانتظار مراجعتك: ' . $instance->template->title_ar,
            'notifiable_type' => FormInstance::class,
            'notifiable_id' => $instance->id,
            'data' => ['form_instance_id' => $instance->id],
        ]);
    }

    private function notifyOwner(FormInstance $instance, string $message): void
    {
        if (!$instance->owner_user_id) {
            return;
        }

        Notification::create([
            'user_id' => $instance->owner_user_id,
            'type' => 'form_status_changed',
            'message' => $message,
            'notifiable_type' => FormInstance::class,
            'notifiable_id' => $instance->id,
            'data' => ['form_instance_id' => $instance->id],
        ]);
    }

    private function audit(FormInstance $instance, User $user, string $action, string $message): void
    {
        FormAuditLog::create([
            'form_instance_id' => $instance->id,
            'user_id' => $user->id,
            'action' => $action,
            'message' => $message,
        ]);
    }
}
