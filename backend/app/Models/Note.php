<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Concerns\HidesArchived;
use Illuminate\Database\Eloquent\Model;

class Note extends Model
{
    use HasFactory, HidesArchived;

    protected $fillable = ['user_id', 'training_assignment_id', 'content', 'notable_type', 'notable_id'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function trainingAssignment()
    {
        return $this->belongsTo(TrainingAssignment::class);
    }
}