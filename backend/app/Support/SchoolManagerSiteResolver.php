<?php

namespace App\Support;

use App\Models\TrainingSite;
use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;

class SchoolManagerSiteResolver
{
    public const MANAGER_ROLES = ['school_manager', 'principal', 'psychology_center_manager'];

    public static function isSiteManagerRole(?string $roleName): bool
    {
        return in_array($roleName, self::MANAGER_ROLES, true);
    }

    public static function isSiteManager(User $user): bool
    {
        return self::isSiteManagerRole($user->role?->name);
    }

    /**
     * يُرجع معرّف موقع التدريب أو يُنهي الطلب بـ 400 إن لم يكن الحساب مربوطاً بمدرسة/مركز.
     */
    /**
     * يُرجع معرّف موقع التدريب من الحساب أو من training_sites.manager_id.
     */
    public static function resolveTrainingSiteId(User $user): ?int
    {
        if (! self::isSiteManager($user)) {
            return null;
        }

        $siteId = (int) ($user->training_site_id ?? 0);
        if ($siteId > 0) {
            return $siteId;
        }

        $managedSiteId = TrainingSite::query()
            ->where('manager_id', $user->id)
            ->value('id');

        return $managedSiteId ? (int) $managedSiteId : null;
    }

    public static function requireTrainingSiteId(User $user): int
    {
        if (! self::isSiteManager($user)) {
            abort(403, 'هذه الخدمة متاحة فقط لمدير جهة التدريب.');
        }

        $siteId = self::resolveTrainingSiteId($user) ?? 0;
        if ($siteId <= 0) {
            throw new HttpResponseException(response()->json([
                'message' => 'لم يتم ربط حسابك بجهة تدريب (مدرسة/مركز). يرجى التواصل مع مدير النظام.',
            ], 400));
        }

        return $siteId;
    }

    /**
     * مزامنة training_sites.manager_id مع حساب المدير المرتبط بـ training_site_id.
     */
    public static function syncSiteManagerId(User $user): void
    {
        if (! self::isSiteManager($user)) {
            return;
        }

        $siteId = (int) ($user->training_site_id ?? 0);
        if ($siteId <= 0) {
            TrainingSite::query()
                ->where('manager_id', $user->id)
                ->update(['manager_id' => null]);

            return;
        }

        $site = TrainingSite::query()->find($siteId);
        if (! $site) {
            return;
        }

        if ($site->manager_id === null || (int) $site->manager_id === (int) $user->id) {
            $site->update(['manager_id' => $user->id]);
        }
    }

    /**
     * حساب مدير الجهة للبريد والإشعارات: manager_id ثم schoolAccount ثم بريد الموقع.
     */
    public static function resolveManagerAccount(TrainingSite $site): ?User
    {
        if ($site->manager_id) {
            $manager = User::query()
                ->whereKey($site->manager_id)
                ->whereHas('role', fn ($q) => $q->whereIn('name', self::MANAGER_ROLES))
                ->first();
            if ($manager) {
                return $manager;
            }
        }

        return User::query()
            ->where('training_site_id', $site->id)
            ->whereHas('role', fn ($q) => $q->whereIn('name', self::MANAGER_ROLES))
            ->where('status', 'active')
            ->orderBy('id')
            ->first();
    }
}
