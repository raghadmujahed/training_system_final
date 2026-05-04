<?php

/**
 * One-off: php scripts/inspect_fs_counselor.php
 * فحص حساب fs.counselor.school@hebron.edu والربط بجهة التدريب.
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$email = 'fs.counselor.school@hebron.edu';

$user = \App\Models\User::query()
    ->where('email', $email)
    ->with(['role', 'trainingSite', 'fieldSupervisorProfile'])
    ->first();

if (!$user) {
    fwrite(STDOUT, "NOT_FOUND: لا يوجد مستخدم بهذا البريد في قاعدة البيانات.\n");
    exit(0);
}

$site = $user->trainingSite;
$profile = $user->fieldSupervisorProfile;

$assignments = \App\Models\TrainingAssignment::query()
    ->where('teacher_id', $user->id)
    ->whereIn('status', ['assigned', 'ongoing'])
    ->with('trainingSite:id,name')
    ->get(['id', 'training_site_id', 'status', 'enrollment_id']);

$payload = [
    'user' => [
        'id' => $user->id,
        'name' => $user->name,
        'email' => $user->email,
        'role' => $user->role?->name,
        'training_site_id' => $user->training_site_id,
        'training_site_name' => $site?->name,
    ],
    'field_supervisor_profile' => $profile ? [
        'workplace_name' => $profile->workplace_name,
        'workplace_type' => $profile->workplace_type,
        'supervisor_type' => $profile->supervisor_type,
    ] : null,
    'assignments_as_field_supervisor' => $assignments->map(fn ($a) => [
        'assignment_id' => $a->id,
        'training_site_id' => $a->training_site_id,
        'training_site_name' => $a->trainingSite?->name,
        'status' => $a->status,
    ])->values()->all(),
];

fwrite(STDOUT, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n");
