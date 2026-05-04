<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FormInstanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'form_template_id' => $this->form_template_id,
            'training_assignment_id' => $this->training_assignment_id,
            'owner_user_id' => $this->owner_user_id,
            'subject_user_id' => $this->subject_user_id,
            'owner_type' => $this->owner_type,
            'status' => $this->status,
            'current_reviewer_id' => $this->current_reviewer_id,
            'status_label' => $this->statusLabel(),
            'payload' => $this->payload ?? [],
            'visibility_roles' => $this->visibility_roles ?? [],
            'workflow_state' => $this->workflow_state ?? [],
            'available_at' => $this->available_at?->toDateTimeString(),
            'due_at' => $this->due_at?->toDateTimeString(),
            'submitted_at' => $this->submitted_at?->toDateTimeString(),
            'approved_at' => $this->approved_at?->toDateTimeString(),
            'finalized_at' => $this->finalized_at?->toDateTimeString(),
            'current_review_step' => $this->current_review_step,
            'template' => new FormTemplateResource($this->whenLoaded('template')),
            'owner' => new UserResource($this->whenLoaded('owner')),
            'subject' => new UserResource($this->whenLoaded('subject')),
            'training_assignment' => new TrainingAssignmentResource($this->whenLoaded('trainingAssignment')),
            'reviews' => FormReviewResource::collection($this->whenLoaded('reviews')),
            'audit_logs' => FormAuditLogResource::collection($this->whenLoaded('auditLogs')),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }

    private function statusLabel(): string
    {
        return match ($this->status) {
            'not_started' => 'لم يبدأ',
            'draft' => 'مسودة',
            'submitted' => 'مرسل',
            'pending_review' => 'بانتظار المراجعة',
            'returned' => 'معاد للتعديل',
            'approved' => 'معتمد',
            'finalized' => 'نهائي',
            default => $this->status,
        };
    }
}
