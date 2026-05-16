<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Concerns\HidesArchived;
use Illuminate\Database\Eloquent\Model;

class StudentEForm extends Model
{
    use HasFactory, HidesArchived;

    protected $table = 'student_eforms';

    protected $fillable = [
        'user_id',
        'form_key',
        'title',
        'payload',
        'status',
        'submitted_at',
        'academic_note',
        'needs_discussion',
        'academic_supervisor_id',
        'academic_reviewed_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'submitted_at' => 'datetime',
        'needs_discussion' => 'boolean',
        'academic_reviewed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function academicSupervisor()
    {
        return $this->belongsTo(User::class, 'academic_supervisor_id');
    }
}
