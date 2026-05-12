<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Permission;

class PermissionSeeder extends Seeder
{
    public function run()
    {
        $permissions = [
            // المستخدمون والأدوار والأقسام
            'manage_users',
            'manage_roles',
            'manage_departments',

            // مواقع وفترات التدريب
            'manage_training_sites',
            'manage_training_periods',

            // إدارة الكوادر التدريبية
            'training_sites.staff.view',
            'training_sites.staff.assign',
            'training_sites.staff.transfer',
            'training_sites.staff.remove',

            // طلبات التدريب
            'manage_training_requests',
            'approve_training_requests',
            'reject_training_requests',

            // توزيع الطلبة
            'manage_training_assignments',

            // المهام والتسليمات
            'manage_tasks',
            'manage_task_submissions',

            // الحضور
            'manage_attendances',

            // التقييمات
            'manage_evaluations',
            'manage_evaluation_templates',

            // الإعلانات والإشعارات
            'manage_announcements',
            'send_notifications',

            // التقارير
            'view_reports',
            'export_reports',

            // النسخ الاحتياطي وسجل النشاطات
            'manage_backups',
            'view_activity_logs',

            // الشعب والمساقات والتسجيلات
            'manage_courses',
            'manage_sections',
            'manage_enrollments',

            // ملفات الإنجاز والزيارات
            'manage_portfolios',
            'manage_supervisor_visits',

            // إعدادات النظام والميزات
            'manage_system_settings',
            'manage_feature_flags',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm]);
        }
    }
}