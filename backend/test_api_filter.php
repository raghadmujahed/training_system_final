<?php
/**
 * اختبار مباشر: تسجيل دخول مديرين مختلفين عبر API
 * والتحقق من أن كل واحد بيشوف مدرسته فقط
 */
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\Request;

// Pick two different school managers
$manager1 = User::where('id', 71)->first(); // مدرسة ذكور الخليل الأساسية
$manager2 = User::where('id', 78)->first(); // مدرسة بنات دورا الأساسية

echo "=== اختبار مباشر: ماذا يرجع /user و /training-requests لكل مدير ===" . PHP_EOL . PHP_EOL;

foreach ([$manager1, $manager2] as $mgr) {
    echo "--- المدير: {$mgr->name} (ID:{$mgr->id}) ---" . PHP_EOL;
    echo "  training_site_id: {$mgr->training_site_id}" . PHP_EOL;
    echo "  trainingSite name: " . ($mgr->trainingSite?->name ?? 'NULL') . PHP_EOL;
    
    // Simulate what TrainingRequestController::index would do
    $trainingSiteId = $mgr->training_site_id;
    $isSchoolManager = in_array($mgr->role?->name, ['school_manager', 'psychology_center_manager'], true);
    
    echo "  isSchoolManager: " . ($isSchoolManager ? 'yes' : 'no') . PHP_EOL;
    echo "  Would filter training_requests by training_site_id: " . ($isSchoolManager && $trainingSiteId ? "YES ({$trainingSiteId})" : "NO — ALL SITES RETURNED") . PHP_EOL;
    
    // Count training requests for this site vs total
    $totalRequests = \App\Models\TrainingRequest::count();
    $filteredRequests = \App\Models\TrainingRequest::where('training_site_id', $trainingSiteId)->count();
    echo "  Total training requests in DB: {$totalRequests}" . PHP_EOL;
    echo "  Training requests for this site: {$filteredRequests}" . PHP_EOL;
    echo PHP_EOL;
}
