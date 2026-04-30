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
            ['name' => 'محمود رائد التميمي', 'email' => 'students2.usool01@hebron.edu', 'university_id' => 'S2U2001', 'phone' => '0592200001', 'department_id' => $usoolDeptId, 'major' => 'رياضيات'],
            ['name' => 'جودي سامر الشرباتي', 'email' => 'students2.usool02@hebron.edu', 'university_id' => 'S2U2002', 'phone' => '0592200002', 'department_id' => $usoolDeptId, 'major' => 'لغة عربية'],
            ['name' => 'ليان عادل جعبري', 'email' => 'students2.usool03@hebron.edu', 'university_id' => 'S2U2003', 'phone' => '0592200003', 'department_id' => $usoolDeptId, 'major' => 'تربية إسلامية'],
            ['name' => 'سيف ياسر المحتسب', 'email' => 'students2.usool04@hebron.edu', 'university_id' => 'S2U2004', 'phone' => '0592200004', 'department_id' => $usoolDeptId, 'major' => 'لغة إنجليزية'],
            ['name' => 'رغد ناصر الطروة', 'email' => 'students2.usool05@hebron.edu', 'university_id' => 'S2U2005', 'phone' => '0592200005', 'department_id' => $usoolDeptId, 'major' => 'رياضيات'],
            ['name' => 'عمر خالد الشلالدة', 'email' => 'students2.usool06@hebron.edu', 'university_id' => 'S2U2006', 'phone' => '0592200006', 'department_id' => $usoolDeptId, 'major' => 'لغة عربية'],
            ['name' => 'هالة محمود الزغاري', 'email' => 'students2.usool07@hebron.edu', 'university_id' => 'S2U2007', 'phone' => '0592200007', 'department_id' => $usoolDeptId, 'major' => 'تربية إسلامية'],
            ['name' => 'بلال طه النتشة', 'email' => 'students2.usool08@hebron.edu', 'university_id' => 'S2U2008', 'phone' => '0592200008', 'department_id' => $usoolDeptId, 'major' => 'لغة إنجليزية'],
            ['name' => 'سارة عصام الرجبي', 'email' => 'students2.usool09@hebron.edu', 'university_id' => 'S2U2009', 'phone' => '0592200009', 'department_id' => $usoolDeptId, 'major' => 'رياضيات'],
            ['name' => 'يوسف إبراهيم الحروب', 'email' => 'students2.usool10@hebron.edu', 'university_id' => 'S2U2010', 'phone' => '0592200010', 'department_id' => $usoolDeptId, 'major' => 'لغة عربية'],
            ['name' => 'دينا حسام القاسمي', 'email' => 'students2.usool11@hebron.edu', 'university_id' => 'S2U2011', 'phone' => '0592200011', 'department_id' => $usoolDeptId, 'major' => 'تربية إسلامية'],
            ['name' => 'معاذ راشد العويوي', 'email' => 'students2.usool12@hebron.edu', 'university_id' => 'S2U2012', 'phone' => '0592200012', 'department_id' => $usoolDeptId, 'major' => 'لغة إنجليزية'],
            ['name' => 'لمى طارق الأطرش', 'email' => 'students2.usool13@hebron.edu', 'university_id' => 'S2U2013', 'phone' => '0592200013', 'department_id' => $usoolDeptId, 'major' => 'رياضيات'],
            ['name' => 'كرم ماجد الشنار', 'email' => 'students2.usool14@hebron.edu', 'university_id' => 'S2U2014', 'phone' => '0592200014', 'department_id' => $usoolDeptId, 'major' => 'لغة عربية'],
            ['name' => 'روان سمير الدبك', 'email' => 'students2.usool15@hebron.edu', 'university_id' => 'S2U2015', 'phone' => '0592200015', 'department_id' => $usoolDeptId, 'major' => 'تربية إسلامية'],

            // 5 طلاب علم النفس
            ['name' => 'أحمد تيسير دعنا', 'email' => 'students2.psy01@hebron.edu', 'university_id' => 'S2P3001', 'phone' => '0592300001', 'department_id' => $psychDeptId, 'major' => 'علم نفس'],
            ['name' => 'نور فادي القواسمي', 'email' => 'students2.psy02@hebron.edu', 'university_id' => 'S2P3002', 'phone' => '0592300002', 'department_id' => $psychDeptId, 'major' => 'علم نفس'],
            ['name' => 'محمد رامي النتشة', 'email' => 'students2.psy03@hebron.edu', 'university_id' => 'S2P3003', 'phone' => '0592300003', 'department_id' => $psychDeptId, 'major' => 'علم نفس'],
            ['name' => 'آية نضال الكركي', 'email' => 'students2.psy04@hebron.edu', 'university_id' => 'S2P3004', 'phone' => '0592300004', 'department_id' => $psychDeptId, 'major' => 'علم نفس'],
            ['name' => 'رهف حازم السلايمة', 'email' => 'students2.psy05@hebron.edu', 'university_id' => 'S2P3005', 'phone' => '0592300005', 'department_id' => $psychDeptId, 'major' => 'علم نفس'],
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
