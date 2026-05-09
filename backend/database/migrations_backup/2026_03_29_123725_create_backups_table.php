<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('backups', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();

            $table->string('type');
            $table->string('name');
            $table->string('file_path');
            $table->bigInteger('size')->nullable();
            $table->string('status')->default('success');
            $table->text('notes')->nullable();

            $table->timestamps();

            // =========================
            // INDEXES
            // =========================

            // المستخدم الذي أنشأ النسخة
            $table->index('user_id');

            // مهم للبحث حسب النوع
            $table->index('type');

            // مهم جداً لتتبع الحالات
            $table->index('status');

            // لتسريع عرض أحدث النسخ
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('backups');
    }
};