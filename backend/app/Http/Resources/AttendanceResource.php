<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Enums\AttendanceStatus;

class AttendanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'date' => $this->date?->toDateString(),
            'check_in' => $this->check_in,
            'check_out' => $this->check_out,
            'status' => $this->status,
            'status_label' => AttendanceStatus::tryFrom($this->status)?->label() ?? $this->status,
            'notes' => $this->notes,
            'periods' => $this->periods,
            'rejection_reason' => $this->rejection_reason,
            'approved_at' => $this->approved_at?->toDateTimeString(),
            'submitted_to_manager_at' => $this->submitted_to_manager_at?->toDateTimeString(),
            'training_assignment' => new TrainingAssignmentResource($this->whenLoaded('trainingAssignment')),
            'user' => new UserResource($this->whenLoaded('user')),
            'approved_by' => new UserResource($this->whenLoaded('approvedBy')),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}