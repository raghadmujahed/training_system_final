<?php

namespace App\Http\Resources;

use App\Enums\GoverningBody;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TrainingRequestBatchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'governing_body' => $this->governing_body,
            'governing_body_label' => GoverningBody::tryFrom((string) $this->governing_body)?->label()
                ?? $this->governing_body,
            'recipient_label' => $this->recipientLabel(),
            'directorate' => $this->directorate,
            'status' => $this->status,
            'letter_number' => $this->letter_number,
            'letter_date' => $this->letter_date?->toDateString(),
            'content' => $this->content,
            'created_by' => new UserResource($this->whenLoaded('createdBy')),
            'sent_at' => $this->sent_at?->toDateTimeString(),
            'items_count' => $this->whenCounted('trainingRequests'),
            'training_requests' => TrainingRequestResource::collection($this->whenLoaded('trainingRequests')),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }

    protected function recipientLabel(): string
    {
        $body = GoverningBody::tryFrom((string) $this->governing_body);

        if ($body === GoverningBody::MINISTRY_OF_HEALTH) {
            return 'وزارة الصحة';
        }

        $dir = trim((string) $this->directorate);

        return $dir !== '' ? 'مديرية التربية والتعليم — '.$dir : 'مديريات التربية والتعليم';
    }
}

