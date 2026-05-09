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
       Schema::create('enrollments', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->onDelete('cascade');
    $table->foreignId('section_id')->constrained()->onDelete('cascade');
    $table->year('academic_year');
    $table->enum('semester', ['first', 'second', 'summer']);
    $table->enum('status', ['active', 'dropped', 'completed'])->default('active');
    $table->decimal('final_grade', 5, 2)->nullable();
    $table->timestamps();
    
    $table->unique(['user_id', 'section_id', 'academic_year', 'semester']);
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('enrollments');
    }
};
