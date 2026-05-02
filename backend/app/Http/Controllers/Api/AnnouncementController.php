<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAnnouncementRequest;
use App\Http\Requests\UpdateAnnouncementRequest;
use App\Http\Resources\AnnouncementResource;
use App\Models\Announcement;
use App\Models\AnnouncementTarget;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    public function __construct()
    {
        //$this->authorizeResource(Announcement::class, 'announcement');
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $roleName = $user->role?->name;

        if ($roleName === 'student') {
            return $this->indexForStudent($request);
        }

        $query = Announcement::with(['user', 'targets.role', 'targets.user', 'targets.department']);

        if (in_array($roleName, ['coordinator', 'training_coordinator'], true)) {
            $query->where('user_id', $user->id);
        } elseif ($roleName !== 'admin') {
            $userId = $user->id;
            $roleId = $user->role_id;
            $deptId = $user->department_id;

            $query->where(function ($q) use ($userId, $roleId, $deptId) {
                $q->whereHas('targets', function ($tq) use ($userId, $roleId, $deptId) {
                    $tq->where(function ($sq) use ($userId, $roleId, $deptId) {
                        $sq->where('user_id', $userId)
                            ->orWhere('role_id', $roleId)
                            ->orWhere('department_id', $deptId);
                    });
                })->orWhereDoesntHave('targets')
                    ->orWhere(function ($q2) {
                        $q2->where('all_students', true)->where('status', 'active');
                    });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $announcements = $query->latest()->paginate($request->per_page ?? 15);

        return AnnouncementResource::collection($announcements);
    }

    protected function indexForStudent(Request $request)
    {
        $user = $request->user();
        $now = now();

        $query = Announcement::query()
            ->with(['user'])
            ->where('status', 'active')
            ->where(function ($q) use ($now) {
                $q->whereNull('published_at')->orWhere('published_at', '<=', $now);
            })
            ->where(function ($q) use ($now) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>=', $now);
            })
            ->where(function ($q) use ($user) {
                $q->where('all_students', true)
                    ->orWhereHas('targets', function ($tq) use ($user) {
                        $tq->where(function ($sq) use ($user) {
                            $sq->where('user_id', $user->id)
                                ->orWhere('role_id', $user->role_id)
                                ->orWhere('department_id', $user->department_id);
                        });
                    });
            })
            ->orderByDesc('published_at')
            ->orderByDesc('created_at');

        $announcements = $query->paginate($request->per_page ?? 15);

        return AnnouncementResource::collection($announcements);
    }

    public function store(StoreAnnouncementRequest $request)
    {
        $status = $request->input('status', 'draft');
        $publishedAt = $request->input('published_at');
        if ($status === 'active' && $publishedAt === null) {
            $publishedAt = now();
        }

        $announcement = Announcement::create([
            'title' => $request->title,
            'content' => $request->content,
            'user_id' => $request->user()->id,
            'status' => $status,
            'published_at' => $publishedAt,
            'expires_at' => $request->input('expires_at'),
            'all_students' => $request->boolean('all_students'),
        ]);

        if ($request->has('target_roles')) {
            foreach ($request->target_roles as $roleId) {
                AnnouncementTarget::create(['announcement_id' => $announcement->id, 'role_id' => $roleId]);
            }
        }
        if ($request->has('target_users')) {
            foreach ($request->target_users as $userId) {
                AnnouncementTarget::create(['announcement_id' => $announcement->id, 'user_id' => $userId]);
            }
        }
        if ($request->has('target_departments')) {
            foreach ($request->target_departments as $deptId) {
                AnnouncementTarget::create(['announcement_id' => $announcement->id, 'department_id' => $deptId]);
            }
        }

        return new AnnouncementResource($announcement->load('targets'));
    }

    public function show(Announcement $announcement)
    {
        return new AnnouncementResource($announcement->load(['user', 'targets']));
    }

    public function update(UpdateAnnouncementRequest $request, Announcement $announcement)
    {
        $announcement->update($request->only([
            'title', 'content', 'status', 'published_at', 'expires_at', 'all_students',
        ]));

        if ($request->has('target_roles') || $request->has('target_users') || $request->has('target_departments')) {
            $announcement->targets()->delete();

            if ($request->has('target_roles')) {
                foreach ($request->target_roles as $roleId) {
                    AnnouncementTarget::create(['announcement_id' => $announcement->id, 'role_id' => $roleId]);
                }
            }
            if ($request->has('target_users')) {
                foreach ($request->target_users as $userId) {
                    AnnouncementTarget::create(['announcement_id' => $announcement->id, 'user_id' => $userId]);
                }
            }
            if ($request->has('target_departments')) {
                foreach ($request->target_departments as $deptId) {
                    AnnouncementTarget::create(['announcement_id' => $announcement->id, 'department_id' => $deptId]);
                }
            }
        }

        return new AnnouncementResource($announcement->load('targets'));
    }

    public function destroy(Request $request, Announcement $announcement)
    {
        if ($request->user()->role?->name !== 'admin'
            && (int) $announcement->user_id !== (int) $request->user()->id) {
            abort(403, 'غير مصرح بحذف هذا الإعلان.');
        }

        $announcement->delete();

        return response()->json(['message' => 'تم حذف الإعلان']);
    }
}
