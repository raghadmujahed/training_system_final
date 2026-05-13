<?php

namespace App\Services\Chat;

use App\Models\TrainingAssignment;
use App\Models\TrainingSite;
use App\Models\User;
use Illuminate\Support\Collection;

class ChatPermissionService
{
    // All roles that act as "site managers" (school / center / directorate heads)
    private const SITE_MANAGER_ROLES = [
        'school_manager', 'principal', 'psychology_center_manager',
        'education_directorate', 'health_directorate',
    ];

    // All roles that act as "field supervisors / mentor teachers"
    private const FIELD_ROLES = [
        'field_supervisor', 'teacher', 'adviser', 'psychologist',
    ];

    /**
     * Central permission gate: can userA send a message to userB?
     */
    public function canMessage(User $userA, User $userB): bool
    {
        if ($userA->id === $userB->id) {
            return false;
        }

        $roleA = $userA->role?->name;
        $roleB = $userB->role?->name;

        // Admin can message anyone
        if ($roleA === 'admin') {
            return true;
        }

        // Anyone can message admin
        if ($roleB === 'admin') {
            return true;
        }

        return match (true) {
            $roleA === 'student'                          => $this->studentCanMessage($userA, $userB),
            $roleA === 'academic_supervisor'              => $this->academicSupervisorCanMessage($userA, $userB),
            in_array($roleA, self::FIELD_ROLES)           => $this->fieldRoleCanMessage($userA, $userB),
            in_array($roleA, self::SITE_MANAGER_ROLES)    => $this->siteManagerCanMessage($userA, $userB),
            $roleA === 'training_coordinator'             => $this->coordinatorCanMessage($userA, $userB),
            $roleA === 'head_of_department'               => $this->headOfDeptCanMessage($userA, $userB),
            default                                       => false,
        };
    }

    /**
     * Returns all users that the given user is allowed to chat with.
     * Optionally filter by a search string (name or university_id).
     */
    public function getAllowedChatUsers(User $user, ?string $search = null): Collection
    {
        $role = $user->role?->name;

        $adminUsers = User::whereHas('role', fn($q) => $q->where('name', 'admin'))
            ->where('id', '!=', $user->id)
            ->get();

        $allowed = match (true) {
            $role === 'student'                          => $this->getAllowedForStudent($user),
            $role === 'academic_supervisor'              => $this->getAllowedForAcademicSupervisor($user),
            in_array($role, self::FIELD_ROLES)           => $this->getAllowedForFieldRole($user),
            in_array($role, self::SITE_MANAGER_ROLES)    => $this->getAllowedForSiteManager($user),
            $role === 'training_coordinator'             => $this->getAllowedForCoordinator($user),
            $role === 'head_of_department'               => $this->getAllowedForHeadOfDept($user),
            $role === 'admin'                            => User::where('id', '!=', $user->id)->get(),
            default                                      => collect(),
        };

        if ($role !== 'admin') {
            $allowed = $allowed->merge($adminUsers)->unique('id');
        }

        $allowed = $allowed->filter(fn($u) => $u->id !== $user->id)->values();

        if ($search) {
            $lower = mb_strtolower($search);
            $allowed = $allowed->filter(function (User $u) use ($lower) {
                return str_contains(mb_strtolower($u->name ?? ''), $lower)
                    || str_contains(mb_strtolower($u->university_id ?? ''), $lower)
                    || str_contains(mb_strtolower($u->email ?? ''), $lower);
            })->values();
        }

        return $allowed->values();
    }

    // ─── Student ─────────────────────────────────────────────

