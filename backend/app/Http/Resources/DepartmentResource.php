<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DepartmentResource extends JsonResource
{
    private static array $arabicLabels = [
        'usool_tarbiah' => 'أصول التربية',
        'psychology' => 'علم النفس',
        'administration' => 'الإدارة والتخطيط التربوي',
    ];

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'label' => self::$arabicLabels[$this->name] ?? $this->name,
            'created_at' => $this->created_at?->toDateTimeString(),
        ];
    }
}