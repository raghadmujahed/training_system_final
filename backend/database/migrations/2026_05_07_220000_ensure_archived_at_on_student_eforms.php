<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('student_eforms')) {
            return;
        }
        if (!Schema::hasColumn('student_eforms', 'archived_at')) {
            Schema::table('student_eforms', function (Blueprint $table) {
                $table->timestamp('archived_at')->nullable()->index();
                $table->string('archived_period', 50)->nullable();
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('student_eforms')) {
            return;
        }
        Schema::table('student_eforms', function (Blueprint $table) {
            if (Schema::hasColumn('student_eforms', 'archived_at')) {
                $table->dropColumn('archived_at');
            }
            if (Schema::hasColumn('student_eforms', 'archived_period')) {
                $table->dropColumn('archived_period');
            }
        });
    }
};
