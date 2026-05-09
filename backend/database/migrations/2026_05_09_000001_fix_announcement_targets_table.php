<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcement_targets', function (Blueprint $table) {
            // Drop columns that the model doesn't use
            $table->dropForeign(['section_id']);
            $table->dropForeign(['training_site_id']);
            $table->dropColumn(['section_id', 'training_site_id', 'target_type', 'target_value']);

            // Add columns the model expects
            $table->foreignId('role_id')->nullable()->after('announcement_id')->constrained()->nullOnDelete();
            $table->foreignId('department_id')->nullable()->after('role_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('announcement_targets', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
            $table->dropForeign(['department_id']);
            $table->dropColumn(['role_id', 'department_id']);

            $table->foreignId('section_id')->nullable()->after('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('training_site_id')->nullable()->after('section_id')->constrained()->cascadeOnDelete();
            $table->enum('target_type', ['user', 'section', 'role', 'training_site', 'all'])->after('training_site_id');
            $table->string('target_value')->nullable()->after('target_type');
        });
    }
};
