<?php

namespace App\Services;

use App\Models\AcademicSupervisionStatusHistory;
use App\Models\Section;
use App\Models\TrainingAssignment;
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
        $query = TrainingAssignment::query()
            ->where('academic_supervisor_id', $supervisor->id)
            ->whereHas('enrollment.user', function (Builder $studentQuery) use ($supervisor) {
                $studentQuery->whereHas('role', fn (Builder $roleQuery) => $roleQuery->where('name', 'student'));

                if ($supervisor->department_id) {
                    $studentQuery->where('department_id', $supervisor->department_id);
                }
            })
            ->with([
                'trainingSite',
                'teacher',
                'trainingPeriod',
                'enrollment.user.department',
                'enrollment.section.course',
                'academicStatusUpdatedBy:id,name',
            ]);

        if ($supervisor->department_id) {
            $query->where(function (Builder $assignmentQuery) use ($supervisor) {
                $assignmentQuery
                    ->whereHas('enrollment.user', fn (Builder $studentQuery) => $studentQuery->where('department_id', $supervisor->department_id))
                    ->orWhereHas('enrollment.section.course', fn (Builder $courseQuery) => $courseQuery->where('department_id', $supervisor->department_id));
            });
        }

        return $query;
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

        // If no TrainingAssignment, check if student is in a supervised section
        if ($this->isStudentInSupervisedSection($supervisor, $studentId)) {
            // Return a new/empty assignment placeholder so the controller can handle gracefully
            // Create a minimal unsaved assignment that references the student's enrollment
            $enrollment = \App\Models\Enrollment::where('user_id', $studentId)
                ->whereHas('section', fn ($q) => $q->where('academic_supervisor_id', $supervisor->id))
                ->latest()
                ->first();

            if ($enrollment) {
                // Try to find any existing assignment for this enrollment
                $existingAssignment = TrainingAssignment::where('enrollment_id', $enrollment->id)->latest()->first();
                if ($existingAssignment) {
                    return $existingAssignment;
                }
            }

            // Student is in a supervised section but has no training assignment yet
            // Allow access by aborting with a specific message the controller can handle
            abort(404, 'Student has no training assignment yet, but is in your supervised section.');
        }

        abort_unless(false, 403, 'You are not authorized to access this student.');
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
