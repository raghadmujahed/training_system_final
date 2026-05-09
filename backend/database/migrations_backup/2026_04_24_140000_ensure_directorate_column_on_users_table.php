<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('users', 'directorate')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->string('directorate')->nullable()->after('training_site_id');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('users', 'directorate')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('directorate');
        });
    }
};
