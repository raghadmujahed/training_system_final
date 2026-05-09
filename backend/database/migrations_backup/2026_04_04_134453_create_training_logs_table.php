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
    {Schema::create('training_logs', function (Blueprint $table) {
    $table->id();
    $table->foreignId('training_assignment_id')->constrained()->onDelete('cascade');
    $table->date('log_date');
    $table->time('start_time')->nullable();
    $table->time('end_time')->nullable();
    $table->text('activities_performed')->nullable();      // الأنشطة المنفذة
    $table->text('supervisor_notes')->nullable();          // ملاحظات المعلم المرشد
    $table->text('student_reflection')->nullable();        // تأمل الطالب
    $table->enum('status', ['draft', 'submitted', 'approved', 'returned'])->default('draft');
    $table->timestamps();
    $table->unique(['training_assignment_id', 'log_date']);
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_logs');
    }
};
