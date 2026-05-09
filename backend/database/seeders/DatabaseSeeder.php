<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        //  تشغيل seeders أولًا
        $this->call([
            RoleSeeder::class,
            DepartmentSeeder::class,
            PermissionSeeder::class,
            CoursesSeeder::class,
            TrainingPeriodsSeeder::class,
            TrainingSitesSeeder::class,
            HebronGovernmentSchoolsXlsxSeeder::class,
            UpdateSchoolsClassificationSeeder::class, // تحديث تصنيف المدارس (ذكور/إناث/مختلطة ودنيا/عليا)
            RolePermissionSeeder::class,
            UsersSeeder::class,
            StudentsSeeder::class,
            Students2Seeder::class,
            SectionsSeeder::class,
            EnrollmentsSeeder::class,
            DemoDataSeeder::class,
            FeatureFlagsSeeder::class
        ]);

      
    }
}