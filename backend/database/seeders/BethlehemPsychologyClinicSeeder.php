<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Role;
use App\Models\TrainingSite;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * حساب مدير عيادة + أخصائيان نفسيان مرتبطان بموقع
 * «عيادة الصحة النفسية - بيت لحم» (يُنشأ في TrainingSitesSeeder).
 */
class BethlehemPsychologyClinicSeeder extends Seeder
{
    private const SITE_NAME = 'عيادة الصحة النفسية - بيت لحم';

    public function run(): void
    {
        $site = TrainingSite::query()->where('name', self::SITE_NAME)->first();
        if (! $site) {
            $this->command?->warn('BethlehemPsychologyClinicSeeder: الموقع «'.self::SITE_NAME.'» غير موجود — شغّل TrainingSitesSeeder أولاً.');

            return;
        }

        $psychDeptId = Department::query()->where('name', 'psychology')->value('id');
        $managerRole = Role::query()->where('name', 'psychology_center_manager')->first();
        $psychologistRole = Role::query()->where('name', 'psychologist')->first();

        if (! $managerRole || ! $psychologistRole) {
            $this->command?->warn('BethlehemPsychologyClinicSeeder: أدوار psychology_center_manager أو psychologist غير متوفرة.');

            return;
        }

        User::query()->firstOrCreate(
            ['email' => 'psych.manager.bethlehem@hebron.edu'],
            [
                'name' => 'أ. سارة مدير عيادة بيت لحم',
                'university_id' => 'PCM-BTH-M01',
                'password' => Hash::make('password'),
                'role_id' => $managerRole->id,
                'status' => 'active',
                'training_site_id' => $site->id,
                'department_id' => $psychDeptId,
                'phone' => $site->phone ?? '02-2222205',
            ]
        );

        $specialists = [
            [
                'email' => 'psych.bethlehem1@hebron.edu',
                'name' => 'د. لينا أخصائية نفسية — بيت لحم',
                'university_id' => 'PSY-BTH-01',
            ],
            [
                'email' => 'psych.bethlehem2@hebron.edu',
                'name' => 'أ. يوسف أخصائي نفسي — بيت لحم',
                'university_id' => 'PSY-BTH-02',
            ],
        ];

        $phones = ['0597100001', '0597100002'];
        foreach ($specialists as $idx => $row) {
            User::query()->firstOrCreate(
                ['email' => $row['email']],
                [
                    'name' => $row['name'],
                    'university_id' => $row['university_id'],
                    'password' => Hash::make('password'),
                    'role_id' => $psychologistRole->id,
                    'status' => 'active',
                    'training_site_id' => $site->id,
                    'department_id' => $psychDeptId,
                    'phone' => $phones[$idx] ?? '0597100000',
                ]
            );
        }

        $this->command?->info('BethlehemPsychologyClinicSeeder: مدير العيادة + أخصائيان مرتبطان بـ «'.self::SITE_NAME.'».');
    }
}
