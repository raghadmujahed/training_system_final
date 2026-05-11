<?php

namespace App\Models;

use App\Models\Concerns\HidesArchived;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SectionStudent extends Model
{
    use HasFactory, HidesArchived;

    protected $fillable = [
        'section_id',
        'student_id',
        'status',
        'notes'
    ];

    protected $casts = [
        'status' => 'string',
    ];

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function scopeAccepted($query)
    {
        return $query->where('status', 'accepted');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }
}
