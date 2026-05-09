<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sections', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->year('academic_year');
            $table->enum('semester', ['first', 'second', 'summer']);
            $table->foreignId('course_id')->constrained()->onDelete('cascade');
            $table->foreignId('academic_supervisor_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('supervisor_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->integer('capacity')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->string('archived_period', 50)->nullable();
            $table->timestamps();
            $table->index(['academic_supervisor_id', 'semester', 'course_id'], 'sections_supervisor_sem_course_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sections');
    }
};
