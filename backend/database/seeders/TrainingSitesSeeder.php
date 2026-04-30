<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TrainingSite;

class TrainingSitesSeeder extends Seeder
{
    public function run()
    {
        $schools = [
            ['name' => 'مدرسة ذكور الخليل الأساسية', 'location' => 'الخليل - وسط', 'phone' => '02-1111111', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 10, 'gender_classification' => 'boys', 'school_level' => 'lower'],
            ['name' => 'مدرسة إناث الخليل الثانوية', 'location' => 'الخليل - وسط', 'phone' => '02-1111112', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 8, 'gender_classification' => 'girls', 'school_level' => 'upper'],
            ['name' => 'مدرسة الخليل الأساسية المختلطة', 'location' => 'الخليل - وسط', 'phone' => '02-1111113', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 12, 'gender_classification' => 'mixed', 'school_level' => 'lower'],

            ['name' => 'مدرسة حلحول الثانوية للبنين', 'location' => 'حلحول', 'phone' => '02-2222221', 'directorate' => 'شمال', 'is_active' => true, 'capacity' => 10, 'gender_classification' => 'boys', 'school_level' => 'upper'],
            ['name' => 'مدرسة بنات حلحول الأساسية', 'location' => 'حلحول', 'phone' => '02-2222222', 'directorate' => 'شمال', 'is_active' => true, 'capacity' => 8, 'gender_classification' => 'girls', 'school_level' => 'lower'],
            ['name' => 'مدرسة سعير الثانوية', 'location' => 'سعير', 'phone' => '02-2222223', 'directorate' => 'شمال', 'is_active' => true, 'capacity' => 12, 'gender_classification' => 'mixed', 'school_level' => 'upper'],

            ['name' => 'مدرسة دورا الثانوية للبنين', 'location' => 'دورا', 'phone' => '02-3333331', 'directorate' => 'جنوب', 'is_active' => true, 'capacity' => 10, 'gender_classification' => 'boys', 'school_level' => 'upper'],
            ['name' => 'مدرسة بنات دورا الأساسية', 'location' => 'دورا', 'phone' => '02-3333332', 'directorate' => 'جنوب', 'is_active' => true, 'capacity' => 9, 'gender_classification' => 'girls', 'school_level' => 'lower'],

            ['name' => 'مدرسة يطا الثانوية', 'location' => 'يطا', 'phone' => '02-4444441', 'directorate' => 'يطا', 'is_active' => true, 'capacity' => 15, 'gender_classification' => 'mixed', 'school_level' => 'upper'],
            ['name' => 'مدرسة بنات يطا الأساسية', 'location' => 'يطا', 'phone' => '02-4444442', 'directorate' => 'يطا', 'is_active' => true, 'capacity' => 10, 'gender_classification' => 'girls', 'school_level' => 'lower'],

            // مدارس حكومية — مديرية وسط (منطقة الخليل ومحيطها) لدعم الفلترة والعرض
            ['name' => 'مدرسة الحسين الثانوية للبنين', 'location' => 'الخليل', 'phone' => '02-2200101', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 12, 'gender_classification' => 'boys', 'school_level' => 'upper'],
            ['name' => 'مدرسة الخليل الثانوية للبنات', 'location' => 'الخليل', 'phone' => '02-2200102', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 10, 'gender_classification' => 'girls', 'school_level' => 'upper'],
            ['name' => 'مدرسة ذكور إذنا الثانوية', 'location' => 'إذنا', 'phone' => '02-2200201', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 11, 'gender_classification' => 'boys', 'school_level' => 'upper'],
            ['name' => 'مدرسة بنات إذنا الأساسية العليا', 'location' => 'إذنا', 'phone' => '02-2200202', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 9, 'gender_classification' => 'girls', 'school_level' => 'upper'],
            ['name' => 'مدرسة ترقوميا الثانوية المختلطة', 'location' => 'ترقوميا', 'phone' => '02-2200301', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 13, 'gender_classification' => 'mixed', 'school_level' => 'upper'],
            ['name' => 'مدرسة بيت أمر الثانوية للبنين', 'location' => 'بيت أمر', 'phone' => '02-2200401', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 10, 'gender_classification' => 'boys', 'school_level' => 'upper'],
            ['name' => 'مدرسة بنات بيت أمر الأساسية', 'location' => 'بيت أمر', 'phone' => '02-2200402', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 8, 'gender_classification' => 'girls', 'school_level' => 'lower'],
            ['name' => 'مدرسة حتا الثانوية', 'location' => 'حتا', 'phone' => '02-2200501', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 10, 'gender_classification' => 'mixed', 'school_level' => 'upper'],
            ['name' => 'مدرسة نوبا الأساسية المختلطة', 'location' => 'نوبا', 'phone' => '02-2200601', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 9, 'gender_classification' => 'mixed', 'school_level' => 'lower'],
            ['name' => 'مدرسة سموع الثانوية للبنين', 'location' => 'سموع', 'phone' => '02-2200701', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 11, 'gender_classification' => 'boys', 'school_level' => 'upper'],
            ['name' => 'مدرسة العديسية الأساسية', 'location' => 'العديسية', 'phone' => '02-2200801', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 8, 'gender_classification' => 'mixed', 'school_level' => 'lower'],
            ['name' => 'مدرسة الشيوخ الأساسية', 'location' => 'الشيوخ', 'phone' => '02-2200901', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 9, 'gender_classification' => 'mixed', 'school_level' => 'lower'],
            ['name' => 'مدرسة يطا البلد الأساسية', 'location' => 'يطا', 'phone' => '02-2201001', 'directorate' => 'يطا', 'is_active' => true, 'capacity' => 10, 'gender_classification' => 'mixed', 'school_level' => 'lower'],
            ['name' => 'مدرسة الخليل الأساسية المشتركة', 'location' => 'الخليل - باب الزاوية', 'phone' => '02-2201101', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 14, 'gender_classification' => 'mixed', 'school_level' => 'lower'],
            ['name' => 'مدرسة بني نعيم الثانوية للبنات', 'location' => 'بني نعيم', 'phone' => '02-2201201', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 9, 'gender_classification' => 'girls', 'school_level' => 'upper'],
            ['name' => 'مدرسة دورا الثانوية للبنات', 'location' => 'دورا', 'phone' => '02-2201301', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 10, 'gender_classification' => 'girls', 'school_level' => 'upper'],
            ['name' => 'مدرسة الفوار الأساسية', 'location' => 'الفوار', 'phone' => '02-2201401', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 8, 'gender_classification' => 'mixed', 'school_level' => 'lower'],
            ['name' => 'مدرسة بيت أولا الثانوية', 'location' => 'بيت أولا', 'phone' => '02-2201501', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 11, 'gender_classification' => 'mixed', 'school_level' => 'upper'],
            ['name' => 'مدرسة تفوح الأساسية المختلطة', 'location' => 'تفوح', 'phone' => '02-2201601', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 9, 'gender_classification' => 'mixed', 'school_level' => 'lower'],
            ['name' => 'مدرسة الخليل التقنية الثانوية', 'location' => 'الخليل - الهرمل', 'phone' => '02-2201701', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 12, 'gender_classification' => 'mixed', 'school_level' => 'upper'],

            // مراكز صحية — وزارة الصحة
            ['name' => 'المركز النفسي التدريبي - الخليل', 'location' => 'الخليل - وسط المدينة', 'phone' => '02-2222201', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 20, 'gender_classification' => 'mixed', 'school_level' => null, 'site_type' => 'health_center', 'governing_body' => 'ministry_of_health', 'school_type' => 'public'],
            ['name' => 'مركز الصحة النفسية - حلحول', 'location' => 'حلحول', 'phone' => '02-2222202', 'directorate' => 'شمال', 'is_active' => true, 'capacity' => 15, 'gender_classification' => 'mixed', 'school_level' => null, 'site_type' => 'health_center', 'governing_body' => 'ministry_of_health', 'school_type' => 'public'],
            ['name' => 'مركز الإرشاد النفسي - دورا', 'location' => 'دورا', 'phone' => '02-2222203', 'directorate' => 'جنوب', 'is_active' => true, 'capacity' => 15, 'gender_classification' => 'mixed', 'school_level' => null, 'site_type' => 'health_center', 'governing_body' => 'ministry_of_health', 'school_type' => 'public'],
            ['name' => 'مركز التأهيل النفسي - يطا', 'location' => 'يطا', 'phone' => '02-2222204', 'directorate' => 'يطا', 'is_active' => true, 'capacity' => 12, 'gender_classification' => 'mixed', 'school_level' => null, 'site_type' => 'health_center', 'governing_body' => 'ministry_of_health', 'school_type' => 'public'],
            ['name' => 'عيادة الصحة النفسية - بيت لحم', 'location' => 'بيت لحم', 'phone' => '02-2222205', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 10, 'gender_classification' => 'mixed', 'school_level' => null, 'site_type' => 'health_center', 'governing_body' => 'ministry_of_health', 'school_type' => 'public'],
        ];

        foreach ($schools as $school) {
            if (!isset($school['governing_body'])) {
                $school['governing_body'] = 'directorate_of_education';
            }
            $school['school_type'] = $school['school_type'] ?? 'public';
            TrainingSite::query()->updateOrCreate(
                ['name' => $school['name']],
                $school
            );
        }
    }
}