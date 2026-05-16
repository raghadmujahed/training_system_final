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
    ];

    protected $casts = [
        'payload' => 'array',
        'submitted_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
