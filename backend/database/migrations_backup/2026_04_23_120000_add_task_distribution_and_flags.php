<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->boolean('allow_resubmission')->default(false)->after('grading_weight');
            $table->boolean('is_required')->default(true)->after('allow_resubmission');
            $table->string('distribution_key')->nullable()->after('is_required')->index();
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn(['allow_resubmission', 'is_required', 'distribution_key']);
        });
    }
};
