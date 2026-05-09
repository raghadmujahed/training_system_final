<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->timestamp('submitted_to_manager_at')->nullable()->after('approved_at');
            $table->foreignId('submitted_to_manager_by')->nullable()->after('submitted_to_manager_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropForeign(['submitted_to_manager_by']);
            $table->dropColumn(['submitted_to_manager_at', 'submitted_to_manager_by']);
        });
    }
};
