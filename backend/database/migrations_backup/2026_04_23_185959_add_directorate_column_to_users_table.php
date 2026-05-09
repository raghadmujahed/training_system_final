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
        if (Schema::hasColumn('users', 'directorate')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->enum('directorate', ['وسط', 'شمال', 'جنوب', 'يطا'])
                ->nullable()
                ->after('training_site_id');
        });
    }

    /**
     * Reverse the migrations.
     */
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
