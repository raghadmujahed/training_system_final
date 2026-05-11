<?php

namespace App\Services;

use App\Models\TrainingLog;
use App\Models\Notification;
use App\Enums\TrainingLogStatus;

class TrainingLogService
{
    public function createLog(array $data, int $studentId): TrainingLog
    {
        $data['status'] = TrainingLogStatus::DRAFT->value;
        return TrainingLog::create($data);
    }

    public function submitLog(TrainingLog $log): TrainingLog
    {
        $log->update(['status' => TrainingLogStatus::SUBMITTED->value]);
        return $log;
    }

    public function reviewLog(TrainingLog $log, string $status, ?string $supervisorNotes = null): TrainingLog
    {
        $log->update([
            'status' => $status,
            'supervisor_notes' => $supervisorNotes ?? $log->supervisor_notes,
        ]);

        // إرسال إشعار للطالب
        $studentId = $log->trainingAssignment?->enrollment?->user_id;
        if ($studentId) {
            $dateStr = $log->log_date ?? '';
            if ($status === 'approved') {
                $msg = "تمت الموافقة على سجل التدريب بتاريخ {$dateStr}." . ($supervisorNotes ? " ملاحظات: {$supervisorNotes}" : '');
            } else {
                $msg = "تم إرجاع سجل التدريب بتاريخ {$dateStr}." . ($supervisorNotes ? " السبب: {$supervisorNotes}" : '');
            }
            Notification::create([
                'user_id' => $studentId,
                'type' => 'training_log_reviewed',
                'message' => $msg,
                'data' => ['log_id' => $log->id, 'status' => $status],
            ]);
        }

        return $log;
    }
}