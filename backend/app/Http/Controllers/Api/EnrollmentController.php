<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEnrollmentRequest;
use App\Http\Requests\UpdateEnrollmentRequest;
use App\Http\Resources\EnrollmentResource;
use App\Models\Enrollment;
use App\Models\Notification as AppNotification;
use Illuminate\Http\Request;

class EnrollmentController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(Enrollment::class, 'enrollment');
    }

    public function index(Request $request)
    {
        $query = Enrollment::with(['user', 'section.course']);
        if ($request->has('section_id')) $query->where('section_id', $request->section_id);
        if ($request->has('user_id')) $query->where('user_id', $request->user_id);
        if ($request->has('status')) $query->where('status', $request->status);
        if ($request->filled('search')) {
            $term = '%' . str_replace(['%', '_'], ['\%', '\_'], $request->search) . '%';
            $query->whereHas('user', function ($uq) use ($term) {
                $uq->where('name', 'like', $term)
                    ->orWhere('university_id', 'like', $term)
                    ->orWhere('email', 'like', $term);
            });
        }

        $enrollments = $query->paginate($request->per_page ?? 15);
        return EnrollmentResource::collection($enrollments);
    }

    public function store(StoreEnrollmentRequest $request)
    {
        $data = $request->validated();

        // Check if student is already enrolled in any ACTIVE section during this period
        // Exclude: dropped, and sections that are archived
        $existingEnrollment = Enrollment::where('user_id', $data['user_id'])
            ->where('academic_year', $data['academic_year'])
            ->where('semester', $data['semester'])
            ->where('status', '!=', 'dropped')
            ->whereHas('section', function ($q) {
                $q->whereNull('archived_at'); // Exclude archived sections
            })
            ->with(['section.course'])
            ->first();

        if ($existingEnrollment) {
            $courseName = $existingEnrollment->section?->course?->name ?? 'غير معروف';
            $sectionName = $existingEnrollment->section?->name ?? 'غير معروف';
            return response()->json([
                'message' => "الطالب مسجل بالفعل في مساق ({$courseName}) شعبة ({$sectionName}) لنفس الفترة التدريبية. لا يمكن تسجيله في أكثر من شعبة أو مساق في نفس الفترة."
            ], 422);
        }
        
        $enrollment = Enrollment::create($data);

        // إشعار الطالب بإضافته إلى الشعبة
        $enrollment->load('section.course');
        $courseName = $enrollment->section?->course?->name ?? '';
        $sectionName = $enrollment->section?->name ?? '';
        AppNotification::create([
            'user_id' => $enrollment->user_id,
            'type' => 'enrollment_added',
            'message' => "تمت إضافتك إلى شعبة \"{$sectionName}\" في مساق \"{$courseName}\".",
            'notifiable_type' => Enrollment::class,
            'notifiable_id' => $enrollment->id,
            'data' => [
                'enrollment_id' => $enrollment->id,
                'section_id' => $enrollment->section_id,
                'course_name' => $courseName,
                'section_name' => $sectionName,
            ],
        ]);

        return new EnrollmentResource($enrollment);
    }

    public function show(Enrollment $enrollment)
    {
        return new EnrollmentResource($enrollment->load(['user', 'section.course']));
    }

    public function update(UpdateEnrollmentRequest $request, Enrollment $enrollment)
    {
        $previousStatus = $enrollment->status;
        $enrollment->update($request->validated());

        // إشعار الطالب عند تغيير الحالة
        if ($enrollment->wasChanged('status') && $previousStatus !== $enrollment->status) {
            $statusLabels = [
                'active' => 'نشط',
                'completed' => 'مكتمل',
                'dropped' => 'منسحب',
                'failed' => 'راسب',
            ];
            $label = $statusLabels[$enrollment->status] ?? $enrollment->status;
            AppNotification::create([
                'user_id' => $enrollment->user_id,
                'type' => 'enrollment_status_changed',
                'message' => "تم تغيير حالة تسجيلك إلى \"{$label}\".",
                'notifiable_type' => Enrollment::class,
                'notifiable_id' => $enrollment->id,
                'data' => ['enrollment_id' => $enrollment->id, 'status' => $enrollment->status],
            ]);
        }

        return new EnrollmentResource($enrollment);
    }

    public function destroy(Enrollment $enrollment)
    {
        $userId = $enrollment->user_id;
        $enrollment->load('section.course');
        $sectionName = $enrollment->section?->name ?? '';

        $enrollment->delete();

        AppNotification::create([
            'user_id' => $userId,
            'type' => 'enrollment_removed',
            'message' => "تمت إزالتك من شعبة \"{$sectionName}\".",
            'data' => ['section_name' => $sectionName],
        ]);

        return response()->json(['message' => 'تم حذف التسجيل']);
    }
}