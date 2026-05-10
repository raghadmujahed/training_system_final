<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TrainingSite;

class TrainingSitesSeeder extends Seeder
{
    public function run()
    {
        $schools = [
            [
                'name' => 'مدرسة ذكور الخليل الأساسية', 
                'location' => 'الخليل - وسط المدينة', 
                'phone' => '022222222', 
                'mobile' => '0591234567',
                'email' => 'khalil_basic_boys@example.edu',
                'directorate' => 'وسط', 
                'is_active' => true, 
                'capacity' => 15, 
                'gender_classification' => 'boys', 
                'school_level' => 'lower', 
                'school_type' => 'public',
                'site_type' => 'school',
                'governing_body' => 'directorate_of_education',
                'description' => 'مدرسة أساسية للبنين في وسط مدينة الخليل، تأسست عام 1960'
            ],
            [
                'name' => 'مدرسة إناث الخليل الثانوية', 
                'location' => 'الخليل - حارة الشيخ', 
                'phone' => '022222223', 
                'mobile' => '0591234568',
                'email' => 'khalil_secondary_girls@example.edu',
                'directorate' => 'وسط', 
                'is_active' => true, 
                'capacity' => 12, 
                'gender_classification' => 'girls', 
                'school_level' => 'upper', 
                'school_type' => 'public',
                'site_type' => 'school',
                'governing_body' => 'directorate_of_education',
                'description' => 'مدرسة ثانوية للبنات في حارة الشيخ، تضم المرحلة الثانوية فقط'
            ],
            [
                'name' => 'مدرسة الخليل الأساسية المختلطة', 
                'location' => 'الخليل - رأس الجورة', 
                'phone' => '022222224', 
                'mobile' => '0591234569',
                'email' => 'khalil_basic_mixed@example.edu',
                'directorate' => 'وسط', 
                'is_active' => true, 
                'capacity' => 18, 
                'gender_classification' => 'mixed', 
                'school_level' => 'both', 
                'school_type' => 'public',
                'site_type' => 'school',
                'governing_body' => 'directorate_of_education',
                'description' => 'مدرسة أساسية مختلطة تضم جميع الصفوف من الأول حتى العاشر'
            ],

            [
                'name' => 'مدرسة حلحول الثانوية للبنين', 
                'location' => 'حلحول - وسط البلدة', 
                'phone' => '022222225', 
                'mobile' => '0591234570',
                'email' => 'halhoul_secondary_boys@example.edu',
                'directorate' => 'شمال', 
                'is_active' => true, 
                'capacity' => 14, 
                'gender_classification' => 'boys', 
                'school_level' => 'upper', 
                'school_type' => 'public',
                'site_type' => 'school',
                'governing_body' => 'directorate_of_education',
                'description' => 'مدرسة ثانوية للبنين في حلحول، تشتهر بالتميز الأكاديمي'
            ],
            [
                'name' => 'مدرسة بنات حلحول الأساسية', 
                'location' => 'حلحول - الشارع الرئيسي', 
                'phone' => '022222226', 
                'mobile' => '0591234571',
                'email' => 'halhoul_basic_girls@example.edu',
                'directorate' => 'شمال', 
                'is_active' => true, 
                'capacity' => 10, 
                'gender_classification' => 'girls', 
                'school_level' => 'lower', 
                'school_type' => 'public',
                'site_type' => 'school',
                'governing_body' => 'directorate_of_education',
                'description' => 'مدرسة أساسية للبنات في حلحول، تضم الصفوف من الأول حتى السادس'
            ],
            [
                'name' => 'مدرسة سعير الثانوية المختلطة', 
                'location' => 'سعير - المركز', 
                'phone' => '022222227', 
                'mobile' => '0591234572',
                'email' => 'sa_ir_secondary_mixed@example.edu',
                'directorate' => 'شمال', 
                'is_active' => true, 
                'capacity' => 16, 
                'gender_classification' => 'mixed', 
                'school_level' => 'both', 
                'school_type' => 'public',
                'site_type' => 'school',
                'governing_body' => 'directorate_of_education',
                'description' => 'مدرسة ثانوية مختلطة في سعير، تضم المرحلتين الأساسية والثانوية'
            ],

            [
                'name' => 'مدرسة دورا الثانوية للبنين', 
                'location' => 'دورا - وسط البلدة', 
                'phone' => '022222228', 
                'mobile' => '0591234573',
                'email' => 'dora_secondary_boys@example.edu',
                'directorate' => 'جنوب', 
                'is_active' => true, 
                'capacity' => 13, 
                'gender_classification' => 'boys', 
                'school_level' => 'upper', 
                'school_type' => 'public',
                'site_type' => 'school',
                'governing_body' => 'directorate_of_education',
                'description' => 'مدرسة ثانوية للبنين في دورا، تأسست عام 1975'
            ],
            [
                'name' => 'مدرسة بنات دورا الأساسية', 
                'location' => 'دورا - الحارة الغربية', 
                'phone' => '022222229', 
                'mobile' => '0591234574',
                'email' => 'dora_basic_girls@example.edu',
                'directorate' => 'جنوب', 
                'is_active' => true, 
                'capacity' => 11, 
                'gender_classification' => 'girls', 
                'school_level' => 'lower', 
                'school_type' => 'public',
                'site_type' => 'school',
                'governing_body' => 'directorate_of_education',
                'description' => 'مدرسة أساسية للبنات في الحارة الغربية من دورا'
            ],

            [
                'name' => 'مدرسة يطا الثانوية', 
                'location' => 'يطا - المركز', 
                'phone' => '022222230', 
                'mobile' => '0591234575',
                'email' => 'yatta_secondary@example.edu',
                'directorate' => 'يطا', 
                'is_active' => true, 
                'capacity' => 20, 
                'gender_classification' => 'mixed', 
                'school_level' => 'upper', 
                'school_type' => 'public',
                'site_type' => 'school',
                'governing_body' => 'directorate_of_education',
                'description' => 'المدرسة الثانوية الرئيسية في يطا، تخدم منطقة واسعة'
            ],
            [
                'name' => 'مدرسة بنات يطا الأساسية', 
                'location' => 'يطا - الشارع الرئيسي', 
                'phone' => '022222231', 
                'mobile' => '0591234576',
                'email' => 'yatta_basic_girls@example.edu',
                'directorate' => 'يطا', 
                'is_active' => true, 
                'capacity' => 12, 
                'gender_classification' => 'girls', 
                'school_level' => 'lower', 
                'school_type' => 'public',
                'site_type' => 'school',
                'governing_body' => 'directorate_of_education',
                'description' => 'مدرسة أساسية للبنات في يطا، تضم الصفوف الابتدائية'
            ],

            // مدارس حكومية إضافية — مديرية وسط
            [
                'name' => 'مدرسة الحسين الثانوية للبنين', 
                'location' => 'الخليل - باب الزاوية', 
                'phone' => '0222200101', 
                'mobile' => '0591234577',
                'email' => 'hussein_secondary_boys@example.edu',
                'directorate' => 'وسط', 
                'is_active' => true, 
                'capacity' => 15, 
                'gender_classification' => 'boys', 
                'school_level' => 'upper', 
                'school_type' => 'public',
                'site_type' => 'school',
                'governing_body' => 'directorate_of_education',
                'description' => 'مدرسة الحسين الثانوية للبنين، من أقدم مدارس الخليل'
            ],
            [
                'name' => 'مدرسة الخليل الثانوية للبنات', 
                'location' => 'الخليل - واد الجوز', 
                'phone' => '0222200102', 
                'mobile' => '0591234578',
                'email' => 'khalil_secondary_girls_main@example.edu',
                'directorate' => 'وسط', 
                'is_active' => true, 
                'capacity' => 14, 
                'gender_classification' => 'girls', 
                'school_level' => 'upper', 
                'school_type' => 'public',
                'site_type' => 'school',
                'governing_body' => 'directorate_of_education',
                'description' => 'المدرسة الثانوية الرئيسية للبنات في الخليل'
            ],

            // مدارس خاصة
            [
                'name' => 'مدرسة الأفق الخاصة', 
                'location' => 'الخليل - شارع إبراهيم الخليل', 
                'phone' => '0222333444', 
                'mobile' => '0599876543',
                'email' => 'al_ufuq_private@example.edu',
                'directorate' => 'وسط', 
                'is_active' => true, 
                'capacity' => 20, 
                'gender_classification' => 'mixed', 
                'school_level' => 'both', 
                'school_type' => 'private',
                'site_type' => 'school',
                'governing_body' => 'directorate_of_education',
                'description' => 'مدرسة خاصة مختلطة تضم جميع المراحل الدراسية'
            ],
            [
                'name' => 'مدرسة الرواد الخاصة', 
                'location' => 'حلحول - المنطقة الصناعية', 
                'phone' => '0222333555', 
                'mobile' => '0599876544',
                'email' => 'al_rowad_private@example.edu',
                'directorate' => 'شمال', 
                'is_active' => true, 
                'capacity' => 18, 
                'gender_classification' => 'mixed', 
                'school_level' => 'both', 
                'school_type' => 'private',
                'site_type' => 'school',
                'governing_body' => 'directorate_of_education',
                'description' => 'مدرسة خاصة حديثة في حلحول تركز على التعليم التكنولوجي'
            ],

            // مدارس وكالة غوث وتشغيل اللاجئين (UNRWA)
            [
                'name' => 'مدرسة الخليل الأساسية للبنين - وكالة', 
                'location' => 'الخليل - مخيم الفوار', 
                'phone' => '0222444666', 
                'mobile' => '0599765432',
                'email' => 'khalil_unrwa_boys@example.edu',
                'directorate' => 'وسط', 
                'is_active' => true, 
                'capacity' => 25, 
                'gender_classification' => 'boys', 
                'school_level' => 'lower', 
                'school_type' => 'unrwa',
                'site_type' => 'school',
                'governing_body' => 'directorate_of_education',
                'description' => 'مدرسة وكالة الغوث للبنين في مخيم الفوار'
            ],
            [
                'name' => 'مدرسة عرابة الأساسية المختلطة - وكالة', 
                'location' => 'الخليل - عرابة', 
                'phone' => '0222444777', 
                'mobile' => '0599765433',
                'email' => 'arroub_unrwa_mixed@example.edu',
                'directorate' => 'وسط', 
                'is_active' => true, 
                'capacity' => 30, 
                'gender_classification' => 'mixed', 
                'school_level' => 'lower', 
                'school_type' => 'unrwa',
                'site_type' => 'school',
                'governing_body' => 'directorate_of_education',
                'description' => 'مدرسة وكالة الغوث المختلطة في منطقة عرابة'
            ],
            ['name' => 'مدرسة نوبا الأساسية المختلطة', 'location' => 'نوبا', 'phone' => '0222200601', 'mobile' => '0591234585', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 9, 'gender_classification' => 'mixed', 'school_level' => 'lower', 'school_type' => 'public'],
            ['name' => 'مدرسة سموع الثانوية للبنين', 'location' => 'سموع', 'phone' => '0222200701', 'mobile' => '0591234586', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 11, 'gender_classification' => 'boys', 'school_level' => 'upper', 'school_type' => 'public'],
            ['name' => 'مدرسة العديسية الأساسية', 'location' => 'العديسية', 'phone' => '0222200801', 'mobile' => '0591234587', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 8, 'gender_classification' => 'mixed', 'school_level' => 'lower', 'school_type' => 'public'],
            ['name' => 'مدرسة الشيوخ الأساسية', 'location' => 'الشيوخ', 'phone' => '0222200901', 'mobile' => '0591234588', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 9, 'gender_classification' => 'mixed', 'school_level' => 'lower', 'school_type' => 'public'],
            ['name' => 'مدرسة يطا البلد الأساسية', 'location' => 'يطا', 'phone' => '0222201001', 'mobile' => '0591234589', 'directorate' => 'يطا', 'is_active' => true, 'capacity' => 10, 'gender_classification' => 'mixed', 'school_level' => 'lower', 'school_type' => 'public'],
            ['name' => 'مدرسة الخليل الأساسية المشتركة', 'location' => 'الخليل - باب الزاوية', 'phone' => '0222201101', 'mobile' => '0591234590', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 14, 'gender_classification' => 'mixed', 'school_level' => 'lower', 'school_type' => 'public'],
            ['name' => 'مدرسة بني نعيم الثانوية للبنات', 'location' => 'بني نعيم', 'phone' => '0222201201', 'mobile' => '0591234591', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 9, 'gender_classification' => 'girls', 'school_level' => 'upper', 'school_type' => 'public'],
            ['name' => 'مدرسة دورا الثانوية للبنات', 'location' => 'دورا', 'phone' => '0222201301', 'mobile' => '0591234592', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 10, 'gender_classification' => 'girls', 'school_level' => 'upper', 'school_type' => 'public'],
            ['name' => 'مدرسة الفوار الأساسية', 'location' => 'الفوار', 'phone' => '0222201401', 'mobile' => '0591234593', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 8, 'gender_classification' => 'mixed', 'school_level' => 'lower', 'school_type' => 'public'],
            ['name' => 'مدرسة بيت أولا الثانوية', 'location' => 'بيت أولا', 'phone' => '0222201501', 'mobile' => '0591234594', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 11, 'gender_classification' => 'mixed', 'school_level' => 'upper', 'school_type' => 'public'],
            ['name' => 'مدرسة تفوح الأساسية المختلطة', 'location' => 'تفوح', 'phone' => '0222201601', 'mobile' => '0591234595', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 9, 'gender_classification' => 'mixed', 'school_level' => 'lower', 'school_type' => 'public'],
            ['name' => 'مدرسة الخليل التقنية الثانوية', 'location' => 'الخليل - الهرمل', 'phone' => '0222201701', 'mobile' => '0591234596', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 12, 'gender_classification' => 'mixed', 'school_level' => 'upper', 'school_type' => 'public'],

            // مراكز صحية — وزارة الصحة
            ['name' => 'المركز النفسي التدريبي - الخليل', 'location' => 'الخليل - وسط المدينة', 'phone' => '0222222201', 'mobile' => '0591234597', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 20, 'gender_classification' => 'mixed', 'school_level' => null, 'site_type' => 'health_center', 'governing_body' => 'ministry_of_health', 'school_type' => 'public'],
            ['name' => 'مركز الصحة النفسية - حلحول', 'location' => 'حلحول', 'phone' => '0222222202', 'mobile' => '0591234598', 'directorate' => 'شمال', 'is_active' => true, 'capacity' => 15, 'gender_classification' => 'mixed', 'school_level' => null, 'site_type' => 'health_center', 'governing_body' => 'ministry_of_health', 'school_type' => 'public'],
            ['name' => 'مركز الإرشاد النفسي - دورا', 'location' => 'دورا', 'phone' => '0222222203', 'mobile' => '0591234599', 'directorate' => 'جنوب', 'is_active' => true, 'capacity' => 15, 'gender_classification' => 'mixed', 'school_level' => null, 'site_type' => 'health_center', 'governing_body' => 'ministry_of_health', 'school_type' => 'public'],
            ['name' => 'مركز التأهيل النفسي - يطا', 'location' => 'يطا', 'phone' => '0222222204', 'mobile' => '0591234600', 'directorate' => 'يطا', 'is_active' => true, 'capacity' => 12, 'gender_classification' => 'mixed', 'school_level' => null, 'site_type' => 'health_center', 'governing_body' => 'ministry_of_health', 'school_type' => 'public'],
            ['name' => 'عيادة الصحة النفسية - بيت لحم', 'location' => 'بيت لحم', 'phone' => '0222222205', 'mobile' => '0591234601', 'directorate' => 'وسط', 'is_active' => true, 'capacity' => 10, 'gender_classification' => 'mixed', 'school_level' => null, 'site_type' => 'health_center', 'governing_body' => 'ministry_of_health', 'school_type' => 'public'],
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