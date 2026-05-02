<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\TrainingSite;
use App\Models\User;
use App\Models\Role;
use App\Models\FieldSupervisorProfile;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

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
            ['email' => 'admin@hebron.edu'],
            [
                'name' => 'مدير النظام',
                'university_id' => 'ADMIN001',
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
            ['email' => 'coordinator.tarbiah@hebron.edu'],
            [
                'name' => 'منسق التدريب — أصول التربية',
                'university_id' => 'COORD01',
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
            ['email' => 'coordinator.psychology@hebron.edu'],
            [
                'name' => 'منسق التدريب — علم النفس',
                'university_id' => 'COORD02',
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
            ['name' => 'د. أحمد المشرف', 'email' => 'supervisor.usool1@hebron.edu', 'university_id' => 'SUPU001', 'phone' => '0590000011'],
            ['name' => 'د. سمير العلي', 'email' => 'supervisor.usool2@hebron.edu', 'university_id' => 'SUPU002', 'phone' => '0590000012'],
            ['name' => 'د. ليلى الحسيني', 'email' => 'supervisor.usool3@hebron.edu', 'university_id' => 'SUPU003', 'phone' => '0590000013'],
        ];
        foreach ($usoolSupervisors as $s) {
            User::firstOrCreate(
                ['email' => $s['email']],
                [
                    'name' => $s['name'],
                    'university_id' => $s['university_id'],
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
            ['name' => 'د. رامي النفسي', 'email' => 'supervisor.psych1@hebron.edu', 'university_id' => 'SUPP001', 'phone' => '0590000021'],
            ['name' => 'د. هدى السعيد', 'email' => 'supervisor.psych2@hebron.edu', 'university_id' => 'SUPP002', 'phone' => '0590000022'],
            ['name' => 'د. نادية القاسم', 'email' => 'supervisor.psych3@hebron.edu', 'university_id' => 'SUPP003', 'phone' => '0590000023'],
        ];
        foreach ($psychSupervisors as $s) {
            User::firstOrCreate(
                ['email' => $s['email']],
                [
                    'name' => $s['name'],
                    'university_id' => $s['university_id'],
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
            $email = 'teacher.' . $teacherIndex . '@hebron.edu';
            $nameIdx = ($teacherIndex - 1) % count($teacherNames);
            // university_id فريد لكل مدرسة (يتجنب التصادم مع TCH001 القديم مثل teacher@hebron.edu)
            $teacherUniversityId = sprintf('TCHS%05d', (int) $school->id);
            User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => $teacherNames[$nameIdx] . ' المعلم - ' . $school->name,
                    'university_id' => $teacherUniversityId,
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
                $email = 'adviser.' . $adviserIndex . '@hebron.edu';
                $nameIdx = ($adviserIndex - 1) % count($adviserNames);
                $adviserUniversityId = sprintf('ADVS%05d', (int) $school->id);
                User::firstOrCreate(
                    ['email' => $email],
                    [
                        'name' => $adviserNames[$nameIdx] . ' المرشد - ' . $school->name,
                        'university_id' => $adviserUniversityId,
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
            ['email' => 'student@hebron.edu'],
            [
                'name' => 'أحمد الطالب',
                'university_id' => 'STU001',
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

            $email = 'schoolmanager.' . $schoolIndex . '@hebron.edu';
            User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => 'مدير ' . $school->name,
                    'university_id' => 'SM' . str_pad((string) $schoolIndex, 3, '0', STR_PAD_LEFT),
                    'password' => Hash::make('password'),
                    'role_id' => $schoolManagerRole->id,
                    'status' => 'active',
                    'training_site_id' => $school->id,
                    'phone' => $school->phone ?? $school->mobile ?? null,
                ]
            );
            $schoolIndex++;
        }

        // 7. أخصائي نفسي
        $psychologistRole = Role::where('name', 'psychologist')->first();
        User::firstOrCreate(
            ['email' => 'psychologist@hebron.edu'],
            [
                'name' => 'سعاد الأخصائية',
                'university_id' => 'PSY001',
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
            ['email' => 'head@hebron.edu'],
            [
                'name' => 'د. رامي رئيس القسم',
                'university_id' => 'HEAD001',
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
                ['email' => 'head.psychology@hebron.edu'],
                [
                    'name' => 'د. ليلى رئيسة قسم علم النفس',
                    'university_id' => 'HEADPSY01',
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
            ['email' => 'edudirectorate@hebron.edu'],
            [
                'name' => 'مديرية التربية والتعليم',
                'university_id' => 'EDU001',
                'password' => Hash::make('password'),
                'role_id' => $eduDirectorateRole->id,
                'status' => 'active',
                'directorate' => 'وسط',
                'phone' => '0222222222',
            ]
        );

        // حسابات مديريات منفصلة للفحص الدقيق حسب المديرية
        User::firstOrCreate(
            ['email' => 'edudir.west@hebron.edu'],
            [
                'name' => 'مديرية التربية - وسط',
                'university_id' => 'EDU002',
                'password' => Hash::make('password'),
                'role_id' => $eduDirectorateRole->id,
                'status' => 'active',
                'directorate' => 'وسط',
                'phone' => '0222222223',
            ]
        );
        User::firstOrCreate(
            ['email' => 'edudir.north@hebron.edu'],
            [
                'name' => 'مديرية التربية - شمال',
                'university_id' => 'EDU003',
                'password' => Hash::make('password'),
                'role_id' => $eduDirectorateRole->id,
                'status' => 'active',
                'directorate' => 'شمال',
                'phone' => '0222222224',
            ]
        );
        User::firstOrCreate(
            ['email' => 'edudir.south@hebron.edu'],
            [
                'name' => 'مديرية التربية - جنوب',
                'university_id' => 'EDU004',
                'password' => Hash::make('password'),
                'role_id' => $eduDirectorateRole->id,
                'status' => 'active',
                'directorate' => 'جنوب',
                'phone' => '0222222225',
            ]
        );
        User::firstOrCreate(
            ['email' => 'edudir.yatta@hebron.edu'],
            [
                'name' => 'مديرية التربية - يطا',
                'university_id' => 'EDU005',
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
            ['email' => 'healthdirectorate@hebron.edu'],
            [
                'name' => 'وزارة الصحة',
                'university_id' => 'HLT001',
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
            ['email' => 'psychcentermanager@hebron.edu'],
            [
                'name' => 'أ. أحمد مدير المركز النفسي',
                'university_id' => 'PCM001',
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