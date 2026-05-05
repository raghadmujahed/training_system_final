<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('field_evaluations', function (Blueprint $table) {
            $table->json('form_context')->nullable()->after('scores')->comment('بيانات رأس النماذج الوصفية (نموذج 6 وغيره)');
        });
    }

    public function down(): void
    {
        Schema::table('field_evaluations', function (Blueprint $table) {
            $table->dropColumn('form_context');
        });
    }
};
