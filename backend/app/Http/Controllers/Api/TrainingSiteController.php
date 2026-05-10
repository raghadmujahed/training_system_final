<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTrainingSiteRequest;
use App\Http\Requests\UpdateTrainingSiteRequest;
use App\Http\Resources\TrainingSiteResource;
use App\Models\TrainingSite;
use Illuminate\Http\Request;

class TrainingSiteController extends Controller
{
    public function __construct()
    {
       // $this->authorizeResource(TrainingSite::class, 'training_site');
    }

    public function index(Request $request)
    {
        $query = TrainingSite::query();
        if ($request->filled('site_type')) {
            $query->where('site_type', trim((string) $request->site_type));
        }
        if ($request->filled('governing_body')) {
            $query->where('governing_body', trim((string) $request->governing_body));
        }
        if ($request->filled('directorate')) {
            $directorate = trim((string) $request->directorate);
            $query->where(function ($subQuery) use ($directorate) {
                $subQuery->where('directorate', $directorate)
                    ->orWhere('directorate', 'like', '%' . $directorate . '%');
            });
        }
        // منطقة / بلدة / نص يطابق عمود الموقع فقط
        if ($request->filled('location')) {
            $loc = '%' . str_replace(['%', '_'], ['\\%', '\\_'], trim((string) $request->location)) . '%';
            $query->where('location', 'like', $loc);
        }
        // بحث عام: يطابق اسم الجهة أو الموقع (البلدة/المنطقة).
        if ($request->filled('search')) {
            $term = '%' . str_replace(['%', '_'], ['\\%', '\\_'], trim((string) $request->search)) . '%';
            $query->where(function ($subQuery) use ($term) {
                $subQuery->where('name', 'like', $term)
                    ->orWhere('location', 'like', $term);
            });
        }
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }
        if ($request->boolean('has_manager_account')) {
            $query->whereIn('id', function ($sub) {
                $sub->select('training_site_id')
                    ->from('users')
                    ->whereNotNull('training_site_id')
                    ->whereIn('role_id', function ($roleSub) {
                        $roleSub->select('id')
                            ->from('roles')
                            ->whereIn('name', ['school_manager', 'principal', 'psychology_center_manager']);
                    });
            });
        }
        if ($request->filled('gender_classification')) {
            $query->where('gender_classification', trim((string) $request->gender_classification));
        }
        if ($request->filled('school_level')) {
            $query->where('school_level', trim((string) $request->school_level));
        }

        if ($request->boolean('include_occupancy')) {
            $query->withCount([
                'trainingAssignments as active_assignments_count' => static function ($q) {
                    $q->whereIn('status', ['assigned', 'ongoing']);
                },
            ]);
        }

        // Always include manager relationship for the list
        $query->with('manager');

        $sites = $query->latest()->paginate($request->per_page ?? 15);
        return TrainingSiteResource::collection($sites);
    }

    public function store(StoreTrainingSiteRequest $request)
    {
        $site = TrainingSite::create($request->validated());
        return new TrainingSiteResource($site);
    }

    public function show(TrainingSite $trainingSite)
    {
        $trainingSite->load([
            'manager',
            'trainingAssignments' => function ($query) {
                $query->with(['enrollment.user', 'teacher', 'academic_supervisor']);
            }
        ]);

        // Add counts for detailed view
        $trainingSite->training_requests_count = $trainingSite->trainingRequests()->count();
        $trainingSite->active_assignments_count = $trainingSite->trainingAssignments()
            ->whereIn('status', ['assigned', 'ongoing'])
            ->count();
        $trainingSite->completed_assignments_count = $trainingSite->trainingAssignments()
            ->where('status', 'completed')
            ->count();

        return new TrainingSiteResource($trainingSite);
    }

    public function update(UpdateTrainingSiteRequest $request, TrainingSite $trainingSite)
    {
        $trainingSite->update($request->validated());
        return new TrainingSiteResource($trainingSite);
    }

    public function destroy(TrainingSite $trainingSite)
    {
        $trainingSite->delete();
        return response()->json(['message' => 'تم حذف موقع التدريب']);
    }

    public function schoolsWithoutManager()
    {
        $schools = TrainingSite::whereNull('manager_id')
            ->orWhere('manager_id', '')
            ->with('manager')
            ->latest()
            ->get();

        return response()->json($schools);
    }

    public function availableSchoolManagers()
    {
        $managers = User::whereHas('role', function ($query) {
            $query->where('name', 'school_manager');
        })
        ->where(function ($query) {
            $query->whereNull('training_site_id')
                ->orWhereNotIn('id', function ($subQuery) {
                    $subQuery->select('manager_id')
                        ->from('training_sites')
                        ->whereNotNull('manager_id');
                });
        })
        ->select('id', 'name', 'email')
        ->get();

        return response()->json($managers);
    }

    public function assignManager(Request $request, TrainingSite $trainingSite)
    {
        $request->validate([
            'manager_id' => 'required|exists:users,id'
        ]);

        $manager = User::find($request->manager_id);
        
        // Check if user has school_manager role
        if (!$manager || $manager->role?->name !== 'school_manager') {
            return response()->json([
                'message' => 'مدير المدرسة يجب أن يكون حساباً موجوداً بدور مدير مدرسة'
            ], 422);
        }

        // Check if manager is already linked to another school
        $existingAssignment = TrainingSite::where('manager_id', $request->manager_id)
            ->where('id', '!=', $trainingSite->id)
            ->first();

        if ($existingAssignment) {
            return response()->json([
                'message' => 'هذا المدير مرتبط بمدرسة أخرى حالياً'
            ], 422);
        }

        $trainingSite->update(['manager_id' => $request->manager_id]);

        return response()->json([
            'message' => 'تم ربط المدير بالمدرسة بنجاح',
            'training_site' => $trainingSite->load('manager')
        ]);
    }
}