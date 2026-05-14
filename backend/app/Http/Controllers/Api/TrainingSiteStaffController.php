<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\TrainingSite;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TrainingSiteStaffController extends Controller
{
    /**
     * Roles allowed to be assigned/transfered as training site staff.
     */
    private const STAFF_ROLES = ['teacher', 'school_manager', 'principal', 'adviser', 'field_supervisor', 'psychologist'];

    /**
     * Roles considered "managers" for a training site.
     */
    private const MANAGER_ROLES = ['school_manager', 'principal'];

    /**
     * Directorate roles that must be restricted to their own directorate.
     */
    private const DIRECTORATE_ROLES = ['education_directorate', 'health_directorate'];

    /**
     * Check if the current user can manage the given training site directorate.
     * Admin: unrestricted.
     * Directorate roles: only their own directorate.
     * Others (training_coordinator, etc.): unrestricted within their permissions.
     */
    private function canAccessDirectorate(?string $directorate, Request $request): bool
    {
        $user = $request->user();
        $roleName = $user?->role?->name;

        if ($roleName === 'admin') {
            return true;
        }

        if (in_array($roleName, self::DIRECTORATE_ROLES, true)) {
            return $directorate === $user->directorate;
        }

        return true;
    }

    /**
     * Get the directorate restriction for the current user, if any.
     * Returns the directorate string, or null if unrestricted.
     */
    private function getDirectorateRestriction(Request $request): ?string
    {
        $user = $request->user();
        $roleName = $user?->role?->name;
        if (in_array($roleName, self::DIRECTORATE_ROLES, true) && $user->directorate) {
            return $user->directorate;
        }
        return null;
    }

    /**
     * Check if the current user has one of the required permissions.
     */
    private function requirePermission(Request $request, string $permission): void
    {
        $user = $request->user();
        if ($user?->role?->name === 'admin') {
            return;
        }
        if (!$user?->hasPermission($permission)) {
            abort(403, 'لا تملك صلاحية تنفيذ هذه العملية');
        }
    }

    /**
     * List all staff assigned to training sites with filtering.
     */
    public function index(Request $request)
    {
        try {
            $this->requirePermission($request, 'training_sites.staff.view');

            $validated = $request->validate([
                'search' => 'nullable|string|max:255',
                'directorate' => 'nullable|string|max:50',
                'training_site_id' => 'nullable|integer|exists:training_sites,id',
                'role' => 'nullable|string|max:50',
                'per_page' => 'nullable|integer|min:1|max:200',
                'page' => 'nullable|integer|min:1',
            ]);

            $query = User::query()
                ->whereNotNull('training_site_id')
                ->with(['trainingSite', 'role']);

            // Filter by allowed roles only
            $staffRoleIds = Role::whereIn('name', self::STAFF_ROLES)->pluck('id');
            $query->whereIn('role_id', $staffRoleIds);

            // Directorate restriction — enforced in backend for all directorate roles
            $directorateRestriction = $this->getDirectorateRestriction($request);
            if ($directorateRestriction) {
                $query->whereHas('trainingSite', function ($q) use ($directorateRestriction) {
                    $q->where('directorate', $directorateRestriction);
                });
            } elseif (!empty($validated['directorate'])) {
                $query->whereHas('trainingSite', function ($q) use ($validated) {
                    $q->where('directorate', $validated['directorate']);
                });
            }

            if (!empty($validated['training_site_id'])) {
                $query->where('training_site_id', $validated['training_site_id']);
            }

            if (!empty($validated['role'])) {
                $query->whereHas('role', function ($q) use ($validated) {
                    $q->where('name', $validated['role']);
                });
            }

            if (!empty($validated['search'])) {
                $search = '%' . $validated['search'] . '%';
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', $search)
                        ->orWhere('email', 'like', $search)
                        ->orWhere('phone', 'like', $search);
                });
            }

            $perPage = $validated['per_page'] ?? 20;
            $result = $query->orderBy('name')->paginate($perPage);

            return response()->json($result);
        } catch (\Throwable $e) {
            Log::error('TrainingSiteStaffController@index error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'حدث خطأ أثناء جلب بيانات الكوادر',
            ], 500);
        }
    }

    /**
     * Get staff for a specific training site.
     */
    public function siteStaff(Request $request, int $id)
    {
        try {
            $this->requirePermission($request, 'training_sites.staff.view');

            $site = TrainingSite::findOrFail($id);

            if (!$this->canAccessDirectorate($site->directorate, $request)) {
                return response()->json([
                    'success' => false,
                    'message' => 'لا تملك صلاحية عرض بيانات هذا الموقع',
                ], 403);
            }

            $staffRoleIds = Role::whereIn('name', self::STAFF_ROLES)->pluck('id');

            $staff = User::where('training_site_id', $id)
                ->whereIn('role_id', $staffRoleIds)
                ->with('role')
                ->orderBy('name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $staff,
            ]);
        } catch (\Throwable $e) {
            Log::error('TrainingSiteStaffController@siteStaff error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'حدث خطأ أثناء جلب بيانات الموقع',
            ], 500);
        }
    }

    /**
     * Assign a user to a training site.
     */
    public function assign(Request $request)
    {
        try {
            $this->requirePermission($request, 'training_sites.staff.assign');

            $validated = $request->validate([
                'user_id' => 'required|exists:users,id',
                'training_site_id' => 'required|exists:training_sites,id',
                'notes' => 'nullable|string|max:500',
            ]);

            $user = User::with('role')->findOrFail($validated['user_id']);
            $site = TrainingSite::findOrFail($validated['training_site_id']);

            // Check directorate permission
            if (!$this->canAccessDirectorate($site->directorate, $request)) {
                return response()->json([
                    'success' => false,
                    'message' => 'لا تملك صلاحية إدارة هذا الموقع (توجد قيود المديرية)',
                ], 403);
            }

            // Validate user role
            if (!in_array($user->role?->name, self::STAFF_ROLES, true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'لا يمكن تعيين هذا المستخدم لأنه لا يملك دوراً صالحاً (معلم، مدير، مرشد...)',
                ], 422);
            }

            // Prevent assigning students
            if ($user->role?->name === 'student') {
                return response()->json([
                    'success' => false,
                    'message' => 'لا يمكن تعيين الطلبة ككادر تدريبي',
                ], 422);
            }

            // Check if user already assigned to same site
            if ($user->training_site_id === $site->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'المستخدم موجود بالفعل في هذا الموقع التدريبي',
                ], 422);
            }

            // Check if training site is active
            if (!$site->is_active) {
                return response()->json([
                    'success' => false,
                    'message' => 'لا يمكن التعيين في موقع غير نشط',
                ], 422);
            }

            // For managers: check if target site already has a manager
            $isManagerRole = in_array($user->role?->name, self::MANAGER_ROLES, true);
            if ($isManagerRole && $site->manager_id !== null) {
                return response()->json([
                    'success' => false,
                    'message' => 'لا يمكن تعيين مدير جديد لأن هذه المدرسة لديها مدير حالي',
                ], 422);
            }

            DB::beginTransaction();
            try {
                // Update user's training site
                $user->training_site_id = $site->id;
                $user->save();

                // If manager role, update training_sites.manager_id
                if ($isManagerRole) {
                    $site->manager_id = $user->id;
                    $site->save();
                }

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'تم تعيين المستخدم بنجاح',
                    'data' => $user->fresh(['trainingSite', 'role']),
                ]);
            } catch (\Throwable $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Throwable $e) {
            Log::error('TrainingSiteStaffController@assign error: ' . $e->getMessage(), [
                'request' => $request->all(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'حدث خطأ أثناء تنفيذ العملية، يرجى المحاولة لاحقاً',
            ], 500);
        }
    }

    /**
     * Transfer a user from one training site to another.
     */
    public function transfer(Request $request)
    {
        try {
            $this->requirePermission($request, 'training_sites.staff.transfer');

            $validated = $request->validate([
                'user_id' => 'required|exists:users,id',
                'training_site_id' => 'required|exists:training_sites,id',
                'reason' => 'nullable|string|max:500',
            ]);

            $user = User::with('role')->findOrFail($validated['user_id']);
            $newSite = TrainingSite::findOrFail($validated['training_site_id']);
            $oldSiteId = $user->training_site_id;

            // Validate user is currently assigned
            if ($oldSiteId === null) {
                return response()->json([
                    'success' => false,
                    'message' => 'لا يمكن نقل المستخدم لأنه غير مرتبط بأي موقع حالياً (استخدم التعيين)',
                ], 422);
            }

            // Prevent transfer to same site
            if ($oldSiteId === $newSite->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'المستخدم موجود بالفعل في هذا الموقع التدريبي',
                ], 422);
            }

            // Validate user role
            if (!in_array($user->role?->name, self::STAFF_ROLES, true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'لا يمكن نقل هذا المستخدم لأنه لا يملك دوراً صالحاً',
                ], 422);
            }

            // Check directorate permission for both old and new sites
            $oldSite = TrainingSite::find($oldSiteId);
            if ($oldSite && !$this->canAccessDirectorate($oldSite->directorate, $request)) {
                return response()->json([
                    'success' => false,
                    'message' => 'لا تملك صلاحية نقل المستخدم من موقعه الحالي',
                ], 403);
            }
            if (!$this->canAccessDirectorate($newSite->directorate, $request)) {
                return response()->json([
                    'success' => false,
                    'message' => 'لا تملك صلاحية نقل المستخدم إلى هذا الموقع (توجد قيود المديرية)',
                ], 403);
            }

            // Check if new site is active
            if (!$newSite->is_active) {
                return response()->json([
                    'success' => false,
                    'message' => 'لا يمكن النقل إلى موقع غير نشط',
                ], 422);
            }

            $isManagerRole = in_array($user->role?->name, self::MANAGER_ROLES, true);

            // For managers: check if target site already has a manager
            if ($isManagerRole && $newSite->manager_id !== null) {
                return response()->json([
                    'success' => false,
                    'message' => 'لا يمكن نقل المدير لأن المدرسة الجديدة لديها مدير حالي',
                ], 422);
            }

            DB::beginTransaction();
            try {
                // If manager, update old site manager_id to null
                if ($isManagerRole && $oldSite) {
                    $oldSite->manager_id = null;
                    $oldSite->save();
                }

                // Update user's training site
                $user->training_site_id = $newSite->id;
                $user->save();

                // If manager, update new site manager_id
                if ($isManagerRole) {
                    $newSite->manager_id = $user->id;
                    $newSite->save();
                }

                DB::commit();

                $roleLabel = $isManagerRole ? 'مدير المدرسة' : 'المعلم المرشد';

                return response()->json([
                    'success' => true,
                    'message' => "تم نقل {$roleLabel} إلى مدرسة أخرى بنجاح",
                    'data' => $user->fresh(['trainingSite', 'role']),
                ]);
            } catch (\Throwable $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Throwable $e) {
            Log::error('TrainingSiteStaffController@transfer error: ' . $e->getMessage(), [
                'request' => $request->all(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'حدث خطأ أثناء تنفيذ العملية، يرجى المحاولة لاحقاً',
            ], 500);
        }
    }

    /**
     * Remove a user from their training site.
     */
    public function remove(Request $request, int $userId)
    {
        try {
            $this->requirePermission($request, 'training_sites.staff.remove');

            $user = User::with('role')->findOrFail($userId);
            $oldSiteId = $user->training_site_id;

            if ($oldSiteId === null) {
                return response()->json([
                    'success' => false,
                    'message' => 'المستخدم غير مرتبط بأي موقع تدريبي',
                ], 422);
            }

            $oldSite = TrainingSite::find($oldSiteId);

            // Check directorate permission
            if ($oldSite && !$this->canAccessDirectorate($oldSite->directorate, $request)) {
                return response()->json([
                    'success' => false,
                    'message' => 'لا تملك صلاحية إزالة المستخدم من هذا الموقع',
                ], 403);
            }

            $isManagerRole = in_array($user->role?->name, self::MANAGER_ROLES, true);

            DB::beginTransaction();
            try {
                // If manager, clear manager_id from old site
                if ($isManagerRole && $oldSite) {
                    $oldSite->manager_id = null;
                    $oldSite->save();
                }

                // Clear user's training site
                $user->training_site_id = null;
                $user->save();

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'تم إزالة المستخدم من الموقع التدريبي بنجاح',
                    'data' => $user->fresh(['role']),
                ]);
            } catch (\Throwable $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Throwable $e) {
            Log::error('TrainingSiteStaffController@remove error: ' . $e->getMessage(), [
                'user_id' => $userId,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'حدث خطأ أثناء تنفيذ العملية، يرجى المحاولة لاحقاً',
            ], 500);
        }
    }

    /**
     * Get available users who can be assigned (not currently assigned and have valid roles).
     */
    public function availableStaff(Request $request)
    {
        try {
            $this->requirePermission($request, 'training_sites.staff.assign');

            $validated = $request->validate([
                'role' => 'nullable|string|max:50',
                'directorate' => 'nullable|string|max:50',
                'search' => 'nullable|string|max:255',
            ]);

            $query = User::query()
                ->whereNull('training_site_id')
                ->whereIn('role_id', Role::whereIn('name', self::STAFF_ROLES)->pluck('id'))
                ->where('status', 'active')
                ->with('role');

            // Directorate restriction — filter by training site directorate (not user.directorate field)
            // Staff users may not have directorate set on their own record, but their potential
            // sites are the source of truth. For directorate users, only show unassigned staff
            // who don't have a site, so we can't pre-filter by site. Instead, we show all
            // unassigned valid-role users; the assign step enforces directorate via canAccessDirectorate.
            // Optional: if admin passes a directorate filter param, filter by user.directorate.
            $user = $request->user();
            if (!empty($validated['directorate'])) {
                $query->where('directorate', $validated['directorate']);
            }

            if (!empty($validated['role'])) {
                $query->whereHas('role', function ($q) use ($validated) {
                    $q->where('name', $validated['role']);
                });
            }

            if (!empty($validated['search'])) {
                $search = '%' . $validated['search'] . '%';
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', $search)
                        ->orWhere('email', 'like', $search);
                });
            }

            $users = $query->orderBy('name')->limit(100)->get();

            return response()->json([
                'success' => true,
                'data' => $users,
            ]);
        } catch (\Throwable $e) {
            Log::error('TrainingSiteStaffController@availableStaff error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'حدث خطأ أثناء جلب البيانات',
            ], 500);
        }
    }
}
