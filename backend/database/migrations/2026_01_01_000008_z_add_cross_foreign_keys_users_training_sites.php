<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the circular foreign keys between users and training_sites
 * now that both tables exist:
 *   - training_sites.manager_id  → users.id  (nullOnDelete)
 *   - users.training_site_id     → training_sites.id (nullOnDelete)
 *
 * These FKs were intentionally omitted from the original create migrations
 * to avoid a circular dependency on migrate:fresh.
 */
return new class extends Migration
{
    public function up(): void
    {
        // training_sites.manager_id → users.id
        Schema::table('training_sites', function (Blueprint $table) {
            $table->foreign('manager_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
        });

        // users.training_site_id → training_sites.id
        Schema::table('users', function (Blueprint $table) {
            $table->foreign('training_site_id')
                ->references('id')
                ->on('training_sites')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['training_site_id']);
        });

        Schema::table('training_sites', function (Blueprint $table) {
            $table->dropForeign(['manager_id']);
        });
    }
};
