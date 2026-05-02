<?php

namespace App\Services;

use App\Models\AcademicSupervisionStatusHistory;
use App\Models\Enrollment;
use App\Models\Section;
use App\Models\TrainingAssignment;
use App\Models\TrainingPeriod;
use App\Models\TrainingRequest;
use App\Models\TrainingSite;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

class AcademicSupervisorStudentService
{
    public function __construct(
        private readonly TrainingTrackResolver $trackResolver
    ) {
    }

    public function supervisedAssignmentsQuery(User $supervisor): Builder
    {
        return $this->supervisedAssignmentsBaseQuery($supervisor)->with([
            'trainingSite',
            'teacher',
            'trainingPeriod',
            'enrollment' => fn ($q) => $q->withArchived()->with(['user.department', 'section.course']),
            'academicStatusUpdatedBy:id,name',
        ]);
    }

    /**
     * نفس نطاق supervisedAssignmentsQuery بدون eager load (مناسب للاستعلامات الفرعية وwhereIn).
     */
    public function supervisedAssignmentsBaseQuery(User $supervisor): Builder
    {
        $query = TrainingAssignment::query()->withArchived()
            ->where(function (Builder $outer) use ($supervisor) {
                $outer->where('academic_supervisor_id', $supervisor->id)
                    ->orWhereHas('enrollment.section', function (Builder $sec) use ($supervisor) {
                        $sec->withArchived()->where('academic_supervisor_id', $supervisor->id);
                    });
            })
            ->whereHas('enrollment', function (Builder $enrollmentQuery) use ($supervisor) {
                $enrollmentQuery->withArchived();
                $enrollmentQuery->whereHas('user', function (Builder $studentQuery) use ($supervisor) {
                    $studentQuery->whereHas('role', fn (Builder $roleQuery) => $roleQuery->where('name', 'student'));

                    if ($supervisor->department_id) {
                        $studentQuery->where(function (Builder $sq) use ($supervisor) {
                            $sq->where('department_id', $supervisor->department_id)
                                ->orWhereHas('enrollments', function (Builder $enr) use ($supervisor) {
                                    $enr->withArchived();
                                    $enr->whereHas('section', function (Builder $sec) use ($supervisor) {
                                        $sec->withArchived()->where('academic_supervisor_id', $supervisor->id);
                                    });
                                });
                        });
                    }
                });
            });

        if ($supervisor->department_id) {
            $query->where(function (Builder $assignmentQuery) use ($supervisor) {
                $assignmentQuery
                    ->whereHas('enrollment', function (Builder $enr) use ($supervisor) {
                        $enr->withArchived()->whereHas('user', fn (Builder $studentQuery) => $studentQuery->where('department_id', $supervisor->department_id));
                    })
                    ->orWhereHas('enrollment', function (Builder $enr) use ($supervisor) {
                        $enr->withArchived()->whereHas('section.course', fn (Builder $courseQuery) => $courseQuery->where('department_id', $supervisor->department_id));
                    })
                    ->orWhereHas('enrollment', function (Builder $enr) use ($supervisor) {
                        $enr->withArchived()->whereHas('section', function (Builder $sec) use ($supervisor) {
                            $sec->withArchived()->where('academic_supervisor_id', $supervisor->id);
                        });
                    });
            });
        }

        return $query;
    }

    /**
     * تسجيلات الشعب تحت إشراف المشرف (أو لها تعيين تدريب يخصّصه كمشرف)، حتى قبل إنشاء تعيين تدريب.
     * يُستخدم لقائمة الطلاب في مساحة العمل لتطابق ما يظهر في بطاقات الشعب.
     */
    public function supervisedEnrollmentsQuery(User $supervisor): Builder
    {
        $query = Enrollment::query()->withArchived()
            ->where(function (Builder $outer) use ($supervisor) {
                $outer->whereHas('section', function (Builder $sec) use ($supervisor) {
                    $sec->withArchived()->where('academic_supervisor_id', $supervisor->id);
                })
                    ->orWhereHas('trainingAssignments', function (Builder $ta) use ($supervisor) {
                        $ta->where('academic_supervisor_id', $supervisor->id);
                    });
            })
            ->whereHas('user', function (Builder $studentQuery) use ($supervisor) {
                $studentQuery->whereHas('role', fn (Builder $roleQuery) => $roleQuery->where('name', 'student'));

                if ($supervisor->department_id) {
                    $studentQuery->where(function (Builder $sq) use ($supervisor) {
                        $sq->where('department_id', $supervisor->department_id)
                            ->orWhereHas('enrollments', function (Builder $enr) use ($supervisor) {
                                $enr->withArchived();
                                $enr->whereHas('section', function (Builder $sec) use ($supervisor) {
                                    $sec->withArchived()->where('academic_supervisor_id', $supervisor->id);
                                });
                            });
                    });
                }
            });

        if ($supervisor->department_id) {
            $query->where(function (Builder $enrollmentQuery) use ($supervisor) {
                $enrollmentQuery
                    ->whereHas('user', fn (Builder $studentQuery) => $studentQuery->where('department_id', $supervisor->department_id))
                    ->orWhereHas('section.course', fn (Builder $courseQuery) => $courseQuery->where('department_id', $supervisor->department_id))
                    ->orWhereHas('section', function (Builder $sec) use ($supervisor) {
                        $sec->withArchived()->where('academic_supervisor_id', $supervisor->id);
                    });
            });
        }

        return $query;
    }

