<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NoteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $student = $this->relationLoaded('trainingAssignment')
            ? $this->trainingAssignment?->enrollment?->user
            : null;

        return [
            'id' => $this->id,
            'content' => $this->content,
            'user_id' => $this->user_id,
            'training_assignment_id' => $this->training_assignment_id,
            'student_name' => $student?->name,
            'student_university_id' => $student?->university_id,
            'user' => new UserResource($this->whenLoaded('user')),
            'training_assignment' => new TrainingAssignmentResource($this->whenLoaded('trainingAssignment')),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}