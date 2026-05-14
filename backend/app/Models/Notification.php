<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Concerns\HidesArchived;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasFactory, HidesArchived;

    protected $fillable = [
        'user_id', 'type', 'title', 'content', 'message',
        'notifiable_type', 'notifiable_id',
        'action_url', 'is_read', 'read_at', 'data',
    ];

    protected $casts = [
        'read_at' => 'datetime',
        'data' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * إشعارات الجدول المخصص (user_id) + إشعارات قناة database لـ Laravel (notifiable = User).
     */
    public function scopeForRecipient(Builder $query, User $user): Builder
    {
        $uid = (int) $user->id;
        $types = [User::class, 'App\Models\User'];

        return $query->where(function (Builder $q) use ($uid, $types) {
            $q->where('user_id', $uid)
                ->orWhere(function (Builder $q2) use ($uid, $types) {
                    $q2->whereIn('notifiable_type', $types)
                        ->where('notifiable_id', $uid);
                });
        });
    }
}