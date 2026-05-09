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
        Schema::create('sections', function (Blueprint $table) {
    $table->id();
    $table->string('name'); // اسم الشعبة، مثلاً "شعبة 1"
    $table->year('academic_year');
  
    $table->foreignId('academic_supervisor_id')->constrained('users')->onDelete('cascade');

    $table->enum('semester', ['first', 'second', 'summer']);
      $table->foreignId('course_id')->constrained()->onDelete('cascade');
    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sections');
    }
};
