<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    // database/migrations/..._create_courses_table.php
public function up()
{
    Schema::create('courses', function (Blueprint $table) {
        $table->id();
        $table->string('code')->unique();    // رمز المساق مثلاً EDUC310
        $table->string('name');              // اسم المساق
        $table->text('description')->nullable();
        $table->integer('credit_hours')->default(3);
        $table->enum('type', ['practical', 'theoretical', 'both'])->default('practical');
        $table->timestamps();
        $table->softDeletes();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('courses');
    }
};
