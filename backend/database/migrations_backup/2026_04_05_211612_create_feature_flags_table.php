<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('feature_flags', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();               // اسم الميزة/الصفحة (مثل 'training_requests.create')
            $table->string('display_name')->nullable();      // اسم قابل للقراءة (مثل 'تقديم طلبات التدريب')
            $table->boolean('is_open')->default(true);       // الحالة (مفتوحة/مغلقة)
            $table->text('description')->nullable();         // وصف
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('feature_flags');
    }
};