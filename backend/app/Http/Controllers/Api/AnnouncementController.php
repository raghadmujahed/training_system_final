<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAnnouncementRequest;
use App\Http\Requests\UpdateAnnouncementRequest;
use App\Http\Resources\AnnouncementResource;
use App\Models\Announcement;
use App\Models\AnnouncementTarget;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Section;
use App\Models\SectionStudent;
use App\Models\User;
use Illuminate\Support\Collection;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

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

        $studentSectionIds = $this->sectionIdsForStudentUser((int) $user->id);

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
                $allowedIds = $this->queryCoordinatorAccessibleSections($user)->pluck('id')->all();
                $invalid = array_diff($sectionIds, $allowedIds);
                if (!empty($invalid)) {
                    return response()->json([
                        'message' => 'لا تملك صلاحية إرسال إعلان لهذه الشعبة',
                        'errors' => ['section_ids' => ['لا تملك صلاحية إرسال إعلان لبعض الشعب المختارة']],
                    ], 422);
                }
            }

            if ($targetType === 'student') {
                $studentId = (int) $request->input('student_id');
                $allowedSectionIds = $this->queryCoordinatorAccessibleSections($user)->pluck('id');
                $allowedStudentIds = $this->studentUserIdsInSections($allowedSectionIds);
                if (! $allowedStudentIds->contains($studentId)) {
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
            try {
                $this->dispatchNotifications($announcement->fresh(['targets', 'user']));
            } catch (\Throwable $e) {
                Log::error('announcement notifications failed on create', [
                    'announcement_id' => $announcement->id,
                    'message' => $e->getMessage(),
                ]);
            }
        }

        $statusMessage = $status === 'active'
            ? 'تم نشر الإعلان وإرسال الإشعارات للفئة المستهدفة'
            : 'تم حفظ الإعلان كمسودة (لن يصل للطلاب حتى التفعيل)';

        return (new AnnouncementResource($announcement->load(['targets.section', 'targetStudent'])))
            ->additional(['message' => $statusMessage]);
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
            if ($announcement->published_at === null) {
                $announcement->published_at = now();
                $announcement->save();
            }
            try {
                $this->dispatchNotifications($announcement->fresh(['targets', 'user']));
            } catch (\Throwable $e) {
                Log::error('announcement notifications failed on update', [
                    'announcement_id' => $announcement->id,
                    'message' => $e->getMessage(),
                ]);
            }
        }

        $extraMessage = $announcement->wasChanged('status') && $announcement->status === 'active'
            ? ['message' => 'تم تفعيل الإعلان وإرسال الإشعارات']
            : [];

        return (new AnnouncementResource($announcement->load('targets')))->additional($extraMessage);
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

        if (! in_array($roleName, ['admin', 'coordinator', 'training_coordinator'], true)) {
            return response()->json(['message' => 'غير مصرح'], 403);
        }

        if (! $user->department_id && $roleName !== 'admin') {
            return response()->json([
                'data' => [],
                'message' => 'حسابك غير مربوط بقسم أكاديمي. تواصل مع مدير النظام لربط القسم بحسابك.',
            ]);
        }

        try {
            $sections = $this->queryCoordinatorAccessibleSections($user)
                ->get()
                ->map(fn ($s) => [
                    'id' => $s->id,
                    'name' => $s->name,
                    'course_name' => $s->course?->name,
                    'academic_year' => $s->academic_year,
                    'semester' => $s->semester,
                    'students_count' => $this->studentUserIdsInSections([$s->id])->count(),
                ]);
        } catch (\Throwable $e) {
            Log::error('coordinatorSections failed', [
                'user_id' => $user->id,
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'تعذر تحميل الشعب. يرجى المحاولة لاحقاً.',
                'data' => [],
            ], 500);
        }

        return response()->json(['data' => $sections->values()]);
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

        if (! $user->department_id && $roleName !== 'admin') {
            return response()->json([
                'data' => [],
                'message' => 'حسابك غير مربوط بقسم أكاديمي.',
            ]);
        }

        $search = trim((string) $request->input('search', ''));
        $accessibleSectionIds = $this->queryCoordinatorAccessibleSections($user)->pluck('id');
        $studentIds = $this->studentUserIdsInSections($accessibleSectionIds);

        if ($studentIds->isEmpty()) {
            return response()->json([
                'data' => [],
                'message' => 'لا يوجد طلاب مسجلون في شعب قسمك حالياً (تحقق من التوزيع على الشعب).',
            ]);
        }

        $query = User::query()
            ->whereIn('id', $studentIds)
            ->where('status', 'active')
            ->whereHas('role', fn ($q) => $q->where('name', 'student'))
            ->select('id', 'name', 'email', 'university_id')
            ->orderBy('name');

        if ($search !== '') {
            $term = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $search) . '%';
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                    ->orWhere('email', 'like', $term)
                    ->orWhere('university_id', 'like', $term);
            });
        }

        $students = $query->limit(50)->get()->map(fn ($u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'university_id' => $u->university_id,
        ]);

        return response()->json(['data' => $students]);
    }

    /**
     * شعب المنسق: قسمه الأكاديمي عبر sections.department_id أو مساقات القسم.
     */
    protected function queryCoordinatorAccessibleSections(User $user)
    {
        $query = Section::query()
            ->select('sections.id', 'sections.name', 'sections.academic_year', 'sections.semester', 'sections.course_id', 'sections.department_id')
            ->with('course:id,name,department_id')
            ->orderBy('sections.name');

        if ($user->role?->name === 'admin' && ! $user->department_id) {
            return $query;
        }

        $deptId = (int) $user->department_id;
        if ($deptId <= 0) {
            return $query->whereRaw('1 = 0');
        }

        $courseIdsInDept = Course::query()->where('department_id', $deptId)->pluck('id');

        return $query->where(function ($q) use ($deptId, $courseIdsInDept) {
            $q->where('sections.department_id', $deptId);
            if ($courseIdsInDept->isNotEmpty()) {
                $q->orWhereIn('sections.course_id', $courseIdsInDept);
            }
        });
    }

    protected function dispatchNotifications(Announcement $announcement): void
    {
        $notificationService = app(NotificationService::class);
        $announcement->loadMissing('user');
        $creator = $announcement->user;

        $title = $announcement->title;
        $message = 'إعلان جديد: ' . $title;
        $data = [
            'announcement_id' => $announcement->id,
            'type' => 'announcement',
            'title' => $title,
            'content' => $announcement->content,
        ];

        $targetType = $announcement->target_type ?? 'all_students';

        // إعلان لكل الطلاب (ضمن قسم المنسق إن وُجد)
        if ($announcement->all_students || $targetType === 'all_students') {
            $studentsQuery = User::query()
                ->where('status', 'active')
                ->whereHas('role', fn ($q) => $q->where('name', 'student'));

            if ($creator && in_array($creator->role?->name, ['coordinator', 'training_coordinator'], true) && $creator->department_id) {
                $studentsQuery->where('department_id', $creator->department_id);
            }

            foreach ($studentsQuery->get() as $student) {
                $notificationService->sendToUser($student, 'announcement', $message, $data, Announcement::class, $announcement->id);
            }
        }

        // إعلان لطالب معين
        if ($targetType === 'student' && $announcement->target_student_id) {
            $student = User::find($announcement->target_student_id);
            if ($student) {
                $notificationService->sendToUser($student, 'announcement', $message, $data, Announcement::class, $announcement->id);
            }
        }

        // إعلان لشعب معينة — إشعار لطلاب هذه الشعب
        if ($targetType === 'sections') {
            $sectionIds = $announcement->targets()->whereNotNull('section_id')->pluck('section_id');
            $studentIds = $this->studentUserIdsInSections($sectionIds);
            if ($studentIds->isNotEmpty()) {
                $students = User::whereIn('id', $studentIds)->where('status', 'active')->get();
                foreach ($students as $student) {
                    $notificationService->sendToUser($student, 'announcement', $message, $data, Announcement::class, $announcement->id);
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

    /**
     * طلاب الشعب: من section_students (مقبول) ومن enrollments (نشط) — كما في التوزيع الفعلي.
     */
    protected function studentUserIdsInSections(Collection|array $sectionIds): Collection
    {
        $ids = collect($sectionIds)->filter()->map(fn ($id) => (int) $id)->unique()->values();
        if ($ids->isEmpty()) {
            return collect();
        }

        $fromPivot = SectionStudent::query()
            ->whereIn('section_id', $ids)
            ->where('status', 'accepted')
            ->pluck('student_id');

        $fromEnrollments = Enrollment::query()
            ->whereIn('section_id', $ids)
            ->where('status', 'active')
            ->pluck('user_id');

        return $fromPivot->merge($fromEnrollments)->map(fn ($id) => (int) $id)->unique()->values();
    }

    protected function sectionIdsForStudentUser(int $studentUserId): Collection
    {
        $fromPivot = SectionStudent::query()
            ->where('student_id', $studentUserId)
            ->where('status', 'accepted')
            ->pluck('section_id');

        $fromEnrollments = Enrollment::query()
            ->where('user_id', $studentUserId)
            ->where('status', 'active')
            ->pluck('section_id');

        return $fromPivot->merge($fromEnrollments)->map(fn ($id) => (int) $id)->unique()->values();
    }
}
