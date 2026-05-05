<?php

namespace App\Http\Controllers\Api\Chat;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\User;
use App\Services\Chat\ChatPermissionService;
use App\Services\Chat\ChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function __construct(
        private ChatService           $chatService,
        private ChatPermissionService $permissions,
    ) {}

    /**
     * GET /api/chats
     * List all chats for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $chats = $this->chatService->getUserChats($user);

        return response()->json(['success' => true, 'data' => $chats]);
    }

    /**
     * POST /api/chats/create-or-get
     * Body: { user_id: int }
     */
    public function createOrGet(Request $request): JsonResponse
    {
        $request->validate(['user_id' => 'required|integer|exists:users,id']);

        $userA  = $request->user();
        $userB  = User::findOrFail($request->user_id);

        try {
            $chat = $this->chatService->createOrGetDirectChat($userA, $userB);
        } catch (\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 403);
        }

        $chat->load([
            'participants.user:id,name,role_id',
            'participants.user.role:id,name',
            'latestMessage.sender:id,name',
        ]);

        return response()->json(['success' => true, 'data' => $chat]);
    }

    /**
     * GET /api/chat/unread-count
     * Returns total number of chats with at least one unread message.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $user = $request->user();

        $count = \App\Models\Chat::whereHas('participants', fn($q) => $q->where('user_id', $user->id))
            ->get()
            ->filter(fn($chat) => $chat->unreadCountFor($user->id) > 0)
            ->count();

        return response()->json(['success' => true, 'unread_count' => $count]);
    }

    /**
     * GET /api/chat/allowed-users
     * Returns users the authenticated user can chat with.
     */
    public function allowedUsers(Request $request): JsonResponse
    {
        $user    = $request->user();
        $allowed = $this->permissions->getAllowedChatUsers($user);

        $result = $allowed->map(fn(User $u) => [
            'id'            => $u->id,
            'name'          => $u->name,
            'role'          => $u->role?->name,
            'department_id' => $u->department_id,
        ])->values();

        return response()->json(['success' => true, 'data' => $result]);
    }
}
