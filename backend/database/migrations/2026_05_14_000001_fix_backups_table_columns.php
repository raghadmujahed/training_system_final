<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fix backups table: the original migration used file_name/file_size/completed_at
 * but the model and controller use name/size/status.
 * Add the missing columns idempotently so Railway/production can run this safely.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('backups', function (Blueprint $table) {
            if (!Schema::hasColumn('backups', 'name')) {
                $table->string('name')->nullable()->after('type');
            }
            if (!Schema::hasColumn('backups', 'size')) {
                $table->bigInteger('size')->nullable()->after('name');
            }
            if (!Schema::hasColumn('backups', 'status')) {
                $table->string('status')->default('completed')->after('size');
            }
        });
    }

    public function down(): void
    {
        Schema::table('backups', function (Blueprint $table) {
            $table->dropColumnIfExists('name');
            $table->dropColumnIfExists('size');
            $table->dropColumnIfExists('status');
        });
    }
};
