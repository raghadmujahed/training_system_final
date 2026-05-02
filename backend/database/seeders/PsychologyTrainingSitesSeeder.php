<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Role;
use App\Models\TrainingSite;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * مراكز تدريب ميداني مرتبطة بمسار علم النفس (site_type: health_center، جهة: وزارة الصحة).
 * لكل مركز حساب مدير مركز نفسي حتى يمرّ تحقق اختيار جهة التدريب.
 */
class PsychologyTrainingSitesSeeder extends Seeder
{
    public function run(): void
    {
        $psychDeptId = Department::where('name', 'psychology')->value('id');
        $managerRole = Role::where('name', 'psychology_center_manager')->first();
        if (! $managerRole) {
            $this->command?->warn('PsychologyTrainingSitesSeeder: دور psychology_center_manager غير موجود — تم التخطي.');

            return;
        }

        $defaultDescription = 'مركز تدريب ميداني لطلاب قسم علم النفس — كلية التربية، جامعة الخليل.';

        $centers = [
            [
                'name' => 'وحدة الإرشاد النفسي التدريبي — كلية التربية',
                'location' => 'الحرم الجامعي — جامعة الخليل',
                'directorate' => 'وسط',
                'phone' => '02-2227101',
                'capacity' => 18,
                'email' => 'psych.manager.facultyunit@hebron.edu',
                'manager_name' => 'د. سمية مدير وحدة التدريب النفسي',
                'uid' => 'PCM-F01',
            ],
            [
                'name' => 'مركز الصحة النفسية المجتمعية — شمال الخليل',
                'location' => 'حلحول',
                'directorate' => 'شمال',
                'phone' => '02-2227102',
                'capacity' => 14,
                'email' => 'psych.manager.commnorth@hebron.edu',
                'manager_name' => 'أ. ليلى مدير المركز',
                'uid' => 'PCM-N01',
            ],
            [
                'name' => 'عيادة الإرشاد والعلاج النفسي — دورا',
                'location' => 'دورا',
                'directorate' => 'جنوب',
                'phone' => '02-2227103',
                'capacity' => 16,
                'email' => 'psych.manager.dura@hebron.edu',
                'manager_name' => 'أ. كمال مدير العيادة',
                'uid' => 'PCM-S01',
            ],
            [
                'name' => 'برنامج التدريب في علم النفس المدرسي — يطا',
                'location' => 'يطا',
                'directorate' => 'يطا',
                'phone' => '02-2227104',
                'capacity' => 12,
                'email' => 'psych.manager.yatta@hebron.edu',
                'manager_name' => 'أ. هدى منسق التدريب الميداني',
                'uid' => 'PCM-Y01',
            ],
            [
                'name' => 'مركز الدعم النفسي والأسرة — وسط الخليل',
                'location' => 'الخليل — ضاحية أبو رمانة',
                'directorate' => 'وسط',
                'phone' => '02-2227105',
                'capacity' => 15,
                'email' => 'psych.manager.family@hebron.edu',
                'manager_name' => 'أ. نوال مدير المركز',
                'uid' => 'PCM-W02',
            ],
            [
                'name' => 'عيادة التقييم النفسي — بني نعيم',
                'location' => 'بني نعيم',
                'directorate' => 'وسط',
                'phone' => '02-2227106',
                'capacity' => 10,
                'email' => 'psych.manager.baninaim@hebron.edu',
                'manager_name' => 'د. إياد مدير العيادة',
                'uid' => 'PCM-BN01',
            ],
        ];

        foreach ($centers as $c) {
            $site = TrainingSite::query()->updateOrCreate(
                ['name' => $c['name']],
                [
                    'location' => $c['location'],
                    'phone' => $c['phone'],
                    'description' => $defaultDescription,
                    'is_active' => true,
                    'directorate' => $c['directorate'],
                    'capacity' => $c['capacity'],
                    'site_type' => 'health_center',
                    'governing_body' => 'ministry_of_health',
                    'school_type' => 'public',
                    'gender_classification' => 'mixed',
                    'school_level' => null,
                ]
            );

            User::query()->firstOrCreate(
                ['email' => $c['email']],
                [
                    'name' => $c['manager_name'],
                    'university_id' => $c['uid'],
                    'password' => Hash::make('password'),
                    'role_id' => $managerRole->id,
                    'status' => 'active',
                    'training_site_id' => $site->id,
                    'department_id' => $psychDeptId,
                    'phone' => $c['phone'],
                ]
            );
        }

        $this->command?->info('PsychologyTrainingSitesSeeder: تم إنشاء/تحديث '.count($centers).' مركز تدريب لقسم علم النفس مع مديري مراكز.');
    }
}
