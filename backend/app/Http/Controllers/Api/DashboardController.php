<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TrainingAssignment;
use App\Models\User;
use App\Models\TrainingSite;
use App\Models\Evaluation;
use App\Models\TrainingRequest;
use App\Models\TrainingRequestBatch;
use App\Models\FeatureFlag;
use App\Models\Notification;
use App\Models\StudentPortfolio;
use App\Models\Task;
use App\Models\TrainingProgram;
use App\Http\Resources\NotificationResource;
use App\Http\Resources\TaskResource;
use App\Http\Resources\TrainingRequestResource;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        $stats = [
            'total_students' => User::whereHas('role', fn($q) => $q->where('name', 'student'))->count(),
            'active_trainings' => TrainingAssignment::where('status', 'ongoing')->count(),
            'completed_trainings' => TrainingAssignment::where('status', 'completed')->count(),
            'total_sites' => TrainingSite::count(),
            // Exclude archived evaluations from pending count
            'pending_evaluations' => Evaluation::whereNull('total_score')->whereNull('archived_at')->count(),
        ];
        
        // إحصائيات حسب المستخدم
        if ($request->user()->role?->name === 'teacher') {
            $stats['my_students'] = TrainingAssignment::where('teacher_id', $request->user()->id)
                ->with('enrollment.user')->get()->pluck('enrollment.user')->unique()->count();
        } elseif ($request->user()->role?->name === 'academic_supervisor') {
            $stats['my_students'] = TrainingAssignment::where('academic_supervisor_id', $request->user()->id)->count();
        } elseif ($request->user()->role?->name === 'student') {
            $stats['my_training'] = TrainingAssignment::whereHas('enrollment', fn($q) => $q->where('user_id', $request->user()->id))
                ->first();
        } elseif (in_array($request->user()->role?->name, ['training_coordinator', 'coordinator'], true)) {
            $stats['coordinator_pending_review'] = TrainingRequest::whereIn('book_status', [
                'sent_to_coordinator',
                'coordinator_under_review',
                'needs_edit',
            ])->count();
            $stats['coordinator_prelim_approved'] = TrainingRequest::where('book_status', 'prelim_approved')->count();
            $stats['coordinator_open_batches'] = TrainingRequestBatch::where('status', 'draft')->count();
        }

        return response()->json($stats);
    }

    public function studentSummary(Request $request)
    {
        $user = $request->user()->loadMissing(['role', 'department', 'trainingSite', 'enrollments.section.course']);

        if ($user->role?->name !== 'student') {
            abort(403);
        }

        $latestRequest = TrainingRequest::with([
            'trainingSite',
            'trainingPeriod',
            'trainingRequestStudents' => function ($query) use ($user) {
                $query->where('user_id', $user->id)
                    ->with(['user', 'course', 'assignedTeacher']);
            },
        ])
            ->where(function ($query) use ($user) {
                $query->where('requested_by', $user->id)
                    ->orWhereHas('trainingRequestStudents', fn ($studentQuery) => $studentQuery->where('user_id', $user->id));
            })
            ->latest()
            ->first();

        $studentTasksQuery = Task::whereHas('trainingAssignment.enrollment', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        });

        $pendingTasksCount = (clone $studentTasksQuery)
            ->whereNotIn('status', ['submitted', 'graded'])
            ->count();

        $latestTasks = (clone $studentTasksQuery)
            ->with(['assignedBy', 'submissions' => function ($query) use ($user) {
                $query->where('user_id', $user->id)->latest();
            }])
            ->latest()
            ->limit(4)
            ->get();

        $portfolio = StudentPortfolio::withCount('entries')
            ->where('user_id', $user->id)
            ->first();

        $program = TrainingProgram::where('user_id', $user->id)->first();
        $assignment = $user->currentTrainingAssignment();
        $notifications = Notification::query()
            ->forRecipient($user)
            ->latest()
            ->limit(3)
            ->get();

        return response()->json([
            'user' => UserResource::make($user)->resolve($request),
            'training_request' => $latestRequest
                ? TrainingRequestResource::make($latestRequest)->resolve($request)
                : null,
            'tasks' => [
                'pending_count' => $pendingTasksCount,
                'latest' => TaskResource::collection($latestTasks)->resolve($request),
            ],
            'portfolio' => [
                'entries_count' => (int) ($portfolio?->entries_count ?? 0),
            ],
            'training_program' => [
                'data' => $program ? [
                    'id' => $program->id,
                    'schedule' => $program->schedule,
                    'status' => $program->status,
                    'coordinator_note' => $program->coordinator_note,
                    'created_at' => $program->created_at,
                    'updated_at' => $program->updated_at,
                ] : null,
                'is_editable' => FeatureFlag::where('name', 'training_program.edit')->value('is_open') ?? false,
                'student_info' => [
                    'name' => $user->name,
                    'university_id' => $user->university_id,
                    'school' => $assignment?->trainingSite?->name ?? '—',
                    'semester' => $assignment?->trainingPeriod?->name ?? '—',
                ],
            ],
            'notifications' => NotificationResource::collection($notifications)->resolve($request),
        ]);
    }
}