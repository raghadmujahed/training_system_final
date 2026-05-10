<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->string('notable_type')->nullable()->change();
            $table->unsignedBigInteger('notable_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->string('notable_type')->nullable(false)->change();
            $table->unsignedBigInteger('notable_id')->nullable(false)->change();
        });
    }
};
