<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * الهجرة الأصلية تستخدم morphs('entity') → entity_type / entity_id
 * بينما النموذج والخدمات يستخدمان model_type / model_id.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('workflow_instances')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if (Schema::hasColumn('workflow_instances', 'entity_type')
            && Schema::hasColumn('workflow_instances', 'entity_id')
            && ! Schema::hasColumn('workflow_instances', 'model_type')) {
            if ($driver === 'mysql') {
                DB::statement('ALTER TABLE workflow_instances CHANGE entity_type model_type VARCHAR(255) NOT NULL');
                DB::statement('ALTER TABLE workflow_instances CHANGE entity_id model_id BIGINT UNSIGNED NOT NULL');
            } elseif ($driver === 'pgsql') {
                DB::statement('ALTER TABLE workflow_instances RENAME COLUMN entity_type TO model_type');
                DB::statement('ALTER TABLE workflow_instances RENAME COLUMN entity_id TO model_id');
            } else {
                Schema::table('workflow_instances', function (Blueprint $table) {
                    $table->renameColumn('entity_type', 'model_type');
                    $table->renameColumn('entity_id', 'model_id');
                });
            }
        }

        if (! Schema::hasColumn('workflow_instances', 'model_type')
            || ! Schema::hasColumn('workflow_instances', 'model_id')) {
            Schema::table('workflow_instances', function (Blueprint $table) {
                if (! Schema::hasColumn('workflow_instances', 'model_type')) {
                    $table->string('model_type')->nullable();
                }
                if (! Schema::hasColumn('workflow_instances', 'model_id')) {
                    $table->unsignedBigInteger('model_id')->nullable();
                }
            });
        }

        if (Schema::hasColumn('workflow_instances', 'initiated_by') && $driver === 'mysql') {
            try {
                DB::statement('ALTER TABLE workflow_instances MODIFY initiated_by BIGINT UNSIGNED NULL');
            } catch (\Throwable) {
                //
            }
        } elseif (Schema::hasColumn('workflow_instances', 'initiated_by') && $driver === 'pgsql') {
            try {
                DB::statement('ALTER TABLE workflow_instances ALTER COLUMN initiated_by DROP NOT NULL');
            } catch (\Throwable) {
                //
            }
        }

        if (Schema::hasTable('workflow_steps')
            && ! Schema::hasColumn('workflow_instances', 'current_step_id')) {
            Schema::table('workflow_instances', function (Blueprint $table) {
                $table->foreignId('current_step_id')->nullable()->constrained('workflow_steps')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        //
    }
};
