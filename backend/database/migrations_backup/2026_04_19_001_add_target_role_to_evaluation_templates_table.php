<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('evaluation_templates', function (Blueprint $table) {
            $table->string('target_role')->nullable()->after('form_type');
            // target_role values: teacher, academic_supervisor, psychologist, school_manager, null=generic
            $table->index('target_role');
        });
    }

    public function down(): void
    {
        Schema::table('evaluation_templates', function (Blueprint $table) {
            $table->dropIndex(['target_role']);
            $table->dropColumn('target_role');
        });
    }
};
