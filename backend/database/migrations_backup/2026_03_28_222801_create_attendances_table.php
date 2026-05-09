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
    Schema::create('attendances', function (Blueprint $table) {
        $table->id();

        $table->foreignId('training_assignment_id')
            ->constrained()
            ->onDelete('cascade');

        $table->foreignId('user_id')
            ->constrained()
            ->onDelete('cascade');

        $table->text('notes')->nullable();
        $table->date('date');
        $table->time('check_in')->nullable();
        $table->time('check_out')->nullable();
     ;
         $table->foreignId('approved_by')->nullable()->constrained('users');
    $table->timestamp('approved_at')->nullable();

        $table->enum('status', ['present', 'absent', 'late'])->default('present');

        $table->timestamps();

        // =========================
        // INDEXES
        // =========================

        // أهم فهرس لتقارير الحضور اليومي
        $table->index(['training_assignment_id', 'user_id', 'date']);

        // تسريع الفلترة حسب الحالة
        $table->index('status');

        // لو في تقارير زمنية
        $table->index('date');
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};