<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * ربط اختياري بين التعيين وحساب «المشرف الميداني» (دور field_supervisor)
     * دون إلغاء teacher_id المستخدم للمعلم/المرشد/الأخصائي المعتمد من جهة التدريب.
     */
    public function up(): void
    {
        Schema::table('training_assignments', function (Blueprint $table) {
            $table->foreignId('field_supervisor_id')
                ->nullable()
                ->after('teacher_id')
                ->constrained('users')
                ->nullOnDelete();
            $table->index(['field_supervisor_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('training_assignments', function (Blueprint $table) {
            $table->dropForeign(['field_supervisor_id']);
        });
    }
};
