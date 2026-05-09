<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * إشعارات Laravel (Notifiable + قناة database) تُدرج notifiable_type / notifiable_id / data
 * دون user_id ولا title. الهجرة الأولى جعلت title إلزامياً فيسبب SQLSTATE 1364.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('notifications')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            try {
                Schema::table('notifications', function (Blueprint $table) {
                    $table->dropForeign(['user_id']);
                });
            } catch (\Throwable) {
                //
            }
            DB::statement('ALTER TABLE notifications MODIFY user_id BIGINT UNSIGNED NULL');
            DB::statement('ALTER TABLE notifications MODIFY title VARCHAR(255) NULL');
            try {
                Schema::table('notifications', function (Blueprint $table) {
                    $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
                });
            } catch (\Throwable) {
                //
            }

            return;
        }

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE notifications ALTER COLUMN user_id DROP NOT NULL');
            DB::statement('ALTER TABLE notifications ALTER COLUMN title DROP NOT NULL');

            return;
        }

        // sqlite وغيره: محاولة عبر المخطط
        try {
            Schema::table('notifications', function (Blueprint $table) {
                if (Schema::hasColumn('notifications', 'user_id')) {
                    $table->unsignedBigInteger('user_id')->nullable()->change();
                }
                if (Schema::hasColumn('notifications', 'title')) {
                    $table->string('title')->nullable()->change();
                }
            });
        } catch (\Throwable) {
            //
        }
    }

    public function down(): void
    {
        // لا نعيد NOT NULL لتجنب كسر صفوف أرسلتها قناة Laravel
    }
};
