<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Enrollment;

// Check both email variations
$emails = [
    'students2.usool12@students.hebron.edu',  // Email from error message
    'students2.usool12@hebron.edu'           // Email in database
];

foreach ($emails as $email) {
    echo "\n🔍 Checking email: $email\n";
    echo str_repeat("-", 50) . "\n";
    
    $student = User::where('email', $email)->first();
    
    if (!$student) {
        echo "❌ No student found with this email\n";
        continue;
    }
    
    echo "✅ Found student: ID {$student->id}, Name: {$student->name}\n";
    
    // Check active enrollments
    $activeEnrollments = Enrollment::where('user_id', $student->id)
        ->where('status', '!=', 'dropped')
        ->whereHas('section', function ($q) {
            $q->whereNull('archived_at');
        })
        ->with(['section.course'])
        ->get();
    
    echo "📊 Active enrollments: " . $activeEnrollments->count() . "\n";
    
    foreach ($activeEnrollments as $enrollment) {
        $courseName = $enrollment->section?->course?->name ?? 'N/A';
        $sectionName = $enrollment->section?->name ?? 'N/A';
        $academicYear = $enrollment->academic_year ?? 'N/A';
        $semester = $enrollment->semester ?? 'N/A';
        
        echo "  - Course: $courseName, Section: $sectionName, Year: $academicYear, Semester: $semester\n";
    }
}

echo "\n💡 Recommendation:\n";
echo "If you're trying to register 'students2.usool12@students.hebron.edu',\n";
echo "but the system finds 'students2.usool12@hebron.edu' with active enrollments,\n";
echo "then either:\n";
echo "1. Use the correct email: students2.usool12@hebron.edu\n";
echo "2. Or update the student's email in the database\n";
