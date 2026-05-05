<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;

class RolePermissionSeeder extends Seeder
{
    public function run()
    {
        // جلب الأدوار
        $admin = Role::where('name', 'admin')->first();
        $trainingCoordinator = Role::where('name', 'training_coordinator')->first();
        $academicSupervisor = Role::where('name', 'academic_supervisor')->first();
        $teacher = Role::where('name', 'teacher')->first();
        $student = Role::where('name', 'student')->first();
        $schoolManager = Role::where('name', 'school_manager')->first();
        $adviser = Role::where('name', 'adviser')->first();
        $psychologist = Role::where('name', 'psychologist')->first();
        $headOfDepartment = Role::where('name', 'head_of_department')->first();
        $educationDirectorate = Role::where('name', 'education_directorate')->first();
        $healthDirectorate = Role::where('name', 'health_directorate')->first();

        // 1. الأدمن: كل الصلاحيات
        if ($admin) {
            $admin->permissions()->sync(Permission::all());
        }

        // 2. منسق التدريب
        if ($trainingCoordinator) {
            $coordinatorPerms = Permission::whereIn('name', [
                'manage_training_sites', 'manage_training_periods',
                'manage_training_requests', 'approve_training_requests', 'reject_training_requests',
                'manage_training_assignments',
                'manage_announcements',
                'view_reports', 'export_reports',
                'manage_courses', 'manage_sections', 'manage_enrollments',
                'manage_feature_flags',
            ])->get();
            $trainingCoordinator->permissions()->sync($coordinatorPerms);
        }

        // 3. المشرف الأكاديمي
        if ($academicSupervisor) {
            $supervisorPerms = Permission::whereIn('name', [
                'manage_tasks', 'manage_task_submissions',
                'manage_attendances',
                'manage_evaluations',
                'view_reports',
                'manage_portfolios', 'manage_supervisor_visits',
            ])->get();
            $academicSupervisor->permissions()->sync($supervisorPerms);
        }

        // 4. المعلم المرشد
        if ($teacher) {
            $teacherPerms = Permission::whereIn('name', [
                'manage_tasks', 'manage_task_submissions',
                'manage_attendances',
                'manage_evaluations',
            ])->get();
            $teacher->permissions()->sync($teacherPerms);
        }

        // 5. الطالب
        if ($student) {
            $studentPerms = Permission::whereIn('name', [
                'manage_tasks', 'manage_task_submissions',
                'manage_attendances',
            ])->get();
            $student->permissions()->sync($studentPerms);
        }

        // 6. مدير المدرسة
        if ($schoolManager) {
            $managerPerms = Permission::whereIn('name', [
                'manage_training_assignments',
                'manage_attendances',
                'manage_evaluations',
                'view_reports',
            ])->get();
            $schoolManager->permissions()->sync($managerPerms);
        }

        // 7. الأخصائي النفسي: نفس صلاحيات المشرف الميداني عملياً (مهام، حضور، تقييمات) مع مسار واجهة موحّد
        if ($psychologist) {
            $psychologistPerms = Permission::whereIn('name', [
                'manage_tasks',
                'manage_task_submissions',
                'manage_attendances',
                'manage_evaluations',
                'view_reports',
                'send_notifications',
            ])->get();
            $psychologist->permissions()->sync($psychologistPerms);
        }

        // 8. المشرف الميداني الموحد (معلم مرشد / مرشد تربوي / أخصائي نفسي)
        $fieldSupervisor = Role::where('name', 'field_supervisor')->first();
        if ($fieldSupervisor) {
            $fieldSupervisorPerms = Permission::whereIn('name', [
                'manage_tasks', 'manage_task_submissions',
                'manage_attendances',
                'manage_evaluations',
                'view_reports',
                'send_notifications',
            ])->get();
            $fieldSupervisor->permissions()->sync($fieldSupervisorPerms);
        }
    }
}