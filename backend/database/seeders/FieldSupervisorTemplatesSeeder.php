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
            // ═══════════════════════════════════════════════════════════
            // Mentor Teacher Evaluation
            // ═══════════════════════════════════════════════════════════
            [
                'name' => 'تقييم ميداني - تدريب تدريسي',
                'code' => 'mentor_evaluation',
                'applies_to' => 'mentor_teacher',
                'criteria' => [
                    [
                        'id' => 'commitment',
                        'label' => 'الالتزام والانضباط',
                        'description' => 'الحضور في الموعد، الالتزام بأنظمة المدرسة',
                        'weight' => 15,
                        'scale' => [1, 2, 3, 4, 5],
                    ],
                    [
                        'id' => 'classroom_management',
                        'label' => 'إدارة الصف',
                        'description' => 'قدرة الطالب على إدارة الصف وضبط السلوك',
                        'weight' => 20,
                        'scale' => [1, 2, 3, 4, 5],
                    ],
                    [
                        'id' => 'planning_preparation',
                        'label' => 'التخطيط والتحضير',
                        'description' => 'جودة تحضير الدروس والخطة التدريسية',
                        'weight' => 15,
                        'scale' => [1, 2, 3, 4, 5],
                    ],
                    [
                        'id' => 'lesson_delivery',
                        'label' => 'تنفيذ الدرس',
                        'description' => 'وضوح الشرح، سلاسة الأداء، تحقيق الأهداف',
                        'weight' => 20,
                        'scale' => [1, 2, 3, 4, 5],
                    ],
                    [
                        'id' => 'teaching_aids',
                        'label' => 'استخدام الوسائل التعليمية',
                        'description' => 'استخدام الوسائل والتقنيات بفعالية',
                        'weight' => 10,
                        'scale' => [1, 2, 3, 4, 5],
                    ],
                    [
                        'id' => 'student_interaction',
                        'label' => 'التفاعل مع الطلبة',
                        'description' => 'التعامل الإيجابي، تحفيز الطلبة، الاستجابة لهم',
                        'weight' => 10,
                        'scale' => [1, 2, 3, 4, 5],
                    ],
                    [
                        'id' => 'professional_development',
                        'label' => 'التطور المهني',
                        'description' => 'استقبال الملاحظات، التحسن الملحوظ',
                        'weight' => 10,
                        'scale' => [1, 2, 3, 4, 5],
                    ],
                ],
                'total_score' => 100,
                'score_ranges' => [
                    'excellent' => ['min' => 90, 'label' => 'ممتاز', 'color' => 'green'],
                    'very_good' => ['min' => 80, 'label' => 'جيد جداً', 'color' => 'blue'],
                    'good' => ['min' => 70, 'label' => 'جيد', 'color' => 'yellow'],
                    'pass' => ['min' => 60, 'label' => 'مقبول', 'color' => 'orange'],
                    'fail' => ['min' => 0, 'label' => 'ضعيف', 'color' => 'red'],
                ],
                'allow_draft' => true,
            ],

            // ═══════════════════════════════════════════════════════════
            // School counselor — نموذج تقييم المرشد/المدرب (علم النفس في المدارس)
            // ═══════════════════════════════════════════════════════════
            [
                'name' => 'نموذج تقييم المرشد/المدرب — إرشاد مدرسي',
                'code' => 'counselor_evaluation',
                'applies_to' => 'school_counselor',
                'criteria' => [
                    ['id' => 'guidance_plan_comprehensive', 'label' => 'وضع خطة إرشادية متكاملة', 'description' => 'شمول الخطة وملاءمتها للبرنامج والمستفيدين', 'weight' => 7, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'collective_guidance_sessions', 'label' => 'تطبيق جلسات التوجيه الجمعي', 'description' => 'تصميم وتنفيذ جلسات التوجيه الجمعي', 'weight' => 7, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'individual_counseling_sessions', 'label' => 'تطبيق جلسات الإرشاد الفردي', 'description' => 'مهارات الجلسة الفردية والمتابعة', 'weight' => 7, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'group_counseling_sessions', 'label' => 'تطبيق جلسات الإرشاد الجماعي وإدارتها', 'description' => 'إدارة المجموعة والأنشطة الجماعية الإرشادية', 'weight' => 7, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'positive_relationships', 'label' => 'بناء علاقة إرشادية إيجابية مع عناصر المدرسة', 'description' => 'التواصل المهني مع الإدارة والكادر', 'weight' => 7, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'session_relationship_quality', 'label' => 'بناء علاقة ناجحة أثناء الجلسات', 'description' => 'الثقة والاحترام والحدود المهنية داخل الجلسة', 'weight' => 7, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'theory_application', 'label' => 'التوظيف الصحيح للنظريات الإرشادية', 'description' => 'ربط الممارسة بالمرجع النظري', 'weight' => 7, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'initiative', 'label' => 'المبادرة', 'description' => 'اقتراح وتنفيذ ما يخدم الإرشاد', 'weight' => 7, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'accepting_supervision', 'label' => 'تقبل التوجيهات', 'description' => 'الاستجابة لملاحظات المشرف والتحسن', 'weight' => 7, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'school_regulations', 'label' => 'الالتزام بأنظمة المدرسة', 'description' => 'السياسات والإجراءات المعتمدة', 'weight' => 7, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'counselee_problems', 'label' => 'التعامل مع مشكلات المسترشدين', 'description' => 'تحليل المشكلات والتدخل المناسب', 'weight' => 6, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'attendance_punctuality', 'label' => 'الالتزام بأوقات الحضور والمغادرة', 'description' => 'المواعيد والدوام التدريبي', 'weight' => 6, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'counseling_ethics', 'label' => 'الالتزام بأخلاقيات مهنة الإرشاد', 'description' => 'السرية والحدود والاحترام', 'weight' => 6, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'data_gathering_analysis', 'label' => 'جمع وتحليل البيانات', 'description' => 'جمع المعلومات وتحليلها لدعم القرار الإرشادي', 'weight' => 6, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'human_communication', 'label' => 'التواصل الإنساني', 'description' => 'أسلوب التواصل والتعاطف المهني', 'weight' => 6, 'scale' => [1, 2, 3, 4, 5]],
                ],
                'total_score' => 100,
                'score_ranges' => [
                    'excellent' => ['min' => 90, 'label' => 'ممتاز', 'color' => 'green'],
                    'very_good' => ['min' => 80, 'label' => 'جيد جداً', 'color' => 'blue'],
                    'good' => ['min' => 70, 'label' => 'جيد', 'color' => 'yellow'],
                    'pass' => ['min' => 60, 'label' => 'مقبول', 'color' => 'orange'],
                    'fail' => ['min' => 0, 'label' => 'ضعيف', 'color' => 'red'],
                ],
                'allow_draft' => true,
            ],

            // ═══════════════════════════════════════════════════════════
            // Clinical / institution supervisor — تقييم مشرف المؤسسة
            // ═══════════════════════════════════════════════════════════
            [
                'name' => 'نموذج تقييم مشرف المؤسسة — تدريب نفسي/مؤسسي',
                'code' => 'psychologist_evaluation',
                'applies_to' => 'psychologist',
                'criteria' => [
                    ['id' => 'task_planning', 'label' => 'بناء خطة لتنفيذ المهام المطلوبة بطريقة سليمة', 'description' => 'تنظيم المهام والأولويات', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'task_execution_portfolio', 'label' => 'تنفيذ المهمات وتوثيقها في ملف الإنجاز', 'description' => 'الإنجاز والتوثيق في الملف', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'supervisor_feedback_use', 'label' => 'الاستفادة من ملاحظات مشرف المؤسسة', 'description' => 'تطبيق التوجيهات والتحسن', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'info_gathering_diagnosis', 'label' => 'استخدام أدوات جمع المعلومات في التشخيص', 'description' => 'المقابلات والملاحظة والأدوات المساندة', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'intervention_methods', 'label' => 'استخدام أساليب التدخل المناسبة', 'description' => 'ملاءمة التدخل للحالة والإطار المؤسسي', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'counseling_skills_application', 'label' => 'تطبيق مهارات الإرشاد بشكل مناسب', 'description' => 'مهارات الجلسة والمتابعة', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'session_communication_language', 'label' => 'استخدام لغة تواصل مناسبة أثناء الجلسات', 'description' => 'الوضوح والاحترام والتعديل حسب الحالة', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'constructive_criticism', 'label' => 'تقبل النقد البناء', 'description' => 'الاستجابة للملاحظات دون دفاعية', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'professional_ethics', 'label' => 'الالتزام بأخلاقيات ممارسة المهنة', 'description' => 'السرية والحدود والاحترام', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'training_punctuality', 'label' => 'الالتزام بمواعيد التدريب والحضور والمغادرة', 'description' => 'الانضباط الزمني', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'session_documentation', 'label' => 'التوثيق المهني للجلسات', 'description' => 'Progress notes والسجلات المطلوبة', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'initiative', 'label' => 'المبادرة', 'description' => 'المبادرة دون انتظار تكليف دائم', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'theory_practice_link', 'label' => 'الربط بين النظري والعملي', 'description' => 'تطبيق المعرفة الأكاديمية ميدانيًا', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'multi_source_information', 'label' => 'جمع المعلومات من مصادر متعددة', 'description' => 'تكامل مصادر البيانات', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'responsibility', 'label' => 'تحمل المسؤولية', 'description' => 'المسؤولية عن المهام والمتابعة', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'institutional_goals_alignment', 'label' => 'العمل ضمن أهداف المؤسسة', 'description' => 'دعم أهداف الجهة التدريبية', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'tests_measures_use', 'label' => 'استخدام الاختبارات والمقاييس عند الحاجة', 'description' => 'الاختيار والتفسير المهني', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'psychological_report_writing', 'label' => 'كتابة التقارير النفسية', 'description' => 'الوضوح والدقة والاستنتاج', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'team_professional_relationship', 'label' => 'بناء علاقة مهنية مع طاقم العمل', 'description' => 'التعاون والاحترام المهني', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
                    ['id' => 'institution_rules_compliance', 'label' => 'الالتزام بأنظمة المؤسسة', 'description' => 'البروتوكولات والسياسات الداخلية', 'weight' => 5, 'scale' => [1, 2, 3, 4, 5]],
                ],
                'total_score' => 100,
                'score_ranges' => [
                    'excellent' => ['min' => 90, 'label' => 'ممتاز', 'color' => 'green'],
                    'very_good' => ['min' => 80, 'label' => 'جيد جداً', 'color' => 'blue'],
                    'good' => ['min' => 70, 'label' => 'جيد', 'color' => 'yellow'],
                    'pass' => ['min' => 60, 'label' => 'مقبول', 'color' => 'orange'],
                    'fail' => ['min' => 0, 'label' => 'ضعيف', 'color' => 'red'],
                ],
                'allow_draft' => true,
            ],
        ];

        foreach ($templates as $template) {
            FieldEvaluationTemplate::updateOrCreate(
                ['code' => $template['code']],
                array_merge($template, ['is_active' => true])
            );
        }
    }
}
