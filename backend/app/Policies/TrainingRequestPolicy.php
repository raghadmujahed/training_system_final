<?php

namespace App\Policies;

use App\Models\TrainingRequest;
use App\Models\User;
use App\Support\PsychologyAcademicWorkflow;

class TrainingRequestPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role?->name, [
            'admin',
            'coordinator',
            'training_coordinator',
            'education_directorate',
            'health_directorate',
            'ministry_of_health',
            'school_manager',
            'principal',
            'psychology_center_manager',
            'academic_supervisor',
            'head_of_department',
        ], true);
    }

    public function view(User $user, TrainingRequest $trainingRequest): bool
    {
        if ($user->role?->name === 'admin') {
            return true;
        }

        if (in_array($user->role?->name, ['coordinator', 'training_coordinator'], true)) {
            if (PsychologyAcademicWorkflow::isPsychologyCoordinator($user)) {
                $trainingRequest->loadMissing('requestedBy');

                return ! PsychologyAcademicWorkflow::isOrchestratedByPsychologySupervisor($trainingRequest);
            }

            return true;
        }

        if ($user->role?->name === 'head_of_department') {
            return true;
        }

        if ($user->role?->name === 'student') {
            if ($trainingRequest->requested_by === $user->id) {
                return true;
            }

            return $trainingRequest->trainingRequestStudents()
                ->where('user_id', $user->id)
                ->exists();
        }

        if ($user->role?->name === 'education_directorate'
            && in_array($trainingRequest->book_status, ['sent_to_directorate', 'directorate_approved', 'directorate_rejected', 'sent_to_school', 'school_approved', 'school_rejected', 'rejected'], true)) {
            if (!empty($user->directorate)) {
                $reqDirectorate = trim((string) ($trainingRequest->directorate
                    ?? data_get($trainingRequest, 'trainingSite.directorate', '')));

                return $reqDirectorate === trim((string) $user->directorate);
            }
            return true;
        }

        if (in_array($user->role?->name, ['health_directorate', 'ministry_of_health'], true)
            && in_array($trainingRequest->book_status, ['sent_to_health_ministry', 'directorate_approved', 'directorate_rejected', 'health_ministry_rejected', 'sent_to_school', 'school_approved', 'school_rejected', 'rejected'], true)) {
            return true;
        }

        if (in_array($user->role?->name, ['school_manager', 'psychology_center_manager', 'principal'], true)) {
            $sameSite = ! $user->training_site_id
                || (int) $trainingRequest->training_site_id === (int) $user->training_site_id;
            $inSchoolFlow = in_array($trainingRequest->book_status, [
                'sent_to_school',
                'school_approved',
                'school_rejected',
            ], true);

            return $sameSite && $inSchoolFlow;
        }

        if ($user->role?->name === 'academic_supervisor') {
            if (PsychologyAcademicWorkflow::isPsychologyAcademicSupervisor($user)) {
                $trainingRequest->loadMissing('trainingRequestStudents');
                if ((int) $trainingRequest->requested_by === (int) $user->id) {
                    return true;
                }

                return $trainingRequest->trainingRequestStudents()
                    ->whereHas('user.enrollments.section', fn ($sec) => $sec->where('academic_supervisor_id', $user->id))
                    ->exists();
            }

            return true;
        }

        return false;
    }

    public function create(User $user): bool
    {
        if ($user->role?->name === 'student') {
            if (PsychologyAcademicWorkflow::userHasPsychologyDepartment($user)) {
                return false;
            }

            return true;
        }

        if (PsychologyAcademicWorkflow::isPsychologyAcademicSupervisor($user)) {
            return true;
        }

        return in_array($user->role?->name, ['coordinator', 'training_coordinator'], true);
    }

    public function update(User $user, TrainingRequest $trainingRequest): bool
    {
        if (PsychologyAcademicWorkflow::isPsychologyAcademicSupervisor($user)) {
            if ((int) $trainingRequest->requested_by !== (int) $user->id) {
                return false;
            }

            return in_array($trainingRequest->book_status, [
                'draft',
                'rejected',
                'coordinator_rejected',
                'needs_edit',
                'prelim_approved',
            ], true);
        }

        return in_array($user->role?->name, ['coordinator', 'training_coordinator'], true)
            && in_array($trainingRequest->book_status, ['draft', 'rejected', 'coordinator_rejected'], true);
    }

    /**
     * تعديل الطالب لطلبه بعد إرجاعه للتعديل من المنسق.
     */
    public function updateAsStudent(User $user, TrainingRequest $trainingRequest): bool
    {
        return $user->role?->name === 'student'
            && (int) $trainingRequest->requested_by === (int) $user->id
            && in_array($trainingRequest->book_status, ['needs_edit', 'coordinator_rejected', 'directorate_rejected', 'health_ministry_rejected', 'school_rejected'], true);
    }

    /**
     * حذف الطالب لطلبه (فقط قبل موافقة المنسق؛ بعد الموافقة لا يمكن الإلغاء أبداً).
     */
    public function deleteAsStudent(User $user, TrainingRequest $trainingRequest): bool
    {
        if ($user->role?->name !== 'student' || (int) $trainingRequest->requested_by !== (int) $user->id) {
            return false;
        }

        return in_array($trainingRequest->book_status, [
            'draft',
            'sent_to_coordinator',
            'coordinator_under_review',
            'needs_edit',
        ], true);
    }

    /**
     * مراجعة المنسق الأكاديمي لطلبات الطلبة.
     */
    public function coordinateReview(User $user, TrainingRequest $trainingRequest): bool
    {
        if (! in_array($user->role?->name, ['training_coordinator', 'coordinator'], true)) {
            return false;
        }

        $trainingRequest->loadMissing('requestedBy');
        if (PsychologyAcademicWorkflow::isOrchestratedByPsychologySupervisor($trainingRequest)) {
            return false;
        }

        $requestOwnerDepartmentId = data_get($trainingRequest, 'requestedBy.department_id');
        if ($requestOwnerDepartmentId && (int) $user->department_id !== (int) $requestOwnerDepartmentId) {
            return false;
        }

        return in_array($trainingRequest->book_status, [
            'sent_to_coordinator',
            'coordinator_under_review',
            'needs_edit',
        ], true);
    }

    public function delete(User $user, TrainingRequest $trainingRequest): bool
    {
        return $user->role?->name === 'admin';
    }

    public function sendToDirectorate(User $user, TrainingRequest $trainingRequest): bool
    {
        if ($trainingRequest->book_status !== 'prelim_approved') {
            return false;
        }

        if (PsychologyAcademicWorkflow::isPsychologyAcademicSupervisor($user)) {
            return (int) $trainingRequest->requested_by === (int) $user->id;
        }

        return in_array($user->role?->name, ['coordinator', 'training_coordinator'], true);
    }

    public function approveByDirectorate(User $user, TrainingRequest $trainingRequest): bool
    {
        if ($user->role?->name === 'education_directorate'
            && $trainingRequest->book_status === 'sent_to_directorate') {
            if (!empty($user->directorate)) {
                $siteDirectorate = trim((string) ($trainingRequest->directorate
                    ?? data_get($trainingRequest, 'trainingSite.directorate', '')));
                if ($siteDirectorate !== trim((string) $user->directorate)) {
                    return false;
                }
            }
            return true;
        }

        return in_array($user->role?->name, ['health_directorate', 'ministry_of_health'], true)
            && $trainingRequest->book_status === 'sent_to_health_ministry';
    }

    public function sendToSchool(User $user, TrainingRequest $trainingRequest): bool
    {
        if ($trainingRequest->book_status !== 'directorate_approved') {
            return false;
        }

        if ($user->role?->name === 'education_directorate'
            && $trainingRequest->governing_body === 'directorate_of_education') {
            if (!empty($user->directorate)) {
                $siteDirectorate = (string) data_get($trainingRequest, 'trainingSite.directorate', '');
                if (trim($siteDirectorate) !== trim((string) $user->directorate)) {
                    return false;
                }
            }
            return true;
        }

        return in_array($user->role?->name, ['health_directorate', 'ministry_of_health'], true)
            && $trainingRequest->governing_body === 'ministry_of_health';
    }

    public function approveBySchool(User $user, TrainingRequest $trainingRequest): bool
    {
        if (! in_array($user->role?->name, ['school_manager', 'psychology_center_manager', 'principal'], true)) {
            return false;
        }

        if ($trainingRequest->book_status !== 'sent_to_school') {
            return false;
        }

        if (! $user->training_site_id) {
            return true;
        }

        return (int) $trainingRequest->training_site_id === (int) $user->training_site_id;
    }
}
