<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * يتوافق الجدول مع FieldSupervisorProfile و UserService::syncFieldSupervisorProfile.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('field_supervisor_profiles')) {
            return;
        }

        Schema::table('field_supervisor_profiles', function (Blueprint $table) {
            if (! Schema::hasColumn('field_supervisor_profiles', 'workplace_name')) {
                $table->string('workplace_name')->nullable();
            }
            if (! Schema::hasColumn('field_supervisor_profiles', 'workplace_type')) {
                $table->string('workplace_type')->nullable();
            }
            if (! Schema::hasColumn('field_supervisor_profiles', 'department')) {
                $table->string('department')->nullable();
            }
            if (! Schema::hasColumn('field_supervisor_profiles', 'address')) {
                $table->text('address')->nullable();
            }
            if (! Schema::hasColumn('field_supervisor_profiles', 'preferences')) {
                $table->json('preferences')->nullable();
            }
        });
    }

    public function down(): void
    {
        //
    }
};
