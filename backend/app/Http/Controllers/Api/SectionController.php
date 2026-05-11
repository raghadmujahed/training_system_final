<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSectionRequest;
use App\Http\Requests\UpdateSectionRequest;
use App\Http\Resources\SectionResource;
use App\Http\Resources\EnrollmentResource;
use App\Models\Course;
use App\Models\Notification as AppNotification;
use App\Models\Section;
use App\Models\TrainingPeriod;
use App\Models\User;
use Illuminate\Http\Request;

class SectionController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(Section::class, 'section');
    }

    public function index(Request $request)
    {
        // Always exclude archived sections - do not allow overriding this via request params
        $query = Section::with(['course.department', 'academicSupervisor', 'createdBy'])
            ->withCount('enrollments');

        // Restrict head_of_department to their own department
        $user = auth()->user();
        $role = $user?->role?->name;
        if ($role === 'head_of_department' && $user->department_id) {
            $courseIds = Course::where('department_id', $user->department_id)->pluck('id');
            $query->whereIn('course_id', $courseIds);
        }

        // Department filter - filter by course's department
        if ($request->filled('department_id')) {
            $courseIds = Course::where('department_id', $request->department_id)->pluck('id');
            $query->whereIn('course_id', $courseIds);
        }

        // Academic supervisor filter
        if ($request->filled('academic_supervisor_id')) {
            $query->where('academic_supervisor_id', $request->academic_supervisor_id);
        }

        // Legacy filters (kept for backward compatibility)
        if ($request->filled('course_id')) {
            $query->where('course_id', $request->course_id);
        }
        if ($request->filled('semester')) {
            $query->where('semester', $request->semester);
        }
        if ($request->filled('academic_year')) {
            $query->where('academic_year', $request->academic_year);
        }

        $sections = $query->paginate($request->per_page ?? 15);

        return SectionResource::collection($sections);
    }

    public function store(StoreSectionRequest $request)
    {
        $data = $request->validated();
        $data['created_by'] = auth()->id();

        // Auto-assign active training period
        $activePeriod = TrainingPeriod::active()->first();
        if ($activePeriod) {
            $data['training_period_id'] = $activePeriod->id;
        }

        // Validate supervisor matches course department
        $this->ensureAcademicSupervisorMatchesCourse(
            $data['academic_supervisor_id'],
            (int) $data['course_id']
        );

        $section = Section::create($data);

        // إشعار المشرف الأكاديمي
        $this->notifySupervisorAssigned($section, $data['academic_supervisor_id']);

        return new SectionResource($section->load(['course', 'academicSupervisor', 'createdBy']));
    }

    public function show(Section $section)
    {
        $section->loadCount('enrollments');
        return new SectionResource($section->load(['course', 'academicSupervisor', 'createdBy']));
    }

    public function update(UpdateSectionRequest $request, Section $section)
    {
        $data = $request->validated();

        // Prevent removing the supervisor by setting it to null/empty
        if (array_key_exists('academic_supervisor_id', $data)) {
            if (empty($data['academic_supervisor_id'])) {
                return response()->json([
                    'message' => 'لا يمكن إزالة المشرف الأكاديمي من الشعبة',
                    'errors' => [
                        'academic_supervisor_id' => ['يجب اختيار مشرف أكاديمي للشعبة']
                    ]
                ], 422);
            }

            $this->ensureAcademicSupervisorMatchesCourse(
                $data['academic_supervisor_id'],
                (int) ($data['course_id'] ?? $section->course_id)
            );
        }

        $previousSupervisorId = $section->academic_supervisor_id;
        $section->update($data);

        // إشعار المشرف الجديد إذا تغيّر
        if (array_key_exists('academic_supervisor_id', $data)
            && $section->academic_supervisor_id
            && $section->academic_supervisor_id !== $previousSupervisorId) {
            $this->notifySupervisorAssigned($section, $section->academic_supervisor_id);
        }

        return new SectionResource($section->load(['course', 'academicSupervisor', 'createdBy']));
    }

    public function destroy(Section $section)
    {
        // Check if section has students
        if ($section->students()->count() > 0) {
            return response()->json(['message' => 'لا يمكن حذف شعبة تحتوي على طلاب'], 422);
        }
        
        $section->delete();

        return response()->json(['message' => 'تم حذف الشعبة']);
    }

    // Student assignment methods
    public function addStudent(Request $request, Section $section)
    {
        $request->validate([
            'student_id' => 'required|exists:users,id',
            'status' => 'sometimes|in:accepted,rejected,pending',
            'notes' => 'sometimes|nullable|string'
        ]);

        $studentId = $request->student_id;
        
        // Check if student is already assigned to this section
        if ($section->students()->where('student_id', $studentId)->exists()) {
            return response()->json(['message' => 'الطالب مسجل بالفعل في هذه الشعبة'], 422);
        }

        // Check section capacity
        if (!$section->hasAvailableCapacity()) {
            return response()->json(['message' => 'الشعبة ممتلئة'], 422);
        }

        // Remove student from other sections of the same course if exists
        $section->course->sections()->each(function ($otherSection) use ($studentId) {
            $otherSection->students()->detach($studentId);
        });

        // Add student to this section
        $section->students()->attach($studentId, [
            'status' => $request->status ?? 'accepted',
            'notes' => $request->notes
        ]);

        // إشعار المشرف الأكاديمي بإضافة طالب لشعبته
        if ($section->academic_supervisor_id) {
            $student = User::find($studentId);
            $section->loadMissing('course');
            AppNotification::create([
                'user_id' => $section->academic_supervisor_id,
                'type' => 'student_added_to_section',
                'message' => "تمت إضافة الطالب \"{$student?->name}\" إلى شعبتك \"{$section->name}\" في مساق \"{$section->course?->name}\".",
                'notifiable_type' => Section::class,
                'notifiable_id' => $section->id,
                'data' => [
                    'section_id' => $section->id,
                    'student_id' => $studentId,
                    'section_name' => $section->name,
                    'course_name' => $section->course?->name,
                ],
            ]);
        }

        return response()->json(['message' => 'تم إضافة الطالب للشعبة بنجاح']);
    }

    public function removeStudent(Request $request, Section $section)
    {
        $request->validate([
            'student_id' => 'required|exists:users,id'
        ]);

        $studentId = $request->student_id;
        
        if (!$section->students()->where('student_id', $studentId)->exists()) {
            return response()->json(['message' => 'الطالب غير مسجل في هذه الشعبة'], 422);
        }

        $section->students()->detach($studentId);

        return response()->json(['message' => 'تم إزالة الطالب من الشعبة بنجاح']);
    }

    public function moveStudent(Request $request, Section $section)
    {
        $request->validate([
            'student_id' => 'required|exists:users,id',
            'target_section_id' => 'required|exists:sections,id'
        ]);

        $studentId = $request->student_id;
        $targetSectionId = $request->target_section_id;

        $targetSection = Section::findOrFail($targetSectionId);

        // Check if target section has capacity
        if (!$targetSection->hasAvailableCapacity()) {
            return response()->json(['message' => 'الشعبة المستهدفة ممتلئة'], 422);
        }

        // Remove from current section
        $section->students()->detach($studentId);

        // Add to target section
        $targetSection->students()->attach($studentId, [
            'status' => 'accepted'
        ]);

        return response()->json(['message' => 'تم نقل الطالب بنجاح']);
    }

    public function assignSupervisor(Request $request, Section $section)
    {
        $request->validate([
            'supervisor_id' => 'nullable|exists:users,id'
        ]);

        $this->ensureAcademicSupervisorMatchesCourse($request->supervisor_id, (int) $section->course_id);

        // Check if academic supervisor is already assigned to another section of the same course
        if ($request->supervisor_id) {
            $existingAssignment = Section::where('course_id', $section->course_id)
                ->where('academic_supervisor_id', $request->supervisor_id)
                ->where('id', '!=', $section->id)
                ->exists();

            if ($existingAssignment) {
                return response()->json(['message' => 'المشرف مسجل بالفعل في شعبة أخرى من نفس المساق'], 422);
            }
        }

        $previousSupervisorId = $section->academic_supervisor_id;
        $section->update(['academic_supervisor_id' => $request->supervisor_id]);

        if ($request->supervisor_id && $request->supervisor_id !== $previousSupervisorId) {
            $this->notifySupervisorAssigned($section, $request->supervisor_id);
        }

        return response()->json(['message' => 'تم تعيين المشرف بنجاح']);
    }

    public function getEnrollments(Section $section)
    {
        $this->authorize('view', $section);
        
        $enrollments = $section->enrollments()
            ->with(['user' => function ($query) {
                $query->select('id', 'name', 'university_id', 'email', 'phone');
            }])
            ->get();
        
        return response()->json(['data' => EnrollmentResource::collection($enrollments)]);
    }

    private function notifySupervisorAssigned(Section $section, int $supervisorId): void
    {
        $section->loadMissing('course');
        $courseName = $section->course?->name ?? '';
        AppNotification::create([
            'user_id' => $supervisorId,
            'type' => 'section_supervisor_assigned',
            'message' => "تم تعيينك مشرفاً أكاديمياً على شعبة \"{$section->name}\" في مساق \"{$courseName}\".",
            'notifiable_type' => Section::class,
            'notifiable_id' => $section->id,
            'data' => [
                'section_id' => $section->id,
                'course_name' => $courseName,
                'section_name' => $section->name,
            ],
        ]);
    }

    private function ensureAcademicSupervisorMatchesCourse(?int $supervisorId, int $courseId): void
    {
        if (! $supervisorId) {
            return;
        }

        $supervisor = User::with(['role', 'department'])->findOrFail($supervisorId);

        abort_unless(
            $supervisor->role?->name === 'academic_supervisor',
            422,
            'المستخدم المحدد ليس مشرفاً أكاديمياً.'
        );

        $courseDepartmentId = Course::where('id', $courseId)->value('department_id');

        if ($courseDepartmentId && $supervisor->department_id) {
            abort_unless(
                (int) $courseDepartmentId === (int) $supervisor->department_id,
                422,
                'قسم المشرف الأكاديمي لا يطابق قسم المساق.'
            );
        }
    }
}