    /**
     * طلب تدريب داخلي يُستخدم فقط لربط تعيينات «قبل اكتمال التوزيع الميداني» حتى تبقى المهام والملاحظات والزيارات متسقة مع نموذج البيانات.
     */
    public function getOrCreateShellTrainingRequest(): TrainingRequest
    {
        $siteId = TrainingSite::query()->orderBy('id')->value('id');
        abort_if(! $siteId, 503, 'لا يوجد موقع تدريب في النظام. أضف جهة تدريب ثم أعد المحاولة.');

        $period = TrainingPeriod::query()->where('is_active', true)->orderByDesc('id')->first()
            ?? TrainingPeriod::query()->orderByDesc('id')->first();
        abort_if(! $period, 503, 'لا توجد فترة تدريبية في النظام. أضف فترة تدريب ثم أعد المحاولة.');

        return TrainingRequest::firstOrCreate(
            ['letter_number' => '__system_academic_shell_v1__'],
            [
                'training_site_id' => $siteId,
                'training_period_id' => $period->id,
                'book_status' => 'draft',
                'status' => 'approved',
                'requested_at' => now(),
            ]
        );
    }

    /**
     * يضمن وجود صف training_assignment لتسجيل طالب تحت إشراف المشرف (مثلاً قبل اكتمال طلب التدريب والموافقات).
     */
    public function ensureShellAssignmentForEnrollment(User $supervisor, int $enrollmentId): ?TrainingAssignment
    {
        return DB::transaction(function () use ($supervisor, $enrollmentId) {
            $existing = TrainingAssignment::query()->withArchived()
                ->where('enrollment_id', $enrollmentId)
                ->lockForUpdate()
                ->latest('id')
                ->first();
            if ($existing) {
                return $existing;
            }

            $allowed = $this->supervisedEnrollmentsQuery($supervisor)->whereKey($enrollmentId)->exists();
            if (! $allowed) {
                return null;
            }

            $period = TrainingPeriod::query()->where('is_active', true)->orderByDesc('id')->first()
                ?? TrainingPeriod::query()->orderByDesc('id')->first();
            if (! $period) {
                return null;
            }

            $shellTr = $this->getOrCreateShellTrainingRequest();
            $start = $period->start_date ?? now()->toDateString();
            $end = $period->end_date ?? now()->addMonths(4)->toDateString();

            return TrainingAssignment::create([
                'enrollment_id' => $enrollmentId,
                'training_request_id' => $shellTr->id,
                'training_site_id' => $shellTr->training_site_id,
                'training_period_id' => $period->id,
                'teacher_id' => null,
                'academic_supervisor_id' => $supervisor->id,
                'coordinator_id' => null,
                'status' => 'assigned',
                'start_date' => $start,
                'end_date' => $end,
            ]);
        });
    }

    public function ensureShellAssignmentsForSupervisedEnrollments(User $supervisor): void
    {
        $enrollmentIds = $this->supervisedEnrollmentsQuery($supervisor)->select('id')->pluck('id');
        foreach ($enrollmentIds as $eid) {
            $this->ensureShellAssignmentForEnrollment($supervisor, (int) $eid);
        }
    }

    /**
     * أرقام تعيينات التدريب للطلاب/الشعب المختارة ضمن إشراف المشرف الأكاديمي.
     * يُنشأ تعيين أولي تلقائياً عند الحاجة حتى تُربط المهام بـ training_assignment_id.
     *
     * @param  'student'|'group'|'section'  $targetType
     * @param  list<int>  $targetIds
     * @return Collection<int, int>
     */
    public function trainingAssignmentIdsForTaskTargets(User $supervisor, string $targetType, array $targetIds): Collection
    {
        $ids = collect($targetIds)->map(fn ($id) => (int) $id)->filter()->values();
        if ($ids->isEmpty() || ! in_array($targetType, ['student', 'group', 'section'], true)) {
            return collect();
        }

        $query = $this->supervisedEnrollmentsQuery($supervisor);

        if ($targetType === 'section') {
            $query->whereIn('section_id', $ids->all());
        } else {
            $query->whereIn('user_id', $ids->all());
        }

        $enrollmentIds = $query->select('id')->pluck('id');
        if ($enrollmentIds->isEmpty()) {
            return collect();
        }

        $assignmentIds = collect();
        foreach ($enrollmentIds as $eid) {
            $assignment = $this->ensureShellAssignmentForEnrollment($supervisor, (int) $eid);
            if ($assignment) {
                $assignmentIds->push($assignment->id);
            }
        }

        return $assignmentIds->unique()->values();
    }

