<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * قواعد موجودة: ENUM (planned, completed, cancelled) بينما التطبيق يستخدم scheduled.
 * يمنع MySQL 1265 "Data truncated for column status" عند الجدولة.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('supervisor_visits') || ! Schema::hasColumn('supervisor_visits', 'status')) {
            return;
        }

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE `supervisor_visits` MODIFY `status` VARCHAR(32) NOT NULL DEFAULT 'scheduled'");
        }

        DB::table('supervisor_visits')
            ->where('status', 'planned')
            ->update(['status' => 'scheduled']);
    }

    public function down(): void
    {
        if (! Schema::hasTable('supervisor_visits') || DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::table('supervisor_visits')
            ->where('status', 'scheduled')
            ->update(['status' => 'planned']);

        DB::statement("ALTER TABLE `supervisor_visits` MODIFY `status` ENUM('planned', 'completed', 'cancelled') NOT NULL DEFAULT 'planned'");
    }
};
