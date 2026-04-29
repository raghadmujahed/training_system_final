<?php

namespace Database\Seeders;

use App\Models\TrainingSite;
use Illuminate\Database\Seeder;

/**
 * يحدث بيانات المدارس الموجودة لتعبئة الحقول الجديدة:
 * - gender_classification (boys/girls/mixed)
 * - school_level (lower/upper)
 * بناءً على اسم المدرسة
 */
class UpdateSchoolsClassificationSeeder extends Seeder
{
    public function run(): void
    {
        $schools = TrainingSite::all();
        $updated = 0;

        foreach ($schools as $school) {
            $name = mb_strtolower($school->name, 'UTF-8');
            
            // تحديد التصنيف الجنسي من الاسم
            $genderClassification = null;
            if (str_contains($name, 'ذكور') || str_contains($name, 'للبنين') || str_contains($name, 'boys')) {
                $genderClassification = 'boys';
            } elseif (str_contains($name, 'إناث') || str_contains($name, 'بنات') || str_contains($name, 'للبنات') || str_contains($name, 'girls')) {
                $genderClassification = 'girls';
            } elseif (str_contains($name, 'مختلط') || str_contains($name, 'مشتركة') || str_contains($name, 'mixed')) {
                $genderClassification = 'mixed';
            }

            // تحديد المرحلة الدراسية من الاسم
            $schoolLevel = null;
            if (str_contains($name, 'أساسية دنيا') || str_contains($name, 'الدنيا') || str_contains($name, 'lower')) {
                $schoolLevel = 'lower';
            } elseif (str_contains($name, 'أساسية عليا') || str_contains($name, 'العليا') || str_contains($name, 'ثانوية') || str_contains($name, 'upper')) {
                $schoolLevel = 'upper';
            }

            // تحديث فقط إذا وجدنا قيمًا
            $updateData = [];
            if ($genderClassification !== null && $school->gender_classification === null) {
                $updateData['gender_classification'] = $genderClassification;
            }
            if ($schoolLevel !== null && $school->school_level === null) {
                $updateData['school_level'] = $schoolLevel;
            }

            if (!empty($updateData)) {
                $school->update($updateData);
                $updated++;
                $this->command->info("✓ {$school->name} → " . json_encode($updateData, JSON_UNESCAPED_UNICODE));
            }
        }

        $this->command->info("تم تحديث {$updated} مدرسة بنجاح!");
    }
}
