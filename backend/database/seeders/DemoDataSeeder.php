<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * هذا السيدر تم إفراغه - البيانات الأساسية موجودة في السيدرز الأخرى.
 * يمكن إنشاء طلبات التدريب والمهام والكتب يدوياً من الواجهة.
 */
class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->command?->info('DemoDataSeeder: لا توجد بيانات تجريبية. البيانات الأساسية موجودة في السيدرز الأخرى (مستخدمين، أقسام، شعب، مساقات، مواقع تدريب، أدوار، صلاحيات).');
        $this->command?->info('يمكن إنشاء طلبات التدريب والمهام والكتب يدوياً من الواجهة.');
    }
}
