<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SupervisorSectionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this['id'] ?? null,
            'section_code' => $this['section_code'] ?? null,
            'section_name' => $this['section_name'] ?? null,
            'course' => $this['course'] ?? null,
            'department' => $this['department'] ?? null,
            'training_track' => $this['training_track'] ?? null,
            'students_count' => $this['students_count'] ?? 0,
            'students' => $this['students'] ?? [],
            'training_sites_count' => $this['training_sites_count'] ?? 0,
            'academic_supervisor' => $this['academic_supervisor'] ?? null,
            'status' => $this['status'] ?? 'active',
        ];
    }
}
