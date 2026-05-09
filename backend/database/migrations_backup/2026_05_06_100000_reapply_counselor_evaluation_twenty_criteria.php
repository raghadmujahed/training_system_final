<?php

use App\Models\FieldEvaluationTemplate;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * إعادة تطبيق الـ ٢٠ بندًا لمن سبق وأن شغّل ترحيلاً قديماً أو لم تُحدَّث قاعدة البيانات.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('field_evaluation_templates')) {
            return;
        }

        FieldEvaluationTemplate::syncOfficialCounselorEvaluationTemplate();
    }

    public function down(): void
    {
        //
    }
};
