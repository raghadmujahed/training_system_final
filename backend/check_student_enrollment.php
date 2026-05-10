<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Enrollment;
use App\Models\Section;

// Find the student by email
$studentEmail = 'students2.usool12@students.hebron.edu';
$student = User::where('email', $studentEmail)->first();

if (!$student) {
    echo "Student not found with email: $studentEmail\n";
    exit;
}

echo "Found student: ID {$student->id}, Name: {$student->name}\n";

// Check all enrollments for this student
$enrollments = Enrollment::where('user_id', $student->id)
    ->with(['section.course'])
    ->get();

echo "\nAll enrollments for this student:\n";
foreach ($enrollments as $enrollment) {
    $status = $enrollment->status ?? 'N/A';
    $courseName = $enrollment->section?->course?->name ?? 'N/A';
    $sectionName = $enrollment->section?->name ?? 'N/A';
    $academicYear = $enrollment->academic_year ?? 'N/A';
    $semester = $enrollment->semester ?? 'N/A';
    $archivedAt = $enrollment->section?->archived_at ?? 'Not archived';
    
    echo "- Enrollment ID: {$enrollment->id}\n";
    echo "  Course: $courseName\n";
    echo "  Section: $sectionName\n";
    echo "  Academic Year: $academicYear\n";
    echo "  Semester: $semester\n";
    echo "  Status: $status\n";
    echo "  Section Archived: $archivedAt\n";
    echo "  ---\n";
}

// Check specifically for active enrollments (excluding dropped and archived)
$activeEnrollments = Enrollment::where('user_id', $student->id)
    ->where('status', '!=', 'dropped')
    ->whereHas('section', function ($q) {
        $q->whereNull('archived_at');
    })
    ->with(['section.course'])
    ->get();

echo "\nActive enrollments (excluding dropped and archived):\n";
foreach ($activeEnrollments as $enrollment) {
    $status = $enrollment->status ?? 'N/A';
    $courseName = $enrollment->section?->course?->name ?? 'N/A';
    $sectionName = $enrollment->section?->name ?? 'N/A';
    $academicYear = $enrollment->academic_year ?? 'N/A';
    $semester = $enrollment->semester ?? 'N/A';
    
    echo "- Enrollment ID: {$enrollment->id}\n";
    echo "  Course: $courseName\n";
    echo "  Section: $sectionName\n";
    echo "  Academic Year: $academicYear\n";
    echo "  Semester: $semester\n";
    echo "  Status: $status\n";
    echo "  ---\n";
}

echo "\nTotal enrollments: " . $enrollments->count() . "\n";
echo "Active enrollments: " . $activeEnrollments->count() . "\n";