    private function studentCanMessage(User $student, User $target): bool
    {
        $roleB = $target->role?->name;

        // Assigned academic supervisor
        if ($roleB === 'academic_supervisor') {
            return $this->hasAssignment($student->id, 'academic_supervisor_id', $target->id);
        }

        // Assigned field role (teacher / field_supervisor / adviser / psychologist)
        if (in_array($roleB, self::FIELD_ROLES)) {
            return $this->hasAssignmentFieldRole($student->id, $target->id);
        }

        // Training coordinator — same department only
        if ($roleB === 'training_coordinator') {
            return $this->sameDepartment($student, $target);
        }

        // Department head — same department only
        if ($roleB === 'head_of_department') {
            return $this->sameDepartment($student, $target);
        }

        // Site manager — student must be assigned to that site
        if (in_array($roleB, self::SITE_MANAGER_ROLES)) {
            return $this->studentIsAtSite($student->id, $target);
        }

        return false;
    }

    private function getAllowedForStudent(User $student): Collection
    {
        $assignments = $this->studentAssignments($student->id);

        $supervisorIds    = $assignments->pluck('academic_supervisor_id')->filter()->unique();
        $fieldRoleIds     = $assignments->pluck('teacher_id')
            ->merge($assignments->pluck('field_supervisor_id'))
            ->filter()->unique();
        $coordinatorIds   = $assignments->pluck('coordinator_id')->filter()->unique();

        // Department head of student's department
        $deptHeadIds = $student->department_id
            ? User::where('department_id', $student->department_id)
                ->whereHas('role', fn($q) => $q->where('name', 'head_of_department'))
                ->pluck('id')
            : collect();

        // Same-department coordinator
        $deptCoordinatorIds = $student->department_id
            ? User::where('department_id', $student->department_id)
                ->whereHas('role', fn($q) => $q->where('name', 'training_coordinator'))
                ->pluck('id')
            : collect();

        // Site managers of sites where student is assigned
        $siteIds = $assignments->pluck('training_site_id')->filter()->unique();
        $siteManagerIds = $siteIds->isNotEmpty()
            ? TrainingSite::whereIn('id', $siteIds)
                ->whereNotNull('manager_id')
                ->pluck('manager_id')
                ->filter()
            : collect();

        $ids = $supervisorIds
            ->merge($fieldRoleIds)
            ->merge($coordinatorIds)
            ->merge($deptHeadIds)
            ->merge($deptCoordinatorIds)
            ->merge($siteManagerIds)
            ->filter()->unique()->values();

        return User::whereIn('id', $ids)->get();
    }

    // ─── Academic Supervisor ──────────────────────────────────

    private function academicSupervisorCanMessage(User $supervisor, User $target): bool
    {
        $roleB = $target->role?->name;

        if ($roleB === 'student') {
            return $this->hasAssignment($target->id, 'academic_supervisor_id', $supervisor->id);
        }

        if (in_array($roleB, self::FIELD_ROLES)) {
            return $this->fieldRoleSharesStudentWithSupervisor($supervisor->id, $target->id);
        }

        if ($roleB === 'training_coordinator') {
            return $this->sameDepartment($supervisor, $target);
        }

        if ($roleB === 'head_of_department') {
            return $this->sameDepartment($supervisor, $target);
        }

        // Site manager connected via shared students
        if (in_array($roleB, self::SITE_MANAGER_ROLES)) {
            return $this->supervisorHasStudentAtSite($supervisor->id, $target);
        }

        return false;
    }

    private function getAllowedForAcademicSupervisor(User $supervisor): Collection
    {
        $assignments = TrainingAssignment::where('academic_supervisor_id', $supervisor->id)
            ->get();

        $studentIds   = $assignments->map(fn($a) => $a->enrollment_id ? $this->enrollmentUserId($a->enrollment_id) : null)->filter()->unique();
        $fieldRoleIds = $assignments->pluck('teacher_id')
            ->merge($assignments->pluck('field_supervisor_id'))
            ->filter()->unique();

        // Coordinator and head of same department
        $sameDeptUsers = $supervisor->department_id
            ? User::where('department_id', $supervisor->department_id)
                ->whereHas('role', fn($q) => $q->whereIn('name', ['training_coordinator', 'head_of_department']))
                ->pluck('id')
            : collect();

        // Site managers connected to students' sites
        $siteIds = $assignments->pluck('training_site_id')->filter()->unique();
        $siteManagerIds = $siteIds->isNotEmpty()
            ? TrainingSite::whereIn('id', $siteIds)->whereNotNull('manager_id')->pluck('manager_id')->filter()
            : collect();

        $ids = $studentIds
            ->merge($fieldRoleIds)
            ->merge($sameDeptUsers)
            ->merge($siteManagerIds)
            ->filter()->unique()->values();

        return User::whereIn('id', $ids)->get();
    }

