<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;

class RoleSeeder extends Seeder
{
    public function run()
    {
        $roles = [
            'admin',                      // مدير النظام (صلاحيات كاملة)
            'student',                    // الطالب المتدرب
            'teacher',                    // المعلم المرشد
            'field_supervisor',           // المشرف الميداني الموحد (جديد)
            'school_manager',             // مدير المدرسة
            'principal',                  // مدير المدرسة (مدير جهة التدريب)
            'psychology_center_manager',  // مدير المركز النفسي
            'adviser',                    // المرشد التربوي
            'psychologist',               // أخصائي نفسي
            'academic_supervisor',        // المشرف الأكاديمي
            'training_coordinator',       // منسق التدريب
            'education_directorate',      // مديريات التربية والتعليم
            'health_directorate',         // وزارة الصحة
            'head_of_department',         // رئيس القسم
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role]);
        }
    }
}