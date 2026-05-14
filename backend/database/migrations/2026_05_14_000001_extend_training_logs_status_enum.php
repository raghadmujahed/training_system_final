<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Extend the training_logs.status ENUM to include 'approved' and 'returned'
     * while preserving the existing 'reviewed' value for backward compatibility.
     *
     * Safe for MySQL — uses ALTER TABLE MODIFY COLUMN which does not truncate
     * existing rows as long as their current values are included in the new ENUM.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE training_logs MODIFY COLUMN status ENUM('draft','submitted','reviewed','approved','returned') NOT NULL DEFAULT 'draft'");
    }

    public function down(): void
    {
        // Before reverting, map any 'approved'/'returned' rows back to 'reviewed'
        // so we don't lose data when rolling back.
        DB::table('training_logs')
            ->whereIn('status', ['approved', 'returned'])
            ->update(['status' => 'reviewed']);

        DB::statement("ALTER TABLE training_logs MODIFY COLUMN status ENUM('draft','submitted','reviewed') NOT NULL DEFAULT 'draft'");
    }
};
