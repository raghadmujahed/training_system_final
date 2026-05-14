<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds archived_at to training_periods so we can distinguish:
 *   - draft    : is_active = false, archived_at = null
 *   - active   : is_active = true,  archived_at = null
 *   - archived : is_active = false, archived_at = <timestamp>
 *
 * MySQL does NOT support partial unique indexes (WHERE clause), so we
 * enforce "only one active period" in application logic + a trigger-free
 * approach: the setActive controller method always deactivates others first
 * inside a transaction. No DB-level partial unique index is added here
 * because MySQL 8 does not support them on regular InnoDB tables.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('training_periods', function (Blueprint $table) {
            if (!Schema::hasColumn('training_periods', 'archived_at')) {
                $table->timestamp('archived_at')->nullable()->after('is_active');
                $table->index('archived_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('training_periods', function (Blueprint $table) {
            if (Schema::hasColumn('training_periods', 'archived_at')) {
                $table->dropIndex(['archived_at']);
                $table->dropColumn('archived_at');
            }
        });
    }
};
