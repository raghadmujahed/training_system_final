<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Role;
use App\Models\Section;
use App\Models\User;
use App\Models\SectionStudent;
use App\Models\TrainingRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class HeadOfDepartmentController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    private function studentRoleId(): int
    {
        static $id = null;
        if ($id === null) {
            $id = Role::where('name', 'student')->value('id') ?? 2;
        }
        return $id;
    }

    // Test endpoint
    public function test(Request $request)
    {
        return response()->json([
            'message' => 'Test endpoint working',
            'user' => auth()->user() ? auth()->user()->id : null,
            'department_id' => auth()->user() ? auth()->user()->department_id : null
        ]);
    }

    // Reports and Statistics
    public function getDashboardStats(Request $request)
    {
        try {
            \Log::info('HeadOfDepartmentController::getDashboardStats called');
            $user = auth()->user();
            \Log::info('User: ' . ($user ? $user->id : 'null'));

            if (!$user) {
                return response()->json([
                    'message' => 'المستخدم غير مسجل الدخول.'
                ], 401);
            }

            $departmentId = $user->department_id;

            if (!$departmentId) {
                return response()->json([
                    'message' => 'لم يتم تعيين قسم لهذا المستخدم. يرجى التواصل مع الإدارة.'
                ], 403);
            }

            $stats = [
                'total_students' => User::where('role_id', $this->studentRoleId())
                    ->where('department_id', $departmentId)
                    ->where('status', 'active')
                    ->count(),
                'total_courses' => Course::where('department_id', $departmentId)->count(),
                'total_sections' => Section::whereHas('course', function ($query) use ($departmentId) {
                    $query->where('department_id', $departmentId);
                })->count(),
                'accepted_rejected_ratio' => $this->getAcceptedRejectedRatio($departmentId),
                'students_per_section' => $this->getStudentsPerSection($departmentId),
                'distribution_overview' => $this->getDistributionOverview($departmentId),
            ];

            return response()->json($stats);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'حدث خطأ في تحميل الإحصائيات',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getStudentsList(Request $request)
    {
        try {
            $user = auth()->user();

            if (!$user) {
                return response()->json([
                    'message' => 'المستخدم غير مسجل الدخول.'
                ], 401);
            }

            $departmentId = $user->department_id;

            if (!$departmentId) {
                return response()->json([
                    'message' => 'لم يتم تعيين قسم لهذا المستخدم. يرجى التواصل مع الإدارة.'
                ], 403);
            }

            $query = User::where('role_id', $this->studentRoleId())
                ->where('department_id', $departmentId)
                ->where('status', 'active')
                ->with(['sectionStudents.section.course', 'trainingSite']);

            // Filters
            if ($request->course_id) {
                $query->whereHas('sectionStudents.section', function ($q) use ($request) {
                    $q->where('course_id', $request->course_id);
                });
            }

            if ($request->section_id) {
                $query->whereHas('sectionStudents', function ($q) use ($request) {
                    $q->where('section_id', $request->section_id);
                });
            }

            if ($request->status) {
                $query->whereHas('sectionStudents', function ($q) use ($request) {
                    $q->where('status', $request->status);
                });
            }

            $students = $query->paginate($request->per_page ?? 20);

            return response()->json($students);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'حدث خطأ في تحميل قائمة الطلاب',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getStudentDetails($studentId)
    {
        try {
            $user = auth()->user();

            if (!$user) {
                return response()->json([
                    'message' => 'المستخدم غير مسجل الدخول.'
                ], 401);
            }

            $departmentId = $user->department_id;

            if (!$departmentId) {
                return response()->json([
                    'message' => 'لم يتم تعيين قسم لهذا المستخدم. يرجى التواصل مع الإدارة.'
                ], 403);
            }

            $student = User::where('id', $studentId)
                ->where('role_id', $this->studentRoleId())
                ->where('department_id', $departmentId)
                ->with(['sectionStudents.section.course', 'trainingSite'])
                ->firstOrFail();

            return response()->json($student);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'حدث خطأ في تحميل بيانات الطالب',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getDistributionStatus(Request $request)
    {
        try {
            $user = auth()->user();

            if (!$user) {
                return response()->json([
                    'message' => 'المستخدم غير مسجل الدخول.'
                ], 401);
            }

            $departmentId = $user->department_id;

            if (!$departmentId) {
                return response()->json([
                    'message' => 'لم يتم تعيين قسم لهذا المستخدم. يرجى التواصل مع الإدارة.'
                ], 403);
            }

            $query = SectionStudent::whereHas('section.course', function ($q) use ($departmentId) {
                $q->where('department_id', $departmentId);
            })->with(['student', 'section.course', 'student.trainingSite']);

            if ($request->course_id) {
                $query->whereHas('section', function ($q) use ($request) {
                    $q->where('course_id', $request->course_id);
                });
            }

            $distribution = $query->paginate($request->per_page ?? 20);

            return response()->json($distribution);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'حدث خطأ في تحميل حالة التوزيع',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getReports(Request $request)
    {
        try {
            $user = auth()->user();

            if (!$user) {
                return response()->json([
                    'message' => 'المستخدم غير مسجل الدخول.'
                ], 401);
            }

            $departmentId = $user->department_id;

            if (!$departmentId) {
                return response()->json([
                    'message' => 'لم يتم تعيين قسم لهذا المستخدم. يرجى التواصل مع الإدارة.'
                ], 403);
            }

            $reportType = $request->type ?? 'overview';
            $courseId = $request->course_id;
            $sectionId = $request->section_id;

            switch ($reportType) {
                case 'students_per_section':
                    return $this->getStudentsPerSectionReport($departmentId, $courseId, $sectionId);
                case 'distribution_status':
                    return $this->getDistributionStatusReport($departmentId, $courseId, $sectionId);
                case 'capacity_utilization':
                    return $this->getCapacityUtilizationReport($departmentId, $courseId);
                default:
                    return $this->getOverviewReport($departmentId);
            }
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'حدث خطأ في تحميل التقارير',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function getAcceptedRejectedRatio($departmentId)
    {
        $total = SectionStudent::whereHas('section.course', function ($query) use ($departmentId) {
            $query->where('department_id', $departmentId);
        })->count();

        if ($total === 0) {
            return ['accepted' => 0, 'rejected' => 0, 'pending' => 0];
        }

        $accepted = SectionStudent::whereHas('section.course', function ($query) use ($departmentId) {
            $query->where('department_id', $departmentId);
        })->where('status', 'accepted')->count();

        $rejected = SectionStudent::whereHas('section.course', function ($query) use ($departmentId) {
            $query->where('department_id', $departmentId);
        })->where('status', 'rejected')->count();

        $pending = SectionStudent::whereHas('section.course', function ($query) use ($departmentId) {
            $query->where('department_id', $departmentId);
        })->where('status', 'pending')->count();

        return [
            'accepted' => $accepted,
            'rejected' => $rejected,
            'pending' => $pending,
            'accepted_percentage' => $total > 0 ? round(($accepted / $total) * 100, 2) : 0,
            'rejected_percentage' => $total > 0 ? round(($rejected / $total) * 100, 2) : 0,
            'pending_percentage' => $total > 0 ? round(($pending / $total) * 100, 2) : 0,
        ];
    }

    private function getStudentsPerSection($departmentId)
    {
        try {
            $sections = Section::whereHas('course', function ($query) use ($departmentId) {
                $query->where('department_id', $departmentId);
            })->with(['course'])->get();

            return $sections->map(function ($section) {
                $activeCount = $section->students()->wherePivot('status', 'accepted')->count();
                $capacity = $section->capacity ?? 0;
                return [
                    'section_id' => $section->id,
                    'section_name' => $section->name,
                    'course_name' => $section->course ? $section->course->name : 'غير محدد',
                    'capacity' => $capacity,
                    'active_students' => $activeCount,
                    'available_capacity' => max(0, $capacity - $activeCount),
                    'utilization_percentage' => $capacity > 0 ? round(($activeCount / $capacity) * 100, 2) : 0,
                ];
            });
        } catch (\Exception $e) {
            \Log::error('getStudentsPerSection error: ' . $e->getMessage());
            return [];
        }
    }

    private function getDistributionOverview($departmentId)
    {
        try {
            $students = User::where('role_id', $this->studentRoleId())
                ->where('department_id', $departmentId)
                ->with(['trainingSite', 'sectionStudents.section.course'])
                ->get();

            $assignedToSections = 0;
            $notAssignedToSections = 0;

            foreach ($students as $student) {
                if ($student->sectionStudents && $student->sectionStudents->count() > 0) {
                    $assignedToSections++;
                } else {
                    $notAssignedToSections++;
                }
            }

            $overview = [
                'total_students' => $students->count(),
                'with_training_site' => $students->whereNotNull('training_site_id')->count(),
                'without_training_site' => $students->whereNull('training_site_id')->count(),
                'assigned_to_sections' => $assignedToSections,
                'not_assigned_to_sections' => $notAssignedToSections,
            ];

            return $overview;
        } catch (\Exception $e) {
            \Log::error('getDistributionOverview error: ' . $e->getMessage());
            return [
                'total_students' => 0,
                'with_training_site' => 0,
                'without_training_site' => 0,
                'assigned_to_sections' => 0,
                'not_assigned_to_sections' => 0,
            ];
        }
    }

    private function getOverviewReport($departmentId)
    {
        try {
            $stats = [
                'total_students' => User::where('role_id', $this->studentRoleId())
                    ->where('department_id', $departmentId)
                    ->count(),
                'total_courses' => Course::where('department_id', $departmentId)->count(),
                'total_sections' => Section::whereHas('course', function ($query) use ($departmentId) {
                    $query->where('department_id', $departmentId);
                })->count(),
                'accepted_rejected_ratio' => $this->getAcceptedRejectedRatio($departmentId),
                'students_per_section' => $this->getStudentsPerSection($departmentId),
                'distribution_overview' => $this->getDistributionOverview($departmentId),
            ];

            return [
                'stats' => $stats,
                'students_per_section' => $this->getStudentsPerSection($departmentId),
                'distribution_overview' => $this->getDistributionOverview($departmentId),
            ];
        } catch (\Exception $e) {
            \Log::error('getOverviewReport error: ' . $e->getMessage());
            return [
                'stats' => [
                    'total_students' => 0,
                    'total_courses' => 0,
                    'total_sections' => 0,
                    'accepted_rejected_ratio' => ['accepted' => 0, 'rejected' => 0, 'pending' => 0],
                ],
                'students_per_section' => [],
                'distribution_overview' => [
                    'total_students' => 0,
                    'with_training_site' => 0,
                    'without_training_site' => 0,
                    'assigned_to_sections' => 0,
                    'not_assigned_to_sections' => 0,
                ],
            ];
        }
    }

    private function getStudentsPerSectionReport($departmentId, $courseId = null, $sectionId = null)
    {
        try {
            $query = Section::whereHas('course', function ($q) use ($departmentId) {
                $q->where('department_id', $departmentId);
            });

            if ($courseId) {
                $query->where('course_id', $courseId);
            }

            if ($sectionId) {
                $query->where('id', $sectionId);
            }

            $sections = $query->with(['course'])->get();

            return $sections->map(function ($section) {
                $activeCount = $section->students()->wherePivot('status', 'accepted')->count();
                $capacity = $section->capacity ?? 0;
                return [
                    'section_id' => $section->id,
                    'section_name' => $section->name,
                    'course_name' => $section->course ? $section->course->name : 'غير محدد',
                    'course_id' => $section->course ? $section->course->id : null,
                    'capacity' => $capacity,
                    'active_students' => $activeCount,
                    'available_capacity' => max(0, $capacity - $activeCount),
                    'utilization_percentage' => $capacity > 0 ? round(($activeCount / $capacity) * 100, 2) : 0,
                ];
            });
        } catch (\Exception $e) {
            \Log::error('getStudentsPerSectionReport error: ' . $e->getMessage());
            return [];
        }
    }

    private function getDistributionStatusReport($departmentId, $courseId = null, $sectionId = null)
    {
        try {
            $query = SectionStudent::whereHas('section.course', function ($q) use ($departmentId) {
                $q->where('department_id', $departmentId);
            })->with(['student', 'section.course', 'student.trainingSite']);

            if ($courseId) {
                $query->whereHas('section', function ($q) use ($courseId) {
                    $q->where('course_id', $courseId);
                });
            }

            if ($sectionId) {
                $query->where('section_id', $sectionId);
            }

            return $query->get()->map(function ($assignment) {
                return [
                    'student_name' => $assignment->student ? $assignment->student->name : 'غير محدد',
                    'university_id' => $assignment->student ? $assignment->student->university_id : '—',
                    'major' => $assignment->student ? $assignment->student->major : '—',
                    'course' => $assignment->section && $assignment->section->course ? $assignment->section->course->name : 'غير محدد',
                    'section' => $assignment->section ? $assignment->section->name : 'غير محدد',
                    'training_place' => $assignment->student && $assignment->student->trainingSite ? $assignment->student->trainingSite->name : 'غير محدد',
                    'status' => $assignment->status,
                    'notes' => $assignment->notes,
                ];
            });
        } catch (\Exception $e) {
            \Log::error('getDistributionStatusReport error: ' . $e->getMessage());
            return [];
        }
    }

    private function getCapacityUtilizationReport($departmentId, $courseId = null)
    {
        try {
            $query = Section::whereHas('course', function ($q) use ($departmentId) {
                $q->where('department_id', $departmentId);
            });

            if ($courseId) {
                $query->where('course_id', $courseId);
            }

            $sections = $query->with(['course'])->get();

            $totalCapacity = $sections->sum('capacity');
            $totalStudents = 0;
            $sectionsData = [];

            foreach ($sections as $section) {
                $activeCount = $section->students()->wherePivot('status', 'accepted')->count();
                $totalStudents += $activeCount;
                $sectionsData[] = [
                    'course_id' => $section->course ? $section->course->id : null,
                    'course_name' => $section->course ? $section->course->name : 'غير محدد',
                    'total_capacity' => $section->capacity ?? 0,
                    'used_capacity' => $activeCount,
                    'utilization_percentage' => ($section->capacity ?? 0) > 0 ? round(($activeCount / ($section->capacity ?? 0)) * 100, 2) : 0,
                ];
            }

            return [
                'total_capacity' => $totalCapacity,
                'total_students' => $totalStudents,
                'overall_utilization' => $totalCapacity > 0 ? round(($totalStudents / $totalCapacity) * 100, 2) : 0,
                'capacity_utilization' => $sectionsData,
            ];
        } catch (\Exception $e) {
            \Log::error('getCapacityUtilizationReport error: ' . $e->getMessage());
            return [
                'total_capacity' => 0,
                'total_students' => 0,
                'overall_utilization' => 0,
                'capacity_utilization' => [],
            ];
        }
    }

    // Administrative Decisions
    public function modifyStudentAssignment(Request $request, $studentId)
    {
        try {
            $request->validate([
                'section_id' => 'required|exists:sections,id',
                'status' => 'sometimes|in:accepted,rejected,pending',
                'notes' => 'sometimes|nullable|string'
            ]);

            $user = auth()->user();

            if (!$user) {
                return response()->json([
                    'message' => 'المستخدم غير مسجل الدخول.'
                ], 401);
            }

            $departmentId = $user->department_id;

            if (!$departmentId) {
                return response()->json([
                    'message' => 'لم يتم تعيين قسم لهذا المستخدم. يرجى التواصل مع الإدارة.'
                ], 403);
            }

            $student = User::where('id', $studentId)
                ->where('role_id', $this->studentRoleId())
                ->where('department_id', $departmentId)
                ->firstOrFail();

            $section = Section::where('id', $request->section_id)
                ->whereHas('course', function ($q) use ($departmentId) {
                    $q->where('department_id', $departmentId);
                })->firstOrFail();

            // Check capacity
            if (!$section->hasAvailableCapacity()) {
                return response()->json(['message' => 'الشعبة ممتلئة'], 422);
            }

            // Remove from other sections of the same course
            $section->course->sections()->each(function ($otherSection) use ($student) {
                $otherSection->students()->detach($student->id);
            });

            // Assign to new section
            $section->students()->attach($student->id, [
                'status' => $request->status ?? 'accepted',
                'notes' => $request->notes
            ]);

            return response()->json(['message' => 'تم تعديل تخصيص الطالب بنجاح']);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'حدث خطأ في تعديل تخصيص الطالب',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function reviewRejectedCases(Request $request)
    {
        try {
            $user = auth()->user();

            if (!$user) {
                return response()->json([
                    'message' => 'المستخدم غير مسجل الدخول.'
                ], 401);
            }

            $departmentId = $user->department_id;

            if (!$departmentId) {
                return response()->json([
                    'message' => 'لم يتم تعيين قسم لهذا المستخدم. يرجى التواصل مع الإدارة.'
                ], 403);
            }

            // Get student IDs in this department
            $studentIds = User::where('role_id', $this->studentRoleId())
                ->where('department_id', $departmentId)
                ->pluck('id');

            // Get rejections from SectionStudent (section assignment rejections)
            $sectionRejections = SectionStudent::whereIn('student_id', $studentIds)
                ->where('status', 'rejected')
                ->with(['student', 'section.course'])
                ->get()
                ->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'type' => 'section_assignment',
                        'source' => 'section',
                        'student' => $item->student,
                        'section' => $item->section,
                        'course' => $item->section->course ?? null,
                        'status' => $item->status,
                        'notes' => $item->notes,
                        'rejection_reason' => $item->notes,
                        'created_at' => $item->created_at,
                    ];
                });

            // Get rejections from TrainingRequest (coordinator, directorate, school rejections)
            $trainingRequestRejections = TrainingRequest::whereHas('trainingRequestStudents.user', function ($q) use ($studentIds) {
                $q->whereIn('id', $studentIds);
            })->where(function ($q) {
                // Rejected by coordinator
                $q->where('book_status', 'coordinator_rejected')
                    // Rejected by directorate
                    ->orWhere('book_status', 'directorate_rejected')
                    // Rejected by school
                    ->orWhere('book_status', 'school_rejected')
                    // General rejected status
                    ->orWhere('book_status', 'rejected');
            })->with(['trainingRequestStudents.user', 'trainingSite', 'requestedBy'])
            ->get()
                ->map(function ($request) {
                    $student = $request->trainingRequestStudents->first()->user ?? null;
                    $rejectionSource = 'unknown';
                    $rejectionReason = $request->rejection_reason;

                    // Determine rejection source
                    if ($request->book_status === 'coordinator_rejected') {
                        $rejectionSource = 'coordinator';
                        $rejectionReason = $request->coordinator_rejection_reason ?? $request->rejection_reason;
                    } elseif ($request->book_status === 'directorate_rejected') {
                        $rejectionSource = 'directorate';
                        $rejectionReason = $request->rejection_reason;
                    } elseif ($request->book_status === 'school_rejected') {
                        $rejectionSource = 'school';
                        $rejectionReason = $request->rejection_reason;
                    } elseif ($request->book_status === 'rejected') {
                        $rejectionSource = 'general';
                    }

                    return [
                        'id' => $request->id,
                        'type' => 'training_request',
                        'source' => $rejectionSource,
                        'student' => $student,
                        'training_site' => $request->trainingSite,
                        'book_status' => $request->book_status,
                        'status' => $request->book_status,
                        'rejection_reason' => $rejectionReason,
                        'notes' => $rejectionReason,
                        'created_at' => $request->created_at,
                        'requested_by' => $request->requestedBy,
                    ];
                });

            // Merge all rejections
            $allRejections = $sectionRejections->concat($trainingRequestRejections)
                ->sortByDesc('created_at')
                ->values();

            // Paginate manually
            $perPage = $request->per_page ?? 20;
            $page = $request->page ?? 1;
            $offset = ($page - 1) * $perPage;
            $paginatedRejections = $allRejections->slice($offset, $perPage);

            return response()->json([
                'data' => $paginatedRejections,
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $allRejections->count(),
                'last_page' => ceil($allRejections->count() / $perPage),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'حدث خطأ في تحميل الحالات المرفوضة',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function bulkEnrollStudents(Request $request)
    {
        try {
            $user = auth()->user();

            if (!$user) {
                return response()->json([
                    'message' => 'المستخدم غير مسجل الدخول.'
                ], 401);
            }

            $departmentId = $user->department_id;

            if (!$departmentId) {
                return response()->json([
                    'message' => 'لم يتم تعيين قسم لهذا المستخدم. يرجى التواصل مع الإدارة.'
                ], 403);
            }

            $request->validate([
                'section_id' => 'required|exists:sections,id',
                'students' => 'required|array',
                'students.*' => 'exists:users,id',
                'academic_year' => 'required|integer',
                'semester' => 'required|in:first,second,summer',
            ]);

            $section = Section::where('id', $request->section_id)
                ->whereHas('course', function ($q) use ($departmentId) {
                    $q->where('department_id', $departmentId);
                })->firstOrFail();

            $success = [];
            $failed = [];

            foreach ($request->students as $studentId) {
                try {
                    $student = User::where('id', $studentId)
                        ->where('role_id', $this->studentRoleId())
                        ->where('department_id', $departmentId)
                        ->where('status', 'active')
                        ->first();

                    if (!$student) {
                        $failed[] = ['student_id' => $studentId, 'error' => 'الطالب غير موجود أو غير مفعل أو لا ينتمي لهذا القسم'];
                        continue;
                    }

                    // Check if already enrolled in this section
                    $existing = SectionStudent::where('section_id', $section->id)
                        ->where('student_id', $studentId)
                        ->first();

                    if ($existing) {
                        $failed[] = ['student_id' => $studentId, 'error' => 'الطالب مسجل بالفعل في هذه الشعبة'];
                        continue;
                    }

                    // Remove from other sections of the same course
                    $section->course->sections()->each(function ($otherSection) use ($studentId) {
                        $otherSection->students()->detach($studentId);
                    });

                    // Enroll in the new section
                    $section->students()->attach($studentId, [
                        'status' => 'accepted',
                        'academic_year' => $request->academic_year,
                        'semester' => $request->semester,
                    ]);

                    $success[] = $student;
                } catch (\Exception $e) {
                    $failed[] = ['student_id' => $studentId, 'error' => $e->getMessage()];
                }
            }

            return response()->json([
                'message' => 'تمت عملية التسجيل',
                'success_count' => count($success),
                'failed_count' => count($failed),
                'success' => $success,
                'failed' => $failed,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'حدث خطأ في التسجيل الجماعي',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Search students by name or university ID
    public function searchStudents(Request $request)
    {
        try {
            $user = auth()->user();

            if (!$user) {
                return response()->json([
                    'message' => 'المستخدم غير مسجل الدخول.'
                ], 401);
            }

            $departmentId = $user->department_id;

            if (!$departmentId) {
                return response()->json([
                    'message' => 'لم يتم تعيين قسم لهذا المستخدم.'
                ], 403);
            }

            $query = $request->get('q', '');

            if (strlen($query) < 2) {
                return response()->json([
                    'data' => []
                ]);
            }

            $students = User::whereHas('role', function ($q) {
                $q->where('name', 'student');
            })
            ->where('department_id', $departmentId)
            ->where('status', 'active') // Only active accounts
            ->where(function ($q) use ($query) {
                $q->where('name', 'LIKE', '%' . $query . '%')
                  ->orWhere('university_id', 'LIKE', '%' . $query . '%')
                  ->orWhere('email', 'LIKE', '%' . $query . '%');
            })
            ->limit(20)
            ->get(['id', 'name', 'university_id', 'email', 'department_id', 'status']);

            return response()->json([
                'data' => $students
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'حدث خطأ في البحث',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
