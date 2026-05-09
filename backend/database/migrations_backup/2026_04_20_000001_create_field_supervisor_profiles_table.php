<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * جدول بيانات المشرف الميداني والنوع الفرعي
     */
    public function up(): void
    {
        Schema::create('field_supervisor_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            
            // النوع الفرعي للمشرف الميداني
            $table->enum('supervisor_type', [
                'mentor_teacher',      // المعلم المرشد
                'school_counselor',    // المرشد التربوي/المدرسي
                'psychologist'         // الأخصائي النفسي
            ])->default('mentor_teacher');
            
            // مؤسسة العمل
            $table->string('workplace_name'); // اسم المدرسة أو المركز
            $table->string('workplace_type'); // مدرسة / مركز صحي / مجتمعي
            $table->string('department')->nullable(); // القسم أو التخصص
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            
            // الإعدادات
            $table->json('preferences')->nullable(); // إعدادات الواجهة
            $table->boolean('is_active')->default(true);
            
            $table->timestamps();
            
            $table->unique('user_id');
            $table->index('supervisor_type');
            $table->index('workplace_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('field_supervisor_profiles');
    }
};
