<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\PortfolioEntry;
use App\Models\StudentEForm;
use App\Models\TrainingAssignment;
use App\Models\TrainingLog;
use App\Services\StudentEFormAcademicReviewService;
use App\Services\TrainingTrackResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class StudentEFormController extends Controller
{
    private const WEEKLY_REPORT_FORM_KEYS = [
        'weekly_full_report',
        'weekly_brief_report',
        'weekly_reflection',
        'daily_tasks_report',
        'learning_experience_review',
        'field_visit_summary',
        'classes_count',
    ];
    public function index(Request $request)
    {
        $user = $request->user();
        if ($user->role?->name !== 'student') {
            return response()->json(['message' => 'هذه الخدمة متاحة للطلاب فقط.'], 403);
        }

        if (! Schema::hasTable('student_eforms')) {
            return response()->json([
                'data' => [],
                'message' => 'جدول النماذج الإلكترونية غير مُنشأ بعد. نفّذ الترحيل (migrate).',
            ]);
        }

        $items = StudentEForm::query()
            ->where('user_id', $user->id)
            ->latest('updated_at')
            ->get();

        return response()->json(['data' => $items]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if ($user->role?->name !== 'student') {
            return response()->json(['message' => 'هذه الخدمة متاحة للطلاب فقط.'], 403);
        }

        if (! Schema::hasTable('student_eforms')) {
            return response()->json([
                'message' => 'جدول النماذج الإلكترونية غير مُنشأ بعد. نفّذ الترحيل (migrate).',
            ], 503);
        }

        $data = $request->validate([
            'form_key' => ['required', 'string', 'max:120'],
            'title' => ['required', 'string', 'max:255'],
            'payload' => ['nullable', 'array'],
        ]);

        try {
            // Always create a new record — student can fill the same form multiple times
            $item = StudentEForm::create([
                'user_id' => $user->id,
                'form_key' => $data['form_key'],
                'title' => $data['title'],
                'payload' => $data['payload'] ?? [],
                'status' => 'draft',
                'submitted_at' => null,
            ]);

            // أنشئ TrainingLog تلقائياً لطلاب أصول التربية عند حفظ أي تقرير أسبوعي
            if (in_array($data['form_key'], self::WEEKLY_REPORT_FORM_KEYS, true)) {
                $user->loadMissing('department');
                $deptName = $user->department?->name ?? '';
                $isUsoolTarbiah = $deptName === TrainingTrackResolver::USOOL_TARBIAH
                    || $user->department_id === TrainingTrackResolver::usoolTarbiahDeptId();

                if ($isUsoolTarbiah) {
                    $assignment = TrainingAssignment::whereHas(
                        'enrollment',
                        fn ($q) => $q->where('user_id', $user->id)
                    )->latest('id')->first();

                    if ($assignment) {
                        $payload = $data['payload'] ?? [];
                        $reflectionJson = is_array($payload) && count($payload) > 0
                            ? json_encode($payload, JSON_UNESCAPED_UNICODE)
                            : '';

                        $log = TrainingLog::withArchived()
                            ->where('training_assignment_id', $assignment->id)
                            ->whereDate('log_date', now()->toDateString())
                            ->first();

                        if ($log) {
                            $log->update([
                                'activities_performed' => $data['title'],
                                'status'               => 'submitted',
                                'student_reflection'   => $reflectionJson,
                            ]);
                        } else {
                            TrainingLog::create([
                                'training_assignment_id' => $assignment->id,
                                'log_date'               => now()->toDateString(),
                                'activities_performed'   => $data['title'],
                                'status'                 => 'submitted',
                                'student_reflection'     => $reflectionJson,
                            ]);
                        }
                    }
                }
            }

            return response()->json($item);
        } catch (\Exception $e) {
            \Log::error('StudentEForm store error: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'form_key' => $data['form_key'],
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'فشل حفظ النموذج: ' . $e->getMessage()
            ], 500);
        }
    }

    public function submit(Request $request, StudentEForm $eform)
    {
        $user = $request->user();
        if ($user->role?->name !== 'student' || $eform->user_id !== $user->id) {
            return response()->json(['message' => 'غير مصرح.'], 403);
        }

        if (! Schema::hasTable('student_eforms')) {
            return response()->json([
                'message' => 'جدول النماذج الإلكترونية غير مُنشأ بعد. نفّذ الترحيل (migrate).',
            ], 503);
        }

        $data = $request->validate([
            'payload' => ['nullable', 'array'],
        ]);

        $payload = $data['payload'] ?? $eform->payload;

        $eform->update([
            'payload' => $payload,
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        $reviewService = app(StudentEFormAcademicReviewService::class);
        $portfolioEntry = $reviewService->onStudentResubmit($eform->fresh(), is_array($payload) ? $payload : null);
        $this->notifyAcademicSupervisorResubmit($eform->fresh(), $portfolioEntry);

        return response()->json($eform->fresh());
    }

    public function update(Request $request, StudentEForm $eform)
    {
        $user = $request->user();
        if ($user->role?->name !== 'student' || $eform->user_id !== $user->id) {
            return response()->json(['message' => 'غير مصرح.'], 403);
        }

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'payload' => ['nullable', 'array'],
        ]);

        $eform->update([
            'title' => $data['title'] ?? $eform->title,
            'payload' => $data['payload'] ?? $eform->payload,
            'status' => 'draft',
            'submitted_at' => null,
        ]);

        // حدّث TrainingLog لطلاب أصول التربية عند تعديل تقرير أسبوعي
        if (in_array($eform->form_key, self::WEEKLY_REPORT_FORM_KEYS, true)) {
            $user->loadMissing('department');
            $deptName = $user->department?->name ?? '';
            $isUsoolTarbiah = $deptName === TrainingTrackResolver::USOOL_TARBIAH
                || $user->department_id === TrainingTrackResolver::usoolTarbiahDeptId();

            if ($isUsoolTarbiah) {
                $assignment = TrainingAssignment::whereHas(
                    'enrollment',
                    fn ($q) => $q->where('user_id', $user->id)
                )->latest('id')->first();

                if ($assignment) {
                    $payload = $data['payload'] ?? $eform->payload;
                    $reflectionJson = is_array($payload) && count($payload) > 0
                        ? json_encode($payload, JSON_UNESCAPED_UNICODE)
                        : '';

                    $log = TrainingLog::withArchived()
                        ->where('training_assignment_id', $assignment->id)
                        ->whereDate('log_date', $eform->created_at->toDateString())
                        ->first();

                    if ($log) {
                        $log->update([
                            'activities_performed' => $eform->title,
                            'status'               => 'submitted',
                            'student_reflection'   => $reflectionJson,
                        ]);
                    }
                }
            }
        }

        return response()->json($eform->fresh());
    }

    private function notifyAcademicSupervisorResubmit(StudentEForm $eform, ?PortfolioEntry $entry): void
    {
        $eform->loadMissing('user');
        $student = $eform->user;
        if (! $student) {
            return;
        }

        $assignment = TrainingAssignment::whereHas(
            'enrollment',
            fn ($q) => $q->where('user_id', $student->id)
        )->latest('id')->first();

        $supervisor = $assignment?->academicSupervisor;
        if (! $supervisor && $student->department_id) {
            $supervisor = \App\Models\User::whereHas('role', fn ($q) => $q->where('name', 'academic_supervisor'))
                ->where('department_id', $student->department_id)
                ->first();
        }

        if (! $supervisor) {
            return;
        }

        $title = $eform->title ?: (StudentEFormAcademicReviewService::PORTFOLIO_TITLES[$eform->form_key] ?? $eform->form_key);

        Notification::create([
            'user_id' => $supervisor->id,
            'type' => 'eform_resubmitted',
            'message' => "أعاد الطالب {$student->name} إرسال النموذج: {$title}",
            'notifiable_type' => $entry ? PortfolioEntry::class : StudentEForm::class,
            'notifiable_id' => $entry?->id ?? $eform->id,
            'data' => [
                'student_id' => $student->id,
                'student_name' => $student->name,
                'form_key' => $eform->form_key,
                'eform_id' => $eform->id,
                'portfolio_entry_id' => $entry?->id,
            ],
        ]);
    }
}
