<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * - توسيع applies_to لقوالب التقييم الميداني (mentor_teacher / school_counselor / psychologist)
 * - تصحيح المفتاح الأجنبي لـ field_evaluations.template_id → field_evaluation_templates
 * - إكمال أعمدة daily_report_templates المتوقعة من النماذج والسيدر
 * - جعل target_role في evaluation_templates نصياً لدعم academic_supervisor / psychologist / adviser
 */
return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if (Schema::hasTable('field_evaluation_templates') && Schema::hasColumn('field_evaluation_templates', 'applies_to')) {
            if ($driver === 'mysql') {
                DB::statement('ALTER TABLE field_evaluation_templates MODIFY applies_to VARCHAR(40) NOT NULL DEFAULT \'all\'');
            } elseif ($driver === 'pgsql') {
                DB::statement('ALTER TABLE field_evaluation_templates ALTER COLUMN applies_to TYPE VARCHAR(40) USING applies_to::text');
            }
        }

        if (Schema::hasTable('field_evaluations') && Schema::hasColumn('field_evaluations', 'template_id')) {
            try {
                Schema::table('field_evaluations', function (Blueprint $table) {
                    $table->dropForeign(['template_id']);
                });
            } catch (\Throwable) {
                // قد لا يوجد مفتاح أجنبي أو اسمه مختلف
            }

            DB::table('field_evaluations')->whereNotNull('template_id')->update(['template_id' => null]);

            Schema::table('field_evaluations', function (Blueprint $table) {
                $table->foreign('template_id')
                    ->references('id')
                    ->on('field_evaluation_templates')
                    ->nullOnDelete();
            });
        }

        if (Schema::hasTable('daily_report_templates')) {
            Schema::table('daily_report_templates', function (Blueprint $table) {
                if (! Schema::hasColumn('daily_report_templates', 'code')) {
                    $table->string('code')->nullable()->unique();
                }
                if (! Schema::hasColumn('daily_report_templates', 'applies_to')) {
                    $table->string('applies_to', 40)->nullable()->index();
                }
                if (! Schema::hasColumn('daily_report_templates', 'allowed_attachments')) {
                    $table->json('allowed_attachments')->nullable();
                }
                if (! Schema::hasColumn('daily_report_templates', 'sort_order')) {
                    $table->integer('sort_order')->default(0);
                }
            });
        }

        if (Schema::hasTable('evaluation_templates') && Schema::hasColumn('evaluation_templates', 'target_role')) {
            if ($driver === 'mysql') {
                DB::statement('ALTER TABLE evaluation_templates MODIFY target_role VARCHAR(64) NULL');
            } elseif ($driver === 'pgsql') {
                DB::statement('ALTER TABLE evaluation_templates ALTER COLUMN target_role TYPE VARCHAR(64) USING target_role::text');
            }
        }
    }

    public function down(): void
    {
        // لا نعيد enum القديمة لتفادي فقدان بيانات
    }
};
