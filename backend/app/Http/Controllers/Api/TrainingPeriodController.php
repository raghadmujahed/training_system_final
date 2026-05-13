<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTrainingPeriodRequest;
use App\Http\Requests\UpdateTrainingPeriodRequest;
use App\Http\Resources\TrainingPeriodResource;
use App\Models\TrainingPeriod;
use App\Services\ArchiveService;
use Illuminate\Http\Request;

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
        // إذا كان is_active = true، قم بتعطيل الفترات الأخرى أولاً
        if ($request->is_active) {
            TrainingPeriod::where('is_active', true)->update(['is_active' => false]);
        }
        $period = TrainingPeriod::create($request->validated());
        return new TrainingPeriodResource($period);
    }

    public function show(TrainingPeriod $trainingPeriod)
    {
        return new TrainingPeriodResource($trainingPeriod);
    }

    public function update(UpdateTrainingPeriodRequest $request, TrainingPeriod $trainingPeriod)
    {
        if ($request->has('is_active') && $request->is_active) {
            TrainingPeriod::where('is_active', true)->where('id', '!=', $trainingPeriod->id)->update(['is_active' => false]);
        }
        $trainingPeriod->fill($request->validated());
        if (!$trainingPeriod->isDirty()) {
            return response()->json(['status' => 'no_changes', 'message' => 'لم تقم بتغيير أي بيانات']);
        }
        $trainingPeriod->save();
        return new TrainingPeriodResource($trainingPeriod);
    }

    public function destroy(TrainingPeriod $trainingPeriod)
    {
        $trainingPeriod->delete();
        return response()->json(['message' => 'تم حذف الفترة التدريبية']);
    }

    /**
     * Activate a training period. Optionally archive the previously active period first.
     */
    public function setActive(Request $request, TrainingPeriod $trainingPeriod, ArchiveService $archiveService)
    {
        $autoArchive = $request->boolean('auto_archive');

        if ($autoArchive) {
            // Find the currently active period and archive it
            $currentActive = TrainingPeriod::where('is_active', true)->first();
            if ($currentActive && $currentActive->id !== $trainingPeriod->id) {
                try {
                    $archiveService->archivePeriod($currentActive->id, auth()->id());
                } catch (\Exception $e) {
                    // If already archived or other error, log but continue
                    // We don't want to block activation if archive fails for some reason
                    \Illuminate\Support\Facades\Log::warning('Auto-archive failed during period activation', [
                        'period_id' => $currentActive->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        TrainingPeriod::where('is_active', true)->update(['is_active' => false]);
        $trainingPeriod->update(['is_active' => true]);

        return new TrainingPeriodResource($trainingPeriod->fresh());
    }
}