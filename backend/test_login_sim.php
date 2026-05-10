<?php
/**
 * اختبار: محاكاة تسجيل الدخول الكامل والتحقق من البيانات
 */
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

use App\Models\User;
use App\Http\Resources\UserResource;
use App\Services\TrainingTrackResolver;

// Simulate login for 3 different school managers
$testIds = [71, 78, 82]; // ثلاثة مديري مدارس مختلفين

echo "=== محاكاة رد تسجيل الدخول لكل مدير ===" . PHP_EOL . PHP_EOL;

foreach ($testIds as $id) {
    $user = User::where('id', $id)->first();
    if (!$user) continue;
    
    // Same as UserController::login
    $userResource = new UserResource($user->load(['role', 'department', 'trainingSite', 'fieldSupervisorProfile', 'enrollments.section.course']));
    
    $loginResponse = [
        'user' => $userResource,
        'access_token' => 'test_token_' . $id,
        'token_type' => 'Bearer',
        'department_ids' => [
            'psychology' => TrainingTrackResolver::psychologyDeptId(),
            'usool_tarbiah' => TrainingTrackResolver::usoolTarbiahDeptId(),
        ],
    ];
    
    // Convert to array like JSON response
    $responseArray = json_decode(json_encode($loginResponse), true);
    
    // Simulate what Login.jsx does
    $userData = $responseArray['user']['data'] ?? $responseArray['user'];
    $trainingSite = $userData['training_site']['data'] ?? $userData['training_site'] ?? null;
    
    echo "--- User ID:{$id} | {$user->name} ---" . PHP_EOL;
    echo "  training_site_id (column): " . ($userData['training_site_id'] ?? 'NULL') . PHP_EOL;
    echo "  training_site.name: " . ($trainingSite['name'] ?? 'NULL') . PHP_EOL;
    echo "  training_site.directorate: " . ($trainingSite['directorate'] ?? 'NULL') . PHP_EOL;
    echo "  role.name: " . ($userData['role']['name'] ?? 'NULL') . PHP_EOL;
    echo PHP_EOL;
}
