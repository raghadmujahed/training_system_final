<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Course;

class CoursesSeeder extends Seeder
{
    public function run()
    {
        $usoolDeptId = \App\Models\Department::where('name', 'usool_tarbiah')->value('id');
        $psychDeptId = \App\Models\Department::where('name', 'psychology')->value('id');

        $courses = [
            ['code' => 'EDUC310', 'name' => 'تربية عملية 1', 'credit_hours' => 3, 'type' => 'practical', 'department_id' => $usoolDeptId],
            ['code' => 'EDUC320', 'name' => 'تربية عملية 2', 'credit_hours' => 3, 'type' => 'practical', 'department_id' => $usoolDeptId],
            ['code' => 'PSYC210', 'name' => 'إرشاد نفسي تربوي', 'credit_hours' => 2, 'type' => 'both', 'department_id' => $psychDeptId],
            ['code' => 'EDUC330', 'name' => 'طرق تدريس', 'credit_hours' => 3, 'type' => 'theoretical', 'department_id' => $usoolDeptId],
        ];

        foreach ($courses as $course) {
            Course::firstOrCreate(['code' => $course['code']], $course);
        }
    }
}