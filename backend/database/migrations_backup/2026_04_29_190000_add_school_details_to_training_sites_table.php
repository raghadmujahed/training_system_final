<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('training_sites', function (Blueprint $table) {
            $table->string('email')->nullable()->after('phone')->comment('بريد المدير الإلكتروني');
            $table->string('mobile')->nullable()->after('phone')->comment('رقم المحمول');
            $table->enum('gender_classification', ['boys', 'girls', 'mixed'])->nullable()->after('school_type')->comment('تصنيف المدرسة: ذكور/إناث/مختلطة');
            $table->enum('school_level', ['lower', 'upper'])->nullable()->after('gender_classification')->comment('مرحلة المدرسة: دنيا/عليا');
        });
    }

    public function down(): void
    {
        Schema::table('training_sites', function (Blueprint $table) {
            $table->dropColumn(['email', 'mobile', 'gender_classification', 'school_level']);
        });
    }
};
