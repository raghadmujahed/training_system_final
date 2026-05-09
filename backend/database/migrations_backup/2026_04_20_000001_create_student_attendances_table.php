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
        Schema::create('student_attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // الطالب
            $table->foreignId('training_request_student_id')->nullable()->constrained('training_request_students')->onDelete('set null'); // رابط طلب التدريب
            $table->string('day'); // اليوم (السبت، الأحد...)
            $table->date('date'); // التاريخ
            $table->time('check_in'); // ساعة الحضور
            $table->time('check_out'); // ساعة المغادرة
            $table->integer('lessons_count')->nullable(); // عدد الحصص
            $table->text('notes')->nullable(); // ملاحظات
            $table->enum('status', ['present', 'absent', 'excused'])->default('present'); // حالة الحضور
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null'); // معتمد من
            $table->timestamp('approved_at')->nullable(); // تاريخ الاعتماد
            $table->timestamps();
            
            $table->index(['user_id', 'date']);
            $table->index(['training_request_student_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_attendances');
    }
};
