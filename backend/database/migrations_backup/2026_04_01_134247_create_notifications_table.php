<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
       Schema::create('notifications', function (Blueprint $table) {
    $table->id();

    $table->foreignId('user_id')
        ->constrained('users')
        ->onDelete('cascade');

    $table->string('type');
    $table->text('message');

    $table->morphs('notifiable');

    $table->timestamp('read_at')->nullable();
    $table->json('data')->nullable();

    $table->timestamps();

    $table->index('user_id');
    $table->index('type');
    $table->index('read_at');
    $table->index('created_at');
});
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};