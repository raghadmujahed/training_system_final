<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
{
    Schema::create('activity_logs', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
        $table->string('action');
        $table->text('description')->nullable();
        $table->string('ip_address', 45)->nullable();
        $table->text('old_data')->nullable();
        $table->text('new_data')->nullable();
         $table->string('method')->nullable();
            $table->string('route')->nullable();
            $table->text('user_agent')->nullable();
        $table->timestamps();
        
        // فهارس
        $table->index('user_id');
        $table->index('created_at');
        $table->index('action');
    });
}

public function down()
{
    Schema::dropIfExists('activity_logs');
}
};
