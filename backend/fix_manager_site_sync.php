<?php
/**
 * إصلاح عدم التزامن بين training_sites.manager_id و users.training_site_id
 *
 * المشكلة: عند ربط مدير بمدرسة عبر assignManager، كان يتم تحديث
 * training_sites.manager_id فقط دون تحديث users.training_site_id
 * مما يجعل جميع مديري المدارس يرون نفس البيانات بعد تسجيل الدخول.
 *
 * هذا السكربت يزامن البيانات الموجودة في قاعدة البيانات.
 */

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\TrainingSite;
use App\Models\User;

$fixed = 0;
$errors = 0;

// 1) لكل مدرسة لديها manager_id، تأكد أن training_site_id للمدير مضبوط
$sites = TrainingSite::whereNotNull('manager_id')->get();

foreach ($sites as $site) {
    $manager = User::find($site->manager_id);

    if (!$manager) {
        echo "⚠️  المدرسة «{$site->name}» (ID: {$site->id}) لديها manager_id = {$site->manager_id} لكن المستخدم غير موجود\n";
        $errors++;
        continue;
    }

    if ((int) $manager->training_site_id === (int) $site->id) {
        echo "✅ المدرسة «{$site->name}» — المدير «{$manager->name}» training_site_id مضبوط بالفعل ({$site->id})\n";
        continue;
    }

    $oldSiteId = $manager->training_site_id;
    $manager->update(['training_site_id' => $site->id]);
    echo "🔧 المدرسة «{$site->name}» — تم تحديث training_site_id للمدير «{$manager->name}» من " . ($oldSiteId ?? 'NULL') . " إلى {$site->id}\n";
    $fixed++;
}

// 2) لكل مدير مدرسة لديه training_site_id، تأكد أن manager_id بالمدرسة مضبوط
$managers = User::whereHas('role', function ($q) {
    $q->whereIn('name', ['school_manager', 'principal', 'psychology_center_manager']);
})->whereNotNull('training_site_id')->get();

foreach ($managers as $manager) {
    $site = TrainingSite::find($manager->training_site_id);

    if (!$site) {
        echo "⚠️  المدير «{$manager->name}» (ID: {$manager->id}) لديه training_site_id = {$manager->training_site_id} لكن المدرسة غير موجودة\n";
        $errors++;
        continue;
    }

    if ((int) $site->manager_id === (int) $manager->id) {
        continue; // already synced
    }

    $site->update(['manager_id' => $manager->id]);
    echo "🔧 المدرسة «{$site->name}» — تم تحديث manager_id من " . ($site->getOriginal('manager_id') ?? 'NULL') . " إلى {$manager->id} ({$manager->name})\n";
    $fixed++;
}

echo "\n═══════════════════════════════════════\n";
echo "تم الإصلاح: {$fixed} | أخطاء: {$errors}\n";
echo "═══════════════════════════════════════\n";
