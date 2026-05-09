<?php
// MIGRATION ALREADY APPLIED - Skipped to avoid duplicate column error
// The directorate column already exists in users table

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
        // Skip - column already exists
        return;
        
        // Original code commented out - column already exists
        // Schema::table('users', function (Blueprint $table) {
        //     $table->enum('directorate', ['وسط', 'شمال', 'جنوب', 'يطا'])
        //         ->nullable()
        //         ->after('training_site_id');
        // });
    }

    public function down(): void
    {
        // Schema::table('users', function (Blueprint $table) {
        //     $table->dropColumn('directorate');
        // });
    }
};
