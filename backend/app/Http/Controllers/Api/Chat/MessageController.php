<?php

namespace App\Http\Controllers\Api\Chat;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Services\Chat\ChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function __construct(private ChatService $chatService) {}

    /**
     * GET /api/chats/{id}/messages
     */
    public function index(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $chat = Chat::findOrFail($id);

        if (! $chat->participants()->where('user_id', $user->id)->exists()) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $this->chatService->markAsRead($chat, $user);

        $messages = $chat->messages()
            ->with('sender:id,name,role_id,avatar_path')
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(fn($m) => [
                'id'         => $m->id,
                'message'    => $m->message,
                'type'       => $m->type,
                'is_read'    => $m->is_read,
                'created_at' => $m->getRawOriginal('created_at') ? str_replace(' ', 'T', $m->getRawOriginal('created_at')) . 'Z' : null,
                'sender'     => [
                    'id'         => $m->sender?->id,
                    'name'       => $m->sender?->name,
                    'avatar_url' => $m->sender?->publicAvatarUrl(),
                ],
                'is_mine' => $m->sender_id === $user->id,
            ]);

        return response()->json(['success' => true, 'data' => $messages]);
    }

    /**
     * POST /api/messages
     * Body: { chat_id: int, message: string, type?: string }
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'chat_id' => 'required|integer|exists:chats,id',
            'message' => 'required|string|max:5000',
            'type'    => 'sometimes|in:text,image',
        ]);

        $user = $request->user();
        $chat = Chat::findOrFail($request->chat_id);

        try {
            $msg = $this->chatService->sendMessage(
                $chat,
                $user,
                $request->message,
                $request->type ?? 'text',
            );
        } catch (\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 403);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'id'         => $msg->id,
                'message'    => $msg->message,
                'type'       => $msg->type,
                'is_read'    => $msg->is_read,
                'created_at' => $msg->getRawOriginal('created_at') ? str_replace(' ', 'T', $msg->getRawOriginal('created_at')) . 'Z' : null,
                'sender'     => [
                    'id'         => $msg->sender?->id,
                    'name'       => $msg->sender?->name,
                    'avatar_url' => $msg->sender?->publicAvatarUrl(),
                ],
                'is_mine' => true,
            ],
        ], 201);
    }
}
