<?php
/**
 * اختبار تسجيل دخول مديري المدارس — هل كل مدير بيشوف مدرسته الصحيحة؟
 */
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Http\Resources\UserResource;

$managers = User::whereHas('role', function ($q) {
    $q->whereIn('name', ['school_manager', 'psychology_center_manager']);
})->limit(5)->get();

echo "=== اختبار بيانات مديري المدارس بعد تسجيل الدخول ===" . PHP_EOL . PHP_EOL;

foreach ($managers as $user) {
    $user->load(['role', 'department', 'trainingSite', 'enrollments.section.course']);
    $resource = (new UserResource($user))->toArray(request());
    
    $trainingSiteFromResource = $resource['training_site'] ?? null;
    $siteName = is_array($trainingSiteFromResource) ? ($trainingSiteFromResource['name'] ?? 'NULL') : 'NULL';
    $siteId = is_array($trainingSiteFromResource) ? ($trainingSiteFromResource['id'] ?? 'NULL') : 'NULL';
    
    echo "User ID:{$user->id} | {$user->name}" . PHP_EOL;
    echo "  training_site_id (column): {$user->training_site_id}" . PHP_EOL;
    echo "  trainingSite (relation): " . ($user->trainingSite?->name ?? 'NULL') . PHP_EOL;
    echo "  Resource training_site.id: {$siteId}" . PHP_EOL;
    echo "  Resource training_site.name: {$siteName}" . PHP_EOL;
    echo PHP_EOL;
}
