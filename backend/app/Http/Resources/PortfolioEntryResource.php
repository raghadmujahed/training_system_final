<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PortfolioEntryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'code' => $this->code,
            'category' => $this->category,
            'content' => $this->content,
            'file_path' => $this->file_path,
            'review_status' => $this->review_status,
            'reviewer_note' => $this->reviewer_note,
            'academic_rating' => $this->academic_rating,
            'reviewed_at' => $this->reviewed_at?->toDateTimeString(),
            'reviewed_by' => $this->reviewed_by,
            'student_portfolio' => $this->whenLoaded('studentPortfolio')
    ? new StudentPortfolioResource($this->studentPortfolio)
    : null,
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}