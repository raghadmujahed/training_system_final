<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Enums\SiteType;
use App\Enums\GoverningBody;
use App\Enums\Directorate;

class TrainingSiteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'location' => $this->location,
            'phone' => $this->phone,
            'description' => $this->description,
            'is_active' => (bool) $this->is_active,
            'directorate' => $this->directorate,
            'directorate_label' => Directorate::tryFrom($this->directorate)?->label() ?? $this->directorate,
            'capacity' => $this->capacity,
            'site_type' => $this->site_type,
            'site_type_label' => SiteType::tryFrom($this->site_type)?->label() ?? $this->site_type,
            'school_type' => $this->school_type ?? null,
            'gender_classification' => $this->gender_classification ?? null,
            'school_level' => $this->school_level ?? null,
            'governing_body' => $this->governing_body,
            'governing_body_label' => GoverningBody::tryFrom($this->governing_body)?->label() ?? $this->governing_body,
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
            'deleted_at' => $this->deleted_at?->toDateTimeString(),
        ];
    }
}