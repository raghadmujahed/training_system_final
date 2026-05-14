<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Enums\TaskStatus;

class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'training_assignment_id' => $this->training_assignment_id,
            'title' => $this->title,
            'description' => $this->description,
            'instructions' => $this->instructions,
            'due_date' => $this->due_date?->toDateString(),
            'status' => $this->status,
            'distribution_key' => $this->distribution_key,
            'target_type' => $this->target_type,
            'target_ids' => $this->target_ids ?? [],
            'task_type' => $this->task_type,
            'grading_weight' => $this->grading_weight,
            'status_label' => TaskStatus::tryFrom($this->status)?->label() ?? $this->status,
            'training_assignment' => new TrainingAssignmentResource($this->whenLoaded('trainingAssignment')),
            'assigned_by' => new UserResource($this->whenLoaded('assignedBy')),
            'submissions' => TaskSubmissionResource::collection($this->whenLoaded('submissions')),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}