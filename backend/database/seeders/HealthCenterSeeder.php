<?php

namespace Database\Seeders;

use App\Models\TrainingSite;
use App\Models\User;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class HealthCenterSeeder extends Seeder
{
    public function run(): void
    {
        // Create health center training site
        $healthSite = TrainingSite::firstOrCreate([
            'name' => 'المركز النفسي التدريبي',
        ], [
            'location' => 'الخليل',
            'phone' => '02-2222222',
            'description' => 'مركز نفسي لتدريب الطلبة',
            'is_active' => true,
            'directorate' => 'وسط',
            'capacity' => 50,
            'site_type' => 'health_center',
            'governing_body' => 'ministry_of_health',
            'school_type' => 'public',
        ]);

        // Get psychology center manager role
        $psychCenterManagerRole = Role::where('name', 'psychology_center_manager')->first();
        
        if ($psychCenterManagerRole) {
            // Create psychology center manager user
            $psychDeptId = \App\Models\Department::where('name', 'psychology')->value('id');

            User::firstOrCreate(
                ['email' => 'psychcentermanager@hebron.edu'],
                [
                    'name' => 'أ. أحمد مدير المركز النفسي',
                    'university_id' => 'PCM001',
                    'password' => Hash::make('password'),
                    'role_id' => $psychCenterManagerRole->id,
                    'status' => 'active',
                    'training_site_id' => $healthSite->id,
                    'department_id' => $psychDeptId,
                    'phone' => '0233333334',
                ]
            );
            
            $this->command->info('Created psychology center manager: psychcentermanager@hebron.edu');
        }

        // Create some psychologists
        $psychologistRole = Role::where('name', 'psychologist')->first();
        if ($psychologistRole) {
            User::firstOrCreate(
                ['email' => 'psychologist1@hebron.edu'],
                [
                    'name' => 'سعاد الأخصائية النفسية',
                    'university_id' => 'PSY001',
                    'password' => Hash::make('password'),
                    'role_id' => $psychologistRole->id,
                    'status' => 'active',
                    'training_site_id' => $healthSite->id,
                    'department_id' => $psychDeptId ?? null,
                    'phone' => '0590000004',
                ]
            );
            
            User::firstOrCreate(
                ['email' => 'psychologist2@hebron.edu'],
                [
                    'name' => 'خالد الأخصائي النفسي',
                    'university_id' => 'PSY002',
                    'password' => Hash::make('password'),
                    'role_id' => $psychologistRole->id,
                    'status' => 'active',
                    'training_site_id' => $healthSite->id,
                    'department_id' => $psychDeptId ?? null,
                    'phone' => '0590000005',
                ]
            );
            
            $this->command->info('Created psychologists for the health center');
        }
    }
}
