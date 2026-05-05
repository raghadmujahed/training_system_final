<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'message' => $this->resolveMessage(),
            'data' => $this->data,
            'notifiable_type' => $this->notifiable_type,
            'notifiable_id' => $this->notifiable_id,
            'read_at'    => $this->getRawOriginal('read_at')    ? str_replace(' ', 'T', $this->getRawOriginal('read_at'))    . 'Z' : null,
            'user'       => new UserResource($this->whenLoaded('user')),
            'created_at' => $this->getRawOriginal('created_at') ? str_replace(' ', 'T', $this->getRawOriginal('created_at')) . 'Z' : null,
            'updated_at' => $this->getRawOriginal('updated_at') ? str_replace(' ', 'T', $this->getRawOriginal('updated_at')) . 'Z' : null,
        ];
    }

    private function resolveMessage(): string
    {
        $msg = $this->message ?? '';

        // إذا كان النص عربياً مباشرة — أعده كما هو
        if (preg_match('/[\x{0600}-\x{06FF}]/u', $msg)) {
            return $msg;
        }

        // إذا كان JSON — حاول استخراج message منه
        if ($msg !== '') {
            $decoded = json_decode($msg, true);
            if (is_array($decoded)) {
                return $decoded['message'] ?? $decoded['body'] ?? $msg;
            }
        }

        // fallback على data['message'] إن وجد
        if (is_array($this->data) && isset($this->data['message'])) {
            return $this->data['message'];
        }

        return $msg ?: '—';
    }
}