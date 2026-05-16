<?php

namespace App\Services;

use App\Mail\SystemMessage;
use App\Models\EmailNotificationLog;
use App\Models\TrainingRequest;
use App\Models\TrainingRequestStudent;
use App\Models\User;
use App\Support\SchoolManagerSiteResolver;
use App\Support\TrainingRequestNotifications;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class TrainingRequestEmailService
{
    public function sendToSchoolManager(TrainingRequest $request): void
    {
        $request = $this->load($request);
        $site = $request->trainingSite;
        if (! $site) return;

        $manager = SchoolManagerSiteResolver::resolveManagerAccount($site);
        $toEmail = $manager?->email ?: $site->email;
        $toName  = $manager?->name ?? 'مدير جهة التدريب';

        if (empty($toEmail)) {
            Log::warning('[Email] Skipped — school has no email', ['request_id' => $request->id]);
            return;
        }

        $students = $request->trainingRequestStudents->map(fn ($s) => '• ' . ($s->user?->name ?? 'طالب'))->implode("\n");
        $url = $this->url("/training-requests/{$request->id}");
        $subject = 'وصول طلب تدريب جديد — ' . $site->name;
        $body = "تم إرسال طلب تدريب جديد إلى جهة التدريب \"{$site->name}\".\n\nالطلاب:\n{$students}\n\nالرابط:\n{$url}";

        $this->fire($toEmail, $toName, $subject, $body, $request->id, 'sent_to_school', 'school_manager');
    }

    public function sendRejectionToStudents(TrainingRequest $request, string $rejectedBy, string $reason): void
    {
        $request = $this->load($request);
        $label = match ($rejectedBy) {
            'coordinator' => 'المنسق الأكاديمي',
            'directorate' => 'المديرية',
            'school' => 'جهة التدريب',
            'head_of_department' => 'رئيس القسم',
            default => 'الجهة المختصة',
        };
        $reason = $reason ?: 'لم يتم ذكر سبب محدد.';
        $url = $this->url('/student/training-requests');
        $suffix = (string) $request->updated_at->timestamp;

        foreach ($request->trainingRequestStudents as $sr) {
            $student = $sr->user;
            if (! $student || empty($student->email)) continue;
            $body = "عزيزي/عزيزتي {$student->name}،\n\nتم رفض طلب التدريب من جهة: {$label}.\n\nالسبب:\n{$reason}\n\nالرابط:\n{$url}";
            $this->fire($student->email, $student->name, 'تحديث حالة طلب التدريب — تم الرفض', $body, $request->id, "rejected_by_{$rejectedBy}", 'student', $suffix);
        }

        if ($rejectedBy === 'school') {
            $gov = match ($request->trainingSite?->governing_body) {
                'ministry_of_health', 'health_directorate' => 'ministry_of_health',
                default => 'directorate_of_education',
            };
            TrainingRequestNotifications::forDirectorate($gov, 'school_rejection', "رفضت جهة التدريب طلب تدريب.", ['request_id' => $request->id]);
        }
    }

    public function sendDirectorateApprovalToStudents(TrainingRequest $request): void
    {
        $request = $this->load($request);
        $url = $this->url('/student/training-requests');
        foreach ($request->trainingRequestStudents as $sr) {
            $student = $sr->user;
            if (! $student || empty($student->email)) continue;
            $body = "عزيزي/عزيزتي {$student->name}،\n\nتمت موافقة المديرية على طلب التدريب.\n\nملاحظة: هذه ليست الموافقة النهائية، بانتظار موافقة جهة التدريب.\n\nالرابط:\n{$url}";
            $this->fire($student->email, $student->name, 'تحديث حالة طلب التدريب — موافقة المديرية', $body, $request->id, 'approved_by_directorate', 'student');
        }
    }

    public function sendSchoolApprovalToStudents(TrainingRequest $request): void
    {
        $request = $this->load($request);
        $site = $request->trainingSite;
        $url = $this->url('/student/training-followup');

        foreach ($request->trainingRequestStudents as $sr) {
            $student = $sr->user;
            if (! $student || empty($student->email)) continue;

            $assignment = $request->trainingAssignments->where('training_request_student_id', $sr->id)->first();
            $supervisor = $assignment?->fieldSupervisorAccount ?? $assignment?->teacher;

            if ($supervisor) {
                $phone = $supervisor->phone ? " — رقم التواصل: {$supervisor->phone}" : '';
                $supervisorInfo = "المشرف الميداني: {$supervisor->name}{$phone}\n";
            } else {
                $supervisorInfo = "سيتم تعيين المشرف الميداني لاحقًا وإبلاغك فورًا.\n";
            }

            $body = "عزيزي/عزيزتي {$student->name}،\n\nوافقت جهة التدريب \"{$site?->name}\" على طلبك.\n\n{$supervisorInfo}\nالرابط:\n{$url}";
            $this->fire($student->email, $student->name, 'تحديث حالة طلب التدريب — موافقة جهة التدريب', $body, $request->id, 'approved_by_school', 'student');
        }
    }

    public function sendSupervisorAssignment(TrainingRequest $request, int $assignmentId, bool $isUpdate): void
    {
        $request = $this->load($request);
        $site = $request->trainingSite;
        $url = $this->url('/student/training-followup');

        foreach ($request->trainingAssignments->where('id', $assignmentId) as $assignment) {
            $student = $assignment->trainingRequestStudent?->user;
            $supervisor = $assignment->fieldSupervisorAccount ?? $assignment->teacher;
            if (! $student || ! $supervisor) continue;

            $suffix = "{$assignmentId}:" . ($isUpdate ? '1' : '0');

            if (! empty($student->email)) {
                $phone = $supervisor->phone ? " — رقم التواصل: {$supervisor->phone}" : '';
                $label = $isUpdate ? 'تم تحديث' : 'تم تعيين';
                $body = "عزيزي/عزيزتي {$student->name}،\n\n{$label} المشرف الميداني: {$supervisor->name}{$phone}\n\nالرابط:\n{$url}";
                $this->fire($student->email, $student->name, 'تحديث المشرف الميداني — ' . $site?->name, $body, $request->id, 'supervisor_assigned', 'student', $suffix);
            }

            if (! empty($supervisor->email)) {
                $label2 = $isUpdate ? 'تم تحديث' : 'تم تعيينك';
                $sUrl = $this->url("/training-requests/{$request->id}");
                $body2 = "عزيزي/عزيزتي {$supervisor->name}،\n\n{$label2} مشرفًا ميدانيًا للطالب {$student->name} في \"{$site?->name}\".\n\nالرابط:\n{$sUrl}";
                $this->fire($supervisor->email, $supervisor->name, 'تعيين مشرف ميداني — ' . $site?->name, $body2, $request->id, 'supervisor_assigned', 'supervisor', $suffix . ':sv');
            }
        }
    }

    private function fire(string $email, string $name, string $subject, string $body, ?int $requestId, string $event, string $recipient, string $suffix = ''): void
    {
        $hash = hash('sha256', "{$requestId}:{$event}:{$email}:{$suffix}");

        if (EmailNotificationLog::where('dedup_hash', $hash)->exists()) {
            EmailNotificationLog::create(['training_request_id' => $requestId, 'event_type' => $event, 'recipient_type' => $recipient, 'recipient_email' => $email, 'subject' => $subject, 'body' => $body, 'status' => 'skipped', 'error_message' => 'Duplicate', 'dedup_hash' => $hash]);
            return;
        }

        try {
            Mail::to($email)->send(new SystemMessage($subject, $body, $name));
            EmailNotificationLog::create(['training_request_id' => $requestId, 'event_type' => $event, 'recipient_type' => $recipient, 'recipient_email' => $email, 'subject' => $subject, 'body' => $body, 'status' => 'sent', 'dedup_hash' => $hash, 'sent_at' => now()]);
        } catch (\Throwable $e) {
            Log::error('[Email] Failed', ['email' => $email, 'event' => $event, 'error' => $e->getMessage()]);
            EmailNotificationLog::create(['training_request_id' => $requestId, 'event_type' => $event, 'recipient_type' => $recipient, 'recipient_email' => $email, 'subject' => $subject, 'body' => $body, 'status' => 'failed', 'error_message' => $e->getMessage(), 'dedup_hash' => $hash]);
        }
    }

    private function load(TrainingRequest $r): TrainingRequest
    {
        return $r->loadMissing([
            'trainingSite.manager',
            'trainingRequestStudents.user',
            'trainingAssignments.fieldSupervisorAccount',
            'trainingAssignments.teacher',
            'trainingAssignments.trainingRequestStudent.user',
        ]);
    }

    private function url(string $path): string
    {
        return rtrim(env('FRONTEND_URL', env('APP_URL', 'http://localhost')), '/') . '/' . ltrim($path, '/');
    }
}