    // ─── Field Roles (teacher / field_supervisor / adviser / psychologist) ────

    private function fieldRoleCanMessage(User $fieldUser, User $target): bool
    {
        $roleB = $target->role?->name;

        if ($roleB === 'student') {
            return $this->hasAssignmentFieldRole($target->id, $fieldUser->id);
        }

        if ($roleB === 'academic_supervisor') {
            return $this->fieldRoleSharesStudentWithSupervisor($target->id, $fieldUser->id);
        }

        // Site manager of own site
        if (in_array($roleB, self::SITE_MANAGER_ROLES)) {
            return $this->fieldUserBelongsToManagerSite($fieldUser, $target);
        }

        // Training coordinator connected via shared students or site/department
        if ($roleB === 'training_coordinator') {
            return $this->fieldUserHasStudentInDept($fieldUser, $target);
        }

        // Other field roles at the same site
        if (in_array($roleB, self::FIELD_ROLES)) {
            return $this->sameSite($fieldUser, $target);
        }

        return false;
    }

    private function getAllowedForFieldRole(User $fieldUser): Collection
    {
        $assignments = TrainingAssignment::where(fn($q) => $q
            ->where('teacher_id', $fieldUser->id)
            ->orWhere('field_supervisor_id', $fieldUser->id)
        )->get();

        $studentIds  = $assignments->map(fn($a) => $a->enrollment_id ? $this->enrollmentUserId($a->enrollment_id) : null)->filter()->unique();
        $acSupIds    = $assignments->pluck('academic_supervisor_id')->filter()->unique();

        // Site manager of own training site (via user.training_site_id or assignments)
        $siteIds = collect([$fieldUser->training_site_id])
            ->merge($assignments->pluck('training_site_id'))
            ->filter()->unique();

        $siteManagerIds = $siteIds->isNotEmpty()
            ? TrainingSite::whereIn('id', $siteIds)->whereNotNull('manager_id')->pluck('manager_id')->filter()
            : collect();

        // Coordinators connected via students' departments
        $studentDeptIds = $studentIds->isNotEmpty()
            ? User::whereIn('id', $studentIds)->pluck('department_id')->filter()->unique()
            : collect();
        $coordinatorIds = $studentDeptIds->isNotEmpty()
            ? User::whereIn('department_id', $studentDeptIds)
                ->whereHas('role', fn($q) => $q->where('name', 'training_coordinator'))
                ->pluck('id')
            : collect();

        $ids = $studentIds->merge($acSupIds)->merge($siteManagerIds)->merge($coordinatorIds)
            ->filter()->unique()->values();

        return User::whereIn('id', $ids)->get();
    }

    // ─── Site Manager ─────────────────────────────────────────

    private function siteManagerCanMessage(User $manager, User $target): bool
    {
        $roleB = $target->role?->name;
        $siteId = $this->getManagerSiteId($manager);
        if (! $siteId) {
            return false;
        }

        if ($roleB === 'student') {
            return TrainingAssignment::where('training_site_id', $siteId)
                ->whereHas('enrollment', fn($q) => $q->where('user_id', $target->id))
                ->exists();
        }

        if (in_array($roleB, self::FIELD_ROLES)) {
            return $this->fieldUserBelongsToSite($target, $siteId);
        }

        if ($roleB === 'academic_supervisor') {
            return TrainingAssignment::where('training_site_id', $siteId)
                ->where('academic_supervisor_id', $target->id)
                ->exists();
        }

        if ($roleB === 'training_coordinator') {
            // Coordinator whose department has students at this site
            return TrainingAssignment::where('training_site_id', $siteId)
                ->whereHas('enrollment.user', fn($q) => $q->where('department_id', $target->department_id))
                ->exists();
        }

        return false;
    }

