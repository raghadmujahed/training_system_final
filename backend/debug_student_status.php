<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Section;

// Check both email variations
$emails = [
    'students2.usool12@students.hebron.edu',
    'students2.usool12@hebron.edu'
];

foreach ($emails as $email) {
    echo "\n🔍 Checking email: $email\n";
    echo str_repeat("-", 50) . "\n";
    
    $student = User::with('role')->where('email', $email)->first();
    
    if (!$student) {
        echo "❌ No student found with this email\n";
        continue;
    }
    
    echo "✅ Found student:\n";
    echo "  ID: {$student->id}\n";
    echo "  Name: {$student->name}\n";
    echo "  Email: {$student->email}\n";
    echo "  University ID: {$student->university_id}\n";
    echo "  Status: {$student->status}\n";
    echo "  Role ID: {$student->role_id}\n";
    echo "  Role Name: " . ($student->role?->name ?? 'No role') . "\n";
    
    // Check if student meets enrollment requirements
    $isActive = $student->status === 'active';
    $isStudent = $student->role?->name === 'student' || $student->role_id === 2;
    
    echo "\n📋 Validation Check:\n";
    echo "  Status 'active': " . ($isActive ? '✅' : '❌') . "\n";
    echo "  Is student role: " . ($isStudent ? '✅' : '❌') . "\n";
    echo "  Can enroll: " . ($isActive && $isStudent ? '✅' : '❌') . "\n";
    
    if (!$isActive) {
        echo "  ⚠️  Student is NOT active - this will cause validation error!\n";
    }
    
    if (!$isStudent) {
        echo "  ⚠️  User is NOT a student - this will cause validation error!\n";
    }
}

// Also check if there are any sections available for current period
echo "\n🔍 Checking available sections:\n";
echo str_repeat("-", 50) . "\n";

$sections = Section::whereNull('archived_at')
    ->with('course')
    ->limit(5)
    ->get();

echo "Available sections (first 5):\n";
foreach ($sections as $section) {
    echo "  - Section: {$section->name}, Course: {$section->course?->name}, ID: {$section->id}\n";
}
