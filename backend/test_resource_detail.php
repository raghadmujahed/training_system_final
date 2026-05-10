<?php
/**
 * اختبار مفصل — ماذا يرجع UserResource لـ training_site بالضبط؟
 */
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Http\Resources\UserResource;

$user = User::where('id', 78)->first(); // مدير مدرسة بنات دورا الأساسية
$user->load(['role', 'department', 'trainingSite', 'enrollments.section.course']);

$resource = (new UserResource($user))->toArray(request());

echo "=== User ID:78 (مدير مدرسة بنات دورا الأساسية) ===" . PHP_EOL;
echo "training_site_id column: " . $user->training_site_id . PHP_EOL;
echo "trainingSite relation name: " . ($user->trainingSite?->name ?? 'NULL') . PHP_EOL;
echo PHP_EOL . "--- Full Resource output ---" . PHP_EOL;
echo "training_site key: " . json_encode($resource['training_site'] ?? 'KEY MISSING', JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
echo "role key: " . json_encode($resource['role'] ?? 'KEY MISSING', JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
echo "department key: " . json_encode($resource['department'] ?? 'KEY MISSING', JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;

// Also test the full JSON response like the API would return
$fullJson = (new UserResource($user))->toResponse(request())->getContent();
echo PHP_EOL . "--- Full JSON API response (first 2000 chars) ---" . PHP_EOL;
echo substr($fullJson, 0, 2000) . PHP_EOL;
