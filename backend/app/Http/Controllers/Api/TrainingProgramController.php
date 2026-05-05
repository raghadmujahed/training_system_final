<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FeatureFlag;
use App\Models\PortfolioEntry;
use App\Models\StudentPortfolio;
use App\Models\TrainingProgram;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;

class TrainingProgramController extends Controller
{
    /**
     * عرض برنامج التدريب للطالب المسجل
     */
    public function show(Request $request)
    {
        $user = $request->user();

        $program = TrainingProgram::where('user_id', $user->id)->first();

        $isOpen = FeatureFlag::where('name', 'training_program.edit')->value('is_open') ?? false;

        $assignment = $user->currentTrainingAssignment();

        return response()->json([
            'data' => $program ? [
                'id' => $program->id,
                'schedule' => $program->schedule,
                'status' => $program->status,
                'coordinator_note' => $program->coordinator_note,
                'created_at' => $program->created_at,
                'updated_at' => $program->updated_at,
            ] : null,
            'is_editable' => $isOpen,
            'student_info' => [
                'name' => $user->name,
                'university_id' => $user->university_id,
                'school' => $assignment?->trainingSite?->name ?? '—',
                'semester' => $assignment?->trainingPeriod?->name ?? '—',
            ],
        ]);
    }

    /**
     * حفظ/تحديث برنامج التدريب
     */
    public function store(Request $request)
    {
        $isOpen = FeatureFlag::where('name', 'training_program.edit')->value('is_open') ?? false;

        if (! $isOpen) {
            return response()->json([
                'message' => 'إدخال برنامج التدريب مغلق حالياً من قبل المنسق.',
            ], 403);
        }

        $request->validate([
            'schedule' => 'required|array',
        ]);

        $user = $request->user();
        $assignment = $user->currentTrainingAssignment();

        $program = TrainingProgram::updateOrCreate(
            ['user_id' => $user->id],
            [
                'schedule' => $request->schedule,
                'training_assignment_id' => $assignment?->id,
                'status' => 'submitted',
            ]
        );

        // حفظ نسخة في الملف الإنجازي
        $portfolioEntry = $this->syncToPortfolio($user, $program);

        return response()->json([
            'message' => 'تم حفظ برنامج التدريب بنجاح',
            'data' => [
                'id' => $program->id,
                'schedule' => $program->schedule,
                'portfolio_entry_id' => $portfolioEntry?->id,
            ],
        ]);
    }

    /**
     * عرض برنامج تدريب طالب معين (للمعلم/المشرف/المنسق)
     */
    public function showForStudent(Request $request, $studentId)
    {
        $program = TrainingProgram::where('user_id', $studentId)->first();

        if (! $program) {
            return response()->json(['data' => null, 'message' => 'لا يوجد برنامج تدريب لهذا الطالب بعد.']);
        }

        return response()->json([
            'data' => [
                'id' => $program->id,
                'schedule' => $program->schedule,
                'status' => $program->status,
                'coordinator_note' => $program->coordinator_note,
                'student' => [
                    'id' => $program->user->id,
                    'name' => $program->user->name,
                    'university_id' => $program->user->university_id,
                ],
                'created_at' => $program->created_at,
                'updated_at' => $program->updated_at,
            ],
        ]);
    }

    /**
     * قائمة برامج التدريب المرسلة (للمنسق)
     */
    public function indexForCoordinator(Request $request)
    {
        $query = TrainingProgram::with('user.department', 'trainingAssignment.trainingSite', 'trainingAssignment.trainingPeriod');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('university_id', 'like', "%{$search}%");
            });
        }

        $programs = $query->orderByDesc('updated_at')->paginate($request->per_page ?? 50);

        $items = $programs->getCollection()->map(function ($p) {
            return [
                'id' => $p->id,
                'status' => $p->status,
                'coordinator_note' => $p->coordinator_note,
                'student' => [
                    'id' => $p->user->id,
                    'name' => $p->user->name,
                    'university_id' => $p->user->university_id,
                    'department' => $p->user->department?->name,
                ],
                'training_site' => $p->trainingAssignment?->trainingSite?->name,
                'period' => $p->trainingAssignment?->trainingPeriod?->name,
                'updated_at' => $p->updated_at?->format('Y-m-d H:i'),
            ];
        });

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $programs->currentPage(),
                'last_page' => $programs->lastPage(),
                'total' => $programs->total(),
            ],
        ]);
    }

    /**
     * تحديث حالة برنامج تدريب (موافقة/رفض من المنسق)
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:approved,rejected',
            'coordinator_note' => 'nullable|string|max:500',
        ]);

        $program = TrainingProgram::findOrFail($id);
        $program->status = $request->status;
        $program->coordinator_note = $request->coordinator_note ?? null;
        $program->save();

        return response()->json([
            'message' => $request->status === 'approved'
                ? 'تمت الموافقة على برنامج التدريب'
                : 'تم رفض برنامج التدريب',
            'data' => [
                'id' => $program->id,
                'status' => $program->status,
                'coordinator_note' => $program->coordinator_note,
            ],
        ]);
    }

    /**
     * حفظ نسخة من برنامج التدريب في الملف الإنجازي
     */
    protected function syncToPortfolio($user, $program)
    {
        $portfolio = StudentPortfolio::where('user_id', $user->id)->first();

        if (! $portfolio) {
            try {
                $portfolio = StudentPortfolio::create([
                    'user_id' => $user->id,
                    'training_assignment_id' => $program->training_assignment_id,
                ]);
            } catch (QueryException $e) {
                return null;
            }
        }

        $title = 'برنامج التدريب';
        $content = json_encode($program->schedule, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

        return PortfolioEntry::updateOrCreate(
            [
                'student_portfolio_id' => $portfolio->id,
                'title' => $title,
            ],
            [
                'content' => $content,
            ]
        );
    }
}
