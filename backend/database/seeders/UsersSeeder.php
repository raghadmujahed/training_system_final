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
                'status' => 'active',
            ]
        );

        // 2. منسق التدريب — قسم أصول التربية
        $coordinatorRole = Role::where('name', 'training_coordinator')->first();
        $usoolDeptId = Department::where('name', 'usool_tarbiah')->value('id');
        User::firstOrCreate(
            ['email' => 'coordinator.tarbiah@hebron.edu'],
            [
                'name' => 'منسق التدريب — أصول التربية',
                'university_id' => 'COORD01',
                'password' => Hash::make('password'),
                'role_id' => $coordinatorRole->id,
                'department_id' => $usoolDeptId,
                'status' => 'active',
            ]
        );

        // 2b. منسق التدريب — قسم علم النفس
        $psychDeptId = Department::where('name', 'psychology')->value('id');
        User::firstOrCreate(
            ['email' => 'coordinator.psychology@hebron.edu'],
            [
                'name' => 'منسق التدريب — علم النفس',
                'university_id' => 'COORD02',
                'password' => Hash::make('password'),
                'role_id' => $coordinatorRole->id,
                'department_id' => $psychDeptId,
                'status' => 'active',
            ]
        );

        // 3. مشرف أكاديمي
        $supervisorRole = Role::where('name', 'academic_supervisor')->first();
        User::firstOrCreate(
            ['email' => 'supervisor@hebron.edu'],
            [
                'name' => 'د. أحمد المشرف',
                'university_id' => 'SUP001',
                'password' => Hash::make('password'),
                'role_id' => $supervisorRole->id,
                'status' => 'active',
            ]
        );

        // 4. معلمين مرشدين — كل معلم مربوط بمدرسة واحدة
        $teacherRole = Role::where('name', 'teacher')->first();
        $teachers = [
            ['name' => 'محمد المعلم', 'email' => 'teacher@hebron.edu', 'university_id' => 'TCH001', 'training_site_id' => 1],
            ['name' => 'فاطمة المرشدة', 'email' => 'teacher2@hebron.edu', 'university_id' => 'TCH002', 'training_site_id' => 2],
            ['name' => 'أحمد المرشد', 'email' => 'teacher3@hebron.edu', 'university_id' => 'TCH003', 'training_site_id' => 3],
            ['name' => 'سعاد المرشدة', 'email' => 'teacher4@hebron.edu', 'university_id' => 'TCH004', 'training_site_id' => 4],
            ['name' => 'خالد المرشد', 'email' => 'teacher5@hebron.edu', 'university_id' => 'TCH005', 'training_site_id' => 7],
            ['name' => 'نور المرشدة', 'email' => 'teacher6@hebron.edu', 'university_id' => 'TCH006', 'training_site_id' => 9],
            ['name' => 'رنا المرشدة', 'email' => 'teacher7@hebron.edu', 'university_id' => 'TCH007', 'training_site_id' => 11],
            ['name' => 'علي المرشد', 'email' => 'teacher8@hebron.edu', 'university_id' => 'TCH008', 'training_site_id' => 14],
        ];
        foreach ($teachers as $t) {
            User::firstOrCreate(
                ['email' => $t['email']],
                [
                    'name' => $t['name'],
                    'university_id' => $t['university_id'],
                    'password' => Hash::make('password'),
                    'role_id' => $teacherRole->id,
                    'training_site_id' => $t['training_site_id'],
                    'status' => 'active',
                ]
            );
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
                'status' => 'active',
            ]
        );

        // 6. مدير مدرسة — إنشاء حساب لكل مدرسة
        $schoolManagerRole = Role::where('name', 'school_manager')->first();
        $allSchools = TrainingSite::query()
            ->where('site_type', 'school')
            ->where('is_active', true)
            ->get();

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
                    'password' => Hash::make('password'),
                    'role_id' => $schoolManagerRole->id,
                    'status' => 'active',
                    'training_site_id' => $school->id,
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
                'status' => 'active',
            ]
        );

        // 8. رئيس القسم
        $headRole = Role::where('name', 'head_of_department')->first();
        User::firstOrCreate(
            ['email' => 'head@hebron.edu'],
            [
                'name' => 'د. رامي رئيس القسم',
                'university_id' => 'HEAD001',
                'password' => Hash::make('password'),
                'role_id' => $headRole->id,
                'status' => 'active',
            ]
        );

        // 9. مديرية التربية
        $eduDirectorateRole = Role::where('name', 'education_directorate')->first();
        User::firstOrCreate(
            ['email' => 'edudirectorate@hebron.edu'],
            [
                'name' => 'مديرية التربية والتعليم',
                'password' => Hash::make('password'),
                'role_id' => $eduDirectorateRole->id,
                'status' => 'active',
                'directorate' => 'وسط',
            ]
        );

        // حسابات مديريات منفصلة للفحص الدقيق حسب المديرية
        User::firstOrCreate(
            ['email' => 'edudir.west@hebron.edu'],
            [
                'name' => 'مديرية التربية - وسط',
                'password' => Hash::make('password'),
                'role_id' => $eduDirectorateRole->id,
                'status' => 'active',
                'directorate' => 'وسط',
            ]
        );
        User::firstOrCreate(
            ['email' => 'edudir.north@hebron.edu'],
            [
                'name' => 'مديرية التربية - شمال',
                'password' => Hash::make('password'),
                'role_id' => $eduDirectorateRole->id,
                'status' => 'active',
                'directorate' => 'شمال',
            ]
        );
        User::firstOrCreate(
            ['email' => 'edudir.south@hebron.edu'],
            [
                'name' => 'مديرية التربية - جنوب',
                'password' => Hash::make('password'),
                'role_id' => $eduDirectorateRole->id,
                'status' => 'active',
                'directorate' => 'جنوب',
            ]
        );
        User::firstOrCreate(
            ['email' => 'edudir.yatta@hebron.edu'],
            [
                'name' => 'مديرية التربية - يطا',
                'password' => Hash::make('password'),
                'role_id' => $eduDirectorateRole->id,
                'status' => 'active',
                'directorate' => 'يطا',
            ]
        );

        // 10. وزارة الصحة
        $healthDirectorateRole = Role::where('name', 'health_directorate')->first();
        User::firstOrCreate(
            ['email' => 'healthdirectorate@hebron.edu'],
            [
                'name' => 'وزارة الصحة',
                'password' => Hash::make('password'),
                'role_id' => $healthDirectorateRole->id,
                'status' => 'active',
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
            ]
        );
    }
}