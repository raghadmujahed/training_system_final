<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AnnouncementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'content' => $this->content,
            'status' => $this->status,
            'published_at' => $this->published_at?->toDateTimeString(),
            'expires_at' => $this->expires_at?->toDateTimeString(),
            'all_students' => (bool) $this->all_students,
            'user' => new UserResource($this->whenLoaded('user')),
            'targets' => AnnouncementTargetResource::collection($this->whenLoaded('targets')),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}