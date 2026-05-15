<?php

namespace App\Listeners;

use App\Events\FieldSupervisorAssigned;
use App\Events\TrainingRequestApprovedByDirectorate;
use App\Events\TrainingRequestApprovedBySchool;
use App\Events\TrainingRequestRejected;
use App\Events\TrainingRequestSentToSchool;
use App\Services\TrainingRequestEmailService;

class SendTrainingRequestEmail
{
    public function __construct(private TrainingRequestEmailService $service) {}

    public function handle(object $event): void
    {
        match (true) {
            $event instanceof TrainingRequestSentToSchool => $this->service->sendToSchoolManager($event->trainingRequest),
            $event instanceof TrainingRequestRejected => $this->service->sendRejectionToStudents($event->trainingRequest, $event->rejectedBy, $event->reason),
            $event instanceof TrainingRequestApprovedByDirectorate => $this->service->sendDirectorateApprovalToStudents($event->trainingRequest),
            $event instanceof TrainingRequestApprovedBySchool => $this->service->sendSchoolApprovalToStudents($event->trainingRequest),
            $event instanceof FieldSupervisorAssigned => $this->service->sendSupervisorAssignment($event->trainingRequest, $event->trainingAssignment->id, $event->isUpdate),
            default => null,
        };
    }
}
