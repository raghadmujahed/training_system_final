<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\FormInstanceResource;
use App\Models\FormInstance;
use App\Services\FormEngineService;
use Illuminate\Http\Request;

class FormInstanceController extends Controller
{
    public function __construct(private readonly FormEngineService $forms)
    {
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $this->forms->ensureInstancesFor($user);

        $query = FormInstance::query()
            ->with(['template', 'owner', 'subject', 'trainingAssignment.trainingSite', 'reviews.reviewer'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('owner_type'), fn ($q) => $q->where('owner_type', $request->owner_type))
            ->latest('updated_at');

        if ($user->role?->name !== 'admin') {
            $query->where(function ($q) use ($user) {
                $q->where('owner_user_id', $user->id)
                    ->orWhere('subject_user_id', $user->id)
                    ->orWhere('current_reviewer_id', $user->id)
                    ->orWhereHas('trainingAssignment', function ($assignmentQuery) use ($user) {
                        $role = $user->role?->name;
                        if ($role === 'field_supervisor') {
                            $assignmentQuery->where(function ($q) use ($user) {
                                $q->where('teacher_id', $user->id)->orWhere('field_supervisor_id', $user->id);
                            });
                        } elseif (in_array($role, ['teacher', 'adviser', 'psychologist'], true)) {
                            $assignmentQuery->where('teacher_id', $user->id);
                        } elseif ($role === 'academic_supervisor') {
                            $assignmentQuery->where('academic_supervisor_id', $user->id);
                        } elseif (in_array($role, ['school_manager', 'psychology_center_manager', 'principal'], true) && $user->training_site_id) {
                            $assignmentQuery->where('training_site_id', $user->training_site_id);
                        } elseif (in_array($role, ['coordinator', 'training_coordinator'], true)) {
                            $assignmentQuery->where('coordinator_id', $user->id);
                        }
                    });
            });
        }

        return FormInstanceResource::collection($query->paginate($request->per_page ?? 25));
    }

    public function show(Request $request, FormInstance $formInstance)
    {
        $formInstance->load(['template', 'owner', 'subject', 'trainingAssignment.trainingSite', 'reviews.reviewer', 'auditLogs.user']);
        abort_unless($this->forms->userCanViewInstance($request->user(), $formInstance), 403, 'غير مصرح.');

        return new FormInstanceResource($formInstance);
    }

    public function update(Request $request, FormInstance $formInstance)
    {
        $formInstance->load('template');
        abort_unless((int) $formInstance->owner_user_id === (int) $request->user()->id || $request->user()->role?->name === 'admin', 403, 'غير مصرح.');

        $data = $request->validate([
            'payload' => 'nullable|array',
        ]);

        $formInstance->update([
            'payload' => $data['payload'] ?? [],
            'status' => FormInstance::STATUS_DRAFT,
        ]);

        return new FormInstanceResource($formInstance->fresh(['template', 'owner', 'subject', 'reviews.reviewer']));
    }

    public function submit(Request $request, FormInstance $formInstance)
    {
        $formInstance->load(['template', 'trainingAssignment.enrollment.user', 'trainingAssignment.trainingSite']);
        $data = $request->validate([
            'payload' => 'nullable|array',
        ]);

        return new FormInstanceResource(
            $this->forms->submit($formInstance, $request->user(), $data['payload'] ?? [])
        );
    }

    public function review(Request $request, FormInstance $formInstance)
    {
        $formInstance->load(['template', 'trainingAssignment.enrollment.user', 'trainingAssignment.trainingSite', 'reviews']);
        $data = $request->validate([
            'decision' => 'required|in:approved,returned',
            'comment' => 'nullable|string',
        ]);

        return new FormInstanceResource(
            $this->forms->review($formInstance, $request->user(), $data['decision'], $data['comment'] ?? null)
        );
    }
}
