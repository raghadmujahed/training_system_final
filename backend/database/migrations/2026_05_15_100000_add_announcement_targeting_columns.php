<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * إضافة حقل target_type لجدول الإعلانات + section_id لجدول الأهداف
 * - الإعلانات القديمة التي all_students=true تأخذ target_type='all_students'
 * - الإعلانات القديمة الأخرى تأخذ target_type='all_students' (سلوك آمن)
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1) إضافة target_type + target_student_id على جدول announcements
        Schema::table('announcements', function (Blueprint $table) {
            if (!Schema::hasColumn('announcements', 'target_type')) {
                $table->string('target_type', 30)->default('all_students')->after('all_students');
            }
            if (!Schema::hasColumn('announcements', 'target_student_id')) {
                $table->foreignId('target_student_id')->nullable()->after('target_type')
                      ->constrained('users')->nullOnDelete();
            }
        });

        // 2) إضافة section_id على announcement_targets (للاستهداف بالشعبة)
        Schema::table('announcement_targets', function (Blueprint $table) {
            if (!Schema::hasColumn('announcement_targets', 'section_id')) {
                $table->foreignId('section_id')->nullable()->after('department_id')
                      ->constrained('sections')->cascadeOnDelete();
            }
        });

        // 3) تعيين target_type للإعلانات القديمة
        DB::table('announcements')
            ->whereNull('target_type')
            ->orWhere('target_type', '')
            ->update(['target_type' => 'all_students']);
    }

    public function down(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            if (Schema::hasColumn('announcements', 'target_student_id')) {
                $table->dropForeign(['target_student_id']);
                $table->dropColumn('target_student_id');
            }
            if (Schema::hasColumn('announcements', 'target_type')) {
                $table->dropColumn('target_type');
            }
        });

        Schema::table('announcement_targets', function (Blueprint $table) {
            if (Schema::hasColumn('announcement_targets', 'section_id')) {
                $table->dropForeign(['section_id']);
                $table->dropColumn('section_id');
            }
        });
    }
};
