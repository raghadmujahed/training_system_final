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

    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $chats = $this->chatService->getUserChats($user);
        return response()->json(['success' => true, 'data' => $chats]);
    }

    public function createOrGet(Request $request): JsonResponse
    {
        $request->validate(['user_id' => 'required|integer|exists:users,id']);
        $userA = $request->user();
        $userB = User::findOrFail($request->user_id);
        try {
            $chat = $this->chatService->createOrGetDirectChat($userA, $userB);
        } catch (\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 403);
        }
        $data = $this->chatService->getUserChats($userA)->firstWhere('id', $chat->id);
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $user  = $request->user();
        $count = Chat::whereHas('participants', fn($q) => $q->where('user_id', $user->id))
            ->get()
            ->filter(fn($chat) => $chat->unreadCountFor($user->id) > 0)
            ->count();
        return response()->json(['success' => true, 'unread_count' => $count]);
    }

    public function allowedUsers(Request $request): JsonResponse
    {
        $user    = $request->user();
        $allowed = $this->permissions->getAllowedChatUsers($user);
        $result  = $allowed->map(fn(User $u) => [
            'id'            => $u->id,
            'name'          => $u->name,
            'role'          => $u->role?->name,
            'department_id' => $u->department_id,
        ])->values();
        return response()->json(['success' => true, 'data' => $result]);
    }
}
