<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EvaluationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'evaluation_type' => $this->evaluation_type,
            'total_score' => $this->total_score,
            'notes' => $this->notes,
            'training_assignment' => new TrainingAssignmentResource($this->whenLoaded('trainingAssignment')),
            'evaluator' => new UserResource($this->whenLoaded('evaluator')),
            'template' => new EvaluationTemplateResource($this->whenLoaded('template')),
            'scores' => EvaluationScoreResource::collection($this->whenLoaded('scores')),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}