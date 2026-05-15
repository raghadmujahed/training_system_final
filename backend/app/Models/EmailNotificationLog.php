<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailNotificationLog extends Model
{
    protected $fillable = [
        'training_request_id',
        'event_type',
        'recipient_type',
        'recipient_email',
        'subject',
        'body',
        'status',
        'error_message',
        'dedup_hash',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];
}
