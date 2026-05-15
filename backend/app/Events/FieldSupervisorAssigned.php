<?php

namespace App\Events;

use App\Models\TrainingAssignment;
use App\Models\TrainingRequest;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FieldSupervisorAssigned
{
    use Dispatchable, SerializesModels;

    public TrainingRequest $trainingRequest;
    public TrainingAssignment $trainingAssignment;
    public bool $isUpdate;

    public function __construct(
        TrainingRequest $trainingRequest,
        TrainingAssignment $trainingAssignment,
        bool $isUpdate = false
    ) {
        $this->trainingRequest = $trainingRequest;
        $this->trainingAssignment = $trainingAssignment;
        $this->isUpdate = $isUpdate;
    }
}
