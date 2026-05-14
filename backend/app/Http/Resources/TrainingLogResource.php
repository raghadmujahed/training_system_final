<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Enums\TrainingLogStatus;

class TrainingLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // استخراج اسم الطالب من العلاقة إذا كانت محمّلة
        $assignment = $this->whenLoaded('trainingAssignment');
        $studentName = null;
        $studentId   = null;

        if ($this->relationLoaded('trainingAssignment') && $this->trainingAssignment) {
            $ta = $this->trainingAssignment;
            if ($ta->relationLoaded('enrollment') && $ta->enrollment) {
                $enr = $ta->enrollment;
                if ($enr->relationLoaded('user') && $enr->user) {
                    $studentName = $enr->user->name;
                    $studentId   = $enr->user->id;
                }
            }
        }

        return [
            'id'                    => $this->id,
            'log_date'              => $this->log_date?->toDateString(),
            'start_time'            => $this->start_time,
            'end_time'              => $this->end_time,
            'activities_performed'  => $this->activities_performed,
            'supervisor_notes'      => $this->supervisor_notes,
            'student_reflection'    => $this->student_reflection,
            'status'                => $this->status,
            'status_label'          => TrainingLogStatus::tryFrom($this->status)?->label() ?? $this->status,
            'student_name'          => $studentName,
            'student_id'            => $studentId,
            'training_assignment'   => $assignment,
            'created_at'            => $this->created_at?->toDateTimeString(),
            'updated_at'            => $this->updated_at?->toDateTimeString(),
        ];
    }
}