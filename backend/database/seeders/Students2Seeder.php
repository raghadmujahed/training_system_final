<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class Students2Seeder extends Seeder
{
    public function run(): void
    {
        $studentRoleId = Role::query()->where('name', 'student')->value('id');
        if (! $studentRoleId) {
            $this->command?->warn('تخطي Students2Seeder: دور student غير موجود.');
            return;
        }

        $usoolDeptId = Department::query()->where('name', 'usool_tarbiah')->value('id');
        $psychDeptId = Department::query()->where('name', 'psychology')->value('id');

        if (! $usoolDeptId || ! $psychDeptId) {
            $this->command?->warn('تخطي Students2Seeder: الأقسام المطلوبة غير موجودة.');
            return;
        }

        $students = [
            // 15 طالب أصول التربية — تخصصات متنوعة
            ['name' => 'محمود رائد التميمي', 'email' => 'students2.usool01@student.hebron.edu', 'university_id' => '202020001', 'phone' => '0592200001', 'department_id' => $usoolDeptId, 'major' => 'رياضيات'],
            ['name' => 'جودي سامر الشرباتي', 'email' => 'students2.usool02@student.hebron.edu', 'university_id' => '202020002', 'phone' => '0592200002', 'department_id' => $usoolDeptId, 'major' => 'لغة عربية'],
            ['name' => 'ليان عادل جعبري', 'email' => 'students2.usool03@student.hebron.edu', 'university_id' => '202020003', 'phone' => '0592200003', 'department_id' => $usoolDeptId, 'major' => 'تربية إسلامية'],
            ['name' => 'سيف ياسر المحتسب', 'email' => 'students2.usool04@student.hebron.edu', 'university_id' => '202020004', 'phone' => '0592200004', 'department_id' => $usoolDeptId, 'major' => 'لغة إنجليزية'],
            ['name' => 'رغد ناصر الطروة', 'email' => 'students2.usool05@student.hebron.edu', 'university_id' => '202020005', 'phone' => '0592200005', 'department_id' => $usoolDeptId, 'major' => 'رياضيات'],
            ['name' => 'عمر خالد الشلالدة', 'email' => 'students2.usool06@student.hebron.edu', 'university_id' => '202020006', 'phone' => '0592200006', 'department_id' => $usoolDeptId, 'major' => 'لغة عربية'],
            ['name' => 'هالة محمود الزغاري', 'email' => 'students2.usool07@student.hebron.edu', 'university_id' => '202020007', 'phone' => '0592200007', 'department_id' => $usoolDeptId, 'major' => 'تربية إسلامية'],
            ['name' => 'بلال طه النتشة', 'email' => 'students2.usool08@student.hebron.edu', 'university_id' => '202020008', 'phone' => '0592200008', 'department_id' => $usoolDeptId, 'major' => 'لغة إنجليزية'],
            ['name' => 'سارة عصام الرجبي', 'email' => 'students2.usool09@student.hebron.edu', 'university_id' => '202020009', 'phone' => '0592200009', 'department_id' => $usoolDeptId, 'major' => 'رياضيات'],
            ['name' => 'يوسف إبراهيم الحروب', 'email' => 'students2.usool10@student.hebron.edu', 'university_id' => '202020010', 'phone' => '0592200010', 'department_id' => $usoolDeptId, 'major' => 'لغة عربية'],
            ['name' => 'دينا حسام القاسمي', 'email' => 'students2.usool11@student.hebron.edu', 'university_id' => '202020011', 'phone' => '0592200011', 'department_id' => $usoolDeptId, 'major' => 'تربية إسلامية'],
            ['name' => 'معاذ راشد العويوي', 'email' => 'students2.usool12@student.hebron.edu', 'university_id' => '202020012', 'phone' => '0592200012', 'department_id' => $usoolDeptId, 'major' => 'لغة إنجليزية'],
            ['name' => 'لمى طارق الأطرش', 'email' => 'students2.usool13@student.hebron.edu', 'university_id' => '202020013', 'phone' => '0592200013', 'department_id' => $usoolDeptId, 'major' => 'رياضيات'],
            ['name' => 'كرم ماجد الشنار', 'email' => 'students2.usool14@student.hebron.edu', 'university_id' => '202020014', 'phone' => '0592200014', 'department_id' => $usoolDeptId, 'major' => 'لغة عربية'],
            ['name' => 'روان سمير الدبك', 'email' => 'students2.usool15@student.hebron.edu', 'university_id' => '202020015', 'phone' => '0592200015', 'department_id' => $usoolDeptId, 'major' => 'تربية إسلامية'],

            // 5 طلاب علم النفس
            ['name' => 'أحمد تيسير دعنا', 'email' => 'students2.psy01@student.hebron.edu', 'university_id' => '202030001', 'phone' => '0592300001', 'department_id' => $psychDeptId, 'major' => 'علم نفس'],
            ['name' => 'نور فادي القواسمي', 'email' => 'students2.psy02@student.hebron.edu', 'university_id' => '202030002', 'phone' => '0592300002', 'department_id' => $psychDeptId, 'major' => 'علم نفس'],
            ['name' => 'محمد رامي النتشة', 'email' => 'students2.psy03@student.hebron.edu', 'university_id' => '202030003', 'phone' => '0592300003', 'department_id' => $psychDeptId, 'major' => 'علم نفس'],
            ['name' => 'آية نضال الكركي', 'email' => 'students2.psy04@student.hebron.edu', 'university_id' => '202030004', 'phone' => '0592300004', 'department_id' => $psychDeptId, 'major' => 'علم نفس'],
            ['name' => 'رهف حازم السلايمة', 'email' => 'students2.psy05@student.hebron.edu', 'university_id' => '202030005', 'phone' => '0592300005', 'department_id' => $psychDeptId, 'major' => 'علم نفس'],
        ];

        foreach ($students as $data) {
            User::query()->updateOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'university_id' => $data['university_id'],
                    'phone' => $data['phone'],
                    'password' => Hash::make('password'),
                    'role_id' => $studentRoleId,
                    'department_id' => $data['department_id'],
                    'major' => $data['major'] ?? null,
                    'status' => 'active',
                ]
            );
        }

        $this->command?->info('تم إدخال 20 طلاب عبر Students2Seeder بنجاح.');
    }
}
