<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ArchiveBatch extends Model
{
    use HasFactory;

    protected $fillable = [
        'training_period_id',
        'archived_by',
        'archived_at',
        'status',
        'summary_counts',
        'notes',
        'error_message',
    ];

    protected $casts = [
        'archived_at' => 'datetime',
        'summary_counts' => 'array',
    ];

    public function trainingPeriod()
    {
        return $this->belongsTo(TrainingPeriod::class);
    }

    public function archivedBy()
    {
        return $this->belongsTo(User::class, 'archived_by');
    }

    /**
     * Check if a training period has already been archived successfully.
     */
    public static function isPeriodArchived(int $periodId): bool
    {
        return static::where('training_period_id', $periodId)
            ->where('status', 'completed')
            ->exists();
    }

    /**
     * Get the latest archive batch for a period.
     */
    public static function getLatestForPeriod(int $periodId): ?self
    {
        return static::where('training_period_id', $periodId)
            ->latest()
            ->first();
    }
}
