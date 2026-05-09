<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * لقواعد MySQL أُنشئت قبل تصحيح هجرة student_portfolios — يجعل العمود يقبل NULL.
 * على SQLite نفّذ migrate:fresh إن ظهر خطأ في /my-portfolio.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('student_portfolios')) {
            return;
        }

        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        try {
            DB::statement('ALTER TABLE student_portfolios MODIFY training_assignment_id BIGINT UNSIGNED NULL');
        } catch (\Throwable $e) {
            // قد يكون مُعدّاً مسبقاً
        }
    }

    public function down(): void
    {
        //
    }
};
