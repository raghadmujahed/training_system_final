<?php

namespace App\Services\Chat;

use App\Models\Chat;
use App\Models\ChatMessage;
use App\Models\ChatParticipant;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ChatService
{
    public function __construct(private ChatPermissionService $permissions) {}

    /**
     * Returns an existing direct chat between two users, or creates one.
     * Throws \RuntimeException when messaging is not permitted.
     */
    public function createOrGetDirectChat(User $userA, User $userB): Chat
    {
        if (! $this->permissions->canMessage($userA, $userB)) {
            throw new \RuntimeException('غير مسموح لك بمراسلة هذا المستخدم.', 403);
        }

        // Look for an existing direct chat that contains exactly these two users
        $existing = Chat::where('type', 'direct')
            ->whereHas('participants', fn($q) => $q->where('user_id', $userA->id))
            ->whereHas('participants', fn($q) => $q->where('user_id', $userB->id))
            ->first();

        if ($existing) {
            return $existing;
        }

        return DB::transaction(function () use ($userA, $userB) {
            $chat = Chat::create(['type' => 'direct']);
            ChatParticipant::create(['chat_id' => $chat->id, 'user_id' => $userA->id]);
            ChatParticipant::create(['chat_id' => $chat->id, 'user_id' => $userB->id]);
            return $chat;
        });
    }

    /**
     * Send a message and mark as read for sender.
     */
    public function sendMessage(Chat $chat, User $sender, string $message, string $type = 'text'): ChatMessage
    {
        if (! $chat->participants()->where('user_id', $sender->id)->exists()) {
            throw new \RuntimeException('لست مشاركاً في هذه المحادثة.', 403);
        }

        $msg = ChatMessage::create([
            'chat_id'   => $chat->id,
            'sender_id' => $sender->id,
            'message'   => $message,
            'type'      => $type,
            'is_read'   => false,
        ]);

        // Mark sender's last read
        $chat->participants()
            ->where('user_id', $sender->id)
            ->update(['last_read_at' => now()]);

        return $msg->load('sender');
    }

    /**
     * Mark all unread messages in a chat as read for the given user.
     */
    public function markAsRead(Chat $chat, User $user): void
    {
        // Update last_read_at on participant record
        $chat->participants()
            ->where('user_id', $user->id)
            ->update(['last_read_at' => now()]);

        // Mark messages sent by others as is_read = true
        ChatMessage::where('chat_id', $chat->id)
            ->where('sender_id', '!=', $user->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);
    }

    /**
     * Load chats for a user with last message + unread count.
     */
    public function getUserChats(User $user): \Illuminate\Support\Collection
    {
        return Chat::whereHas('participants', fn($q) => $q->where('user_id', $user->id))
            ->with([
                'participants.user:id,name,role_id',
                'participants.user.role:id,name',
                'latestMessage.sender:id,name',
            ])
            ->get()
            ->map(function (Chat $chat) use ($user) {
                $otherParticipants = $chat->participants
                    ->where('user_id', '!=', $user->id)
                    ->values();

                return [
                    'id'           => $chat->id,
                    'type'         => $chat->type,
                    'participants' => $otherParticipants->map(fn($p) => [
                        'id'   => $p->user?->id,
                        'name' => $p->user?->name,
                        'role' => $p->user?->role?->name,
                    ])->values(),
                    'last_message'  => $chat->latestMessage ? [
                        'id'         => $chat->latestMessage->id,
                        'message'    => $chat->latestMessage->message,
                        'sender_id'  => $chat->latestMessage->sender_id,
                        'sender'     => $chat->latestMessage->sender?->name,
                        'created_at' => $chat->latestMessage->getRawOriginal('created_at') ? str_replace(' ', 'T', $chat->latestMessage->getRawOriginal('created_at')) . 'Z' : null,
                    ] : null,
                    'unread_count' => $chat->unreadCountFor($user->id),
                    'created_at'   => $chat->created_at,
                ];
            })
            ->sortByDesc(fn($c) => $c['last_message']['created_at'] ?? $c['created_at'])
            ->values();
    }
}
