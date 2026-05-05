<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\TrainingAssignment;
use App\Enums\AttendanceStatus;

class AttendanceService
{
    public function recordAttendance(array $data, int $userId): Attendance
    {
        return Attendance::create([
            'training_assignment_id' => $data['training_assignment_id'],
            'user_id' => $userId,
            'date' => $data['date'],
            'check_in' => $data['check_in'] ?? null,
            'check_out' => $data['check_out'] ?? null,
            'status' => $data['status'],
            'periods' => $data['periods'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);
    }

    public function approveAttendance(Attendance $attendance, int $approverId, ?string $notes = null): Attendance
    {
        $attendance->update([
            'approved_by' => $approverId,
            'approved_at' => now(),
            'status' => 'present',
            'notes' => $notes ?? $attendance->notes,
        ]);
        return $attendance;
    }

    public function rejectAttendance(Attendance $attendance, int $rejecterId, ?string $reason = null): Attendance
    {
        $attendance->update([
            'approved_by' => null,
            'approved_at' => null,
            'status' => 'rejected',
            'rejection_reason' => $reason,
        ]);
        return $attendance;
    }

    public function getAttendanceSummary(int $trainingAssignmentId): array
    {
        $stats = Attendance::where('training_assignment_id', $trainingAssignmentId)
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
            ")->first();

        return [
            'total_days' => $stats->total ?? 0,
            'present' => $stats->present ?? 0,
            'absent' => $stats->absent ?? 0,
            'late' => $stats->late ?? 0,
            'attendance_rate' => $stats->total > 0 ? round(($stats->present / $stats->total) * 100, 2) : 0,
        ];
    }
}