<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * الجدول الأصلي يفتقد letter_date وحقولاً أخرى يملأها النموذج والخدمات؛
 * subject كان NOT NULL بينما OfficialLetter::create لا يمرره.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('official_letters')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        Schema::table('official_letters', function (Blueprint $table) {
            if (! Schema::hasColumn('official_letters', 'letter_date')) {
                $table->date('letter_date')->nullable();
            }
            if (! Schema::hasColumn('official_letters', 'file_path')) {
                $table->string('file_path')->nullable();
            }
            if (! Schema::hasColumn('official_letters', 'rejection_reason')) {
                $table->text('rejection_reason')->nullable();
            }
        });

        if (Schema::hasColumn('official_letters', 'subject') && $driver === 'mysql') {
            DB::statement('ALTER TABLE official_letters MODIFY subject VARCHAR(255) NULL');
        } elseif (Schema::hasColumn('official_letters', 'subject') && $driver === 'pgsql') {
            DB::statement('ALTER TABLE official_letters ALTER COLUMN subject DROP NOT NULL');
        } elseif (Schema::hasColumn('official_letters', 'subject')) {
            try {
                Schema::table('official_letters', function (Blueprint $table) {
                    $table->string('subject')->nullable()->change();
                });
            } catch (\Throwable) {
                //
            }
        }
    }

    public function down(): void
    {
        //
    }
};
