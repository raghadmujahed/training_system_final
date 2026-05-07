<?php
require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;

$user = User::where('university_id', 'S2U2015')->first();

if ($user) {
    echo "User: " . $user->name . " (ID: " . $user->id . ")\n";
    
    // Check enrollments
    $enrollments = $user->enrollments()->with('section')->get();
    echo "Enrollments count: " . $enrollments->count() . "\n";
    
    foreach ($enrollments as $enrollment) {
        echo "  - Enrollment ID: " . $enrollment->id . ", Section: " . ($enrollment->section?->name ?? 'N/A') . ", Archived: " . ($enrollment->section?->archived_at ?? 'No') . "\n";
    }
    
    // Check current training assignment
    $assignment = $user->currentTrainingAssignment();
    if ($assignment) {
        echo "\nCurrent Training Assignment:\n";
        echo "  Assignment ID: " . $assignment->id . "\n";
        echo "  Site: " . ($assignment->trainingSite?->name ?? 'NULL') . "\n";
        echo "  Teacher: " . ($assignment->teacher?->name ?? 'NULL') . "\n";
        echo "  Period: " . ($assignment->trainingPeriod?->name ?? 'NULL') . "\n";
        echo "  Start Date: " . ($assignment->start_date ?? 'NULL') . "\n";
    } else {
        echo "\nNO TRAINING ASSIGNMENT FOUND\n";
    }
} else {
    echo "USER NOT FOUND\n";
}
