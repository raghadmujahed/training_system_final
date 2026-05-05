<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatRelationship extends Model
{
    protected $table = 'chat_relationships';

    protected $fillable = ['user_id', 'related_user_id', 'type'];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function relatedUser()
    {
        return $this->belongsTo(User::class, 'related_user_id');
    }
}
