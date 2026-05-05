<?php

/**
 * Script to check training request status for a student
 * Run with: php check_training_request.php <student_user_id>
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\TrainingRequest;
use App\Models\User;

$studentId = $argv[1] ?? null;

if (!$studentId) {
    echo "Usage: php check_training_request.php <student_user_id>\n";
    exit(1);
}

$student = User::find($studentId);

if (!$student) {
    echo "Student with ID {$studentId} not found.\n";
    exit(1);
}

echo "========================================\n";
echo "Student: {$student->name} (ID: {$student->id})\n";
echo "Email: {$student->email}\n";
echo "Department ID: {$student->department_id}\n";
echo "Training Site ID: {$student->training_site_id}\n";
echo "========================================\n\n";

$requests = TrainingRequest::with(['trainingSite', 'trainingRequestStudents'])
    ->where(function ($q) use ($student) {
        $q->where('requested_by', $student->id)
            ->orWhereHas('trainingRequestStudents', fn ($sq) => $sq->where('user_id', $student->id));
    })
    ->latest()
    ->get();

echo "Found " . $requests->count() . " training request(s):\n\n";

foreach ($requests as $request) {
    echo "----------------------------------------\n";
    echo "Request ID: {$request->id}\n";
    echo "Letter Number: {$request->letter_number}\n";
    echo "Book Status: {$request->book_status}\n";
    echo "Status: {$request->status}\n";
    echo "Requested By: {$request->requested_by}\n";
    echo "Training Site: " . ($request->trainingSite?->name ?? 'N/A') . "\n";
    echo "Created At: {$request->created_at}\n";
    echo "Updated At: {$request->updated_at}\n";
    
    $studentInRequest = $request->trainingRequestStudents->where('user_id', $student->id)->first();
    if ($studentInRequest) {
        echo "Student Status in Request: {$studentInRequest->status}\n";
        echo "Assigned Teacher ID: {$studentInRequest->assigned_teacher_id}\n";
    }
    echo "----------------------------------------\n\n";
}

echo "\n========================================\n";
echo "Latest Request Book Status: " . ($requests->first()?->book_status ?? 'N/A') . "\n";
echo "========================================\n";
