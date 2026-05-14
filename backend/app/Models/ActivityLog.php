<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'causer_id',
        'subject_type',
        'subject_id',
        'action',
        'description',
        'ip_address',
        'old_data',
        'new_data',
        'method',
        'route',
        'user_agent',
    ];

    protected $casts = [
        'old_data' => 'array',
        'new_data' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function causer()
    {
        return $this->belongsTo(User::class, 'causer_id');
    }

    public function details()
    {
        return $this->hasMany(ActivityLogDetail::class);
    }
}