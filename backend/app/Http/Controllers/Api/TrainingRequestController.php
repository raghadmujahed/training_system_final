<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTrainingRequest;
use App\Http\Requests\UpdateTrainingRequest;
use App\Http\Requests\SendTrainingRequestToDirectorateRequest;
use App\Http\Requests\DirectorateApproveTrainingRequest;
use App\Http\Requests\SendTrainingRequestToSchoolRequest;
use App\Http\Requests\SchoolApproveTrainingRequest;
use App\Http\Requests\RejectTrainingRequestRequest;
use App\Http\Requests\CoordinatorReviewTrainingRequest;
use App\Http\Requests\IndexTrainingRequestRequest;
use App\Http\Resources\TrainingRequestResource;
use App\Models\TrainingRequest;
use App\Models\TrainingRequestStudent;
use App\Models\TrainingSite;
use App\Models\TrainingPeriod;
use App\Models\Course;
use App\Models\OfficialLetter;
use App\Models\User;
use App\Services\TrainingRequestService;
use App\Support\PsychologyAcademicWorkflow;
use App\Support\TrainingRequestNotifications;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TrainingRequestController extends Controller
{
    private function hasManagerAccountForSite(TrainingSite $site): bool
    {
        $managerRoles = $site->site_type === 'health_center'
            ? ['psychology_center_manager']
            : ['school_manager', 'principal'];

        return User::query()
            ->where('training_site_id', $site->id)
            ->whereHas('role', fn ($q) => $q->whereIn('name', $managerRoles))
            ->exists();
    }

    private function resolveAutoTrainingPeriodId(): ?int
    {
        $period = TrainingPeriod::query()
            ->where('is_active', true)
            ->latest('id')
            ->first();

        if (! $period) {
            $period = TrainingPeriod::query()->latest('id')->first();
        }

        return $period?->id;
    }

    private function resolveAutoCourseIdForStudent($user): ?int
    {
        $enrollment = $user?->currentEnrollment();
        $courseId = data_get($enrollment, 'section.course.id');
        return $courseId ? (int) $courseId : null;
    }

    private function normalizeStudentDates(array $data): array
    {
        $activePeriod = TrainingPeriod::query()
            ->where('is_active', true)
            ->latest('id')
            ->first()
            ?? TrainingPeriod::query()->latest('id')->first();

        $start = $data['start_date'] ?? $activePeriod?->start_date?->toDateString() ?? now()->toDateString();
        $end = $data['end_date'] ?? $activePeriod?->end_date?->toDateString() ?? now()->addDay()->toDateString();

        if ($end <= $start) {
            $end = \Carbon\Carbon::parse($start)->addDay()->toDateString();
        }

        $data['start_date'] = $start;
        $data['end_date'] = $end;

        return $data;
    }

    private function normalizeDirectorate(?string $value): string
    {
        $v = trim((string) $value);
        $v = str_replace(['مديرية', 'مديرية ', '  '], ['', '', ' '], $v);
        return trim($v);
    }

    private function isAllowedDirectorate(?string $value): bool
    {
        return in_array($this->normalizeDirectorate($value), ['وسط', 'شمال', 'جنوب', 'يطا'], true);
    }

    protected $trainingRequestService;

    public function __construct(TrainingRequestService $trainingRequestService)
    {
        $this->trainingRequestService = $trainingRequestService;
        $this->authorizeResource(TrainingRequest::class, 'training_request');
    }

    /**
     * توحيد قيمة الجهة الحكومية الواردة من الفلتر (تصحيح قيم واجهة قد تُرسل بصيغ الأدوار).
     *
     * @return 'directorate_of_education'|'ministry_of_health'|null
     */
    private function normalizeGoverningBodyFilter(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return match ($value) {
            'education_directorate' => 'directorate_of_education',
            'health_directorate' => 'ministry_of_health',
            'directorate_of_education', 'ministry_of_health' => $value,
            default => null,
        };
    }

    public function index(IndexTrainingRequestRequest $request)
    {
        $query = TrainingRequest::with([
            'trainingSite',
            'requestedBy.department',
            'trainingRequestStudents.user',
            'trainingRequestStudents.course',
            'trainingRequestStudents.assignedTeacher',
            'trainingPeriod',
        ]);

        if ($request->filled('book_status')) {
            $query->where('book_status', $request->book_status);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('training_site_id')) {
            $query->where('training_site_id', $request->training_site_id);
        }
        if ($request->filled('training_period_id')) {
            $query->where('training_period_id', $request->training_period_id);
        }
        $governingBodyFilter = $this->normalizeGoverningBodyFilter($request->governing_body);
        if ($governingBodyFilter !== null) {
            $query->where(function ($q) use ($governingBodyFilter) {
                $q->where('governing_body', $governingBodyFilter)
                    ->orWhere(function ($q2) use ($governingBodyFilter) {
                        $q2->whereNull('governing_body')
                            ->whereHas('trainingSite', fn ($sq) => $sq->where('governing_body', $governingBodyFilter));
                    });
            });
        }
        if ($request->filled('from_date')) {
            $query->whereDate('requested_at', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->whereDate('requested_at', '<=', $request->to_date);
        }
        if ($request->filled('search')) {
            $term = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $request->search) . '%';
            $query->where(function ($q) use ($term) {
                $q->where('letter_number', 'like', $term)
                    ->orWhereHas('trainingRequestStudents.user', function ($uq) use ($term) {
                        $uq->where('name', 'like', $term)
                            ->orWhere('university_id', 'like', $term);
                    });
            });
        }

        if (in_array($request->user()->role?->name, ['school_manager', 'psychology_center_manager', 'principal'], true) && $request->user()->training_site_id) {
            $query->where('training_site_id', $request->user()->training_site_id);
        }
        if (in_array($request->user()->role?->name, ['coordinator', 'training_coordinator'], true)) {
            $coordinatorDeptId = $request->user()->department_id;
            if ($coordinatorDeptId) {
                $query->where(function ($q) use ($coordinatorDeptId) {
                    $q->whereHas('requestedBy', function ($uq) use ($coordinatorDeptId) {
                        $uq->where('department_id', $coordinatorDeptId);
                    })
                    ->orWhereHas('trainingRequestStudents.user', function ($uq) use ($coordinatorDeptId) {
                        $uq->where('department_id', $coordinatorDeptId);
                    });
                });
            }

            if (PsychologyAcademicWorkflow::isPsychologyCoordinator($request->user())) {
                $psychSupervisorIds = User::query()
                    ->whereHas('role', fn ($r) => $r->where('name', 'academic_supervisor'))
                    ->whereHas('department', fn ($d) => $d->where('name', \App\Services\TrainingTrackResolver::PSYCHOLOGY))
                    ->pluck('id');
                if ($psychSupervisorIds->isNotEmpty()) {
                    $query->whereNotIn('requested_by', $psychSupervisorIds->all());
                }
            }
            // إذا لم يكن للمنسق قسم، يرى جميع الطلبات بدون فلتر
        }
        if (PsychologyAcademicWorkflow::isPsychologyAcademicSupervisor($request->user())) {
            $supervisor = $request->user();
            $query->where(function ($q) use ($supervisor) {
                $q->where('requested_by', $supervisor->id)
                    ->orWhereHas('trainingRequestStudents.user.enrollments.section', function ($sec) use ($supervisor) {
                        $sec->where('academic_supervisor_id', $supervisor->id);
                    });
            });
        }
        if ($request->user()->role?->name === 'education_directorate' && !empty($request->user()->directorate)) {
            $userDirectorate = $request->user()->directorate;
            $query->where(function ($q) use ($userDirectorate) {
                $q->where('directorate', $userDirectorate)
                    ->orWhereHas('trainingSite', function ($sq) use ($userDirectorate) {
                        $sq->where('directorate', $userDirectorate);
                    });
            });
        }

        // فصل مسار التربية (مدارس) عن مسار الصحة (مراكز صحية) في قوائم الجهات الرسمية
        if ($request->user()->role?->name === 'education_directorate') {
            $query->whereHas('trainingSite', fn ($q) => $q->where('site_type', 'school'));
        }
        if (in_array($request->user()->role?->name, ['health_directorate', 'ministry_of_health'], true)) {
            $query->whereHas('trainingSite', fn ($q) => $q->where('site_type', 'health_center'));
        }

        $trainingRequests = $query->latest()->paginate($request->per_page ?? 15);

        return TrainingRequestResource::collection($trainingRequests);
    }

    public function store(StoreTrainingRequest $request)
    {
        $trainingRequest = $this->trainingRequestService->createTrainingRequest(
            $request->validated(),
            $request->user()
        );
        return new TrainingRequestResource($trainingRequest);
    }

    public function show(TrainingRequest $trainingRequest)
    {
        return new TrainingRequestResource($trainingRequest->load([
            'trainingSite',
            'trainingRequestStudents.user',
            'trainingRequestStudents.course',
            'trainingRequestStudents.assignedTeacher',
        ]));
    }

    public function update(UpdateTrainingRequest $request, TrainingRequest $trainingRequest)
    {
        $trainingRequest->update($request->validated());
        return new TrainingRequestResource($trainingRequest);
    }

    public function destroy(TrainingRequest $trainingRequest)
    {
        $trainingRequest->delete();
        return response()->json(['message' => 'تم حذف الكتاب بنجاح']);
    }

    public function sendToDirectorate(SendTrainingRequestToDirectorateRequest $request, TrainingRequest $trainingRequest)
    {
        $this->authorize('sendToDirectorate', $trainingRequest);
        $this->trainingRequestService->sendToDirectorate(
            $trainingRequest,
            $request->user()->id,
            $request->validated()
        );
        return response()->json(['message' => 'تم إرسال الكتاب إلى المديرية بنجاح']);
    }

    public function directorateApprove(DirectorateApproveTrainingRequest $request, TrainingRequest $trainingRequest)
    {
        $trainingRequest->loadMissing('trainingSite');
        $this->authorize('approveByDirectorate', $trainingRequest);
        if ($request->status === 'rejected') {
            $reason = $request->rejection_reason ?? '';
            try {
                if ($trainingRequest->governing_body === 'ministry_of_health') {
                    $this->trainingRequestService->healthMinistryReject($trainingRequest, $reason, $request->user()->id);
                    return response()->json(['message' => 'تم رفض الكتاب من وزارة الصحة']);
                }
                $this->trainingRequestService->directorateReject($trainingRequest, $reason, $request->user()->id);
                return response()->json(['message' => 'تم رفض الكتاب من المديرية']);
            } catch (ValidationException $e) {
                return response()->json(['message' => 'فشل رفض الطلب', 'errors' => $e->errors()], 422);
            } catch (\Exception $e) {
                return response()->json(['message' => 'حدث خطأ أثناء رفض الطلب: ' . $e->getMessage()], 500);
            }
        }
        try {
            $this->trainingRequestService->directorateApprove($trainingRequest, $request->user()->id);

            // Auto-send to training site after approval
            $trainingRequest->refresh();
            $letterData = [
                'letter_number' => $request->letter_number,
                'letter_date' => $request->letter_date,
                'content' => $request->content,
            ];
            $this->trainingRequestService->sendToSchool($trainingRequest, $request->user()->id, $letterData);

            return response()->json(['message' => 'تمت موافقة الجهة الرسمية وإرسال الكتاب إلى جهة التدريب بنجاح']);
        } catch (ValidationException $e) {
            return response()->json(['message' => 'فشل اعتماد الطلب', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'حدث خطأ أثناء اعتماد الطلب: ' . $e->getMessage()], 500);
        }
    }

    public function sendToSchool(SendTrainingRequestToSchoolRequest $request, TrainingRequest $trainingRequest)
    {
        $this->authorize('sendToSchool', $trainingRequest);
        $this->trainingRequestService->sendToSchool(
            $trainingRequest,
            $request->user()->id,
            $request->validated()
        );
        return response()->json(['message' => 'تم إرسال الكتاب إلى جهة التدريب بنجاح']);
    }

    public function schoolApprove(SchoolApproveTrainingRequest $request, TrainingRequest $trainingRequest)
    {
        $trainingRequest->loadMissing('trainingSite');
        $this->authorize('approveBySchool', $trainingRequest);
        if ($request->status === 'rejected') {
            $reason = $request->rejection_reason ?? '';
            try {
                $this->trainingRequestService->schoolReject($trainingRequest, $reason, $request->user()->id);
                return response()->json(['message' => 'تم رفض الطلب من جهة التدريب']);
            } catch (ValidationException $e) {
                return response()->json(['message' => 'فشل رفض الطلب', 'errors' => $e->errors()], 422);
            } catch (\Exception $e) {
                return response()->json(['message' => 'حدث خطأ أثناء رفض الطلب: ' . $e->getMessage()], 500);
            }
        }
        try {
            $this->trainingRequestService->schoolApprove($trainingRequest, $request->user()->id, $request->students);
            return response()->json(['message' => 'تمت موافقة جهة التدريب وتعيين المشرفين الميدانيين بنجاح']);
        } catch (ValidationException $e) {
            return response()->json(['message' => 'فشل اعتماد الطلب', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'حدث خطأ أثناء اعتماد الطلب: ' . $e->getMessage()], 500);
        }
    }

    public function reject(RejectTrainingRequestRequest $request, TrainingRequest $trainingRequest)
    {
        $this->authorize('update', $trainingRequest);
        try {
            $this->trainingRequestService->reject($trainingRequest, $request->rejection_reason ?? '', $request->user()->id);
            return response()->json(['message' => 'تم رفض الكتاب']);
        } catch (ValidationException $e) {
            return response()->json(['message' => 'فشل رفض الطلب', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'حدث خطأ أثناء رفض الطلب: ' . $e->getMessage()], 500);
        }
    }

    public function coordinatorReview(CoordinatorReviewTrainingRequest $request, TrainingRequest $trainingRequest)
    {
        $this->authorize('coordinateReview', $trainingRequest);

        $decision = $request->validated()['decision'];
        if ($decision === 'approved') {
            $decision = 'prelim_approved';
        }
        $reason = $request->validated()['reason'] ?? null;

        if ($decision === 'needs_edit') {
            $trainingRequest->update([
                'book_status' => 'needs_edit',
                'needs_edit_reason' => $reason,
                'coordinator_reviewed_at' => now(),
            ]);
            $msg = 'أعيد طلب التدريب للطالب للتعديل.';
        } elseif ($decision === 'rejected') {
            $trainingRequest->update([
                'book_status' => 'coordinator_rejected',
                'status' => 'rejected',
                'coordinator_rejection_reason' => $reason,
                'coordinator_reviewed_at' => now(),
            ]);
            $msg = 'تم رفض طلب التدريب من المنسق.';
        } else {
            $trainingRequest->update([
                'book_status' => 'prelim_approved',
                'coordinator_reviewed_at' => now(),
            ]);
            $msg = 'تم اعتماد الطلب مبدئيًا. يمكن الآن تجميعه في دفعة وإرساله للجهة الرسمية.';
        }

        $trainingRequest->load([
            'requestedBy.role',
            'trainingSite',
            'trainingRequestStudents.user',
            'trainingRequestStudents.course',
            'trainingRequestStudents.assignedTeacher',
            'trainingPeriod',
        ]);

        if ($decision === 'needs_edit' || $decision === 'rejected') {
            TrainingRequestNotifications::forStudents(
                $trainingRequest,
                'training_request_coordinator_review',
                $msg,
                [
                    'training_request_id' => $trainingRequest->id,
                    'book_status' => $trainingRequest->book_status,
                    'decision' => $decision,
                ]
            );
        } else {
            TrainingRequestNotifications::forStudents(
                $trainingRequest,
                'training_request_coordinator_review',
                'تحديث مسار طلبك اعتماد المنسق المبدئي — الطلب يتابع لدى الجهات الرسمية، وليس قبولاً نهائياً في جهة التدريب بعد.',
                [
                    'training_request_id' => $trainingRequest->id,
                    'book_status' => $trainingRequest->book_status,
                    'decision' => $decision,
                ]
            );
        }

        return new TrainingRequestResource($trainingRequest);
    }

    public function studentIndex()
    {
        if (auth()->user()->role?->name !== 'student') {
            abort(403);
        }

        $user = auth()->user();
        $requests = TrainingRequest::with([
            'trainingSite',
            'trainingPeriod',
            'trainingRequestStudents' => function ($query) use ($user) {
                $query->where('user_id', $user->id)
                    ->with(['user', 'course', 'assignedTeacher']);
            },
        ])
            ->where(function ($q) use ($user) {
                $q->where('requested_by', $user->id)
                    ->orWhereHas('trainingRequestStudents', fn ($sq) => $sq->where('user_id', $user->id));
            })
            ->latest()
            ->paginate(15);

        return TrainingRequestResource::collection($requests);
    }

    public function studentStore(Request $request)
    {
        $this->authorize('create', TrainingRequest::class);

        $user = $request->user();
        if ($user->resolveStudentTrack() === 'psychology') {
            return response()->json([
                'message' => 'طلبات تدريب قسم علم النفس يتم إنشاؤها بواسطة المشرف الأكاديمي للقسم وليس من قبل الطالب.',
            ], 403);
        }
        $existingRequest = TrainingRequest::query()
            ->where(function ($q) use ($user) {
                $q->where('requested_by', $user->id)
                    ->orWhereHas('trainingRequestStudents', fn ($sq) => $sq->where('user_id', $user->id));
            })
            ->latest('id')
            ->first();

        if ($existingRequest) {
            return response()->json([
                'message' => 'مسموح للطالب بطلب تدريب واحد فقط. يرجى تعديل الطلب الحالي بدل إنشاء طلب جديد.',
                'training_request_id' => $existingRequest->id,
                'book_status' => $existingRequest->book_status,
            ], 409);
        }

        // تحقق من أن الطالب مسجّل في شعبة مرتبطة بمساق
        $enrollment    = $user->currentEnrollment();
        $enrolledSection = $enrollment?->section;

        if (! $enrolledSection) {
            return response()->json([
                'message' => 'لا يمكن إرسال طلب التدريب. يجب أن تكون مسجلاً في شعبة دراسية أولاً. تواصل مع رئيس القسم لتسجيلك في الشعبة المناسبة.',
            ], 422);
        }

        if (! $enrolledSection->course_id) {
            return response()->json([
                'message' => 'الشعبة المسجّل فيها غير مرتبطة بمساق. تواصل مع رئيس القسم لإصلاح هذا.',
            ], 422);
        }

        $data = $request->validate([
            'training_site_id'      => 'required|exists:training_sites,id',
            'training_period_id'    => 'nullable|exists:training_periods,id',
            'course_id'             => 'nullable|exists:courses,id',
            'directorate'           => 'nullable|string',
            'gender_classification' => 'nullable|in:boys,girls,mixed',
            'school_level'          => 'nullable|in:lower,upper,both',
            'notes'                 => 'nullable|string',
            'start_date'            => 'nullable|date',
            'end_date'              => 'nullable|date|after:start_date',
            'attachment_path'       => 'nullable|string|max:2048',
            'governing_body'        => 'nullable|in:directorate_of_education,ministry_of_health',
        ]);

        $data['training_period_id'] = $data['training_period_id'] ?? $this->resolveAutoTrainingPeriodId();
        $data['course_id'] = $data['course_id'] ?? $this->resolveAutoCourseIdForStudent($request->user());
        $data = $this->normalizeStudentDates($data);

        if (empty($data['course_id'])) {
            return response()->json([
                'message' => 'تعذر تحديد المساق تلقائيًا. يرجى التأكد من تسجيل الطالب في شعبة مرتبطة بمساق.',
            ], 422);
        }

        $site = TrainingSite::findOrFail($data['training_site_id']);
        $track = auth()->user()?->resolveStudentTrack();
        if ($track === 'education' && $site->site_type !== 'school') {
            return response()->json([
                'message' => 'طالب أصول التربية يمكنه اختيار مدارس فقط.',
            ], 422);
        }
        if ($track === 'education' && empty($data['directorate'])) {
            return response()->json([
                'message' => 'لطالب أصول التربية يجب اختيار المديرية أولاً.',
            ], 422);
        }
        if (! empty($data['directorate']) && ! $this->isAllowedDirectorate($data['directorate'])) {
            return response()->json([
                'message' => 'المديرية المحددة غير صالحة.',
                'errors' => [
                    'directorate' => ['المديرية المحددة غير صالحة.'],
                ],
            ], 422);
        }
        if (
            $track === 'education'
            && ! empty($data['directorate'])
            && $this->normalizeDirectorate((string) $site->directorate) !== $this->normalizeDirectorate((string) $data['directorate'])
        ) {
            return response()->json([
                'message' => 'جهة التدريب المختارة لا تتبع المديرية المحددة.',
            ], 422);
        }

        if (! empty($data['governing_body']) && $data['governing_body'] !== $site->governing_body) {
            return response()->json([
                'message' => 'الجهة الرسمية المختارة لا تطابق نوع موقع التدريب.',
            ], 422);
        }
        if (! $this->hasManagerAccountForSite($site)) {
            return response()->json([
                'message' => 'المدرسة/جهة التدريب المختارة غير مربوطة بحساب مدير. يرجى اختيار جهة أخرى أو مراجعة الإدارة.',
            ], 422);
        }

        // Re-validate that the site is active
        if (! $site->is_active) {
            return response()->json([
                'message' => 'مكان التدريب المختار غير متاح حالياً.',
            ], 422);
        }

        // Re-validate gender_classification matches site (if submitted)
        if (! empty($data['gender_classification']) && $site->gender_classification !== null) {
            if ($site->gender_classification !== $data['gender_classification']) {
                return response()->json([
                    'message' => 'مكان التدريب المختار لا يتطابق مع تصنيف الجنس المحدد.',
                ], 422);
            }
        }

        // Re-validate school_level matches site (if submitted)
        // A site with school_level = 'both' is valid for any requested level.
        if (! empty($data['school_level']) && in_array($data['school_level'], ['lower', 'upper'], true)) {
            if ($site->school_level !== null && ! in_array($site->school_level, [$data['school_level'], 'both'], true)) {
                return response()->json([
                    'message' => 'مكان التدريب المختار لا يتطابق مع المرحلة الدراسية المحددة.',
                ], 422);
            }
        }

        // Capacity check
        $activeCount = $site->trainingAssignments()
            ->whereIn('status', ['assigned', 'ongoing'])
            ->count();
        if ($site->capacity > 0 && $activeCount >= $site->capacity) {
            return response()->json([
                'message' => 'لا توجد سعة متاحة في مكان التدريب المختار.',
            ], 422);
        }

        $trainingRequest = TrainingRequest::create([
            'requested_by' => auth()->id(),
            'training_site_id' => $data['training_site_id'],
            'training_period_id' => $data['training_period_id'] ?? null,
            'governing_body' => $site->governing_body,
            'directorate' => $data['directorate'] ?? null,
            'status' => 'pending',
            'book_status' => 'sent_to_coordinator',
            'requested_at' => now(),
            'attachment_path' => $data['attachment_path'] ?? null,
        ]);

        TrainingRequestStudent::create([
            'training_request_id' => $trainingRequest->id,
            'user_id' => auth()->id(),
            'course_id' => $data['course_id'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'notes' => $data['notes'] ?? null,
            'status' => 'pending',
        ]);

        $resource = $trainingRequest->load([
            'requestedBy.role',
            'trainingSite',
            'trainingRequestStudents.user',
            'trainingRequestStudents.course',
            'trainingRequestStudents.assignedTeacher',
            'trainingPeriod',
        ]);

        TrainingRequestNotifications::forCoordinatorsByDepartment(
            (int) auth()->user()->department_id,
            'training_request_new_from_student_department',
            'طلب تدريب جديد من طالب ضمن نفس القسم بانتظار المراجعة.',
            ['training_request_id' => $trainingRequest->id]
        );

        return new TrainingRequestResource($resource);
    }

    public function studentUpdate(Request $request, TrainingRequest $trainingRequest)
    {
        $this->authorize('updateAsStudent', $trainingRequest);

        $data = $request->validate([
            'training_site_id'      => 'required|exists:training_sites,id',
            'training_period_id'    => 'nullable|exists:training_periods,id',
            'course_id'             => 'nullable|exists:courses,id',
            'directorate'           => 'nullable|string',
            'gender_classification' => 'nullable|in:boys,girls,mixed',
            'school_level'          => 'nullable|in:lower,upper,both',
            'notes'                 => 'nullable|string',
            'start_date'            => 'nullable|date',
            'end_date'              => 'nullable|date|after:start_date',
            'attachment_path'       => 'nullable|string|max:2048',
        ]);

        $data['training_period_id'] = $data['training_period_id'] ?? $this->resolveAutoTrainingPeriodId();
        $data['course_id'] = $data['course_id'] ?? $this->resolveAutoCourseIdForStudent($request->user());
        $data = $this->normalizeStudentDates($data);

        if (empty($data['course_id'])) {
            return response()->json([
                'message' => 'تعذر تحديد المساق تلقائيًا. يرجى التأكد من تسجيل الطالب في شعبة مرتبطة بمساق.',
            ], 422);
        }

        $site = TrainingSite::findOrFail($data['training_site_id']);
        $track = auth()->user()?->resolveStudentTrack();
        if ($track === 'education' && $site->site_type !== 'school') {
            return response()->json([
                'message' => 'طالب أصول التربية يمكنه اختيار مدارس فقط.',
            ], 422);
        }
        if ($track === 'education' && empty($data['directorate'])) {
            return response()->json([
                'message' => 'لطالب أصول التربية يجب اختيار المديرية أولاً.',
            ], 422);
        }
        if (! empty($data['directorate']) && ! $this->isAllowedDirectorate($data['directorate'])) {
            return response()->json([
                'message' => 'المديرية المحددة غير صالحة.',
                'errors' => [
                    'directorate' => ['المديرية المحددة غير صالحة.'],
                ],
            ], 422);
        }
        if (
            $track === 'education'
            && ! empty($data['directorate'])
            && $this->normalizeDirectorate((string) $site->directorate) !== $this->normalizeDirectorate((string) $data['directorate'])
        ) {
            return response()->json([
                'message' => 'جهة التدريب المختارة لا تتبع المديرية المحددة.',
            ], 422);
        }
        if (! $this->hasManagerAccountForSite($site)) {
            return response()->json([
                'message' => 'المدرسة/جهة التدريب المختارة غير مربوطة بحساب مدير. يرجى اختيار جهة أخرى أو مراجعة الإدارة.',
            ], 422);
        }

        // Re-validate that the site is active
        if (! $site->is_active) {
            return response()->json([
                'message' => 'مكان التدريب المختار غير متاح حالياً.',
            ], 422);
        }

        // Re-validate gender_classification matches site (if submitted)
        if (! empty($data['gender_classification']) && $site->gender_classification !== null) {
            if ($site->gender_classification !== $data['gender_classification']) {
                return response()->json([
                    'message' => 'مكان التدريب المختار لا يتطابق مع بيانات الطلب (تصنيف الجنس).',
                ], 422);
            }
        }

        // Re-validate school_level matches site (if submitted)
        if (! empty($data['school_level']) && in_array($data['school_level'], ['lower', 'upper'], true)) {
            if ($site->school_level !== null && ! in_array($site->school_level, [$data['school_level'], 'both'], true)) {
                return response()->json([
                    'message' => 'مكان التدريب المختار لا يتطابق مع بيانات الطلب (المرحلة الدراسية).',
                ], 422);
            }
        }

        // Capacity check
        $activeCount = $site->trainingAssignments()
            ->whereIn('status', ['assigned', 'ongoing'])
            ->count();
        if ($site->capacity > 0 && $activeCount >= $site->capacity) {
            return response()->json([
                'message' => 'لا توجد سعة متاحة في مكان التدريب المختار.',
            ], 422);
        }

        $trainingRequest->update([
            'training_site_id' => $data['training_site_id'],
            'training_period_id' => $data['training_period_id'] ?? null,
            'governing_body' => $site->governing_body,
            'directorate' => $data['directorate'] ?? null,
            'attachment_path' => $data['attachment_path'] ?? $trainingRequest->attachment_path,
            'book_status' => 'sent_to_coordinator',
            'status' => 'pending',
            'rejection_reason' => null,
            'needs_edit_reason' => null,
            'coordinator_rejection_reason' => null,
            'coordinator_reviewed_at' => null,
            'batched_at' => null,
            'sent_to_directorate_at' => null,
            'directorate_approved_at' => null,
            'sent_to_school_at' => null,
            'school_approved_at' => null,
        ]);

        // حذف الربط القديم بالدفعة حتى لا يُعتبر الطلب مكرراً عند إنشاء دفعة جديدة
        DB::table('training_request_batch_items')->where('training_request_id', $trainingRequest->id)->delete();

        $row = TrainingRequestStudent::query()
            ->where('training_request_id', $trainingRequest->id)
            ->where('user_id', auth()->id())
            ->first();

        if ($row) {
            $row->update([
                'course_id' => $data['course_id'],
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'notes' => $data['notes'] ?? null,
                'status' => 'pending',
                'rejection_reason' => null,
                'assigned_teacher_id' => null,
            ]);
        }

        $withRelations = $trainingRequest->fresh()->load([
            'trainingRequestStudents',
            'requestedBy.role',
            'trainingSite',
            'trainingRequestStudents.user',
            'trainingRequestStudents.course',
            'trainingRequestStudents.assignedTeacher',
            'trainingPeriod',
        ]);

        TrainingRequestNotifications::forStudents(
            $withRelations,
            'training_request_student_resubmitted',
            'أعاد الطالب تقديم طلب التدريب بعد التعديل.',
            ['training_request_id' => $trainingRequest->id]
        );

        TrainingRequestNotifications::forCoordinators(
            'training_request_student_resubmitted',
            'أعاد طالب تقديم طلب تدريب بعد التعديل.',
            ['training_request_id' => $trainingRequest->id]
        );

        return new TrainingRequestResource($withRelations);
    }

    public function studentDestroy(TrainingRequest $trainingRequest)
    {
        $this->authorize('deleteAsStudent', $trainingRequest);

        TrainingRequestStudent::query()
            ->where('training_request_id', $trainingRequest->id)
            ->delete();

        $trainingRequest->delete();

        return response()->json(['message' => 'تم حذف طلب التدريب بنجاح']);
    }

    // ========== School Manager Endpoints ==========

    /**
     * جلب طلبات التدريب المرسلة إلى جهة التدريب الخاصة بمدير المدرسة
     */
    public function schoolManagerMentorRequests(Request $request)
    {
        $user = $request->user();

        if (!in_array($user->role?->name, ['school_manager', 'principal', 'psychology_center_manager'], true)) {
            abort(403, 'هذه الخدمة متاحة فقط لمدير جهة التدريب.');
        }

        $query = TrainingRequest::with([
            'trainingSite',
            'requestedBy.department',
            'trainingRequestStudents.user',
            'trainingRequestStudents.course',
            'trainingRequestStudents.assignedTeacher',
            'trainingPeriod',
        ])
            ->where('book_status', 'sent_to_school')
            ->where('status', 'pending');

        if ($user->training_site_id) {
            $query->where('training_site_id', $user->training_site_id);
        }

        if ($request->filled('governing_body')) {
            $query->where('governing_body', $request->governing_body);
        }

        $trainingRequests = $query->latest('sent_to_school_at')->paginate($request->per_page ?? 100);

        return TrainingRequestResource::collection($trainingRequests);
    }

    /**
     * جلب المعلمين المتاحين للتعيين كمرشدين في جهة التدريب
     */
    public function schoolManagerTeachers(Request $request)
    {
        $user = $request->user();

        if (!in_array($user->role?->name, ['school_manager', 'principal', 'psychology_center_manager'], true)) {
            abort(403, 'هذه الخدمة متاحة فقط لمدير جهة التدريب.');
        }

        // جهة التدريب (مدرسة): معلم/مرشد أو حساب مشرف ميداني في المنصة. المركز النفسي: أخصائي نفسي فقط.
        $targetRoles = $user->role?->name === 'psychology_center_manager'
            ? ['psychologist']
            : ['teacher', 'adviser', 'field_supervisor'];

        $teachers = User::where('status', 'active')
            ->with('role')
            ->whereHas('role', fn($q) => $q->whereIn('name', $targetRoles))
            ->when($user->training_site_id, fn ($q) => $q->where('training_site_id', $user->training_site_id))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $request->search) . '%';
                $q->where(function ($sub) use ($term) {
                    $sub->where('name', 'like', $term)
                        ->orWhere('university_id', 'like', $term);
                });
            })
            ->orderBy('name')
            ->get();

        return UserResource::collection($teachers);
    }

    /**
     * موافقة/رفض مدير المدرسة على طلب التدريب مع تعيين المعلمين المرشدين
     */
    public function schoolManagerApprove(SchoolApproveTrainingRequest $request, TrainingRequest $trainingRequest)
    {
        $trainingRequest->loadMissing('trainingSite');
        $this->authorize('approveBySchool', $trainingRequest);

        if ($request->status === 'rejected') {
            $reason = $request->rejection_reason ?? '';
            try {
                $this->trainingRequestService->schoolReject($trainingRequest, $reason, $request->user()->id);
                return response()->json(['message' => 'تم رفض الطلب من جهة التدريب']);
            } catch (ValidationException $e) {
                return response()->json(['message' => 'فشل رفض الطلب', 'errors' => $e->errors()], 422);
            } catch (\Exception $e) {
                return response()->json(['message' => 'حدث خطأ أثناء رفض الطلب: ' . $e->getMessage()], 500);
            }
        }

        try {
            $this->trainingRequestService->schoolApprove($trainingRequest, $request->user()->id, $request->students);
            return response()->json(['message' => 'تمت موافقة جهة التدريب وتعيين المشرفين الميدانيين بنجاح']);
        } catch (ValidationException $e) {
            return response()->json(['message' => 'فشل اعتماد الطلب', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'حدث خطأ أثناء اعتماد الطلب: ' . $e->getMessage()], 500);
        }
    }
}
