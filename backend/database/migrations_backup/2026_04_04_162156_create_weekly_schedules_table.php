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
       Schema::create('weekly_schedules', function (Blueprint $table) {
    $table->id();

    // ربط الجدول بالمعلم
    $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');

    // يوم الدوام
    $table->enum('day', [
        'saturday',
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday'
    ]);

    // وقت بداية ونهاية الحصة/الدوام
    $table->time('start_time');
    $table->time('end_time');

    $table->foreignId('training_site_id')
    ->constrained('training_sites')
    ->onDelete('cascade');

    $table->unsignedBigInteger('submitted_by')->nullable();
    $table->foreign('submitted_by')->references('id')->on('users')->onDelete('set null');

    $table->timestamps();

    // منع تكرار نفس اليوم لنفس المعلم
    $table->unique(['teacher_id', 'day']);
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('weekly_schedules');
    }
};
