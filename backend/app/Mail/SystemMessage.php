<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SystemMessage extends Mailable
{
    use Queueable, SerializesModels;

    private readonly string $_body;
    private readonly string $_recipientName;

    public function __construct(
        string $subject,
        string $body,
        string $recipientName = '',
    ) {
        $this->subject = $subject;
        $this->_body = $body;
        $this->_recipientName = $recipientName;
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subject);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.system-message',
            with: [
                'subject' => $this->subject,
                'body' => $this->_body,
                'recipientName' => $this->_recipientName,
            ],
        );
    }
}
