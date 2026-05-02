<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('training_sites')->whereNull('capacity')->update(['capacity' => 3]);

        Schema::table('announcements', function (Blueprint $table) {
            if (! Schema::hasColumn('announcements', 'status')) {
                $table->string('status', 32)->default('active')->after('user_id');
            }
            if (! Schema::hasColumn('announcements', 'published_at')) {
                $table->timestamp('published_at')->nullable()->after('status');
            }
            if (! Schema::hasColumn('announcements', 'expires_at')) {
                $table->timestamp('expires_at')->nullable()->after('published_at');
            }
            if (! Schema::hasColumn('announcements', 'all_students')) {
                $table->boolean('all_students')->default(false)->after('expires_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            foreach (['all_students', 'expires_at', 'published_at', 'status'] as $col) {
                if (Schema::hasColumn('announcements', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
