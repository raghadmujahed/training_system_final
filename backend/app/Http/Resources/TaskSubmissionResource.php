<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskSubmissionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'file_path' => $this->file_path,
            'file_url' => $this->file_path ? \Storage::disk('public')->url($this->file_path) : null,
            'notes' => $this->notes,
            'status' => $this->status,
            'review_status' => $this->review_status,
            'score' => $this->score !== null ? (float) $this->score : null,
            'grade' => $this->score !== null ? (float) $this->score : null,
            'feedback' => $this->feedback,
            'submitted_at' => $this->submitted_at?->toDateTimeString(),
            'task' => new TaskResource($this->whenLoaded('task')),
            'user' => new UserResource($this->whenLoaded('user')),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}