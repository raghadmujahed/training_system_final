<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Enums\TrainingRequestStudentStatus;

class TrainingRequestStudentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $course = $this->relationLoaded('course') ? $this->course : null;
        $department = ($course && $course->relationLoaded('department')) ? $course->department : null;

        return [
            'id' => $this->id,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'notes' => $this->notes,
            'rejection_reason' => $this->rejection_reason,
            'status' => $this->status,
            'status_label' => TrainingRequestStudentStatus::tryFrom($this->status)?->label() ?? $this->status,
            'user' => new UserResource($this->whenLoaded('user')),
            'course' => new CourseResource($this->whenLoaded('course')),
            'department_id' => $department?->id ?? $course?->department_id,
            'department_name' => $department?->name,
            'assigned_teacher' => new UserResource($this->whenLoaded('assignedTeacher')),
            'training_request' => new TrainingRequestResource($this->whenLoaded('trainingRequest')),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}