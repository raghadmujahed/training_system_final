<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Requests\ChangeUserStatusRequest;
use App\Http\Requests\LoginRequest;
use App\Enums\UserStatus;
use App\Helpers\ActivityLogger;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\TrainingTrackResolver;
use App\Services\UserService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    protected $userService;

    public function __construct(UserService $userService)
    {
        $this->userService = $userService;
        $this->authorizeResource(User::class, 'user');
    }

    public function index(Request $request)
    {
        $validated = $request->validate([
            'role_id' => 'nullable|exists:roles,id',
            'role' => 'nullable|string|exists:roles,name',
            'department_id' => 'nullable|exists:departments,id',
            'status' => [
                'nullable',
                Rule::in(array_map(static fn (UserStatus $status) => $status->value, UserStatus::cases())),
            ],
            'search' => 'nullable|string|max:255',
            'sort_by' => ['nullable', Rule::in(['id', 'university_id', 'name', 'email', 'role', 'status', 'created_at'])],
            'sort_direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => 'nullable|integer|min:1|max:200',
            'page' => 'nullable|integer|min:1',
        ]);

        $users = User::query()->select('users.*');

        // مدير المدرسة يُسمح له بجلب المعلمين من نفس المدرسة فقط لاستخدامهم في التعيين.
        if ($request->user()->role?->name === 'school_manager') {
            $users->whereHas('role', function ($q) {
                $q->where('name', 'teacher');
            });
            if ($request->user()->training_site_id) {
                $users->where('training_site_id', $request->user()->training_site_id);
            }
        }

        // منسق التدريب والأخصائي النفسي ورئيس القسم يُسمح لهم بجلب الطلبة فقط (قائمة مرجعية).
        if (in_array($request->user()->role?->name, ['training_coordinator', 'coordinator', 'psychologist', 'head_of_department'], true)) {
            $users->whereHas('role', function ($q) {
                $q->where('name', 'student');
            });
            $users->where('status', 'active');
        }

        if ($request->user()->role?->name === 'head_of_department' && $request->user()->department_id) {
            $users->where('users.department_id', $request->user()->department_id);
        }

        $users->when($validated['role_id'] ?? null, function ($q, $roleId) {
            $q->where('users.role_id', $roleId);
        });

        $users->when($validated['role'] ?? null, function ($q, $roleName) {
            $q->whereHas('role', fn ($rq) => $rq->where('name', $roleName));
        });

        $users->when($validated['department_id'] ?? null, function ($q, $departmentId) {
            $q->where('users.department_id', $departmentId);
        });

        $users->when($validated['status'] ?? null, function ($q, $status) {
            $q->where('users.status', $status);
        });

        $users->when($validated['search'] ?? null, function ($q, $search) {
            $term = trim($search);
            $q->where(function ($qq) use ($term) {
                $qq->where('users.name', 'like', "%{$term}%")
                    ->orWhere('users.email', 'like', "%{$term}%")
                    ->orWhere('users.university_id', 'like', "%{$term}%");
            });
        });

        $sortBy = $validated['sort_by'] ?? 'created_at';
        $sortDirection = $validated['sort_direction'] ?? 'desc';

        if ($sortBy === 'role') {
            $users->leftJoin('roles', 'roles.id', '=', 'users.role_id')
                ->orderBy('roles.name', $sortDirection)
                ->orderBy('users.id');
        } else {
            $users->orderBy("users.{$sortBy}", $sortDirection);

            if ($sortBy !== 'id') {
                $users->orderBy('users.id');
            }
        }

        $perPage = min(max((int) ($validated['per_page'] ?? 15), 1), 200);

        return response()->json($users->with(['role', 'department'])->paginate($perPage));
    }

    public function store(StoreUserRequest $request)
    {
        $user = $this->userService->createUser($request->validated());

        ActivityLogger::log(
            'user',
            'created',
            'تم إضافة مستخدم جديد',
            $user,
            ['email' => $user->email, 'role_id' => $user->role_id],
            $request->user()
        );

        return new UserResource($user->load(['role', 'department', 'trainingSite']));
    }

    public function show(User $user)
    {
        return new UserResource($user->load(['role', 'department', 'trainingSite']));
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        $oldData = $user->getOriginal();
        $user = $this->userService->updateUser($user, $request->validated());

        ActivityLogger::log(
            'user',
            'updated',
            'تم تحديث المستخدم',
            $user,
            ['old' => $oldData, 'new' => $user->getAttributes()],
            $request->user()
        );

        return new UserResource($user->fresh(['role', 'department', 'trainingSite']));
    }

    public function destroy(User $user)
    {
        $userName = $user->name;
        $userEmail = $user->email;

        ActivityLogger::log(
            'user',
            'deleted',
            'تم حذف المستخدم',
            $user,
            ['deleted_user' => $userName, 'email' => $userEmail],
            auth()->user()
        );

        $user->delete();
        return response()->json(['message' => 'تم حذف المستخدم']);
    }

    public function changeStatus(ChangeUserStatusRequest $request, User $user)
    {
        $oldStatus = $user->status;
        $user = $this->userService->changeStatus($user, $request->status);

        ActivityLogger::log(
            'user',
            'status_changed',
            'تم تغيير حالة المستخدم',
            $user,
            ['old_status' => $oldStatus, 'new_status' => $user->status],
            $request->user()
        );

        return new UserResource($user->fresh(['role', 'department', 'trainingSite']));
    }

    // ========== دوال تسجيل الدخول والخروج ==========

    public function login(LoginRequest $request)
    {
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            ActivityLogger::log(
                'auth',
                'login_failed',
                'فشل تسجيل الدخول',
                null,
                ['reason' => 'email_not_found', 'email' => $request->email, 'ip' => $request->ip()]
            );
            return response()->json(['message' => 'البريد الإلكتروني غير موجود'], 404);
        }

        if (!Hash::check($request->password, $user->password)) {
            ActivityLogger::log(
                'auth',
                'login_failed',
                'كلمة المرور خاطئة',
                $user,
                ['reason' => 'wrong_password', 'email' => $request->email, 'ip' => $request->ip()]
            );
            return response()->json(['message' => 'كلمة المرور غير صحيحة'], 401);
        }

        if ($user->status !== 'active') {
            ActivityLogger::log(
                'auth',
                'login_blocked',
                'حساب غير نشط',
                $user
            );
            return response()->json(['message' => 'الحساب غير نشط. يرجى التواصل مع المسؤول.'], 403);
        }

        $user->tokens()->delete();
        $token = $user->createToken('auth_token')->plainTextToken;

        ActivityLogger::log(
            'auth',
            'login',
            'تم تسجيل الدخول',
            $user,
            ['ip' => $request->ip(), 'user_agent' => $request->userAgent()]
        );

        return response()->json([
            'user' => new UserResource($user->load(['role', 'department', 'trainingSite', 'fieldSupervisorProfile', 'enrollments.section.course'])),
            'access_token' => $token,
            'token_type' => 'Bearer',
            'department_ids' => [
                'psychology' => TrainingTrackResolver::psychologyDeptId(),
                'usool_tarbiah' => TrainingTrackResolver::usoolTarbiahDeptId(),
            ],
        ]);
    }

    public function currentUser(Request $request)
{
        return new UserResource($request->user()->load(['role', 'department', 'trainingSite', 'enrollments.section.course']));
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'phone' => [
                'nullable',
                'string',
                function (string $attribute, mixed $value, \Closure $fail) {
                    if ($value === null || $value === '') {
                        return;
                    }
                    if (! is_string($value) || ! preg_match('/^(056|059)\d{7}$/', $value)) {
                        $fail('رقم الهاتف يجب أن يكون مكونًا من 10 أرقام ويبدأ بـ 056 أو 059');
                    }
                },
            ],
        ]);

        $user->update([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
        ]);

        ActivityLogger::log(
            'user',
            'profile_updated',
            'تم تحديث الملف الشخصي',
            $user,
            ['name' => $user->name, 'email' => $user->email],
            $user
        );

        return new UserResource($user->fresh(['role', 'department', 'trainingSite']));
    }

    public function changePassword(Request $request)
    {
        $user = $request->user();
        
        $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|min:8',
            'new_password_confirmation' => 'required|same:new_password',
        ]);

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'كلمة المرور الحالية غير صحيحة'], 422);
        }

        $user->update([
            'password' => Hash::make($request->new_password),
        ]);

        ActivityLogger::log(
            'user',
            'password_changed',
            'تم تغيير كلمة المرور',
            $user,
            [],
            $user
        );

        return response()->json(['message' => 'تم تغيير كلمة المرور بنجاح']);
    }

    public function getStaffDirectory(Request $request)
    {
        try {
            $user = $request->user();
            
            // Get student's department and training site
            $studentDepartmentId = $user->department_id;
            $studentTrainingSiteId = $user->training_site_id;

            $staff = [];

            // Get Head of Department
            $headOfDepartment = User::whereHas('role', function ($q) {
                $q->where('name', 'head_of_department');
            })->where('department_id', $studentDepartmentId)
            ->with(['role', 'department'])
            ->first();

            if ($headOfDepartment) {
                $staff[] = [
                    'id' => $headOfDepartment->id,
                    'name' => $headOfDepartment->name,
                    'email' => $headOfDepartment->email,
                    'phone' => $headOfDepartment->phone,
                    'role' => 'رئيس القسم',
                    'role_name' => $headOfDepartment->role->name,
                    'department' => $headOfDepartment->department?->name,
                ];
            }

            // Get Coordinator
            $coordinator = User::whereHas('role', function ($q) {
                $q->where('name', 'coordinator');
            })->where('department_id', $studentDepartmentId)
            ->with(['role', 'department'])
            ->first();

            if ($coordinator) {
                $staff[] = [
                    'id' => $coordinator->id,
                    'name' => $coordinator->name,
                    'email' => $coordinator->email,
                    'phone' => $coordinator->phone,
                    'role' => 'المنسق',
                    'role_name' => $coordinator->role->name,
                    'department' => $coordinator->department?->name,
                ];
            }

            // Get Academic Supervisor
            $academicSupervisor = User::whereHas('role', function ($q) {
                $q->where('name', 'academic_supervisor');
            })->where('department_id', $studentDepartmentId)
            ->with(['role', 'department'])
            ->first();

            if ($academicSupervisor) {
                $staff[] = [
                    'id' => $academicSupervisor->id,
                    'name' => $academicSupervisor->name,
                    'email' => $academicSupervisor->email,
                    'phone' => $academicSupervisor->phone,
                    'role' => 'المشرف الأكاديمي',
                    'role_name' => $academicSupervisor->role->name,
                    'department' => $academicSupervisor->department?->name,
                ];
            }

            // Get School Manager (from training site)
            if ($studentTrainingSiteId) {
                $schoolManager = User::whereHas('role', function ($q) {
                    $q->where('name', 'school_manager');
                })->where('training_site_id', $studentTrainingSiteId)
                ->with(['role', 'trainingSite'])
                ->first();

                if ($schoolManager) {
                    $staff[] = [
                        'id' => $schoolManager->id,
                        'name' => $schoolManager->name,
                        'email' => $schoolManager->email,
                        'phone' => $schoolManager->phone,
                        'role' => 'مدير المدرسة',
                        'role_name' => $schoolManager->role->name,
                        'training_site' => $schoolManager->trainingSite?->name,
                    ];
                }

                // Get Teachers (from training site)
                $teachers = User::whereHas('role', function ($q) {
                    $q->where('name', 'teacher');
                })->where('training_site_id', $studentTrainingSiteId)
                ->with(['role', 'trainingSite'])
                ->get();

                foreach ($teachers as $teacher) {
                    $staff[] = [
                        'id' => $teacher->id,
                        'name' => $teacher->name,
                        'email' => $teacher->email,
                        'phone' => $teacher->phone,
                        'role' => 'المعلم',
                        'role_name' => $teacher->role->name,
                        'training_site' => $teacher->trainingSite?->name,
                    ];
                }
            }

            return response()->json([
                'data' => $staff,
                'total' => count($staff),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'حدث خطأ في تحميل دليل الموظفين',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function logout(Request $request)
    {
        $user = $request->user();

        if ($user) {
            ActivityLogger::log(
                'auth',
                'logout',
                'تم تسجيل الخروج',
                $user,
                ['ip' => $request->ip(), 'user_agent' => $request->userAgent()]
            );
        }

        $user?->currentAccessToken()?->delete();

        return response()->json(['message' => 'تم تسجيل الخروج بنجاح']);
    }

    public function bulkAdd(Request $request)
    {
        $request->validate(['users' => 'required|array']);

        $success = [];
        $failed = [];

        foreach ($request->users as $userData) {
            try {
                $user = $this->userService->createUser($userData);
                $success[] = $user;
                ActivityLogger::log(
                    'user',
                    'created_bulk',
                    'تم إضافة مستخدم',
                    $user,
                    [],
                    $request->user()
                );
            } catch (\Exception $e) {
                $failed[] = ['email' => $userData['email'] ?? '?', 'error' => $e->getMessage()];
            }
        }

        ActivityLogger::log(
            'user',
            'bulk_upload',
            'رفع جماعي للمستخدمين',
            null,
            ['success_count' => count($success), 'fail_count' => count($failed)],
            $request->user()
        );

        return response()->json(['success' => $success, 'failed' => $failed]);
    }

    public function search(Request $request)
    {
        $query = $request->get('query');
        $role = $request->get('role');
        
        if (!$query || strlen($query) < 1) {
            return response()->json(['data' => []]);
        }
        
        // First get the role ID
        $roleId = null;
        if ($role) {
            $roleRecord = \App\Models\Role::where('name', $role)->first();
            if ($roleRecord) {
                $roleId = $roleRecord->id;
            }
        }
        
        $usersQuery = User::query()
            ->where(function ($q) use ($query) {
                $q->where('name', 'LIKE', '%' . $query . '%')
                  ->orWhere('university_id', 'LIKE', '%' . $query . '%');
            })
            ->where('status', 'active');
        
        // Filter by role if specified
        if ($roleId) {
            $usersQuery->where('role_id', $roleId);
        }
        
        $users = $usersQuery->limit(20)->get(['id', 'name', 'university_id', 'email']);
        
        return response()->json(['data' => $users]);
    }
}