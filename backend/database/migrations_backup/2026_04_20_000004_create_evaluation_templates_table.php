<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * قوالب التقييم الميداني حسب نوع المشرف
     */
    public function up(): void
    {
        Schema::create('field_evaluation_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            
            $table->enum('applies_to', [
                'mentor_teacher',
                'school_counselor',
                'psychologist',
                'all'
            ]);
            
            // بنود التقييم
            $table->json('criteria');
            /*
            [
                {
                    "id": "commitment",
                    "label": "الالتزام والانضباط",
                    "weight": 20,
                    "scale": [1, 2, 3, 4, 5]
                },
                ...
            ]
            */
            
            // إعدادات التقييم
            $table->integer('total_score')->default(100);
            $table->json('score_ranges'); // نطاقات الدرجات
            /*
            {
                "excellent": {"min": 90, "label": "ممتاز"},
                "good": {"min": 80, "label": "جيد جداً"},
                ...
            }
            */
            
            $table->boolean('allow_draft')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index('applies_to');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('field_evaluation_templates');
    }
};
