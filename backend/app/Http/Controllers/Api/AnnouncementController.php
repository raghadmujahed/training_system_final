<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAnnouncementRequest;
use App\Http\Requests\UpdateAnnouncementRequest;
use App\Http\Resources\AnnouncementResource;
use App\Models\Announcement;
use App\Models\AnnouncementTarget;
use App\Models\Section;
use App\Models\SectionStudent;
use App\Models\User;
use App\Services\NotificationService;
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

        $query = Announcement::with([
            'user', 'targets.role', 'targets.user', 'targets.department', 'targets.section', 'targetStudent',
        ]);

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

        $isAnnouncementConsumer = !in_array($roleName, ['coordinator', 'training_coordinator'], true)
            && $roleName !== 'admin';

        if ($isAnnouncementConsumer) {
            $now = now();
            $query->where('status', 'active')
                ->where(function ($q) use ($now) {
                    $q->whereNull('published_at')->orWhere('published_at', '<=', $now);
                })
                ->where(function ($q) use ($now) {
                    $q->whereNull('expires_at')->orWhere('expires_at', '>=', $now);
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

        // شعب الطالب المقبول فيها
        $studentSectionIds = SectionStudent::where('student_id', $user->id)
            ->where('status', 'accepted')
            ->pluck('section_id');

        $query = Announcement::query()
            ->with(['user'])
            ->where('status', 'active')
            ->where(function ($q) use ($now) {
                $q->whereNull('published_at')->orWhere('published_at', '<=', $now);
            })
            ->where(function ($q) use ($now) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>=', $now);
            })
            ->where(function ($q) use ($user, $studentSectionIds) {
                // 1) إعلانات لكل الطلاب
                $q->where(function ($q2) {
                    $q2->where('all_students', true)
                       ->orWhere('target_type', 'all_students');
                })
                // 2) إعلان موجه للطالب شخصياً
                ->orWhere('target_student_id', $user->id)
                // 3) إعلانات موجهة لشعب الطالب
                ->when($studentSectionIds->isNotEmpty(), function ($q2) use ($studentSectionIds) {
                    $q2->orWhere(function ($q3) use ($studentSectionIds) {
                        $q3->where('target_type', 'sections')
                           ->whereHas('targets', function ($tq) use ($studentSectionIds) {
                               $tq->whereIn('section_id', $studentSectionIds);
                           });
                    });
                })
                // 4) targets قديمة (user/role/department)
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
        $user = $request->user();
        $roleName = $user->role?->name;
        $targetType = $request->input('target_type', 'all_students');
        $isCoordinator = in_array($roleName, ['coordinator', 'training_coordinator'], true);

        // تحقق الصلاحيات للمنسق
        if ($isCoordinator) {
            if ($targetType === 'sections') {
                $sectionIds = $request->input('section_ids', []);
                $allowedIds = Section::whereNull('archived_at')->pluck('id')->toArray();
                $invalid = array_diff($sectionIds, $allowedIds);
                if (!empty($invalid)) {
                    return response()->json([
                        'message' => 'لا تملك صلاحية إرسال إعلان لهذه الشعبة',
                        'errors' => ['section_ids' => ['لا تملك صلاحية إرسال إعلان لبعض الشعب المختارة']],
                    ], 422);
                }
            }

            if ($targetType === 'student') {
                $studentId = $request->input('student_id');
                $exists = SectionStudent::where('student_id', $studentId)
                    ->where('status', 'accepted')
                    ->exists();
                if (!$exists) {
                    return response()->json([
                        'message' => 'لا تملك صلاحية إرسال إعلان لهذا الطالب',
                        'errors' => ['student_id' => ['لا تملك صلاحية إرسال إعلان لهذا الطالب']],
                    ], 422);
                }
            }
        }

        $status = $request->input('status', 'draft');
        $publishedAt = $request->input('published_at');
        if ($status === 'active' && $publishedAt === null) {
            $publishedAt = now();
        }

        $announcement = Announcement::create([
            'title' => $request->title,
            'content' => $request->content,
            'user_id' => $user->id,
            'status' => $status,
            'published_at' => $publishedAt,
            'expires_at' => $request->input('expires_at'),
            'all_students' => $targetType === 'all_students',
            'target_type' => $targetType,
            'target_student_id' => $targetType === 'student' ? $request->input('student_id') : null,
        ]);

        // حفظ targets حسب النوع
        if ($targetType === 'sections') {
            foreach ($request->input('section_ids', []) as $sectionId) {
                AnnouncementTarget::create([
                    'announcement_id' => $announcement->id,
                    'section_id' => $sectionId,
                ]);
            }
        } elseif ($targetType === 'student') {
            AnnouncementTarget::create([
                'announcement_id' => $announcement->id,
                'user_id' => $request->input('student_id'),
            ]);
        }

        // targets قديمة (roles, users, departments) — للأدمن
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

        if ($status === 'active') {
            $this->dispatchNotifications($announcement);
        }

        return (new AnnouncementResource($announcement->load(['targets.section', 'targetStudent'])))
            ->additional(['message' => 'تم إنشاء الإعلان بنجاح']);
    }

    public function show(Announcement $announcement)
    {
        return new AnnouncementResource($announcement->load([
            'user', 'targets.role', 'targets.user', 'targets.department', 'targets.section', 'targetStudent',
        ]));
    }

    public function update(UpdateAnnouncementRequest $request, Announcement $announcement)
    {
        // Check field-level changes
        $announcement->fill($request->only([
            'title', 'content', 'status', 'published_at', 'expires_at', 'all_students',
        ]));
        $fieldsChanged = $announcement->isDirty();

        // Check targets change
        $targetsChanged = false;
        if ($request->has('target_roles') || $request->has('target_users') || $request->has('target_departments')) {
            $currentTargets = $announcement->targets()
                ->selectRaw('COALESCE(role_id,0) as role_id, COALESCE(user_id,0) as user_id, COALESCE(department_id,0) as department_id')
                ->get()
                ->map(fn($t) => "{$t->role_id}_{$t->user_id}_{$t->department_id}")
                ->sort()->values()->toArray();

            $newTargets = collect()
                ->merge(collect($request->target_roles ?? [])->map(fn($id) => "{$id}_0_0"))
                ->merge(collect($request->target_users ?? [])->map(fn($id) => "0_{$id}_0"))
                ->merge(collect($request->target_departments ?? [])->map(fn($id) => "0_0_{$id}"))
                ->sort()->values()->toArray();

            $targetsChanged = $currentTargets !== $newTargets;
        }

        if (!$fieldsChanged && !$targetsChanged) {
            return response()->json(['status' => 'no_changes', 'message' => 'لم تقم بتغيير أي بيانات']);
        }

        if ($fieldsChanged) {
            $announcement->save();
        }

        if ($targetsChanged && ($request->has('target_roles') || $request->has('target_users') || $request->has('target_departments'))) {
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

        if ($announcement->wasChanged('status') && $announcement->status === 'active') {
            $this->dispatchNotifications($announcement);
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

    /**
     * جلب الشعب المتاحة للمنسق (لاستخدامها في اختيار الفئة المستهدفة)
     */
    public function coordinatorSections(Request $request)
    {
        $user = $request->user();
        $roleName = $user->role?->name;

        if (!in_array($roleName, ['admin', 'coordinator', 'training_coordinator'], true)) {
            return response()->json(['message' => 'غير مصرح'], 403);
        }

        $sections = Section::whereNull('archived_at')
            ->select('id', 'name', 'academic_year', 'semester', 'course_id')
            ->with('course:id,name')
            ->withCount(['students as active_students_count' => function ($q) {
                $q->wherePivot('status', 'accepted');
            }])
            ->orderBy('name')
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'course_name' => $s->course?->name,
                'academic_year' => $s->academic_year,
                'semester' => $s->semester,
                'students_count' => $s->active_students_count,
            ]);

        return response()->json(['data' => $sections]);
    }

    /**
     * جلب الطلاب المتاحين للمنسق (طلاب مقبولين في شعب غير مؤرشفة)
     */
    public function coordinatorStudents(Request $request)
    {
        $user = $request->user();
        $roleName = $user->role?->name;

        if (!in_array($roleName, ['admin', 'coordinator', 'training_coordinator'], true)) {
            return response()->json(['message' => 'غير مصرح'], 403);
        }

        $search = $request->input('search', '');

        $query = User::whereHas('sectionStudents', function ($q) {
            $q->where('status', 'accepted')
              ->whereHas('section', fn ($sq) => $sq->whereNull('archived_at'));
        })
        ->select('id', 'name', 'email')
        ->orderBy('name');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $students = $query->limit(50)->get()->map(fn ($u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
        ]);

        return response()->json(['data' => $students]);
    }

    protected function dispatchNotifications(Announcement $announcement): void
    {
        $notificationService = app(NotificationService::class);
        $title = $announcement->title;
        $message = 'إعلان جديد: ' . $title;
        $data = [
            'announcement_id' => $announcement->id,
            'type' => 'announcement',
            'title' => $title,
        ];

        $targetType = $announcement->target_type ?? 'all_students';

        // إعلان لكل الطلاب
        if ($announcement->all_students || $targetType === 'all_students') {
            $notificationService->sendToRole('student', 'announcement', $message, $data);
        }

        // إعلان لطالب معين
        if ($targetType === 'student' && $announcement->target_student_id) {
            $student = User::find($announcement->target_student_id);
            if ($student) {
                $notificationService->sendToUser($student, 'announcement', $message, $data);
            }
        }

        // إعلان لشعب معينة — إشعار لطلاب هذه الشعب
        if ($targetType === 'sections') {
            $sectionIds = $announcement->targets()->whereNotNull('section_id')->pluck('section_id');
            if ($sectionIds->isNotEmpty()) {
                $studentIds = SectionStudent::whereIn('section_id', $sectionIds)
                    ->where('status', 'accepted')
                    ->pluck('student_id')
                    ->unique();
                $students = User::whereIn('id', $studentIds)->get();
                foreach ($students as $student) {
                    $notificationService->sendToUser($student, 'announcement', $message, $data);
                }
            }
        }

        // targets قديمة (role, user, department)
        foreach ($announcement->targets as $target) {
            if ($target->user_id && $targetType !== 'student') {
                $user = User::find($target->user_id);
                if ($user) {
                    $notificationService->sendToUser($user, 'announcement', $message, $data);
                }
            }
            if ($target->role_id) {
                $role = $target->role?->name;
                if ($role && $role !== 'student') {
                    $notificationService->sendToRole($role, 'announcement', $message, $data);
                }
            }
            if ($target->department_id) {
                $users = User::where('department_id', $target->department_id)->get();
                foreach ($users as $user) {
                    $notificationService->sendToUser($user, 'announcement', $message, $data);
                }
            }
        }
    }
}
