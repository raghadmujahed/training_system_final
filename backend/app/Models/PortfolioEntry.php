<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Concerns\HidesArchived;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class PortfolioEntry extends Model
{
    use HasFactory, HidesArchived;

    protected $fillable = [
        'student_portfolio_id', 'title', 'code', 'category', 'content', 'file_path',
        'review_status', 'reviewer_note', 'academic_rating', 'reviewed_by', 'reviewed_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function studentPortfolio()
    {
        return $this->belongsTo(StudentPortfolio::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}