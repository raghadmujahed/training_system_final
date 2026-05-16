<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\TeacherSchoolAssignment;
use App\Models\TrainingAssignment;
use App\Models\TrainingSite;
use App\Models\User;
use App\Models\Role;
use App\Models\FieldSupervisorProfile;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class UsersSeeder extends Seeder
{
    private function normalizeDirectorate(string $value): string
    {
        $v = trim($value);
        $v = str_replace(['مديرية', 'مديرية ', '  '], ['', '', ' '], $v);
        return trim($v);
    }

    private function resolveSchoolSiteIdForDirectorate(string $directorate): ?int
    {
        $normalized = $this->normalizeDirectorate($directorate);

        $siteId = TrainingSite::query()
            ->where('site_type', 'school')
            ->where('directorate', $normalized)
            ->orderBy('id')
            ->value('id');

        if ($siteId) {
            return (int) $siteId;
        }

        $siteId = TrainingSite::query()
            ->where('site_type', 'school')
            ->where('directorate', 'like', '%' . $normalized . '%')
            ->orderBy('id')
            ->value('id');

        return $siteId ? (int) $siteId : null;
    }

    public function run()
    {
        // 1. مدير النظام
        $adminRole = Role::where('name', 'admin')->first();
        User::firstOrCreate(
            ['email' => 'admin@hebron.edu.ps'],
            [
                'name' => 'مدير النظام',
                'password' => Hash::make('password'),
                'role_id' => $adminRole->id,
                'phone' => '0590000000',
                'status' => 'active',
            ]
        );

        // 2. منسق التدريب — قسم أصول التربية
        $coordinatorRole = Role::where('name', 'training_coordinator')->first();
        $usoolDeptId = Department::where('name', 'usool_tarbiah')->value('id')
            ?? Department::query()->orderBy('id')->value('id');
        User::firstOrCreate(
            ['email' => 'coordinator.tarbiah@hebron.edu.ps'],
            [
                'name' => 'منسق التدريب — أصول التربية',
                'password' => Hash::make('password'),
                'role_id' => $coordinatorRole->id,
                'department_id' => $usoolDeptId,
                'phone' => '0590000001',
                'status' => 'active',
            ]
        );

        // 2b. منسق التدريب — قسم علم النفس
        $psychDeptId = Department::where('name', 'psychology')->value('id')
            ?? $usoolDeptId;
        User::firstOrCreate(
            ['email' => 'coordinator.psychology@hebron.edu.ps'],
            [
                'name' => 'منسق التدريب — علم النفس',
                'password' => Hash::make('password'),
                'role_id' => $coordinatorRole->id,
                'department_id' => $psychDeptId,
                'phone' => '0590000002',
                'status' => 'active',
            ]
        );

        // 3. مشرفين أكاديميين — 3 لكل قسم
        $supervisorRole = Role::where('name', 'academic_supervisor')->first();

        // مشرفو قسم أصول التربية
        $usoolSupervisors = [
            ['name' => 'د. أحمد المشرف', 'email' => 'supervisor.usool1@hebron.edu.ps', 'phone' => '0590000011'],
            ['name' => 'د. سمير العلي', 'email' => 'supervisor.usool2@hebron.edu.ps', 'phone' => '0590000012'],
            ['name' => 'د. ليلى الحسيني', 'email' => 'supervisor.usool3@hebron.edu.ps', 'phone' => '0590000013'],
        ];
        foreach ($usoolSupervisors as $s) {
            User::firstOrCreate(
                ['email' => $s['email']],
                [
                    'name' => $s['name'],
                    'password' => Hash::make('password'),
                    'role_id' => $supervisorRole->id,
                    'department_id' => $usoolDeptId,
                    'phone' => $s['phone'],
                    'status' => 'active',
                ]
            );
        }

        // مشرفو قسم علم النفس
        $psychSupervisors = [
            ['name' => 'د. رامي النفسي', 'email' => 'supervisor.psych1@hebron.edu.ps', 'phone' => '0590000021'],
            ['name' => 'د. هدى السعيد', 'email' => 'supervisor.psych2@hebron.edu.ps', 'phone' => '0590000022'],
            ['name' => 'د. نادية القاسم', 'email' => 'supervisor.psych3@hebron.edu.ps', 'phone' => '0590000023'],
        ];
        foreach ($psychSupervisors as $s) {
            User::firstOrCreate(
                ['email' => $s['email']],
                [
                    'name' => $s['name'],
                    'password' => Hash::make('password'),
                    'role_id' => $supervisorRole->id,
                    'department_id' => $psychDeptId,
                    'phone' => $s['phone'],
                    'status' => 'active',
                ]
            );
        }

        // 4. معلمين مرشدين — معلم واحد في كل مدرسة
        $teacherRole = Role::where('name', 'teacher')->first();
        $majors = ['رياضيات', 'لغة عربية', 'تربية إسلامية', 'لغة إنجليزية'];
        $teacherNames = [
            'محمد', 'فاطمة', 'أحمد', 'سعاد', 'خالد', 'نور', 'رنا', 'علي',
            'يوسف', 'هند', 'بلال', 'آية', 'عمر', 'لمى', 'كرم', 'دينا',
            'سيف', 'جودي', 'معاذ', 'روان', 'هالة', 'رغد', 'ليان', 'محمود',
            'سارة', 'لينا', 'ياسر', 'منى', 'طارق', 'إيمان',
        ];
        $teacherIndex = 1;
        $allSchools = TrainingSite::query()
            ->where('site_type', 'school')
            ->where('is_active', true)
            ->get();

        foreach ($allSchools as $school) {
            $email = 'teacher.' . $teacherIndex . '@hebron.edu.ps';
            $nameIdx = ($teacherIndex - 1) % count($teacherNames);
            User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => $teacherNames[$nameIdx] . ' المعلم - ' . $school->name,
                    'password' => Hash::make('password'),
                    'role_id' => $teacherRole->id,
                    'training_site_id' => $school->id,
                    'phone' => '0591' . str_pad((string) ($teacherIndex + 100), 6, '0', STR_PAD_LEFT),
                    'major' => $majors[($teacherIndex - 1) % count($majors)],
                    'status' => 'active',
                ]
            );
            $teacherIndex++;
        }

        foreach ($allSchools as $school) {
            if (Schema::hasTable('teacher_school_assignments')) {
                TeacherSchoolAssignment::syncLegacyTeachersForSchool($school->id);
            }
        }

        // ربط تعيينات التدريب النشطة بمعلم المرشد الرسمي لكل مدرسة (مثل assigned_teacher_id عند الموافقة)
        $teacherIndex = 1;
        foreach ($allSchools as $school) {
            $schoolTeacher = User::where('email', 'teacher.' . $teacherIndex . '@hebron.edu.ps')->first();
            if ($schoolTeacher) {
                TrainingAssignment::query()
                    ->where('training_site_id', $school->id)
                    ->whereIn('status', ['assigned', 'ongoing'])
                    ->update(['teacher_id' => $schoolTeacher->id]);
            }
            $teacherIndex++;
        }

        // 4b. مرشدون تربويون — مرشد واحد في كل مدرسة
        $adviserRole = Role::where('name', 'adviser')->first();
        if ($adviserRole) {
            $adviserNames = [
                'سعاد', 'هدى', 'منى', 'إيمان', 'فاطمة', 'نادية', 'آمنة', 'ربى',
                'خالد', 'علي', 'محمد', 'أحمد', 'يوسف', 'عمر', 'بلال', 'سعيد',
                'رامي', 'طارق', 'محمود', 'خضر', 'جمال', 'حسن', 'إبراهيم', 'داود',
                'سليمان', 'عبدالله', 'مصطفى', 'زكي', 'نمر', 'رشيد',
            ];
            $adviserIndex = 1;
            foreach ($allSchools as $school) {
                $email = 'adviser.' . $adviserIndex . '@hebron.edu.ps';
                $nameIdx = ($adviserIndex - 1) % count($adviserNames);
                User::firstOrCreate(
                    ['email' => $email],
                    [
                        'name' => $adviserNames[$nameIdx] . ' المرشد - ' . $school->name,
                        'password' => Hash::make('password'),
                        'role_id' => $adviserRole->id,
                        'training_site_id' => $school->id,
                        'phone' => '0592' . str_pad((string) ($adviserIndex + 100), 6, '0', STR_PAD_LEFT),
                        'major' => $majors[($adviserIndex - 1) % count($majors)],
                        'status' => 'active',
                    ]
                );
                $adviserIndex++;
            }
        }

        // 5. طالب
        $studentRole = Role::where('name', 'student')->first();
        User::firstOrCreate(
            ['email' => 'student@student.hebron.edu'],
            [
                'name' => 'أحمد الطالب',
                'university_id' => '202000001',
                'password' => Hash::make('password'),
                'role_id' => $studentRole->id,
                'department_id' => $usoolDeptId,
                'major' => 'رياضيات',
                'phone' => '0591000000',
                'status' => 'active',
            ]
        );

        // 6. مدير مدرسة — إنشاء حساب لكل مدرسة
        $schoolManagerRole = Role::where('name', 'school_manager')->first();

        $schoolIndex = 1;
        foreach ($allSchools as $school) {
            // تخطي المدارس التي لها مدير بالفعل
            $existingManager = User::query()
                ->where('training_site_id', $school->id)
                ->whereIn('role_id', function ($q) {
                    $q->select('id')->from('roles')
                      ->whereIn('name', ['school_manager', 'principal']);
                })
                ->exists();

            if ($existingManager) {
                continue;
            }

            $email = 'schoolmanager.' . $schoolIndex . '@hebron.edu.ps';
            $manager = User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => 'مدير ' . $school->name,
                    'password' => Hash::make('password'),
                    'role_id' => $schoolManagerRole->id,
                    'status' => 'active',
                    'training_site_id' => $school->id,
                    'phone' => $school->phone ?? $school->mobile ?? null,
                ]
            );
            if ($manager->training_site_id === null) {
                $manager->update(['training_site_id' => $school->id]);
            }
            \App\Support\SchoolManagerSiteResolver::syncSiteManagerId($manager);
            $schoolIndex++;
        }

        // مزامنة manager_id لكل مدير مدرسة موجود مسبقاً
        User::query()
            ->whereNotNull('training_site_id')
            ->whereHas('role', fn ($q) => $q->whereIn('name', ['school_manager', 'principal']))
            ->each(fn (User $u) => \App\Support\SchoolManagerSiteResolver::syncSiteManagerId($u));

        // 7. أخصائي نفسي
        $psychologistRole = Role::where('name', 'psychologist')->first();
        User::firstOrCreate(
            ['email' => 'psychologist@hebron.edu.ps'],
            [
                'name' => 'سعاد الأخصائية',
                'password' => Hash::make('password'),
                'role_id' => $psychologistRole->id,
                'department_id' => $psychDeptId,
                'phone' => '0590000004',
                'status' => 'active',
            ]
        );

        // 8. رئيس القسم (يجب ربطه بقسم وإلا تفشل واجهة /head-department/* بـ 403)
        $headRole = Role::where('name', 'head_of_department')->first();
        $headUser = User::firstOrCreate(
            ['email' => 'head@hebron.edu.ps'],
            [
                'name' => 'د. رامي رئيس القسم',
                'password' => Hash::make('password'),
                'role_id' => $headRole->id,
                'department_id' => $usoolDeptId,
                'phone' => '0590000005',
                'status' => 'active',
            ]
        );
        if ($headUser->department_id === null && $usoolDeptId) {
            $headUser->update(['department_id' => $usoolDeptId]);
        }

        // 8b. رئيس قسم علم النفس
        if ($headRole && $psychDeptId) {
            $psychHead = User::firstOrCreate(
                ['email' => 'head.psychology@hebron.edu.ps'],
                [
                    'name' => 'د. ليلى رئيسة قسم علم النفس',
                    'password' => Hash::make('password'),
                    'role_id' => $headRole->id,
                    'department_id' => $psychDeptId,
                    'phone' => '0590000006',
                    'status' => 'active',
                ]
            );
            if ($psychHead->department_id === null && $psychDeptId) {
                $psychHead->update(['department_id' => $psychDeptId]);
            }
        }

        // 9. مديرية التربية
        $eduDirectorateRole = Role::where('name', 'education_directorate')->first();
        User::firstOrCreate(
            ['email' => 'edudirectorate@hebron.edu.ps'],
            [
                'name' => 'مديرية التربية والتعليم',
                'password' => Hash::make('password'),
                'role_id' => $eduDirectorateRole->id,
                'status' => 'active',
                'directorate' => 'وسط',
                'phone' => '0222222222',
            ]
        );

        // حسابات مديريات منفصلة للفحص الدقيق حسب المديرية
        User::firstOrCreate(
            ['email' => 'edudir.west@hebron.edu.ps'],
            [
                'name' => 'مديرية التربية - وسط',
                'password' => Hash::make('password'),
                'role_id' => $eduDirectorateRole->id,
                'status' => 'active',
                'directorate' => 'وسط',
                'phone' => '0222222223',
            ]
        );
        User::firstOrCreate(
            ['email' => 'edudir.north@hebron.edu.ps'],
            [
                'name' => 'مديرية التربية - شمال',
                'password' => Hash::make('password'),
                'role_id' => $eduDirectorateRole->id,
                'status' => 'active',
                'directorate' => 'شمال',
                'phone' => '0222222224',
            ]
        );
        User::firstOrCreate(
            ['email' => 'edudir.south@hebron.edu.ps'],
            [
                'name' => 'مديرية التربية - جنوب',
                'password' => Hash::make('password'),
                'role_id' => $eduDirectorateRole->id,
                'status' => 'active',
                'directorate' => 'جنوب',
                'phone' => '0222222225',
            ]
        );
        User::firstOrCreate(
            ['email' => 'edudir.yatta@hebron.edu.ps'],
            [
                'name' => 'مديرية التربية - يطا',
                'password' => Hash::make('password'),
                'role_id' => $eduDirectorateRole->id,
                'status' => 'active',
                'directorate' => 'يطا',
                'phone' => '0222222226',
            ]
        );

        // 10. وزارة الصحة
        $healthDirectorateRole = Role::where('name', 'health_directorate')->first();
        User::firstOrCreate(
            ['email' => 'healthdirectorate@hebron.edu.ps'],
            [
                'name' => 'وزارة الصحة',
                'password' => Hash::make('password'),
                'role_id' => $healthDirectorateRole->id,
                'status' => 'active',
                'phone' => '0233333333',
            ]
        );

        // 11. مدير المركز النفسي
        $psychCenterManagerRole = Role::where('name', 'psychology_center_manager')->first();
        $healthSite = TrainingSite::where('site_type', 'health_center')->first();
        User::firstOrCreate(
            ['email' => 'psychcentermanager@hebron.edu.ps'],
            [
                'name' => 'أ. أحمد مدير المركز النفسي',
                'password' => Hash::make('password'),
                'role_id' => $psychCenterManagerRole?->id,
                'status' => 'active',
                'training_site_id' => $healthSite?->id,
                'department_id' => $psychDeptId,
                'phone' => '0233333334',
            ]
        );

        // رؤوس أقسام بلا department_id يحرمون واجهة /api/head-department/* (403)
        $headRoleId = Role::where('name', 'head_of_department')->value('id');
        $hodDeptFallback = $usoolDeptId ?? $psychDeptId ?? Department::query()->orderBy('id')->value('id');
        if ($headRoleId && $hodDeptFallback) {
            User::query()
                ->where('role_id', $headRoleId)
                ->whereNull('department_id')
                ->update(['department_id' => $hodDeptFallback]);
        }
    }
}