<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TeacherSchoolAssignment;
use App\Models\User;
use App\Models\TrainingSite;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SchoolManagerTeacherController extends Controller
{
    /**
     * Get current teachers for the school manager's school
     */
    public function index(Request $request)
    {
        $schoolManager = $request->user();
        
        if (!in_array($schoolManager->role?->name, ['school_manager', 'principal'], true)) {
            return response()->json(['message' => 'غير مصرح'], 403);
        }

        if (!$schoolManager->training_site_id) {
            return response()->json(['message' => 'لا يمكن تنفيذ العملية لأن حسابك غير مرتبط بمدرسة.'], 400);
        }

        $teachers = TeacherSchoolAssignment::active()
            ->forSchool($schoolManager->training_site_id)
            ->with(['teacher' => function ($query) {
                $query->select('id', 'name', 'email', 'phone', 'university_id');
            }])
            ->get()
            ->map(function ($assignment) {
                return [
                    'id' => $assignment->teacher->id,
                    'name' => $assignment->teacher->name,
                    'email' => $assignment->teacher->email,
                    'phone' => $assignment->teacher->phone,
                    'university_id' => $assignment->teacher->university_id,
                    'start_date' => $assignment->start_date->format('Y-m-d'),
                    'academic_year' => $assignment->academic_year,
                    'status' => $assignment->status,
                    'assignment_id' => $assignment->id,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $teachers
        ]);
    }

    /**
     * Get teacher assignment history for the school manager's school
     */
    public function history(Request $request)
    {
        $schoolManager = $request->user();
        
        if (!in_array($schoolManager->role?->name, ['school_manager', 'principal'], true)) {
            return response()->json(['message' => 'غير مصرح'], 403);
        }

        if (!$schoolManager->training_site_id) {
            return response()->json(['message' => 'لا يمكن تنفيذ العملية لأن حسابك غير مرتبط بمدرسة.'], 400);
        }

        $assignments = TeacherSchoolAssignment::forSchool($schoolManager->training_site_id)
            ->with(['teacher' => function ($query) {
                $query->select('id', 'name', 'email', 'university_id');
            }, 'createdBy' => function ($query) {
                $query->select('id', 'name');
            }])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($assignment) {
                return [
                    'id' => $assignment->id,
                    'teacher' => [
                        'id' => $assignment->teacher->id,
                        'name' => $assignment->teacher->name,
                        'email' => $assignment->teacher->email,
                        'university_id' => $assignment->teacher->university_id,
                    ],
                    'start_date' => $assignment->start_date->format('Y-m-d'),
                    'end_date' => $assignment->end_date?->format('Y-m-d'),
                    'academic_year' => $assignment->academic_year,
                    'status' => $assignment->status,
                    'action_type' => $assignment->action_type,
                    'reason' => $assignment->reason,
                    'notes' => $assignment->notes,
                    'created_by' => $assignment->createdBy?->name,
                    'created_at' => $assignment->created_at->format('Y-m-d H:i:s'),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $assignments
        ]);
    }

    /**
     * Get available teachers (teachers with no active school assignment)
     */
    public function availableTeachers(Request $request)
    {
        $schoolManager = $request->user();
        
        if (!in_array($schoolManager->role?->name, ['school_manager', 'principal'], true)) {
            return response()->json(['message' => 'غير مصرح'], 403);
        }

        $availableTeachers = TeacherSchoolAssignment::getTeachersWithoutActiveAssignment()
            ->map(function ($teacher) {
                return [
                    'id' => $teacher->id,
                    'name' => $teacher->name,
                    'email' => $teacher->email,
                    'phone' => $teacher->phone,
                    'university_id' => $teacher->university_id,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $availableTeachers
        ]);
    }

    /**
     * Assign a teacher to the school manager's school
     */
    public function assign(Request $request)
    {
        $schoolManager = $request->user();
        
        if (!in_array($schoolManager->role?->name, ['school_manager', 'principal'], true)) {
            return response()->json(['message' => 'غير مصرح'], 403);
        }

        if (!$schoolManager->training_site_id) {
            return response()->json(['message' => 'لا يمكن تنفيذ العملية لأن حسابك غير مرتبط بمدرسة.'], 400);
        }

        $validated = $request->validate([
            'teacher_id' => 'required|exists:users,id',
            'start_date' => 'required|date',
            'academic_year' => 'nullable|string|max:20',
            'notes' => 'nullable|string|max:1000',
        ]);

        // Verify teacher has teacher role
        $teacher = User::find($validated['teacher_id']);
        if (!$teacher->hasRole('teacher')) {
            return response()->json(['message' => 'المستخدم المحدد ليس معلمًا.'], 400);
        }

        // Check if teacher can be assigned to this school
        $canAssign = TeacherSchoolAssignment::canTeacherBeAssignedToSchool(
            $validated['teacher_id'], 
            $schoolManager->training_site_id
        );

        if (!$canAssign['can_assign']) {
            return response()->json(['message' => $canAssign['message']], 400);
        }

        try {
            DB::beginTransaction();

            $assignment = TeacherSchoolAssignment::create([
                'teacher_id' => $validated['teacher_id'],
                'school_id' => $schoolManager->training_site_id,
                'academic_year' => $validated['academic_year'] ?? date('Y'),
                'start_date' => $validated['start_date'],
                'is_active' => true,
                'status' => 'active',
                'action_type' => 'assignment',
                'notes' => $validated['notes'],
                'created_by' => $schoolManager->id,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'تمت إضافة المعلم إلى مدرستك بنجاح.',
                'data' => [
                    'assignment_id' => $assignment->id,
                    'teacher_name' => $teacher->name,
                    'start_date' => $assignment->start_date->format('Y-m-d'),
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Teacher assignment error: ' . $e->getMessage());
            return response()->json(['message' => 'حدث خطأ أثناء إضافة المعلم، يرجى المحاولة لاحقاً.'], 500);
        }
    }

    /**
     * End a teacher assignment from the school manager's school
     */
    public function endAssignment(Request $request, $teacherId)
    {
        $schoolManager = $request->user();
        
        if (!in_array($schoolManager->role?->name, ['school_manager', 'principal'], true)) {
            return response()->json(['message' => 'غير مصرح'], 403);
        }

        if (!$schoolManager->training_site_id) {
            return response()->json(['message' => 'لا يمكن تنفيذ العملية لأن حسابك غير مرتبط بمدرسة.'], 400);
        }

        $validated = $request->validate([
            'end_date' => 'required|date',
            'reason' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:1000',
        ]);

        // Find active assignment for this teacher in this school
        $assignment = TeacherSchoolAssignment::active()
            ->forTeacher($teacherId)
            ->forSchool($schoolManager->training_site_id)
            ->first();

        if (!$assignment) {
            return response()->json(['message' => 'لم يتم العثور على تعيين نشط لهذا المعلم في مدرستك.'], 404);
        }

        if ($validated['end_date'] < $assignment->start_date) {
            return response()->json(['message' => 'تاريخ الانتهاء لا يمكن أن يكون قبل تاريخ البدء.'], 400);
        }

        try {
            DB::beginTransaction();

            $assignment->endAssignment(
                $validated['end_date'],
                $validated['reason'],
                $validated['notes']
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'تم إنهاء تعيين المعلم بنجاح.',
                'data' => [
                    'assignment_id' => $assignment->id,
                    'end_date' => $assignment->end_date->format('Y-m-d'),
                    'reason' => $assignment->reason,
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Teacher assignment end error: ' . $e->getMessage());
            return response()->json(['message' => 'حدث خطأ أثناء إنهاء التعيين، يرجى المحاولة لاحقاً.'], 500);
        }
    }

    /**
     * Get specific teacher assignment details
     */
    public function getAssignmentDetails(Request $request, $teacherId)
    {
        $schoolManager = $request->user();
        
        if (!in_array($schoolManager->role?->name, ['school_manager', 'principal'], true)) {
            return response()->json(['message' => 'غير مصرح'], 403);
        }

        if (!$schoolManager->training_site_id) {
            return response()->json(['message' => 'لا يمكن تنفيذ العملية لأن حسابك غير مرتبط بمدرسة.'], 400);
        }

        $assignment = TeacherSchoolAssignment::active()
            ->forTeacher($teacherId)
            ->forSchool($schoolManager->training_site_id)
            ->with(['teacher', 'school', 'createdBy'])
            ->first();

        if (!$assignment) {
            return response()->json(['message' => 'لم يتم العثور على تعيين نشط لهذا المعلم في مدرستك.'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'assignment_id' => $assignment->id,
                'teacher' => [
                    'id' => $assignment->teacher->id,
                    'name' => $assignment->teacher->name,
                    'email' => $assignment->teacher->email,
                    'phone' => $assignment->teacher->phone,
                    'university_id' => $assignment->teacher->university_id,
                ],
                'school' => [
                    'id' => $assignment->school->id,
                    'name' => $assignment->school->name,
                    'location' => $assignment->school->location,
                ],
                'start_date' => $assignment->start_date->format('Y-m-d'),
                'academic_year' => $assignment->academic_year,
                'status' => $assignment->status,
                'notes' => $assignment->notes,
                'created_by' => $assignment->createdBy?->name,
                'created_at' => $assignment->created_at->format('Y-m-d H:i:s'),
            ]
        ]);
    }
}
