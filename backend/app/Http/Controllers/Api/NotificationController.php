<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = Notification::query()
            ->forRecipient($request->user())
            ->latest()
            ->paginate($request->per_page ?? 15);
        return NotificationResource::collection($notifications);
    }

    public function unreadCount(Request $request)
    {
        $count = Notification::query()
            ->forRecipient($request->user())
            ->whereNull('read_at')
            ->count();
        return response()->json(['unread_count' => $count]);
    }

    public function markAsRead(Notification $notification)
    {
        $this->authorize('update', $notification);
        $notification->update(['read_at' => now()]);
        return new NotificationResource($notification);
    }

    public function markAllAsRead(Request $request)
    {
        Notification::query()
            ->forRecipient($request->user())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
        return response()->json(['message' => 'تم تحديث جميع الإشعارات كمقروءة']);
    }

    public function destroy(Notification $notification)
    {
        $this->authorize('delete', $notification);
        $notification->delete();
        return response()->json(['message' => 'تم حذف الإشعار']);
    }
}