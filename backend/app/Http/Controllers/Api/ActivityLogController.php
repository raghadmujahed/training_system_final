<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ActivityLogger;
use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(ActivityLog::class, 'activity_log');
    }

    public function index(Request $request)
    {
        $query = ActivityLog::with('user');

        // تصفية حسب نوع ومعرف الموضوع
        if ($request->filled('subject_type')) $query->where('subject_type', $request->subject_type);
        if ($request->filled('subject_id')) $query->where('subject_id', $request->subject_id);

        // للطالب: عرض سجلاته فقط
        if ($request->user()->role?->name === 'student') {
            $query->where('causer_id', $request->user()->id);
        }

        if ($request->filled('user_id')) $query->where('user_id', $request->user_id);
        if ($request->filled('action')) $query->where('action', $request->action);
        if ($request->filled('from_date')) $query->whereDate('created_at', '>=', $request->from_date);
        if ($request->filled('to_date')) $query->whereDate('created_at', '<=', $request->to_date);
        
        $logs = $query->latest()->paginate($request->per_page ?? 15);
        return ActivityLogResource::collection($logs);
    }

    public function show(ActivityLog $activityLog)
    {
        return new ActivityLogResource($activityLog->load(['user', 'details']));
    }

    public function destroy(ActivityLog $activityLog)
    {
        $activityLog->delete();
        return response()->json(['message' => 'تم حذف السجل']);
    }

    public function trackPageVisit(Request $request)
    {
        $validated = $request->validate([
            'path' => ['required', 'string', 'max:500'],
            'title' => ['nullable', 'string', 'max:255'],
        ]);

        ActivityLogger::log(
            'ui',
            'page_visit',
            'User visited page',
            null,
            [
                'new' => [
                    'path' => $validated['path'],
                    'title' => $validated['title'] ?? null,
                ],
            ],
            $request->user()
        );

        return response()->json(['message' => 'Page visit logged']);
    }
}