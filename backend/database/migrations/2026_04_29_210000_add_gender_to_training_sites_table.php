<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('training_sites', function (Blueprint $table) {
            $table->enum('gender', ['male', 'female', 'mixed'])->nullable()->after('school_type');
        });
    }

    public function down(): void
    {
        Schema::table('training_sites', function (Blueprint $table) {
            $table->dropColumn('gender');
        });
    }
};
