<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTrainingPeriodRequest;
use App\Http\Requests\UpdateTrainingPeriodRequest;
use App\Http\Resources\TrainingPeriodResource;
use App\Models\TrainingPeriod;
use App\Services\ArchiveService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TrainingPeriodController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(TrainingPeriod::class, 'training_period');
    }

    public function index(Request $request)
    {
        $query = TrainingPeriod::query();
        if ($request->has('is_active')) $query->where('is_active', $request->boolean('is_active'));
        $periods = $query->latest()->paginate($request->per_page ?? 15);
        return TrainingPeriodResource::collection($periods);
    }

    public function store(StoreTrainingPeriodRequest $request)
    {
        $period = DB::transaction(function () use ($request) {
            if ($request->boolean('is_active')) {
                TrainingPeriod::where('is_active', true)->update(['is_active' => false]);
            }
            return TrainingPeriod::create($request->validated());
        });
        return new TrainingPeriodResource($period);
    }

    public function show(TrainingPeriod $trainingPeriod)
    {
        return new TrainingPeriodResource($trainingPeriod);
    }

    public function update(UpdateTrainingPeriodRequest $request, TrainingPeriod $trainingPeriod)
    {
        $trainingPeriod->fill($request->validated());
        if (!$trainingPeriod->isDirty()) {
            return response()->json(['status' => 'no_changes', 'message' => 'لم تقم بتغيير أي بيانات']);
        }

        DB::transaction(function () use ($request, $trainingPeriod) {
            if ($request->has('is_active') && $request->boolean('is_active')) {
                TrainingPeriod::where('is_active', true)
                    ->where('id', '!=', $trainingPeriod->id)
                    ->update(['is_active' => false]);
            }
            $trainingPeriod->save();
        });

        return new TrainingPeriodResource($trainingPeriod->fresh());
    }

    public function destroy(TrainingPeriod $trainingPeriod)
    {
        $trainingPeriod->delete();
        return response()->json(['message' => 'تم حذف الفترة التدريبية']);
    }

    /**
     * Activate a training period.
     * - Deactivates all other active periods inside a transaction.
     * - Optionally archives (sets archived_at) the previously active period via ArchiveService.
     * - Returns the updated period in the unified TrainingPeriodResource shape.
     */
    public function setActive(Request $request, TrainingPeriod $trainingPeriod, ArchiveService $archiveService)
    {
        if ($trainingPeriod->is_active) {
            return response()->json([
                'message' => 'هذه الفترة التدريبية مفعّلة بالفعل.',
                'data'    => new TrainingPeriodResource($trainingPeriod),
            ]);
        }

        $autoArchive = $request->boolean('auto_archive');

        // Optional: archive the currently active period before switching
        if ($autoArchive) {
            $currentActive = TrainingPeriod::where('is_active', true)->first();
            if ($currentActive && $currentActive->id !== $trainingPeriod->id) {
                try {
                    $archiveService->archivePeriod($currentActive->id, auth()->id());
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('Auto-archive failed during period activation', [
                        'period_id' => $currentActive->id,
                        'error'     => $e->getMessage(),
                    ]);
                    // Don't block activation if archive fails (data is never deleted)
                }
            }
        }

        DB::transaction(function () use ($trainingPeriod) {
            // Deactivate all other active periods
            TrainingPeriod::where('is_active', true)
                ->where('id', '!=', $trainingPeriod->id)
                ->update(['is_active' => false]);

            // Activate the target period (clear archived_at if it was previously archived)
            $trainingPeriod->update([
                'is_active'   => true,
                'archived_at' => null,
            ]);
        });

        return new TrainingPeriodResource($trainingPeriod->fresh());
    }
}