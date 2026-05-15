<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AnnouncementTargetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'role' => new RoleResource($this->whenLoaded('role')),
            'user' => new UserResource($this->whenLoaded('user')),
            'department' => new DepartmentResource($this->whenLoaded('department')),
            'section_id' => $this->section_id,
            'section' => $this->whenLoaded('section', function () {
                return ['id' => $this->section->id, 'name' => $this->section->name];
            }),
        ];
    }
}