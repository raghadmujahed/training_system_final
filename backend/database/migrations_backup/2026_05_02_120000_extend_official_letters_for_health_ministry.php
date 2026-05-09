<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * دعم مسار وزارة الصحة في كتب official_letters (كان العمود type لا يقبل to_health_ministry).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE official_letters MODIFY COLUMN type ENUM('to_directorate','to_school','to_health_ministry') NOT NULL");

        DB::statement("ALTER TABLE official_letters MODIFY COLUMN status ENUM(
            'draft',
            'sent_to_directorate',
            'directorate_approved',
            'sent_to_school',
            'school_received',
            'completed',
            'rejected',
            'sent_to_health_ministry',
            'health_ministry_rejected'
        ) NOT NULL DEFAULT 'draft'");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        // تحذير: يفشل إن وُجدت صفوف بالقيم الجديدة
        DB::statement("ALTER TABLE official_letters MODIFY COLUMN type ENUM('to_directorate','to_school') NOT NULL");

        DB::statement("ALTER TABLE official_letters MODIFY COLUMN status ENUM(
            'draft',
            'sent_to_directorate',
            'directorate_approved',
            'sent_to_school',
            'school_received',
            'completed',
            'rejected'
        ) NOT NULL DEFAULT 'draft'");
    }
};
