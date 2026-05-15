<?php

namespace App\Events;

use App\Models\TrainingRequest;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TrainingRequestRejected
{
    use Dispatchable, SerializesModels;

    public TrainingRequest $trainingRequest;
    public string $rejectedBy; // coordinator, directorate, school, head_of_department, general
    public string $reason;
    public ?int $actorId;

    public function __construct(
        TrainingRequest $trainingRequest,
        string $rejectedBy,
        string $reason,
        ?int $actorId = null
    ) {
        $this->trainingRequest = $trainingRequest;
        $this->rejectedBy = $rejectedBy;
        $this->reason = $reason;
        $this->actorId = $actorId;
    }
}
