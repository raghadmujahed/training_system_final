<?php

namespace App\Events;

use App\Models\TrainingRequest;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TrainingRequestApprovedByDirectorate
{
    use Dispatchable, SerializesModels;

    public TrainingRequest $trainingRequest;
    public ?int $actorId;

    public function __construct(TrainingRequest $trainingRequest, ?int $actorId = null)
    {
        $this->trainingRequest = $trainingRequest;
        $this->actorId = $actorId;
    }
}
