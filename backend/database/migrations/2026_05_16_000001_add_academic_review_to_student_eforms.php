<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_eforms', function (Blueprint $table) {
            $table->text('academic_note')->nullable()->after('status');
            $table->boolean('needs_discussion')->default(false)->after('academic_note');
            $table->foreignId('academic_supervisor_id')->nullable()->after('needs_discussion')
                ->constrained('users')->nullOnDelete();
            $table->timestamp('academic_reviewed_at')->nullable()->after('academic_supervisor_id');
        });
    }

    public function down(): void
    {
        Schema::table('student_eforms', function (Blueprint $table) {
            $table->dropForeign(['academic_supervisor_id']);
            $table->dropColumn([
                'academic_note',
                'needs_discussion',
                'academic_supervisor_id',
                'academic_reviewed_at',
            ]);
        });
    }
};
