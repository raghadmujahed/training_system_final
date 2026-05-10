<?php
/**
 * فحص حالة training_site_id لمديري المدارس
 */
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;

$managers = User::whereHas('role', function ($q) {
    $q->whereIn('name', ['school_manager', 'principal', 'psychology_center_manager']);
})->get();

echo "=== مديري المدارس وحالة training_site_id ===" . PHP_EOL . PHP_EOL;

$nullCount = 0;
$okCount = 0;

foreach ($managers as $m) {
    $siteId = $m->training_site_id;
    $siteName = $siteId ? ($m->trainingSite?->name ?? 'موقع غير موجود') : '—';
    $status = $siteId ? '✅' : '❌ NULL';

    if (!$siteId) $nullCount++; else $okCount++;

    echo "ID:{$m->id} | {$m->name} | role:{$m->role?->name} | training_site_id=" . ($siteId ?? 'NULL') . " | school: {$siteName} {$status}" . PHP_EOL;
}

echo PHP_EOL . "═══════════════════════════════════════" . PHP_EOL;
echo "مضبوط: {$okCount} | فارغ: {$nullCount}" . PHP_EOL;
echo "═══════════════════════════════════════" . PHP_EOL;
