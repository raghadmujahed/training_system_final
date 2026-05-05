<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\DailyReportTemplate;
use App\Models\FieldEvaluationTemplate;

/**
 * Seeder لقوالب التقارير والتقييمات للمشرف الميداني
 * يدعم 3 أنواع: mentor_teacher, school_counselor, psychologist
 */
class FieldSupervisorTemplatesSeeder extends Seeder
{
    public function run()
    {
        $this->seedDailyReportTemplates();
        $this->seedEvaluationTemplates();
    }

    /**
     * قوالب التقارير اليومية
     */
    private function seedDailyReportTemplates()
    {
        $templates = [
            // ═══════════════════════════════════════════════════════════
            // Mentor Teacher — المعلم المرشد
            // ═══════════════════════════════════════════════════════════
            [
                'name' => 'تقرير يومي - تدريب تدريسي',
                'code' => 'mentor_daily_report',
                'applies_to' => 'mentor_teacher',
                'fields' => [
                    [
                        'name' => 'lesson_subject',
                        'label' => 'موضوع الدرس',
                        'type' => 'text',
                        'required' => true,
                    ],
                    [
                        'name' => 'class_grade',
                        'label' => 'الصف/الشعبة',
                        'type' => 'text',
                        'required' => true,
                    ],
                    [
                        'name' => 'objectives',
                        'label' => 'أهداف الدرس',
                        'type' => 'textarea',
                        'required' => true,
                    ],
                    [
                        'name' => 'teaching_strategy',
                        'label' => 'استراتيجية التدريس',
                        'type' => 'select',
                        'options' => ['محاضرة', 'نقاش', 'عمل جماعي', 'تعلم نشط', 'أخرى'],
                        'required' => true,
                    ],
                    [
                        'name' => 'teaching_aids',
                        'label' => 'الوسائل التعليمية المستخدمة',
                        'type' => 'textarea',
                        'required' => false,
                    ],
                    [
                        'name' => 'implementation',
                        'label' => 'ما تم تنفيذه من الدرس',
                        'type' => 'textarea',
                        'required' => true,
                    ],
                    [
                        'name' => 'classroom_management',
                        'label' => 'ملاحظات إدارة الصف',
                        'type' => 'textarea',
                        'required' => false,
                    ],
                    [
                        'name' => 'self_reflection',
                        'label' => 'انعكاس الطالب على أدائه',
                        'type' => 'textarea',
                        'required' => true,
                    ],
                    [
                        'name' => 'challenges',
                        'label' => 'الصعوبات والتحديات',
                        'type' => 'textarea',
                        'required' => false,
                    ],
                ],
                'allowed_attachments' => ['pdf', 'doc', 'docx', 'jpg', 'png'],
                'sort_order' => 1,
            ],

            // ═══════════════════════════════════════════════════════════
            // School Counselor — المرشد التربوي
            // ═══════════════════════════════════════════════════════════
            [
                'name' => 'تقرير يومي - إرشاد مدرسي',
                'code' => 'counselor_daily_report',
                'applies_to' => 'school_counselor',
                'fields' => [
                    [
                        'name' => 'activity_type',
                        'label' => 'نوع النشاط الإرشادي',
                        'type' => 'select',
                        'options' => [
                            'متابعة فردية',
                            'جلسة إرشادية',
                            'نشاط جماعي',
                            'ملاحظة صفية',
                            'تواصل مع الأهل',
                            'أخرى'
                        ],
                        'required' => true,
                    ],
                    [
                        'name' => 'target_group',
                        'label' => 'الفئة المستهدفة',
                        'type' => 'text',
                        'required' => true,
                    ],
                    [
                        'name' => 'case_description',
                        'label' => 'وصف الحالة/الموقف',
                        'type' => 'textarea',
                        'required' => true,
                    ],
                    [
                        'name' => 'intervention_approach',
                        'label' => 'أسلوب التدخل الإرشادي',
                        'type' => 'textarea',
                        'required' => true,
                    ],
                    [
                        'name' => 'skills_used',
                        'label' => 'المهارات المستخدمة',
                        'type' => 'textarea',
                        'required' => false,
                    ],
                    [
                        'name' => 'observations',
                        'label' => 'الملاحظات التربوية/النفسية',
                        'type' => 'textarea',
                        'required' => true,
                    ],
                    [
                        'name' => 'recommendations',
                        'label' => 'التوصيات',
                        'type' => 'textarea',
                        'required' => false,
                    ],
                    [
                        'name' => 'follow_up_required',
                        'label' => 'هل يحتاج لمتابعة؟',
                        'type' => 'select',
                        'options' => ['نعم', 'لا'],
                        'required' => true,
                    ],
                ],
                'allowed_attachments' => ['pdf', 'doc', 'docx'],
                'sort_order' => 2,
            ],

            // ═══════════════════════════════════════════════════════════
            // Psychologist — الأخصائي النفسي
            // ═══════════════════════════════════════════════════════════
            [
                'name' => 'تقرير يومي - متابعة نفسية',
                'code' => 'psychologist_daily_report',
                'applies_to' => 'psychologist',
                'fields' => [
                    [
                        'name' => 'session_type',
                        'label' => 'نوع الجلسة/النشاط',
                        'type' => 'select',
                        'options' => [
                            'تقييم نفسي',
                            'جلسة علاجية',
                            'جلسة دعم',
                            'نشاط جماعي',
                            'زيارة ميدانية',
                            'أخرى'
                        ],
                        'required' => true,
                    ],
                    [
                        'name' => 'case_nature',
                        'label' => 'طبيعة الحالة/الخدمة',
                        'type' => 'textarea',
                        'required' => true,
                    ],
                    [
                        'name' => 'professional_notes',
                        'label' => 'الملاحظات المهنية',
                        'type' => 'textarea',
                        'required' => true,
                    ],
                    [
                        'name' => 'tools_used',
                        'label' => 'الأدوات والتقنيات المستخدمة',
                        'type' => 'textarea',
                        'required' => false,
                    ],
                    [
                        'name' => 'outcomes',
                        'label' => 'المخرجات/النتائج',
                        'type' => 'textarea',
                        'required' => true,
                    ],
                    [
                        'name' => 'follow_up_plan',
                        'label' => 'خطة المتابعة والتوصيات',
                        'type' => 'textarea',
                        'required' => false,
                    ],
                    [
                        'name' => 'ethical_notes',
                        'label' => 'ملاحظات أخلاقية/مهنية',
                        'type' => 'textarea',
                        'required' => false,
                    ],
                ],
                'allowed_attachments' => ['pdf', 'doc', 'docx'],
                'sort_order' => 3,
            ],
        ];

        foreach ($templates as $template) {
            DailyReportTemplate::firstOrCreate(
                ['code' => $template['code']],
                $template
            );
        }
    }

    /**
     * قوالب التقييم الميداني
     */
    private function seedEvaluationTemplates()
    {
        $templates = [
            // المعلم المرشد — نموذج 6 (تقرير زيارة صفية): syncOfficialMentorClassroomVisitForm6Template() بعد الحلقة

            // School counselor — نموذج 9: FieldEvaluationTemplate::syncOfficialCounselorEvaluationTemplate() بعد الحلقة

            // الأخصائي/مشرف المؤسسة — النموذج الرسمي (٢٠ معيارًا): syncOfficialPsychologistInstitutionEvaluationTemplate() بعد الحلقة
        ];

        foreach ($templates as $template) {
            FieldEvaluationTemplate::updateOrCreate(
                ['code' => $template['code']],
                array_merge($template, ['is_active' => true])
            );
        }

        FieldEvaluationTemplate::syncOfficialCounselorEvaluationTemplate();
        FieldEvaluationTemplate::syncOfficialMentorClassroomVisitForm6Template();
        FieldEvaluationTemplate::syncOfficialPsychologistInstitutionEvaluationTemplate();
    }
}