    public function supervisedStudentIds(User $supervisor): array
    {
        return $this->supervisedAssignmentsQuery($supervisor)
            ->get()
            ->pluck('enrollment.user_id')
            ->filter()
            ->unique()
            ->values()
            ->toArray();
    }

    public function getAssignmentForStudent(User $supervisor, int $studentId): ?TrainingAssignment
    {
        return $this->supervisedAssignmentsQuery($supervisor)
            ->whereHas('enrollment', fn (Builder $q) => $q->where('user_id', $studentId))
            ->latest('id')
            ->first();
    }

    /**
     * Check if a student is in a section supervised by this supervisor
     * (via enrollments or section_students pivot).
     */
    public function isStudentInSupervisedSection(User $supervisor, int $studentId): bool
    {
        return Section::where('academic_supervisor_id', $supervisor->id)
            ->where(function ($q) use ($studentId) {
                $q->whereHas('enrollments', fn ($eq) => $eq->where('user_id', $studentId))
                  ->orWhereHas('students', fn ($sq) => $sq->where('student_id', $studentId));
            })
            ->exists();
    }

    public function mustGetAssignmentForStudent(User $supervisor, int $studentId): TrainingAssignment
    {
        $assignment = $this->getAssignmentForStudent($supervisor, $studentId);

        if ($assignment) {
            return $assignment;
        }

        $enrollment = $this->supervisedEnrollmentsQuery($supervisor)
            ->where('user_id', $studentId)
            ->orderByDesc('id')
            ->first();

        abort_unless($enrollment, 403, 'You are not authorized to access this student.');

        $created = $this->ensureShellAssignmentForEnrollment($supervisor, (int) $enrollment->id);
        abort_if(! $created, 503, 'تعذر إنشاء سجل تعيين مبدئي. تأكد من وجود موقع وفترة تدريب في النظام.');

        return $created;
    }

    public function updateAcademicStatus(User $actor, int $studentId, string $status, ?string $note = null): TrainingAssignment
    {
        return DB::transaction(function () use ($actor, $studentId, $status, $note) {
            $assignment = $this->assignmentForStatusUpdate($actor, $studentId);
            $oldStatus = $assignment->academic_status;

            $assignment->update([
                'academic_status' => $status,
                'academic_status_note' => $note,
                'academic_status_updated_by' => $actor->id,
                'academic_status_updated_at' => now(),
            ]);

            AcademicSupervisionStatusHistory::create([
                'training_assignment_id' => $assignment->id,
                'student_id' => $assignment->enrollment?->user_id ?? $studentId,
                'academic_supervisor_id' => $assignment->academic_supervisor_id,
                'old_status' => $oldStatus,
                'new_status' => $status,
                'note' => $note,
                'changed_by' => $actor->id,
                'changed_at' => now(),
            ]);

            return $assignment->refresh()->load([
                'trainingSite',
                'teacher',
                'trainingPeriod',
                'enrollment.user.department',
                'enrollment.section.course',
                'academicStatusUpdatedBy:id,name',
            ]);
        });
    }

    private function assignmentForStatusUpdate(User $actor, int $studentId): TrainingAssignment
    {
        if ($actor->role?->name === 'academic_supervisor') {
            return $this->mustGetAssignmentForStudent($actor, $studentId);
        }

        abort_unless(
            in_array($actor->role?->name, ['admin', 'training_coordinator', 'head_of_department'], true),
            403,
            'You are not authorized to update this student status.'
        );

        $query = TrainingAssignment::query()
            ->whereHas('enrollment', fn (Builder $q) => $q->where('user_id', $studentId))
            ->with([
                'trainingSite',
                'teacher',
                'trainingPeriod',
                'enrollment.user.department',
                'enrollment.section.course',
                'academicStatusUpdatedBy:id,name',
            ])
            ->latest('id');

        if ($actor->role?->name === 'head_of_department' && $actor->department_id) {
            $query->whereHas('enrollment.user', fn (Builder $studentQuery) => $studentQuery->where('department_id', $actor->department_id));
        }

        $assignment = $query->first();
        abort_unless($assignment, 403, 'You are not authorized to update this student status.');

        return $assignment;
    }

    public function sections(User $supervisor): Collection
    {
        return $this->supervisedAssignmentsQuery($supervisor)
            ->get()
            ->pluck('enrollment.section')
            ->filter()
            ->unique('id')
            ->values()
            ->map(function ($section) {
                $section->training_track = $this->trackResolver->resolveForAssignment(
                    data_get($section, 'enrollments.0.trainingAssignments.0')
                );

                return $section;
            });
    }
}