    private function getAllowedForSiteManager(User $manager): Collection
    {
        $siteId = $this->getManagerSiteId($manager);
        if (! $siteId) {
            return collect();
        }

        $assignments = TrainingAssignment::where('training_site_id', $siteId)->get();

        $studentIds = $assignments->map(fn($a) => $a->enrollment_id ? $this->enrollmentUserId($a->enrollment_id) : null)->filter()->unique();
        $acSupIds   = $assignments->pluck('academic_supervisor_id')->filter()->unique();

        // All field-role users at this site
        $fieldUserIds = User::where('training_site_id', $siteId)
            ->whereHas('role', fn($q) => $q->whereIn('name', self::FIELD_ROLES))
            ->pluck('id');
        // Also field users referenced in assignments at this site
        $assignmentFieldIds = $assignments->pluck('teacher_id')
            ->merge($assignments->pluck('field_supervisor_id'))
            ->filter()->unique();

        // Coordinators connected via students' departments
        $studentDeptIds = $studentIds->isNotEmpty()
            ? User::whereIn('id', $studentIds)->pluck('department_id')->filter()->unique()
            : collect();
        $coordinatorIds = $studentDeptIds->isNotEmpty()
            ? User::whereIn('department_id', $studentDeptIds)
                ->whereHas('role', fn($q) => $q->where('name', 'training_coordinator'))
                ->pluck('id')
            : collect();

        $ids = $studentIds->merge($acSupIds)->merge($fieldUserIds)->merge($assignmentFieldIds)
            ->merge($coordinatorIds)->filter()->unique()->values();

        return User::whereIn('id', $ids)->get();
    }

    // ─── Training Coordinator ─────────────────────────────────

    private function coordinatorCanMessage(User $coordinator, User $target): bool
    {
        $roleB = $target->role?->name;

        // Same-department roles always allowed
        if (in_array($roleB, ['student', 'academic_supervisor', 'head_of_department'])) {
            return $this->sameDepartment($coordinator, $target);
        }

        // Field roles: allowed if they have a student from coordinator's department
        if (in_array($roleB, self::FIELD_ROLES)) {
            return $this->fieldUserHasStudentInDept($target, $coordinator);
        }

        // Site managers: allowed if they host students from coordinator's department
        if (in_array($roleB, self::SITE_MANAGER_ROLES)) {
            $siteId = $this->getManagerSiteId($target);
            if (! $siteId || ! $coordinator->department_id) {
                return false;
            }
            return TrainingAssignment::where('training_site_id', $siteId)
                ->whereHas('enrollment.user', fn($q) => $q->where('department_id', $coordinator->department_id))
                ->exists();
        }

        return false;
    }

    private function getAllowedForCoordinator(User $coordinator): Collection
    {
        if (! $coordinator->department_id) {
            return collect();
        }

        // Same-department users: students, academic supervisors, head
        $sameDeptIds = User::where('department_id', $coordinator->department_id)
            ->where('id', '!=', $coordinator->id)
            ->whereHas('role', fn($q) => $q->whereIn('name', ['student', 'academic_supervisor', 'head_of_department']))
            ->pluck('id');

        // All enrollments for dept students → assignments → field users + site managers
        $deptStudentIds = User::where('department_id', $coordinator->department_id)
            ->whereHas('role', fn($q) => $q->where('name', 'student'))
            ->pluck('id');

        $assignments = $deptStudentIds->isNotEmpty()
            ? TrainingAssignment::whereHas('enrollment', fn($q) => $q->whereIn('user_id', $deptStudentIds))->get()
            : collect();

        $fieldRoleIds = $assignments->pluck('teacher_id')
            ->merge($assignments->pluck('field_supervisor_id'))
            ->filter()->unique();

        $siteIds = $assignments->pluck('training_site_id')->filter()->unique();
        $siteManagerIds = $siteIds->isNotEmpty()
            ? TrainingSite::whereIn('id', $siteIds)->whereNotNull('manager_id')->pluck('manager_id')->filter()
            : collect();

        $ids = $sameDeptIds->merge($fieldRoleIds)->merge($siteManagerIds)
            ->filter()->unique()->values();

        return User::whereIn('id', $ids)->get();
    }

