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
}