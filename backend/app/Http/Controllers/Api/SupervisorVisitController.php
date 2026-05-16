<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSupervisorVisitRequest;
use App\Http\Requests\UpdateSupervisorVisitRequest;
use App\Http\Requests\CompleteSupervisorVisitRequest;
use App\Http\Resources\SupervisorVisitResource;
use App\Models\SupervisorVisit;
use Illuminate\Http\Request;

class SupervisorVisitController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(SupervisorVisit::class, 'supervisor_visit');
    }

    public function index(Request $request)
    {
        $query = SupervisorVisit::with(['trainingAssignment.enrollment.user', 'supervisor']);
        if ($request->has('training_assignment_id')) $query->where('training_assignment_id', $request->training_assignment_id);
        if ($request->has('supervisor_id')) $query->where('supervisor_id', $request->supervisor_id);
        if ($request->has('status')) $query->where('status', $request->status);
        
        $visits = $query->latest()->paginate($request->per_page ?? 15);
        return SupervisorVisitResource::collection($visits);
    }

    public function store(StoreSupervisorVisitRequest $request)
    {
        $visit = SupervisorVisit::create([
            'training_assignment_id' => $request->training_assignment_id,
            'supervisor_id' => $request->user()->id,
            'scheduled_date' => $request->scheduled_date,
            'notes' => $request->notes,
            'status' => SupervisorVisit::initialStatus(),
        ]);
        return new SupervisorVisitResource($visit);
    }

    public function show(SupervisorVisit $supervisorVisit)
    {
        return new SupervisorVisitResource($supervisorVisit->load(['trainingAssignment', 'supervisor']));
    }

    public function update(UpdateSupervisorVisitRequest $request, SupervisorVisit $supervisorVisit)
    {
        $supervisorVisit->update($request->validated());
        return new SupervisorVisitResource($supervisorVisit);
    }

    public function complete(CompleteSupervisorVisitRequest $request, SupervisorVisit $supervisorVisit)
    {
        $supervisorVisit->update([
            'notes' => $request->notes,
            'rating' => $request->rating,
            'status' => 'completed',
            'visit_date' => now(),
        ]);
        return new SupervisorVisitResource($supervisorVisit);
    }

    public function destroy(SupervisorVisit $supervisorVisit)
    {
        $supervisorVisit->delete();
        return response()->json(['message' => 'تم حذف الزيارة']);
    }
}