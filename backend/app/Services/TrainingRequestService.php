<?php

namespace App\Services;

use App\Enums\BookStatus;
use App\Enums\OfficialLetterStatus;
use App\Enums\OfficialLetterType;
use App\Enums\TrainingRequestStudentStatus;
use App\Models\Course;
use App\Models\Notification as AppNotification;
use App\Models\OfficialLetter;
use App\Models\TrainingAssignment;
use App\Models\TrainingRequest;
use App\Models\TrainingRequestStudent;
use App\Models\TrainingSite;
use App\Models\User;
use App\Models\WorkflowTemplate;
use App\Models\WorkflowApproval;
use App\Models\WorkflowInstance;
use App\Support\PsychologyAcademicWorkflow;
use App\Support\TrainingRequestNotifications;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TrainingRequestService
{
    public function __construct(
        private NotificationService $notificationService = new NotificationService(),
    ) {}

    /**
     * إنشاء كتاب تدريبي جديد (من المنسق أو من مشرف علم النفس حسب السياسات).
     */
    public function createTrainingRequest(array $data, User $creator): TrainingRequest
    {
        return DB::transaction(function () use ($data, $creator) {
            PsychologyAcademicWorkflow::assertSupervisorOverseesPsychologyStudents($creator, $data['students'] ?? []);
            if (PsychologyAcademicWorkflow::isPsychologyAcademicSupervisor($creator)) {
                PsychologyAcademicWorkflow::assertTrainingSiteMatchesPsychologyTrack((int) $data['training_site_id'], $creator);
            }

            $site = TrainingSite::findOrFail($data['training_site_id']);
            $isPsychologySupervisor = PsychologyAcademicWorkflow::isPsychologyAcademicSupervisor($creator);

            $bookStatus = $isPsychologySupervisor
                ? BookStatus::PRELIM_APPROVED->value
                : BookStatus::DRAFT->value;

            $attributes = [
                'requested_by' => $creator->id,
                'letter_number' => $data['letter_number'] ?? $this->generateLetterNumber(),
                'letter_date' => $data['letter_date'] ?? now(),
                'training_site_id' => $data['training_site_id'],
                'training_period_id' => $data['training_period_id'] ?? null,
                'governing_body' => $site->governing_body,
                'book_status' => $bookStatus,
                'status' => 'pending',
                'requested_at' => now(),
            ];

            if ($isPsychologySupervisor) {
                $dir = $data['directorate'] ?? null;
                if (($site->site_type ?? '') === 'school' || ($site->governing_body ?? '') === 'directorate_of_education') {
                    $attributes['directorate'] = $dir !== null && $dir !== ''
                        ? $dir
                        : (trim((string) ($site->directorate ?? '')) ?: null);
                }
            }

            $trainingRequest = TrainingRequest::create($attributes);

            foreach ($data['students'] as $student) {
                TrainingRequestStudent::create([
                    'training_request_id' => $trainingRequest->id,
                    'user_id' => $student['user_id'],
                    'course_id' => $student['course_id'],
                    'start_date' => $student['start_date'],
                    'end_date' => $student['end_date'],
                    'notes' => $student['notes'] ?? null,
                    'status' => TrainingRequestStudentStatus::PENDING->value,
                ]);
            }

            return $trainingRequest->load('trainingRequestStudents');
        });
    }

    /**
     * إرسال الكتاب إلى مديرية التربية
     */
    public function sendToDirectorate(TrainingRequest $trainingRequest, int $coordinatorId, array $letterData): void
    {
        DB::transaction(function () use ($trainingRequest, $coordinatorId, $letterData) {
            $trainingRequest->update([
                'book_status' => BookStatus::SENT_TO_DIRECTORATE->value,
                'sent_to_directorate_at' => now(),
                'status' => 'pending',
            ]);

            OfficialLetter::create([
                'training_request_id' => $trainingRequest->id,
                'letter_number' => $this->uniqueOfficialLetterNumber(
                    $letterData['letter_number'] ?? null,
                    $trainingRequest->id,
                    'مديرية'
                ),
                'letter_date' => $letterData['letter_date'],
                'type' => OfficialLetterType::TO_DIRECTORATE->value,
                'content' => $letterData['content'],
                'sent_by' => $coordinatorId,
                'sent_at' => now(),
                'status' => OfficialLetterStatus::SENT_TO_DIRECTORATE->value,
            ]);

            $workflowTemplateId = $this->resolveWorkflowTemplateId();
            if ($workflowTemplateId) {
                $workflow = WorkflowInstance::create([
                    'workflow_template_id' => $workflowTemplateId,
                    'model_type' => TrainingRequest::class,
                    'model_id' => $trainingRequest->id,
                    'status' => 'in_progress',
                ]);

                WorkflowApproval::create([
                    'workflow_instance_id' => $workflow->id,
                    'workflow_step_id' => 1,
                    'status' => 'pending',
                ]);
            }

            TrainingRequestNotifications::forDirectorate(
                $trainingRequest->governing_body,
                'training_request_received_from_coordinator',
                'طلب تدريب جديد بانتظار الموافقة. كتاب رقم: ' . ($trainingRequest->letter_number ?? "#{$trainingRequest->id}"),
                [
                    'training_request_id' => $trainingRequest->id,
                    'book_status' => BookStatus::SENT_TO_DIRECTORATE->value,
                ]
            );
        });
    }

    /**
     * موافقة مديرية التربية على الكتاب
     */
    public function directorateApprove(TrainingRequest $trainingRequest, int $directorateUserId): void
    {
        DB::transaction(function () use ($trainingRequest, $directorateUserId) {
            $trainingRequest->update([
                'book_status' => BookStatus::DIRECTORATE_APPROVED->value,
                'directorate_approved_at' => now(),
                'status' => 'pending',
            ]);

            $workflowInstance = WorkflowInstance::where('model_type', TrainingRequest::class)
                ->where('model_id', $trainingRequest->id)
                ->first();

            if ($workflowInstance) {
                $approval = WorkflowApproval::where('workflow_instance_id', $workflowInstance->id)
                    ->where('status', 'pending')
                    ->first();

                if ($approval) {
                    $approval->update([
                        'status' => 'approved',
                        'approved_by' => $directorateUserId,
                        'approved_at' => now(),
                    ]);
                }
            }

            $this->notifyHeadsAndAdmins(
                $trainingRequest,
                'training_request_directorate_approved',
                'تمت موافقة الجهة الرسمية على طلب التدريب رقم ' . ($trainingRequest->letter_number ?? "#{$trainingRequest->id}") . '.',
                ['training_request_id' => $trainingRequest->id]
            );

            $this->notifyCoordinator(
                $trainingRequest,
                'training_request_directorate_approved',
                'تمت موافقة الجهة الرسمية على طلب التدريب رقم ' . ($trainingRequest->letter_number ?? "#{$trainingRequest->id}") . '.',
                [
                    'training_request_id' => $trainingRequest->id,
                    'book_status' => BookStatus::DIRECTORATE_APPROVED->value,
                ]
            );
        });
    }

    /**
     * إرسال الكتاب إلى المدرسة (بعد موافقة المديرية)
     */
    public function sendToSchool(TrainingRequest $trainingRequest, int $directorateUserId, array $letterData): void
    {
        DB::transaction(function () use ($trainingRequest, $directorateUserId, $letterData) {
            $trainingRequest->update([
                'book_status' => BookStatus::SENT_TO_SCHOOL->value,
                'sent_to_school_at' => now(),
                'status' => 'pending',
            ]);

            OfficialLetter::create([
                'training_request_id' => $trainingRequest->id,
                'letter_number' => $this->uniqueOfficialLetterNumber(
                    $letterData['letter_number'] ?? null,
                    $trainingRequest->id,
                    'جهة-تدريب'
                ),
                'letter_date' => $letterData['letter_date'],
                'type' => OfficialLetterType::TO_SCHOOL->value,
                'content' => $letterData['content'],
                'sent_by' => $directorateUserId,
                'sent_at' => now(),
                'status' => OfficialLetterStatus::SENT_TO_SCHOOL->value,
                'training_site_id' => $trainingRequest->training_site_id,
            ]);

            TrainingRequestNotifications::forSchoolManager(
                $trainingRequest->training_site_id,
                'training_request_received_from_directorate',
                'تم إرسال طلب تدريب من الجهة الرسمية بانتظار موافقتك وتعيين المشرف الميداني.',
                [
                    'training_request_id' => $trainingRequest->id,
                    'book_status' => BookStatus::SENT_TO_SCHOOL->value,
                ]
            );
        });
    }

    /**
     * موافقة جهة التدريب وتعيين المشرف الميداني (المعلم/المرشد/الأخصائي أو حساب مشرف ميداني في المنصة)
     */
    public function schoolApprove(TrainingRequest $trainingRequest, int $schoolManagerId, array $studentsData): void
    {
        DB::transaction(function () use ($trainingRequest, $schoolManagerId, $studentsData) {
            $activeTrainingPeriodId = $this->requireActiveTrainingPeriodId();
            $manager = User::with('role')->findOrFail($schoolManagerId);
            $isPsychCenterManager = $manager->role?->name === 'psychology_center_manager';
            $allowedRoles = $isPsychCenterManager
                ? ['psychologist']
                : ['teacher', 'adviser', 'field_supervisor'];

            $this->assertTrainingSiteAcceptsNewStudents($trainingRequest, count($studentsData));

            foreach ($studentsData as $studentData) {
                $studentRequest = TrainingRequestStudent::findOrFail($studentData['id']);
                $enrollmentId = $this->requireEnrollmentId($studentRequest);
                $assignedUser = User::with('role')->findOrFail($studentData['assigned_teacher_id']);

                abort_unless(
                    in_array($assignedUser->role?->name, $allowedRoles, true),
                    422,
                    'المستخدم المحدد ليس من نوع المشرف الميداني المناسب لجهة التدريب.'
                );

                if ($manager->training_site_id) {
                    abort_unless(
                        (int) $assignedUser->training_site_id === (int) $manager->training_site_id,
                        422,
                        'المشرف الميداني المحدد غير مرتبط بجهة التدريب الخاصة بك.'
                    );
                }

                $platformFieldSupervisorId = $studentData['field_supervisor_id'] ?? null;
                if ($platformFieldSupervisorId !== null && $platformFieldSupervisorId !== '') {
                    abort_if($isPsychCenterManager, 422, 'لا يمكن إرفاق حساب مشرف ميداني منفصل في مسار المركز النفسي ضمن هذا الإجراء.');
                    $platformFs = User::with('role')->findOrFail((int) $platformFieldSupervisorId);
                    abort_unless(
                        $platformFs->role?->name === 'field_supervisor',
                        422,
                        'حساب المشرف الميداني في المنصة غير صالح.'
                    );
                    if ($manager->training_site_id) {
                        abort_unless(
                            (int) $platformFs->training_site_id === (int) $manager->training_site_id,
                            422,
                            'حساب المشرف الميداني في المنصة غير مرتبط بجهة التدريب الخاصة بك.'
                        );
                    }
                    abort_if(
                        (int) $platformFs->id === (int) $assignedUser->id,
                        422,
                        'لا حاجة لتحديد مشرف منصة منفصل عندما يكون المعيّن الأساسي هو نفسه حساب المشرف الميداني.'
                    );
                    abort_unless(
                        in_array($assignedUser->role?->name, ['teacher', 'adviser'], true),
                        422,
                        'حقل المشرف الميداني في المنصة يُستخدم فقط عند تعيين معلم أو مرشد تربوي كمشرف ميداني أساسي.'
                    );
                }

                $assignmentFieldSupervisorId = null;
                if ($assignedUser->role?->name === 'field_supervisor') {
                    $assignmentFieldSupervisorId = (int) $assignedUser->id;
                } elseif ($platformFieldSupervisorId !== null && $platformFieldSupervisorId !== '') {
                    $assignmentFieldSupervisorId = (int) $platformFieldSupervisorId;
                }

                $studentRequest->update([
                    'status' => TrainingRequestStudentStatus::APPROVED->value,
                    'assigned_teacher_id' => $studentData['assigned_teacher_id'],
                ]);

                TrainingAssignment::create([
                    'enrollment_id' => $enrollmentId,
                    'training_request_id' => $trainingRequest->id,
                    'training_request_student_id' => $studentRequest->id,
                    'training_site_id' => $trainingRequest->training_site_id,
                    'training_period_id' => $activeTrainingPeriodId,
                    'teacher_id' => $studentData['assigned_teacher_id'],
                    'field_supervisor_id' => $assignmentFieldSupervisorId,
                    'academic_supervisor_id' => $this->getAcademicSupervisorId($studentRequest->course_id),
                    'status' => 'assigned',
                    'start_date' => $studentRequest->start_date,
                    'end_date' => $studentRequest->end_date,
                ]);
            }

            $trainingRequest->update([
                'book_status' => BookStatus::SCHOOL_APPROVED->value,
                'school_approved_at' => now(),
                'status' => 'approved',
            ]);

            $this->notifyHeadsAndAdmins(
                $trainingRequest,
                'training_request_school_approved',
                'تمت موافقة جهة التدريب على طلب التدريب رقم ' . ($trainingRequest->letter_number ?? "#{$trainingRequest->id}") . '.',
                ['training_request_id' => $trainingRequest->id]
            );

            $trainingRequest->load(['trainingRequestStudents.user', 'requestedBy', 'trainingSite']);
            TrainingRequestNotifications::forStudents(
                $trainingRequest,
                'training_request_final_placement_student',
                'تم قبولك في جهة التدريب.',
                [
                    'training_request_id' => $trainingRequest->id,
                    'book_status' => BookStatus::SCHOOL_APPROVED->value,
                ]
            );

            // إرسال بريد إلكتروني للطلاب عند قبول جهة التدريب
            $siteName = $trainingRequest->trainingSite?->name ?? 'جهة التدريب';
            $studentUsers = $trainingRequest->trainingRequestStudents
                ->pluck('user')
                ->merge([optional($trainingRequest->requestedBy)])
                ->filter()
                ->unique('id');
            foreach ($studentUsers as $studentUser) {
                $this->notificationService->sendEmail(
                    $studentUser,
                    'تم قبول طلب تدريبك',
                    "مرحباً {$studentUser->name}،\n\nيسعدنا إبلاغك بأنه تم قبول طلب تدريبك في {$siteName}.\n\nيمكنك الدخول إلى المنصة للاطلاع على تفاصيل التدريب."
                );
            }

            $deptId = $trainingRequest->trainingRequestStudents
                ->map(fn ($trs) => $trs->course?->department_id)
                ->filter()
                ->first();

            $trainingRequest->loadMissing('requestedBy');
            $skipPsychologyCoordinatorNotice = $deptId
                && PsychologyAcademicWorkflow::departmentIsPsychology((int) $deptId)
                && PsychologyAcademicWorkflow::isOrchestratedByPsychologySupervisor($trainingRequest);

            if (! $skipPsychologyCoordinatorNotice) {
                TrainingRequestNotifications::forCoordinatorsByDepartment(
                    $deptId ? (int) $deptId : null,
                    'training_request_final_school_accept_coordinator',
                    'تم قبول طلبة في جهة التدريب — طلب رقم ' . ($trainingRequest->letter_number ?? "#{$trainingRequest->id}") . '.',
                    [
                        'training_request_id' => $trainingRequest->id,
                        'book_status' => BookStatus::SCHOOL_APPROVED->value,
                    ]
                );
            }

            $workflowInstance = WorkflowInstance::where('model_type', TrainingRequest::class)
                ->where('model_id', $trainingRequest->id)
                ->first();

            if ($workflowInstance) {
                $workflowInstance->update(['status' => 'approved']);
            }
        });
    }

    /**
     * رفض من المديرية
     */
    public function directorateReject(TrainingRequest $trainingRequest, string $reason, int $rejectedBy): void
    {
        DB::transaction(function () use ($trainingRequest, $reason, $rejectedBy) {
            $trainingRequest->update([
                'book_status' => BookStatus::DIRECTORATE_REJECTED->value,
                'status' => 'rejected',
                'rejection_reason' => $reason,
            ]);

            $trainingRequest->trainingRequestStudents()->update([
                'status' => TrainingRequestStudentStatus::REJECTED->value,
                'rejection_reason' => $reason,
            ]);

            $workflowInstance = WorkflowInstance::where('model_type', TrainingRequest::class)
                ->where('model_id', $trainingRequest->id)
                ->first();

            if ($workflowInstance) {
                $workflowInstance->update(['status' => 'rejected']);
            }

            $this->notifyHeadsAndAdmins(
                $trainingRequest,
                'training_request_directorate_rejected',
                'تم رفض طلب التدريب رقم ' . ($trainingRequest->letter_number ?? "#{$trainingRequest->id}") . ' من المديرية. السبب: ' . $reason,
                ['training_request_id' => $trainingRequest->id, 'rejection_reason' => $reason]
            );

            $this->notifyCoordinator(
                $trainingRequest,
                'training_request_directorate_rejected',
                'تم رفض طلب التدريب رقم ' . ($trainingRequest->letter_number ?? "#{$trainingRequest->id}") . ' من المديرية. سبب الرفض: ' . $reason,
                [
                    'training_request_id' => $trainingRequest->id,
                    'book_status' => BookStatus::DIRECTORATE_REJECTED->value,
                    'rejection_reason' => $reason,
                ]
            );

            $trainingRequest->load('trainingRequestStudents');
            TrainingRequestNotifications::forStudents(
                $trainingRequest,
                'training_request_directorate_rejected_student',
                'تم رفض طلب التدريب من المديرية. السبب: ' . $reason,
                [
                    'training_request_id' => $trainingRequest->id,
                    'book_status' => BookStatus::DIRECTORATE_REJECTED->value,
                    'rejection_reason' => $reason,
                ]
            );
        });
    }

    /**
     * رفض من وزارة الصحة
     */
    public function healthMinistryReject(TrainingRequest $trainingRequest, string $reason, int $rejectedBy): void
    {
        DB::transaction(function () use ($trainingRequest, $reason, $rejectedBy) {
            $trainingRequest->update([
                'book_status' => BookStatus::HEALTH_MINISTRY_REJECTED->value,
                'status' => 'rejected',
                'rejection_reason' => $reason,
            ]);

            $trainingRequest->trainingRequestStudents()->update([
                'status' => TrainingRequestStudentStatus::REJECTED->value,
                'rejection_reason' => $reason,
            ]);

            $workflowInstance = WorkflowInstance::where('model_type', TrainingRequest::class)
                ->where('model_id', $trainingRequest->id)
                ->first();

            if ($workflowInstance) {
                $workflowInstance->update(['status' => 'rejected']);
            }

            $this->notifyCoordinator(
                $trainingRequest,
                'training_request_health_ministry_rejected',
                'تم رفض طلب التدريب رقم ' . ($trainingRequest->letter_number ?? "#{$trainingRequest->id}") . ' من وزارة الصحة. سبب الرفض: ' . $reason,
                [
                    'training_request_id' => $trainingRequest->id,
                    'book_status' => BookStatus::HEALTH_MINISTRY_REJECTED->value,
                    'rejection_reason' => $reason,
                ]
            );

            $trainingRequest->load('trainingRequestStudents');
            TrainingRequestNotifications::forStudents(
                $trainingRequest,
                'training_request_health_ministry_rejected_student',
                'تم رفض طلب التدريب من وزارة الصحة. السبب: ' . $reason,
                [
                    'training_request_id' => $trainingRequest->id,
                    'book_status' => BookStatus::HEALTH_MINISTRY_REJECTED->value,
                    'rejection_reason' => $reason,
                ]
            );
        });
    }

    /**
     * رفض من جهة التدريب (المدرسة/المركز)
     */
    public function schoolReject(TrainingRequest $trainingRequest, string $reason, int $rejectedBy): void
    {
        DB::transaction(function () use ($trainingRequest, $reason, $rejectedBy) {
            $trainingRequest->update([
                'book_status' => BookStatus::SCHOOL_REJECTED->value,
                'status' => 'rejected',
                'rejection_reason' => $reason,
            ]);

            $trainingRequest->trainingRequestStudents()->update([
                'status' => TrainingRequestStudentStatus::REJECTED->value,
                'rejection_reason' => $reason,
            ]);

            $workflowInstance = WorkflowInstance::where('model_type', TrainingRequest::class)
                ->where('model_id', $trainingRequest->id)
                ->first();

            if ($workflowInstance) {
                $workflowInstance->update(['status' => 'rejected']);
            }

            $this->notifyHeadsAndAdmins(
                $trainingRequest,
                'training_request_school_rejected',
                'تم رفض طلب التدريب رقم ' . ($trainingRequest->letter_number ?? "#{$trainingRequest->id}") . ' من جهة التدريب. السبب: ' . $reason,
                ['training_request_id' => $trainingRequest->id, 'rejection_reason' => $reason]
            );

            $this->notifyCoordinator(
                $trainingRequest,
                'training_request_school_rejected',
                'تم رفض طلب التدريب رقم ' . ($trainingRequest->letter_number ?? "#{$trainingRequest->id}") . ' من جهة التدريب. سبب الرفض: ' . $reason,
                [
                    'training_request_id' => $trainingRequest->id,
                    'book_status' => BookStatus::SCHOOL_REJECTED->value,
                    'rejection_reason' => $reason,
                ]
            );

            $trainingRequest->load('trainingRequestStudents');
            TrainingRequestNotifications::forStudents(
                $trainingRequest,
                'training_request_school_rejected_student',
                'تم رفض طلب التدريب من جهة التدريب. السبب: ' . $reason,
                [
                    'training_request_id' => $trainingRequest->id,
                    'book_status' => BookStatus::SCHOOL_REJECTED->value,
                    'rejection_reason' => $reason,
                ]
            );
        });
    }

    /**
     * رفض الكتاب مع سبب (عام)
     */
    public function reject(TrainingRequest $trainingRequest, string $reason, int $rejectedBy): void
    {
        DB::transaction(function () use ($trainingRequest, $reason, $rejectedBy) {
            $trainingRequest->update([
                'book_status' => BookStatus::REJECTED->value,
                'status' => 'rejected',
                'rejection_reason' => $reason,
            ]);

            $trainingRequest->trainingRequestStudents()->update([
                'status' => TrainingRequestStudentStatus::REJECTED->value,
                'rejection_reason' => $reason,
            ]);

            $workflowInstance = WorkflowInstance::where('model_type', TrainingRequest::class)
                ->where('model_id', $trainingRequest->id)
                ->first();

            if ($workflowInstance) {
                $workflowInstance->update(['status' => 'rejected']);
            }

            $this->notifyCoordinator(
                $trainingRequest,
                'training_request_directorate_rejected',
                'تم رفض طلب التدريب رقم ' . ($trainingRequest->letter_number ?? "#{$trainingRequest->id}") . '. سبب الرفض: ' . $reason,
                [
                    'training_request_id' => $trainingRequest->id,
                    'book_status' => BookStatus::REJECTED->value,
                    'rejection_reason' => $reason,
                ]
            );

            $trainingRequest->load('trainingRequestStudents');
            TrainingRequestNotifications::forStudents(
                $trainingRequest,
                'training_request_rejected_student',
                'تم رفض طلب التدريب. السبب: ' . $reason,
                [
                    'training_request_id' => $trainingRequest->id,
                    'book_status' => BookStatus::REJECTED->value,
                    'rejection_reason' => $reason,
                ]
            );
        });
    }

    /**
     * عدد تعيينات التدريب النشطة في الجهة (لا يُستهلك قبل قبول المدرسة النهائي — يُستدعى عند القبول فقط).
     */
    private function activeTrainingAssignmentsAtSite(int $trainingSiteId): int
    {
        return TrainingAssignment::query()
            ->where('training_site_id', $trainingSiteId)
            ->whereIn('status', ['assigned', 'ongoing'])
            ->count();
    }

    /**
     * @throws ValidationException
     */
    private function assertTrainingSiteAcceptsNewStudents(TrainingRequest $trainingRequest, int $incomingCount): void
    {
        $siteId = (int) $trainingRequest->training_site_id;
        if ($siteId < 1 || $incomingCount < 1) {
            return;
        }

        $site = TrainingSite::query()->find($siteId);
        if (! $site || $site->capacity === null) {
            return;
        }

        $cap = max(0, (int) $site->capacity);
        $used = $this->activeTrainingAssignmentsAtSite($siteId);
        $remaining = max(0, $cap - $used);

        if ($used + $incomingCount > $cap) {
            throw ValidationException::withMessages([
                'capacity' => "الجهة التدريبية مكتملة السعة (المتبقي: {$remaining}). لا يمكن قبول المزيد من الطلبة.",
            ]);
        }
    }

    /**
     * إرسال إشعار لرؤساء الأقسام المعنيين والأدمن.
     * يحدد القسم(الأقسام) من خلال مساقات الطلاب في طلب التدريب.
     */
    private function notifyHeadsAndAdmins(
        TrainingRequest $trainingRequest,
        string $type,
        string $message,
        array $data = []
    ): void {
        $courseIds = TrainingRequestStudent::where('training_request_id', $trainingRequest->id)
            ->pluck('course_id')
            ->unique()
            ->filter()
            ->values();

        $departmentIds = Course::whereIn('id', $courseIds)
            ->pluck('department_id')
            ->unique()
            ->filter()
            ->values();

        // رؤساء الأقسام المعنيون
        $hodIds = User::whereHas('role', fn ($q) => $q->where('name', 'head_of_department'))
            ->whereIn('department_id', $departmentIds)
            ->pluck('id');

        // كل الأدمن
        $adminIds = User::whereHas('role', fn ($q) => $q->where('name', 'admin'))
            ->pluck('id');

        $recipientIds = $hodIds->merge($adminIds)->unique();

        foreach ($recipientIds as $userId) {
            AppNotification::create([
                'user_id' => $userId,
                'type' => $type,
                'message' => $message,
                'notifiable_type' => TrainingRequest::class,
                'notifiable_id' => $trainingRequest->id,
                'data' => $data,
            ]);
        }
    }

    private function notifyCoordinator(
        TrainingRequest $trainingRequest,
        string $type,
        string $message,
        array $data = []
    ): void {
        $coordinatorId = OfficialLetter::where('training_request_id', $trainingRequest->id)
            ->where('type', OfficialLetterType::TO_DIRECTORATE->value)
            ->latest('id')
            ->value('sent_by');

        if (! $coordinatorId) {
            return;
        }

        AppNotification::create([
            'user_id' => $coordinatorId,
            'type' => $type,
            'message' => $message,
            'notifiable_type' => TrainingRequest::class,
            'notifiable_id' => $trainingRequest->id,
            'data' => $data,
        ]);
    }

    /**
     * رقم كتاب للعرض يبقى كما أدخله المستخدم؛ القيمة المخزّنة تُكمّل لتفادي انتهاك الفهرس الفريد letter_number.
     */
    private function uniqueOfficialLetterNumber(?string $baseNumber, int $trainingRequestId, string $stageLabel): string
    {
        $base = trim((string) $baseNumber);
        if ($base === '') {
            $base = 'كتاب';
        }

        return sprintf('%s-طلب%d-%s', $base, $trainingRequestId, $stageLabel);
    }

    private function generateLetterNumber(): string
    {
        return 'LET-' . date('Ymd') . '-' . rand(100, 999);
    }

    private function resolveWorkflowTemplateId(): ?int
    {
        return WorkflowTemplate::query()
            ->where('model_type', TrainingRequest::class)
            ->where('is_active', true)
            ->orderByDesc('version')
            ->value('id')
            ?? WorkflowTemplate::query()
                ->where('is_active', true)
                ->orderByDesc('version')
                ->value('id');
    }

    private function getEnrollmentId(int $userId, int $courseId): ?int
    {
        $enrollment = \App\Models\Enrollment::where('user_id', $userId)
            ->whereHas('section', function ($q) use ($courseId) {
                $q->where('course_id', $courseId);
            })->first();

        return $enrollment?->id;
    }

    private function requireEnrollmentId(TrainingRequestStudent $studentRequest): int
    {
        $enrollmentId = $this->getEnrollmentId($studentRequest->user_id, $studentRequest->course_id);

        if ($enrollmentId) {
            return $enrollmentId;
        }

        throw ValidationException::withMessages([
            'students' => [
                "لا يمكن اعتماد الطالب {$studentRequest->user_id} لعدم وجود تسجيل أكاديمي مرتبط بالمساق المطلوب.",
            ],
        ]);
    }

    private function getActiveTrainingPeriodId(): ?int
    {
        $period = \App\Models\TrainingPeriod::where('is_active', true)->first();

        return $period?->id;
    }

    private function requireActiveTrainingPeriodId(): int
    {
        $periodId = $this->getActiveTrainingPeriodId();

        if ($periodId) {
            return $periodId;
        }

        throw ValidationException::withMessages([
            'training_period' => ['لا يمكن اعتماد الطلب لعدم وجود فترة تدريب مفعلة.'],
        ]);
    }

    private function getAcademicSupervisorId(int $courseId): ?int
    {
        $courseDepartmentId = \App\Models\Course::where('id', $courseId)->value('department_id');

        $section = \App\Models\Section::query()
            ->where('course_id', $courseId)
            ->whereNotNull('academic_supervisor_id')
            ->when($courseDepartmentId, function ($query) use ($courseDepartmentId) {
                $query->whereHas('academicSupervisor', fn ($supervisorQuery) => $supervisorQuery->where('department_id', $courseDepartmentId));
            })
            ->orderBy('id')
            ->first();

        return $section?->academic_supervisor_id;
    }
}
