<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $tables = [
        'notifications',
        'announcements',
        'notes',
        'official_letters',
    ];

    public function up(): void
    {
        foreach ($this->tables as $tableName) {
            if (!Schema::hasTable($tableName)) {
                continue;
            }
            if (Schema::hasColumn($tableName, 'archived_at')) {
                continue;
            }
            Schema::table($tableName, function (Blueprint $table) {
                $table->timestamp('archived_at')->nullable()->index();
                $table->string('archived_period', 50)->nullable();
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $tableName) {
            if (!Schema::hasTable($tableName)) {
                continue;
            }
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (Schema::hasColumn($tableName, 'archived_at')) {
                    $table->dropColumn('archived_at');
                }
                if (Schema::hasColumn($tableName, 'archived_period')) {
                    $table->dropColumn('archived_period');
                }
            });
        }
    }
};
