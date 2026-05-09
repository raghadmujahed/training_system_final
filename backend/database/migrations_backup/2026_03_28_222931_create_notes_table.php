<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
public function up(): void
{
    Schema::create('notes', function (Blueprint $table) {
        $table->id();

        $table->foreignId('user_id')
            ->constrained()
            ->onDelete('cascade');

        $table->foreignId('training_assignment_id')
            ->constrained()
            ->onDelete('cascade');

        $table->text('content');

        $table->timestamps();

        // =========================
        // INDEXES
        // =========================

        // عرض ملاحظات المستخدم
        $table->index('user_id');

        // عرض ملاحظات المهمة
        $table->index('training_assignment_id');

        // مهم جداً للترتيب الزمني (latest notes)
        $table->index('created_at');

        // فهرس مركب للاستعلامات الشائعة
        $table->index(['training_assignment_id', 'user_id']);
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notes');
    }
};