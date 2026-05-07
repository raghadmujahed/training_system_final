<?php
require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

$rows = DB::select("SELECT u.id, u.name, u.university_id, ta.id as assignment_id, ta.training_site_id, ta.teacher_id, ta.training_period_id, ts.name as site_name, t.name as teacher_name, tp.name as period_name FROM users u LEFT JOIN training_assignments ta ON ta.user_id = u.id AND ta.status = 'active' LEFT JOIN training_sites ts ON ts.id = ta.training_site_id LEFT JOIN users t ON t.id = ta.teacher_id LEFT JOIN training_periods tp ON tp.id = ta.training_period_id WHERE u.university_id = 'S2U2015'");

if (count($rows) > 0) {
    $row = $rows[0];
    echo "User ID: " . $row->id . "\n";
    echo "Name: " . $row->name . "\n";
    echo "University ID: " . $row->university_id . "\n";
    echo "Assignment ID: " . ($row->assignment_id ?? 'NULL') . "\n";
    echo "Site ID: " . ($row->training_site_id ?? 'NULL') . "\n";
    echo "Site Name: " . ($row->site_name ?? 'NULL') . "\n";
    echo "Teacher ID: " . ($row->teacher_id ?? 'NULL') . "\n";
    echo "Teacher Name: " . ($row->teacher_name ?? 'NULL') . "\n";
    echo "Period ID: " . ($row->training_period_id ?? 'NULL') . "\n";
    echo "Period Name: " . ($row->period_name ?? 'NULL') . "\n";
} else {
    echo "No user found with university_id S2U2015\n";
}
