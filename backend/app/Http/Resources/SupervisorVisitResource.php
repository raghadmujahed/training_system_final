<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Enums\SupervisorVisitStatus;

class SupervisorVisitResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'visit_date' => $this->visit_date?->toDateString(),
            'scheduled_date' => $this->scheduled_date?->toDateString(),
            'notes' => $this->notes,
            'rating' => $this->rating,
            'status' => $this->status,
            'status_label' => SupervisorVisitStatus::tryFrom((string) $this->status)?->label()
                ?? match ((string) $this->status) {
                    'planned', 'scheduled' => 'مجدولة',
                    'completed' => 'منفذة',
                    'cancelled' => 'ملغية',
                    default => (string) $this->status,
                },
            'training_assignment' => new TrainingAssignmentResource($this->whenLoaded('trainingAssignment')),
            'supervisor' => new UserResource($this->whenLoaded('supervisor')),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}