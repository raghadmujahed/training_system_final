<?php

use App\Models\FieldEvaluationTemplate;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('field_evaluation_templates')) {
            return;
        }

        FieldEvaluationTemplate::syncOfficialMentorClassroomVisitForm6Template();
    }

    public function down(): void
    {
        //
    }
};
