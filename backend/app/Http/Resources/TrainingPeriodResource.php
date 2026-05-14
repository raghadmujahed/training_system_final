<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TrainingPeriodResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $startDate = $this->start_date;
        $endDate   = $this->end_date;

        $academicYear = $startDate ? (int) $startDate->format('Y') : null;
        $semester     = $startDate ? $this->resolveSemester((int) $startDate->format('n')) : null;

        // Unified status: active | archived | draft
        if ($this->is_active) {
            $status = 'active';
        } elseif ($this->archived_at) {
            $status = 'archived';
        } else {
            $status = 'draft';
        }

        return [
            'id'            => $this->id,
            'name'          => $this->name,
            'start_date'    => $startDate?->toDateString(),
            'end_date'      => $endDate?->toDateString(),
            'academic_year' => $academicYear,
            'semester'      => $semester,
            'is_active'     => (bool) $this->is_active,
            'status'        => $status,
            'archived_at'   => $this->archived_at?->toDateTimeString(),
            'created_at'    => $this->created_at?->toDateTimeString(),
            'updated_at'    => $this->updated_at?->toDateTimeString(),
        ];
    }

    private function resolveSemester(int $startMonth): string
    {
        if ($startMonth >= 6 && $startMonth <= 8) {
            return 'summer';
        }
        if ($startMonth >= 1 && $startMonth <= 5) {
            return 'second';
        }
        return 'first';
    }
}