<?php

namespace App\Http\Controllers\Api;

use App\Models\StudentEvaluation;
use App\Models\User;
use App\Models\TrainingRequestStudent;
use App\Models\TrainingRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Controller;

class StudentEvaluationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $query = StudentEvaluation::with(['student', 'evaluator', 'trainingRequestStudent']);

        // Filter by evaluator (school manager can only see their own evaluations)
        if ($user->role && in_array($user->role->name, ['school_manager', 'principal', 'psychology_center_manager'])) {
            $query->where('evaluator_id', $user->id);
        }

        // Filter by student if specified
        if ($request->has('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        // Filter by date range if specified
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('evaluation_date', [$request->start_date, $request->end_date]);
        }

        $evaluations = $query->orderBy('evaluation_date', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json([
            'data' => $evaluations->items(),
            'meta' => [
                'current_page' => $evaluations->currentPage(),
                'last_page' => $evaluations->lastPage(),
                'per_page' => $evaluations->perPage(),
                'total' => $evaluations->total(),
            ],
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:users,id',
            'training_request_student_id' => 'nullable|exists:training_request_students,id',
            // Rating fields from evaluation image
            'supervisor' => 'nullable|integer|min:1|max:5',
            'attendance' => 'nullable|integer|min:1|max:5',
            'cooperation_with_staff' => 'nullable|integer|min:1|max:5',
            'professionalism' => 'nullable|integer|min:1|max:5',
            'dealing_with_students' => 'nullable|integer|min:1|max:5',
            'manners' => 'nullable|integer|min:1|max:5',
            'participation_in_activities' => 'nullable|integer|min:1|max:5',
            'school' => 'nullable|integer|min:1|max:5',
            'comfort' => 'nullable|integer|min:1|max:5',
            'professional_ethics' => 'nullable|integer|min:1|max:5',
            'general_notes' => 'nullable|string|max:2000',
            'evaluation_date' => 'nullable|date',
        ]);

        // Set evaluator to current user and default evaluation date
        $validated['evaluator_id'] = Auth::id();
        $validated['evaluation_date'] = $validated['evaluation_date'] ?? now()->toDateString();

        // Check if evaluation already exists for this student and evaluator
        $existingEvaluation = StudentEvaluation::where('student_id', $validated['student_id'])
            ->where('evaluator_id', $validated['evaluator_id'])
            ->first();

        if ($existingEvaluation) {
            return response()->json([
                'message' => 'تم تقييم هذا الطالب بالفعل من قبلك',
                'evaluation' => $existingEvaluation->load(['student', 'evaluator']),
            ], 422);
        }

        $evaluation = StudentEvaluation::create($validated);

        return response()->json([
            'message' => 'تم حفظ التقييم بنجاح',
            'evaluation' => $evaluation->load(['student', 'evaluator']),
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $evaluation = StudentEvaluation::with(['student', 'evaluator', 'trainingRequestStudent'])
            ->findOrFail($id);

        // Check if user has permission to view this evaluation
        $user = Auth::user();
        if ($user->role && in_array($user->role->name, ['school_manager', 'principal', 'psychology_center_manager'])) {
            if ($evaluation->evaluator_id !== $user->id) {
                return response()->json(['message' => 'غير مصرح لك بعرض هذا التقييم'], 403);
            }
        }

        return response()->json($evaluation);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $evaluation = StudentEvaluation::findOrFail($id);

        // Check if user has permission to update this evaluation
        $user = Auth::user();
        if ($evaluation->evaluator_id !== $user->id) {
            return response()->json(['message' => 'غير مصرح لك بتعديل هذا التقييم'], 403);
        }

        $validated = $request->validate([
            // Rating fields from evaluation image
            'supervisor' => 'nullable|integer|min:1|max:5',
            'attendance' => 'nullable|integer|min:1|max:5',
            'cooperation_with_staff' => 'nullable|integer|min:1|max:5',
            'professionalism' => 'nullable|integer|min:1|max:5',
            'dealing_with_students' => 'nullable|integer|min:1|max:5',
            'manners' => 'nullable|integer|min:1|max:5',
            'participation_in_activities' => 'nullable|integer|min:1|max:5',
            'school' => 'nullable|integer|min:1|max:5',
            'comfort' => 'nullable|integer|min:1|max:5',
            'professional_ethics' => 'nullable|integer|min:1|max:5',
            'general_notes' => 'nullable|string|max:2000',
            'evaluation_date' => 'nullable|date',
        ]);

        $evaluation->update($validated);

        return response()->json([
            'message' => 'تم تحديث التقييم بنجاح',
            'evaluation' => $evaluation->load(['student', 'evaluator']),
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $evaluation = StudentEvaluation::findOrFail($id);

        // Check if user has permission to delete this evaluation
        $user = Auth::user();
        if ($evaluation->evaluator_id !== $user->id) {
            return response()->json(['message' => 'غير مصرح لك بحذف هذا التقييم'], 403);
        }

        $evaluation->delete();

        return response()->json(['message' => 'تم حذف التقييم بنجاح']);
    }

    /**
     * Get evaluation statistics for the current evaluator.
     */
    public function statistics(): JsonResponse
    {
        $user = Auth::user();
        
        $evaluations = StudentEvaluation::where('evaluator_id', $user->id);
        
        $totalEvaluations = $evaluations->count();
        $averageRating = $evaluations->avg('overall_performance');
        
        $ratingDistribution = [
            'excellent' => $evaluations->where('overall_performance', '>=', 4.5)->count(),
            'very_good' => $evaluations->whereBetween('overall_performance', [3.5, 4.4])->count(),
            'good' => $evaluations->whereBetween('overall_performance', [2.5, 3.4])->count(),
            'acceptable' => $evaluations->whereBetween('overall_performance', [1.5, 2.4])->count(),
            'weak' => $evaluations->where('overall_performance', '<', 1.5)->count(),
        ];

        return response()->json([
            'total_evaluations' => $totalEvaluations,
            'average_rating' => round($averageRating, 2),
            'rating_distribution' => $ratingDistribution,
        ]);
    }

    /**
     * Get evaluations by student.
     */
    public function byStudent(string $studentId): JsonResponse
    {
        $user = Auth::user();
        
        $evaluations = StudentEvaluation::where('student_id', $studentId)
            ->with(['evaluator'])
            ->orderBy('evaluation_date', 'desc')
            ->get();

        return response()->json($evaluations);
    }

    /**
     * Get all students assigned to the school manager's training site.
     * Returns students regardless of training request status.
     */
    public function getMySiteStudents(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!in_array($user->role?->name, ['school_manager', 'principal', 'psychology_center_manager'], true)) {
            return response()->json(['message' => 'هذه الخدمة متاحة فقط لمدير جهة التدريب.'], 403);
        }

        // Get the training site ID for the current user
        $trainingSiteId = $user->training_site_id;
        
        if (!$trainingSiteId) {
            return response()->json(['message' => 'لم يتم تعيين موقع تدريب لهذا المستخدم.'], 400);
        }

        // Get all training requests for this site that have been sent to or approved by school
        $trainingRequests = TrainingRequest::with([
            'trainingSite',
            'trainingRequestStudents.user.department',
            'trainingRequestStudents.course',
            'trainingPeriod',
        ])
            ->where('training_site_id', $trainingSiteId)
            ->whereIn('book_status', ['sent_to_school', 'school_approved', 'directorate_approved', 'completed'])
            ->get();

        // Extract students from all requests
        $students = [];
        foreach ($trainingRequests as $request) {
            foreach ($request->trainingRequestStudents as $student) {
                $departmentName = $student->user?->department?->name;
                $students[] = [
                    'id' => $student->id,
                    'student_id' => $student->user_id,
                    'student_name' => $student->user?->name ?? 'غير معروف',
                    'university_id' => $student->user?->university_id ?? '—',
                    'specialization' => $student->course?->name ?? '—',
                    'status' => $student->status_label ?? $student->status ?? '—',
                    'request_id' => $request->id,
                    'site' => $request->trainingSite?->name ?? '—',
                    'site_location' => $request->trainingSite?->location ?? '—',
                    'site_directorate' => $request->trainingSite?->directorate ?? '—',
                    'period' => $request->trainingPeriod?->name ?? '—',
                    'training_status' => $request->status,
                    'book_status' => $request->book_status,
                    'department_name' => $departmentName,
                    'track' => $student->user?->resolveStudentTrack(),
                ];
            }
        }

        return response()->json([
            'students' => $students,
            'total' => count($students),
            'training_site' => $trainingRequests->first()?->trainingSite?->name,
        ]);
    }
}
