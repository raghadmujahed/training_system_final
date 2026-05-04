<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * إضافة حقول تقييم المرشد الإرشادي
     */
    public function up(): void
    {
        Schema::table('field_evaluations', function (Blueprint $table) {
            $table->string('supervisor_name')->nullable()->after('general_notes')->comment('اسم المشرف التدريبي');
            $table->date('evaluation_date')->nullable()->after('supervisor_name')->comment('تاريخ التقييم');
        });
    }

    public function down(): void
    {
        Schema::table('field_evaluations', function (Blueprint $table) {
            $table->dropColumn(['supervisor_name', 'evaluation_date']);
        });
    }
};
