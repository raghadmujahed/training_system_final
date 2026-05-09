<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * قوالب التقارير اليومية حسب نوع المشرف
     */
    public function up(): void
    {
        Schema::create('daily_report_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // اسم القالب
            $table->string('code')->unique(); // معرف فريد
            
            // النوع المستهدف
            $table->enum('applies_to', [
                'mentor_teacher',
                'school_counselor',
                'psychologist',
                'all' // للكل
            ]);
            
            // حقول القالب (JSON)
            $table->json('fields'); 
            /*
            [
                {
                    "name": "lesson_topic",
                    "label": "موضوع الدرس",
                    "type": "text",
                    "required": true
                },
                ...
            ]
            */
            
            // أنواع المرفقات المسموح بها
            $table->json('allowed_attachments')->nullable();
            /*
            ["pdf", "doc", "image"]
            */
            
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            
            $table->index('applies_to');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_report_templates');
    }
};