    // ─── Head of Department ───────────────────────────────────

    private function headOfDeptCanMessage(User $head, User $target): bool
    {
        $roleB = $target->role?->name;

        // Same-department users always allowed
        if (in_array($roleB, ['academic_supervisor', 'training_coordinator', 'student'])) {
            return $this->sameDepartment($head, $target);
        }

        // Field roles connected to dept students
        if (in_array($roleB, self::FIELD_ROLES)) {
            return $this->fieldUserHasStudentInDept($target, $head);
        }

        // Site managers hosting dept students
        if (in_array($roleB, self::SITE_MANAGER_ROLES)) {
            $siteId = $this->getManagerSiteId($target);
            if (! $siteId || ! $head->department_id) {
                return false;
            }
            return TrainingAssignment::where('training_site_id', $siteId)
                ->whereHas('enrollment.user', fn($q) => $q->where('department_id', $head->department_id))
                ->exists();
        }

        return false;
    }

    private function getAllowedForHeadOfDept(User $head): Collection
    {
        if (! $head->department_id) {
            return collect();
        }

        // Same-department users
        $sameDeptIds = User::where('department_id', $head->department_id)
            ->where('id', '!=', $head->id)
            ->whereHas('role', fn($q) => $q->whereIn('name', [
                'academic_supervisor', 'training_coordinator', 'student',
            ]))->pluck('id');

        // Dept students → assignments → field users + site managers
        $deptStudentIds = User::where('department_id', $head->department_id)
            ->whereHas('role', fn($q) => $q->where('name', 'student'))
            ->pluck('id');

        $assignments = $deptStudentIds->isNotEmpty()
            ? TrainingAssignment::whereHas('enrollment', fn($q) => $q->whereIn('user_id', $deptStudentIds))->get()
            : collect();

        $fieldRoleIds = $assignments->pluck('teacher_id')
            ->merge($assignments->pluck('field_supervisor_id'))
            ->filter()->unique();

        $siteIds = $assignments->pluck('training_site_id')->filter()->unique();
        $siteManagerIds = $siteIds->isNotEmpty()
            ? TrainingSite::whereIn('id', $siteIds)->whereNotNull('manager_id')->pluck('manager_id')->filter()
            : collect();

        $ids = $sameDeptIds->merge($fieldRoleIds)->merge($siteManagerIds)
            ->filter()->unique()->values();

        return User::whereIn('id', $ids)->get();
    }

    // ─── Helpers ──────────────────────────────────────────────

    private function studentAssignments(int $studentId): Collection
    {
        return TrainingAssignment::whereHas('enrollment', fn($q) => $q->where('user_id', $studentId))
            ->get();
    }

    private function hasAssignment(int $studentId, string $supervisorColumn, int $supervisorId): bool
    {
        return TrainingAssignment::whereHas('enrollment', fn($q) => $q->where('user_id', $studentId))
            ->where($supervisorColumn, $supervisorId)
            ->exists();
    }

    private function hasAssignmentFieldRole(int $studentId, int $fieldUserId): bool
    {
        return TrainingAssignment::whereHas('enrollment', fn($q) => $q->where('user_id', $studentId))
            ->where(fn($q) => $q
                ->where('teacher_id', $fieldUserId)
                ->orWhere('field_supervisor_id', $fieldUserId)
            )
            ->exists();
    }

