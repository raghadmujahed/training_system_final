<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('section_students')) {
            Schema::table('section_students', function (Blueprint $table) {
                if (!Schema::hasColumn('section_students', 'archived_at')) {
                    $table->timestamp('archived_at')->nullable()->after('training_period_id');
                }
                if (!Schema::hasColumn('section_students', 'archived_period')) {
                    $table->string('archived_period')->nullable()->after('archived_at');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('section_students')) {
            Schema::table('section_students', function (Blueprint $table) {
                if (Schema::hasColumn('section_students', 'archived_at')) {
                    $table->dropColumn('archived_at');
                }
                if (Schema::hasColumn('section_students', 'archived_period')) {
                    $table->dropColumn('archived_period');
                }
            });
        }
    }
};
