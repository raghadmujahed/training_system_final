<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TrainingPeriod extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'start_date', 'end_date', 'is_active', 'archived_at', 'department_id'];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
        'archived_at' => 'datetime',
    ];

    /**
     * Check if this period has been archived.
     */
    public function isArchived(): bool
    {
        return $this->archived_at !== null ||
            ArchiveBatch::isPeriodArchived($this->id);
    }

    /**
     * Get the latest archive batch for this period.
     */
    public function latestArchiveBatch(): ?ArchiveBatch
    {
        return ArchiveBatch::getLatestForPeriod($this->id);
    }

    public function trainingAssignments()
    {
        return $this->hasMany(TrainingAssignment::class);
    }

    public function sections()
    {
        return $this->hasMany(Section::class);
    }

    public function enrollments()
    {
        return $this->hasMany(Enrollment::class);
    }

    public function archiveBatches()
    {
        return $this->hasMany(ArchiveBatch::class);
    }

    /**
     * Scope to get the active period.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get non-archived periods.
     */
    public function scopeNotArchived($query)
    {
        return $query->whereNull('archived_at');
    }
}