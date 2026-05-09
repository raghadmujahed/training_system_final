<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_requests', function (Blueprint $table) {
            $table->id();

            // الطالب مقدم الطلب (مرتبط بـ users)
$table->string('book_status')->default('draft');

            // التواريخ الخاصة بسير العمل
            $table->timestamp('sent_to_directorate_at')->nullable();
            $table->timestamp('directorate_approved_at')->nullable();

            $table->timestamp('sent_to_school_at')->nullable();
            $table->timestamp('school_approved_at')->nullable();
            // المدرسة/موقع التدريب
            $table->foreignId('training_site_id')->constrained()->cascadeOnDelete();

            // المساق المرتبط بالطلب (مثل تربية عملية 1)

            // تواريخ التدريب (تؤخذ من training_periods، ولكن يمكن تخزينها هنا للرجوع السريع)

            // حالة الطلب
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');

            // تاريخ تقديم الطلب
            $table->timestamp('requested_at')->useCurrent();

            // ملاحظات إضافية

            // سبب الرفض (يملأ عند رفض الطلب)
             $table->text('rejection_reason')->nullable();

             $table->string('letter_number')->nullable();
        $table->date('letter_date')->nullable();
        $table->foreignId('training_period_id')->nullable()->constrained();

            $table->timestamps();

            // ========== الفهارس ==========
            $table->index('training_site_id');
            $table->index('requested_at');

            // فهرس مركب للبحث السريع (موقع + حالة)
            $table->index(['training_site_id', 'status']);

            // فهرس مركب للمستخدم + الحالة (لجلب طلبات طالب معين)
            $table->index( 'status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_requests');
    }
};