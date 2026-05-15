<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Concerns\HidesArchived;
use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    use HasFactory, HidesArchived;

    protected $fillable = [
        'title',
        'content',
        'user_id',
        'status',
        'published_at',
        'expires_at',
        'all_students',
        'target_type',
        'target_student_id',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'expires_at' => 'datetime',
        'all_students' => 'boolean',
    ];

    public function targetStudent()
    {
        return $this->belongsTo(User::class, 'target_student_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function targets()
    {
        return $this->hasMany(AnnouncementTarget::class);
    }
}