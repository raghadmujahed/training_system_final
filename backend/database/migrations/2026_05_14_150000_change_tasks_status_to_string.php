<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * قواعد موجودة: تحويل tasks.status من ENUM إلى VARCHAR لتفادي MySQL 1265
 * عند استخدام قيم مثل pending / in_progress / graded مع تعريف ENUM أضيق في السيرفر.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('tasks')) {
            return;
        }

        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE `tasks` MODIFY `status` VARCHAR(32) NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        if (! Schema::hasTable('tasks')) {
            return;
        }

        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE `tasks` MODIFY `status` ENUM('draft','published','submitted','archived','pending') NOT NULL DEFAULT 'draft'");
    }
};
