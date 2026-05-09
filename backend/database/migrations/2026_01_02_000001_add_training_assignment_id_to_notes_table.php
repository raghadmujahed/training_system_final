<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->foreignId('training_assignment_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            $table->index('training_assignment_id');
        });
    }

    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->dropForeign(['training_assignment_id']);
            $table->dropIndex(['training_assignment_id']);
            $table->dropColumn('training_assignment_id');
        });
    }
};
