<?php
/**
 * اختبار: ما هو شكل رد /user الفعلي (مع data wrapper)
 */
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

use App\Models\User;
use App\Http\Resources\UserResource;

$user = User::where('id', 78)->first(); // مدير مدرسة بنات دورا
$user->load(['role', 'department', 'trainingSite', 'enrollments.section.course']);

// Same as currentUser() endpoint
$response = (new UserResource($user));
$json = $response->toResponse(request())->getContent();
$data = json_decode($json, true);

echo "=== Full /user response for manager ID:78 ===" . PHP_EOL . PHP_EOL;
echo "Top-level keys: " . implode(', ', array_keys($data)) . PHP_EOL;
echo "data.training_site_id: " . ($data['data']['training_site_id'] ?? 'MISSING') . PHP_EOL;
echo "data.training_site exists: " . (isset($data['data']['training_site']) ? 'YES' : 'NO') . PHP_EOL;

if (isset($data['data']['training_site'])) {
    $ts = $data['data']['training_site'];
    echo "data.training_site.name: " . ($ts['name'] ?? 'MISSING') . PHP_EOL;
    echo "data.training_site has 'data' key: " . (isset($ts['data']) ? 'YES' : 'NO') . PHP_EOL;
}

echo PHP_EOL . "--- What the frontend sees ---" . PHP_EOL;
// getCurrentUser returns response.data (from axios), so it's the full JSON object
// userRes = response.data = { data: { id, name, training_site: {...}, ... } }
// u = userRes?.data || userRes || {}
// So u = { id: 78, name: "...", training_site: { id: 8, name: "مدرسة بنات دورا..." } }

$userRes = $data; // This is what axios returns as response.data
$u = $userRes['data'] ?? $userRes;
$site = $u['training_site']['data'] ?? $u['training_site'] ?? [];

echo "u.training_site_id: " . ($u['training_site_id'] ?? 'MISSING') . PHP_EOL;
echo "site.name: " . ($site['name'] ?? 'MISSING') . PHP_EOL;
echo "site.directorate: " . ($site['directorate'] ?? 'MISSING') . PHP_EOL;