    /**
     * Does the field-role user share a student with the given academic supervisor?
     */
    private function fieldRoleSharesStudentWithSupervisor(int $academicSupId, int $fieldUserId): bool
    {
        return TrainingAssignment::where('academic_supervisor_id', $academicSupId)
            ->where(fn($q) => $q
                ->where('teacher_id', $fieldUserId)
                ->orWhere('field_supervisor_id', $fieldUserId)
            )
            ->exists();
    }

    /**
     * Is the field user linked to the site managed by the given manager?
     */
    private function fieldUserBelongsToManagerSite(User $fieldUser, User $manager): bool
    {
        $siteId = $this->getManagerSiteId($manager);
        if (! $siteId) {
            return false;
        }
        return $this->fieldUserBelongsToSite($fieldUser, $siteId);
    }

    private function fieldUserBelongsToSite(User $fieldUser, int $siteId): bool
    {
        if ($fieldUser->training_site_id && $fieldUser->training_site_id === $siteId) {
            return true;
        }
        // Also check via assignments
        return TrainingAssignment::where('training_site_id', $siteId)
            ->where(fn($q) => $q
                ->where('teacher_id', $fieldUser->id)
                ->orWhere('field_supervisor_id', $fieldUser->id)
            )
            ->exists();
    }

    /**
     * Does the field user have at least one student who belongs to the coordinator's/head's department?
     */
    private function fieldUserHasStudentInDept(User $fieldUser, User $deptUser): bool
    {
        if (! $deptUser->department_id) {
            return false;
        }
        return TrainingAssignment::where(fn($q) => $q
            ->where('teacher_id', $fieldUser->id)
            ->orWhere('field_supervisor_id', $fieldUser->id)
        )
        ->whereHas('enrollment.user', fn($q) => $q->where('department_id', $deptUser->department_id))
        ->exists();
    }

    /**
     * Does the supervisor have any student assigned to the site managed by the given manager?
     */
    private function supervisorHasStudentAtSite(int $supervisorId, User $manager): bool
    {
        $siteId = $this->getManagerSiteId($manager);
        if (! $siteId) {
            return false;
        }
        return TrainingAssignment::where('academic_supervisor_id', $supervisorId)
            ->where('training_site_id', $siteId)
            ->exists();
    }

    /**
     * Is the student assigned to a training site managed by this manager?
     */
    private function studentIsAtSite(int $studentId, User $manager): bool
    {
        $siteId = $this->getManagerSiteId($manager);
        if (! $siteId) {
            return false;
        }
        return TrainingAssignment::where('training_site_id', $siteId)
            ->whereHas('enrollment', fn($q) => $q->where('user_id', $studentId))
            ->exists();
    }

    /**
     * Get the training_site id managed by a site-manager user.
     * Site managers are linked via TrainingSite.manager_id = user.id.
     */
    private function getManagerSiteId(User $manager): ?int
    {
        // Check if a TrainingSite has this user as manager
        $site = TrainingSite::where('manager_id', $manager->id)->first();
        if ($site) {
            return $site->id;
        }
        // Fallback: user.training_site_id (some managers are also linked this way)
        return $manager->training_site_id ?: null;
    }

    private function sameDepartment(User $userA, User $userB): bool
    {
        if (! $userA->department_id || ! $userB->department_id) {
            return false;
        }
        return $userA->department_id === $userB->department_id;
    }

    private function sameSite(User $userA, User $userB): bool
    {
        if (! $userA->training_site_id || ! $userB->training_site_id) {
            return false;
        }
        return $userA->training_site_id === $userB->training_site_id;
    }

    /**
     * Helper: get enrollment's user_id without loading the full relation each time.
     */
    private function enrollmentUserId(int $enrollmentId): ?int
    {
        static $cache = [];
        if (! isset($cache[$enrollmentId])) {
            $cache[$enrollmentId] = \App\Models\Enrollment::find($enrollmentId)?->user_id;
        }
        return $cache[$enrollmentId];
    }
}
