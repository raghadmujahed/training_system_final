<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\Attendance;
use App\Models\Course;
use App\Models\Department;
use App\Models\Enrollment;
use App\Models\Evaluation;
use App\Models\EvaluationItem;
use App\Models\EvaluationScore;
use App\Models\EvaluationTemplate;
use App\Models\PortfolioEntry;
use App\Models\Role;
use App\Models\StudentPortfolio;
use App\Models\SupervisorVisit;
use App\Models\Task;
use App\Models\TaskSubmission;
use App\Models\TrainingAssignment;
use App\Models\TrainingLog;
use App\Models\TrainingPeriod;
use App\Models\TrainingRequest;
use App\Models\TrainingRequestBatch;
use App\Models\TrainingRequestBatchItem;
use App\Models\TrainingRequestStudent;
use App\Models\TrainingSite;
use App\Models\User;
use App\Models\WeeklySchedule;
use App\Models\Section;
use App\Models\SectionStudent;
use Illuminate\Database\Seeder;

/**
 * بيانات وهمية مترابطة لتجربة معظم مسارات النظام بعد تشغيل الـ seeders الأساسية.
 */
class DemoDataSeeder extends Seeder
{
    private const ACADEMIC_YEAR = 2025;

    private const SEMESTER = 'first';

    public function run(): void
    {
        $site = TrainingSite::query()->orderBy('id')->first();
        $period = TrainingPeriod::query()->where('is_active', true)->orderBy('id')->first()
            ?? TrainingPeriod::query()->orderBy('id')->first();

        if (!$site || !$period) {
            $this->command?->warn('تخطي DemoDataSeeder: يلزم وجود موقع تدريب وفترة تدريب (شغّل TrainingSitesSeeder و TrainingPeriodsSeeder).');

            return;
        }

        $course = Course::query()->where('code', 'EDUC310')->first()
            ?? Course::query()->orderBy('id')->first();

        $section = Section::query()->orderBy('id')->first();
        $supervisor = User::query()->whereHas('role', fn ($q) => $q->where('name', 'academic_supervisor'))->first();
        $teacher = User::query()->whereHas('role', fn ($q) => $q->where('name', 'teacher'))->first();
        $coordinator = User::query()
            ->whereHas('role', fn ($q) => $q->where('name', 'training_coordinator'))
            ->orderBy('id')
            ->first();
        $admin = User::query()->where('email', 'admin@hebron.edu')->first();

        if (!$course || !$section || !$supervisor || !$teacher || !$coordinator) {
            $this->command?->warn('تخطي DemoDataSeeder: بيانات أساسية ناقصة (مساق، شعبة، مشرف، معلم، منسق).');

            return;
        }

        // شعبة إضافية لمساق ثانٍ (اختياري)
        $course320 = Course::query()->where('code', 'EDUC320')->first();
        $sectionB = null;
        if ($course320) {
            $sectionB = Section::query()->firstOrCreate(
                ['name' => 'شعبة B — تجريبي', 'course_id' => $course320->id],
                [
                    'academic_year' => self::ACADEMIC_YEAR,
                    'semester' => self::SEMESTER,
                    'academic_supervisor_id' => $supervisor->id,
                ]
            );
        }

        $studentRoleId = Role::query()->where('name', 'student')->value('id');
        $students = User::query()
            ->where('role_id', $studentRoleId)
            ->orderBy('id')
            ->get();

        if ($students->isEmpty()) {
            $this->command?->warn('تخطي DemoDataSeeder: لا يوجد طلاب في قاعدة البيانات.');

            return;
        }

        foreach ($students as $idx => $student) {
            Enrollment::query()->updateOrCreate(
                [
                    'user_id' => $student->id,
                    'section_id' => $section->id,
                    'academic_year' => self::ACADEMIC_YEAR,
                    'semester' => self::SEMESTER,
                ],
                ['status' => 'active']
            );

            if ($sectionB && $idx % 2 === 1) {
                Enrollment::query()->updateOrCreate(
                    [
                        'user_id' => $student->id,
                        'section_id' => $sectionB->id,
                        'academic_year' => self::ACADEMIC_YEAR,
                        'semester' => self::SEMESTER,
                    ],
                    ['status' => 'active']
                );
            }
        }

        // حالة التوزيع (رئيس القسم) تُقرأ من section_students وليس من enrollments فقط
        Enrollment::query()
            ->where('status', 'active')
            ->get()
            ->each(function (Enrollment $e) {
                SectionStudent::query()->firstOrCreate(
                    [
                        'section_id' => $e->section_id,
                        'student_id' => $e->user_id,
                    ],
                    ['status' => 'accepted']
                );
            });

        // شعبة بمساق قسم علم النفس — ليظهر لرئيس القسم شيء عند فتح «حالة التوزيع»
        $psychCourse = Course::query()->where('code', 'PSYC210')->first();
        $psychDeptId = Department::query()->where('name', 'psychology')->value('id');
        if ($psychCourse && $psychDeptId && $supervisor) {
            $psychSection = Section::query()->firstOrCreate(
                ['name' => 'شعبة إرشاد نفسي — تجريبي', 'course_id' => $psychCourse->id],
                [
                    'academic_year' => self::ACADEMIC_YEAR,
                    'semester' => self::SEMESTER,
                    'academic_supervisor_id' => $supervisor->id,
                ]
            );
            User::query()
                ->where('role_id', $studentRoleId)
                ->where('department_id', $psychDeptId)
                ->get()
                ->each(function (User $student) use ($psychSection) {
                    Enrollment::query()->updateOrCreate(
                        [
                            'user_id' => $student->id,
                            'section_id' => $psychSection->id,
                            'academic_year' => self::ACADEMIC_YEAR,
                            'semester' => self::SEMESTER,
                        ],
                        ['status' => 'active']
                    );
                    SectionStudent::query()->firstOrCreate(
                        [
                            'section_id' => $psychSection->id,
                            'student_id' => $student->id,
                        ],
                        ['status' => 'accepted']
                    );
                });
        }

        $stu01 = $students->firstWhere('email', 'stu01@hebron.edu') ?? $students->get(0);
        $stu02 = $students->firstWhere('email', 'stu02@hebron.edu') ?? $students->get(1);
        $stu03 = $students->firstWhere('email', 'stu03@hebron.edu') ?? $students->get(2);

        // ——— قالب تقييم + بنود ———
        $template = EvaluationTemplate::query()->firstOrCreate(
            ['name' => 'نموذج تقييم التدريب — بيانات تجريبية'],
            [
                'description' => 'يُستخدم لاختبار شاشات التقييم والتقارير.',
                'form_type' => 'evaluation',
            ]
        );

        $itemTitles = [
            ['title' => 'التزام الحضور والانضباط', 'max_score' => 20],
            ['title' => 'تطبيق المهارات التربوية', 'max_score' => 40],
            ['title' => 'التفاعل مع الطلبة والزملاء', 'max_score' => 40],
        ];
        $items = collect();
        foreach ($itemTitles as $row) {
            $items->push(
                EvaluationItem::query()->firstOrCreate(
                    ['template_id' => $template->id, 'title' => $row['title']],
                    [
                        'field_type' => 'score',
                        'is_required' => true,
                        'max_score' => $row['max_score'],
                    ]
                )
            );
        }

        // ——— طلب 1: مسودة (طالب) ———
        $trDraft = TrainingRequest::query()->updateOrCreate(
            ['letter_number' => 'DEMO-TR-DRAFT-001'],
            [
                'requested_by' => $stu01->id,
                'book_status' => 'draft',
                'status' => 'pending',
                'training_site_id' => $site->id,
                'training_period_id' => $period->id,
                'governing_body' => 'directorate_of_education',
                'requested_at' => now()->subDays(3),
            ]
        );

        TrainingRequestStudent::query()->updateOrCreate(
            [
                'training_request_id' => $trDraft->id,
                'user_id' => $stu01->id,
            ],
            [
                'course_id' => $course->id,
                'start_date' => $period->start_date,
                'end_date' => $period->end_date,
                'status' => 'pending',
            ]
        );

        // ——— طلب 2: مرسل للمديرية بعد مراجعة المنسق (عدة طلاب) ———
        $trDirectorate = TrainingRequest::query()->updateOrCreate(
            ['letter_number' => 'DEMO-TR-DIR-001'],
            [
                'requested_by' => $stu02->id,
                'book_status' => 'sent_to_directorate',
                'status' => 'pending',
                'training_site_id' => $site->id,
                'training_period_id' => $period->id,
                'governing_body' => 'directorate_of_education',
                'requested_at' => now()->subDays(8),
                'sent_to_directorate_at' => now()->subDays(6),
                'coordinator_reviewed_at' => now()->subDays(7),
            ]
        );

        foreach (array_filter([$stu02, $stu03, $students->get(3)]) as $stu) {
            if (!$stu) {
                continue;
            }
            TrainingRequestStudent::query()->updateOrCreate(
                [
                    'training_request_id' => $trDirectorate->id,
                    'user_id' => $stu->id,
                ],
                [
                    'course_id' => $course->id,
                    'start_date' => $period->start_date,
                    'end_date' => $period->end_date,
                    'status' => 'approved',
                ]
            );
        }

        // ——— طلبات إضافية: مرسلة إلى جهة التدريب (3 طلبات) ———
        $sentToSchoolStudents = array_values(array_filter([$stu01, $stu02, $stu03]));
        foreach ($sentToSchoolStudents as $i => $stu) {
            $seq = str_pad((string) ($i + 1), 3, '0', STR_PAD_LEFT);
            $trSentToSchool = TrainingRequest::query()->updateOrCreate(
                ['letter_number' => "DEMO-TR-SCHOOL-{$seq}"],
                [
                    'requested_by' => $stu->id,
                    'book_status' => 'sent_to_school',
                    'status' => 'pending',
                    'training_site_id' => $site->id,
                    'training_period_id' => $period->id,
                    'governing_body' => 'directorate_of_education',
                    'requested_at' => now()->subDays(15 + $i),
                    'sent_to_directorate_at' => now()->subDays(14 + $i),
                    'directorate_approved_at' => now()->subDays(12 + $i),
                    'sent_to_school_at' => now()->subDays(10 + $i),
                    'coordinator_reviewed_at' => now()->subDays(14 + $i),
                ]
            );

            TrainingRequestStudent::query()->updateOrCreate(
                [
                    'training_request_id' => $trSentToSchool->id,
                    'user_id' => $stu->id,
                ],
                [
                    'course_id' => $course->id,
                    'start_date' => $period->start_date,
                    'end_date' => $period->end_date,
                    'status' => 'approved',
                ]
            );
        }

        // ——— طلب 3: موافقة مدرسة — جاهز للتعيين والحضور والمهام ———
        $trActive = TrainingRequest::query()->updateOrCreate(
            ['letter_number' => 'DEMO-TR-ACTIVE-001'],
            [
                'requested_by' => $stu02->id,
                'book_status' => 'school_approved',
                'status' => 'approved',
                'training_site_id' => $site->id,
                'training_period_id' => $period->id,
                'governing_body' => 'directorate_of_education',
                'requested_at' => now()->subDays(30),
                'sent_to_directorate_at' => now()->subDays(28),
                'directorate_approved_at' => now()->subDays(25),
                'sent_to_school_at' => now()->subDays(20),
                'school_approved_at' => now()->subDays(18),
            ]
        );

        $trsActive = TrainingRequestStudent::query()->updateOrCreate(
            [
                'training_request_id' => $trActive->id,
                'user_id' => $stu02->id,
            ],
            [
                'course_id' => $course->id,
                'start_date' => $period->start_date,
                'end_date' => $period->end_date,
                'status' => 'approved',
                'assigned_teacher_id' => $teacher->id,
            ]
        );

        $enrollmentStu02 = Enrollment::query()->where('user_id', $stu02->id)
            ->where('section_id', $section->id)
            ->where('academic_year', self::ACADEMIC_YEAR)
            ->where('semester', self::SEMESTER)
            ->first();

        if ($enrollmentStu02) {
            $assignment = TrainingAssignment::query()->updateOrCreate(
                ['training_request_student_id' => $trsActive->id],
                [
                    'enrollment_id' => $enrollmentStu02->id,
                    'training_request_id' => $trActive->id,
                    'training_site_id' => $site->id,
                    'training_period_id' => $period->id,
                    'teacher_id' => $teacher->id,
                    'academic_supervisor_id' => $supervisor->id,
                    'coordinator_id' => $coordinator->id,
                    'status' => 'ongoing',
                    'start_date' => $period->start_date,
                    'end_date' => $period->end_date,
                ]
            );

            Attendance::query()->updateOrCreate(
                [
                    'training_assignment_id' => $assignment->id,
                    'user_id' => $stu02->id,
                    'date' => now()->subDays(2)->toDateString(),
                ],
                [
                    'notes' => 'حضور تجريبي',
                    'check_in' => '08:00:00',
                    'check_out' => '13:00:00',
                    'status' => 'present',
                    'approved_by' => $teacher->id,
                    'approved_at' => now()->subDay(),
                ]
            );

            TrainingLog::query()->updateOrCreate(
                [
                    'training_assignment_id' => $assignment->id,
                    'log_date' => now()->subDays(3)->toDateString(),
                ],
                [
                    'start_time' => '08:00:00',
                    'end_time' => '13:00:00',
                    'activities_performed' => 'مشاهدة حصص، مساعدة المعلم في الأنشطة الصفية.',
                    'student_reflection' => 'تأمل تجريبي حول أهمية التخطيط للحصة.',
                    'status' => 'submitted',
                ]
            );

            TrainingLog::query()->updateOrCreate(
                [
                    'training_assignment_id' => $assignment->id,
                    'log_date' => now()->subDays(1)->toDateString(),
                ],
                [
                    'activities_performed' => 'مسودة يومية قيد الإكمال.',
                    'status' => 'draft',
                ]
            );

            $task = Task::query()->updateOrCreate(
                [
                    'training_assignment_id' => $assignment->id,
                    'title' => 'تقرير موضوعي — بيانات تجريبية',
                ],
                [
                    'description' => 'صف حصة رصدتها خلال الأسبوع (اختبار واجهة المهام).',
                    'assigned_by' => $teacher->id,
                    'due_date' => now()->addWeek()->toDateString(),
                    'status' => 'submitted',
                ]
            );

            TaskSubmission::query()->updateOrCreate(
                [
                    'task_id' => $task->id,
                    'user_id' => $stu02->id,
                ],
                [
                    'notes' => 'تسليم تجريبي بدون ملف.',
                    'submitted_at' => now()->subHours(4),
                ]
            );

            $evaluation = Evaluation::query()->updateOrCreate(
                [
                    'training_assignment_id' => $assignment->id,
                    'evaluator_id' => $supervisor->id,
                    'template_id' => $template->id,
                ],
                [
                    'total_score' => 85,
                    'notes' => 'تقييم تجريبي إجمالي جيد.',
                ]
            );

            foreach ($items as $item) {
                $scoreVal = match ($item->title) {
                    'التزام الحضور والانضباط' => 18,
                    'تطبيق المهارات التربوية' => 35,
                    default => 32,
                };
                EvaluationScore::query()->updateOrCreate(
                    [
                        'evaluation_id' => $evaluation->id,
                        'item_id' => $item->id,
                    ],
                    ['score' => min($scoreVal, $item->max_score)]
                );
            }

            SupervisorVisit::query()->updateOrCreate(
                [
                    'training_assignment_id' => $assignment->id,
                    'supervisor_id' => $supervisor->id,
                    'visit_date' => now()->subDays(5)->toDateString(),
                ],
                [
                    'notes' => 'زيارة ميدانية تجريبية، الملاحظات إيجابية.',
                    'rating' => 4.5,
                    'status' => 'completed',
                    'scheduled_date' => now()->subDays(6)->toDateString(),
                ]
            );

            $portfolio = StudentPortfolio::query()->firstOrCreate(
                [
                    'user_id' => $stu02->id,
                    'training_assignment_id' => $assignment->id,
                ]
            );

            PortfolioEntry::query()->firstOrCreate(
                [
                    'student_portfolio_id' => $portfolio->id,
                    'title' => 'خطة درس تجريبية',
                ],
                [
                    'content' => 'أهداف، وسائل، إجراءات — نص وهمي للاختبار.',
                ]
            );

            WeeklySchedule::query()->updateOrCreate(
                [
                    'teacher_id' => $teacher->id,
                    'day' => 'sunday',
                ],
                [
                    'start_time' => '08:00:00',
                    'end_time' => '14:00:00',
                    'training_site_id' => $site->id,
                    'submitted_by' => $teacher->id,
                ]
            );

            WeeklySchedule::query()->updateOrCreate(
                [
                    'teacher_id' => $teacher->id,
                    'day' => 'tuesday',
                ],
                [
                    'start_time' => '08:30:00',
                    'end_time' => '13:30:00',
                    'training_site_id' => $site->id,
                    'submitted_by' => $teacher->id,
                ]
            );
        }

        // ——— طلب مرفوض (عرض في القوائم) ———
        $trRejected = TrainingRequest::query()->updateOrCreate(
            ['letter_number' => 'DEMO-TR-REJ-001'],
            [
                'requested_by' => $stu03->id,
                'book_status' => 'rejected',
                'status' => 'rejected',
                'training_site_id' => $site->id,
                'training_period_id' => $period->id,
                'governing_body' => 'directorate_of_education',
                'requested_at' => now()->subDays(12),
                'rejection_reason' => 'سبب وهمي للاختبار: نقص في البيانات المرفقة.',
            ]
        );

        TrainingRequestStudent::query()->updateOrCreate(
            [
                'training_request_id' => $trRejected->id,
                'user_id' => $stu03->id,
            ],
            [
                'course_id' => $course->id,
                'start_date' => $period->start_date,
                'end_date' => $period->end_date,
                'status' => 'rejected',
                'rejection_reason' => 'مرفوض ضمن سيناريو الاختبار.',
            ]
        );

        // ——— دفعة مسودة تربط طلب المسودة ———
        if (TrainingRequestBatch::query()->where('letter_number', 'DEMO-BATCH-001')->doesntExist()) {
            $batch = TrainingRequestBatch::query()->create([
                'governing_body' => 'directorate_of_education',
                'directorate' => 'وسط',
                'status' => 'draft',
                'letter_number' => 'DEMO-BATCH-001',
                'letter_date' => now()->toDateString(),
                'content' => 'دفعة تجريبية — لم يُرسل بعد.',
                'created_by' => $coordinator->id,
                'sent_at' => null,
            ]);
            TrainingRequestBatchItem::query()->firstOrCreate(
                [
                    'batch_id' => $batch->id,
                    'training_request_id' => $trDraft->id,
                ]
            );
        }

        if ($admin) {
            Announcement::query()->firstOrCreate(
                ['title' => 'إعلان تجريبي — بداية الفصل التدريبي'],
                [
                    'content' => 'مرحباً بكم في النظام. هذا إعلان وهمي لاختبار لوحة الإعلانات.',
                    'user_id' => $admin->id,
                ]
            );
        }

        $this->command?->info('تم تحميل بيانات DemoDataSeeder (طلبات، تعيين، حضور، مهام، تقييم، محفظة، جدول، دفعة، إعلان).');
    }
}
