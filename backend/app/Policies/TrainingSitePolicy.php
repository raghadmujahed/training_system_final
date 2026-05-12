<?php

namespace App\Policies;

use App\Models\User;
use App\Models\TrainingSite;

class TrainingSitePolicy
{
    /**
     * تحديد ما إذا كان المستخدم يمكنه إنشاء موقع تدريب.
     */
    public function create(User $user): bool
    {
        // الأدوار المسموح لها بإنشاء مواقع التدريب
        $allowedRoles = ['admin', 'education_directorate', 'ministry_of_health'];
        
        return in_array($user->role?->name, $allowedRoles);
    }

    /**
     * تحديد ما إذا كان المستخدم يمكنه عرض أي موقع تدريب.
     */
    public function viewAny(User $user): bool
    {
        return true; // الجميع يمكنهم العرض (أو حسب الصلاحية)
    }

    /**
     * تحديد ما إذا كان المستخدم يمكنه عرض موقع تدريب محدد.
     */
    public function view(User $user, TrainingSite $trainingSite): bool
    {
        return true; // الجميع يمكنهم العرض
    }

    /**
     * تحديد ما إذا كان المستخدم يمكنه تحديث موقع تدريب.
     */
    public function update(User $user, TrainingSite $trainingSite): bool
    {
        $allowedRoles = ['admin', 'education_directorate', 'ministry_of_health'];
        if (in_array($user->role?->name, $allowedRoles, true)) {
            return true;
        }
        // مدير المدرسة أو المركز النفسي يعدّل موقع التدريب المرتبط بحسابه فقط
        if (in_array($user->role?->name, ['school_manager', 'psychology_center_manager', 'principal']) && $user->training_site_id) {
            return (int) $user->training_site_id === (int) $trainingSite->id;
        }

        return false;
    }

    /**
     * تحديد ما إذا كان المستخدم يمكنه حذف موقع تدريب.
     */
    public function delete(User $user, TrainingSite $trainingSite): bool
    {
        if ($user->role?->name === 'admin') {
            return true;
        }
        // مديرية التربية يمكنها حذف مواقع في مديريتها فقط
        if ($user->role?->name === 'education_directorate' && !empty($user->directorate)) {
            return $trainingSite->directorate === $user->directorate;
        }
        // وزارة الصحة يمكنها حذف مواقع تابعة لها
        if ($user->role?->name === 'ministry_of_health') {
            return true;
        }
        return false;
    }
}