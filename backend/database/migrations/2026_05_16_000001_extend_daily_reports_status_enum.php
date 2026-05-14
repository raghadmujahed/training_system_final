<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * إضافة القيمة returned إلى ENUM حالة daily_reports بشكل آمن.
 * الـ enum الحالي: draft, submitted, reviewed
 * الـ enum الجديد: draft, submitted, reviewed, returned
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('daily_reports')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement(
                "ALTER TABLE daily_reports MODIFY status ENUM('draft','submitted','reviewed','returned') NOT NULL DEFAULT 'draft'"
            );
        }
        // SQLite (testing): ENUM is stored as VARCHAR — no change needed
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            // تحويل returned → reviewed قبل تقليص الـ enum
            DB::table('daily_reports')->where('status', 'returned')->update(['status' => 'reviewed']);
            DB::statement(
                "ALTER TABLE daily_reports MODIFY status ENUM('draft','submitted','reviewed') NOT NULL DEFAULT 'draft'"
            );
        }
    }
};
