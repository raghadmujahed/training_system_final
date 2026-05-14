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
        try {
            $user  = $request->user();
            $chats = $this->chatService->getUserChats($user);
            return response()->json(['success' => true, 'data' => $chats]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /chats/create-or-get
     * Find an existing chat with the user. Do NOT create one if none exists.
     * Returns the chat data or null if no conversation exists yet.
     */
    public function createOrGet(Request $request): JsonResponse
    {
        $request->validate(['user_id' => 'required|integer|exists:users,id']);
        $userA = $request->user();
        $userB = User::findOrFail($request->user_id);

        // Check permission first
        if (! $this->permissions->canMessage($userA, $userB)) {
            return response()->json(['success' => false, 'message' => 'غير مسموح لك بمراسلة هذا المستخدم.'], 403);
        }

        $chat = $this->chatService->findDirectChat($userA, $userB);

        if (! $chat) {
            // No existing conversation — return draft info so frontend can open draft mode
            return response()->json([
                'success'  => true,
                'data'     => null,
                'draft'    => true,
                'receiver' => [
                    'id' => $userB->id,
                    'name' => $userB->name,
                    'role' => $userB->role?->name,
                    'avatar_url' => $userB->publicAvatarUrl(),
                ],
            ]);
        }

        // Load full chat data the same way getUserChats does
        $data = $this->chatService->getUserChats($userA)->firstWhere('id', $chat->id);
        // If the chat exists but has no messages yet (shouldn't happen now but handle gracefully)
        if (! $data) {
            return response()->json([
                'success'  => true,
                'data'     => null,
                'draft'    => true,
                'receiver' => [
                    'id' => $userB->id,
                    'name' => $userB->name,
                    'role' => $userB->role?->name,
                    'avatar_url' => $userB->publicAvatarUrl(),
                ],
            ]);
        }

        return response()->json(['success' => true, 'data' => $data, 'draft' => false]);
    }

    /**
     * POST /chats/start-with-message
     * Atomically find-or-create a chat AND send the first message.
     * Body: { user_id, message, type? }
     */
    public function startWithMessage(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'message' => 'required|string|max:5000',
            'type'    => 'sometimes|in:text,image',
        ]);

        $userA = $request->user();
        $userB = User::findOrFail($request->user_id);

        try {
            [$chat, $msg] = $this->chatService->startWithMessage(
                $userA,
                $userB,
                $request->message,
                $request->type ?? 'text',
            );
        } catch (\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 403);
        }

        // Return chat with last message in the same shape as getUserChats
        $data = $this->chatService->getUserChats($userA)->firstWhere('id', $chat->id);

        return response()->json([
            'success' => true,
            'data'    => $data,
            'message' => [
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
                'is_mine'    => true,
            ],
        ], 201);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        try {
            $user  = $request->user();
            $count = Chat::whereHas('participants', fn($q) => $q->where('user_id', $user->id))
                ->get()
                ->filter(fn($chat) => $chat->unreadCountFor($user->id) > 0)
                ->count();
            return response()->json(['success' => true, 'unread_count' => $count]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function allowedUsers(Request $request): JsonResponse
    {
        try {
            $user   = $request->user();
            $search = $request->query('search');
            $allowed = $this->permissions->getAllowedChatUsers($user, $search ?: null);

            $roleLabels = [
                'student'                   => 'طالب',
                'academic_supervisor'       => 'مشرف أكاديمي',
                'field_supervisor'          => 'مشرف ميداني',
                'teacher'                   => 'معلم مرشد',
                'adviser'                   => 'مرشد تربوي',
                'psychologist'              => 'أخصائي نفسي',
                'training_coordinator'      => 'منسق تدريب',
                'head_of_department'        => 'رئيس قسم',
                'school_manager'            => 'مدير مدرسة',
                'principal'                 => 'مدير المدرسة',
                'psychology_center_manager' => 'مدير مركز نفسي',
                'education_directorate'     => 'مديرية التربية',
                'health_directorate'        => 'مديرية الصحة',
                'admin'                     => 'مدير النظام',
            ];

            $result = $allowed->map(fn(User $u) => [
                'id'            => $u->id,
                'name'          => $u->name,
                'role'          => $u->role?->name,
                'role_label'    => $roleLabels[$u->role?->name] ?? ($u->role?->name ?? ''),
                'department_id' => $u->department_id,
                'university_id' => $u->university_id,
                'avatar_url'    => $u->publicAvatarUrl(),
            ])->values();

            return response()->json(['success' => true, 'data' => $result]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
