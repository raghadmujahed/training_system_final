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
 *
 * قواعد قديمة قد تفتقد عمود manager_id: نُضيفه هنا قبل إنشاء الـ FK.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('training_sites')) {
            if (! Schema::hasColumn('training_sites', 'manager_id')) {
                Schema::table('training_sites', function (Blueprint $table) {
                    $table->unsignedBigInteger('manager_id')->nullable()->index();
                });
            }

            if (Schema::hasColumn('training_sites', 'manager_id')
                && ! $this->foreignKeyExists('training_sites', 'training_sites_manager_id_foreign')) {
                Schema::table('training_sites', function (Blueprint $table) {
                    $table->foreign('manager_id')
                        ->references('id')
                        ->on('users')
                        ->nullOnDelete();
                });
            }
        }

        if (Schema::hasTable('users')
            && Schema::hasColumn('users', 'training_site_id')
            && Schema::hasTable('training_sites')
            && ! $this->foreignKeyExists('users', 'users_training_site_id_foreign')) {
            Schema::table('users', function (Blueprint $table) {
                $table->foreign('training_site_id')
                    ->references('id')
                    ->on('training_sites')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('users') && $this->foreignKeyExists('users', 'users_training_site_id_foreign')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropForeign(['training_site_id']);
            });
        }

        if (Schema::hasTable('training_sites') && $this->foreignKeyExists('training_sites', 'training_sites_manager_id_foreign')) {
            Schema::table('training_sites', function (Blueprint $table) {
                $table->dropForeign(['manager_id']);
            });
        }
    }

    private function foreignKeyExists(string $table, string $constraintName): bool
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return false;
        }

        $database = Schema::getConnection()->getDatabaseName();
        $row = Schema::getConnection()->selectOne(
            'SELECT 1 AS ok FROM information_schema.TABLE_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = ?
             LIMIT 1',
            [$database, $table, $constraintName, 'FOREIGN KEY']
        );

        return $row !== null;
    }
};
