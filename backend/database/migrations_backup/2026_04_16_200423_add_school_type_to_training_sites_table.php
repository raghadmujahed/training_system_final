<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('training_sites', function (Blueprint $table) {
            $table->string('school_type')->default('public')->after('site_type');
        });
    }

    public function down(): void
    {
        Schema::table('training_sites', function (Blueprint $table) {
            $table->dropColumn('school_type');
        });
    }
};