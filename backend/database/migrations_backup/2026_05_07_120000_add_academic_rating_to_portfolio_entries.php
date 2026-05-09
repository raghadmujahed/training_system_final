<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('portfolio_entries', function (Blueprint $table) {
            if (! Schema::hasColumn('portfolio_entries', 'academic_rating')) {
                $table->unsignedTinyInteger('academic_rating')->nullable()->after('reviewer_note');
            }
        });
    }

    public function down(): void
    {
        Schema::table('portfolio_entries', function (Blueprint $table) {
            if (Schema::hasColumn('portfolio_entries', 'academic_rating')) {
                $table->dropColumn('academic_rating');
            }
        });
    }
};
