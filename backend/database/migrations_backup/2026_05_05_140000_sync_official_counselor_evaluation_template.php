<?php

use App\Models\FieldEvaluationTemplate;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * مزامنة نموذج 9 — نموذج تقييم المرشد/ المدرب (٢٠ مؤشرًا) مع النص الرسمي.
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
        // لا نعيد نسخة قديمة تلقائياً
    }
};
