<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOfficialLetterRequest;
use App\Http\Requests\SendOfficialLetterRequest;
use App\Http\Requests\ReceiveOfficialLetterRequest;
use App\Http\Requests\ApproveOfficialLetterRequest;
use App\Http\Resources\OfficialLetterResource;
use App\Models\OfficialLetter;
use App\Services\OfficialLetterService;
use App\Support\SchoolManagerSiteResolver;
use Illuminate\Http\Request;

class OfficialLetterController extends Controller
{
    protected $officialLetterService;

    public function __construct(OfficialLetterService $officialLetterService)
{
    $this->officialLetterService = $officialLetterService;
    // $this->authorizeResource(OfficialLetter::class, 'official_letter');
}

    public function index(Request $request)
    {
        $user = $request->user();
        $query = OfficialLetter::with(['trainingRequest', 'sentBy', 'receivedBy', 'trainingSite']);

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if (SchoolManagerSiteResolver::isSiteManager($user)) {
            $siteId = SchoolManagerSiteResolver::requireTrainingSiteId($user);
            $query->where('type', 'to_school')->where('training_site_id', $siteId);
        }
        if ($user?->role?->name === 'education_directorate' && !empty($user->directorate)) {
            $query->whereHas('trainingRequest.trainingSite', function ($sq) use ($user) {
                $sq->where('directorate', $user->directorate);
            });
        }

        $letters = $query->latest()->paginate($request->per_page ?? 15);
        return OfficialLetterResource::collection($letters);
    }

    public function store(StoreOfficialLetterRequest $request)
    {
        $letter = $this->officialLetterService->createLetter($request->validated(), $request->user()->id);
        return new OfficialLetterResource($letter);
    }

    public function show(OfficialLetter $officialLetter)
    {
        return new OfficialLetterResource($officialLetter->load(['trainingRequest', 'sentBy', 'receivedBy', 'trainingSite']));
    }

    public function send(SendOfficialLetterRequest $request, OfficialLetter $officialLetter)
    {
        $this->authorize('send', $officialLetter);
        $letter = $this->officialLetterService->sendLetter($officialLetter, $request->status);
        return new OfficialLetterResource($letter);
    }

    public function receive(ReceiveOfficialLetterRequest $request, OfficialLetter $officialLetter)
    {
        $this->authorize('receive', $officialLetter);
        $letter = $this->officialLetterService->receiveLetter($officialLetter, $request->user()->id);
        return new OfficialLetterResource($letter);
    }

    public function approve(ApproveOfficialLetterRequest $request, OfficialLetter $officialLetter)
    {
        $this->authorize('approve', $officialLetter);

        // منطق الموافقة على الكتاب من المديرية أو المدرسة
        $officialLetter->update([
            'status' => $request->status === 'approved' ? 'directorate_approved' : 'rejected',
            'rejection_reason' => $request->rejection_reason,
        ]);
        return new OfficialLetterResource($officialLetter);
    }
}