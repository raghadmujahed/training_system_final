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
       Schema::create('training_sites', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('location')->nullable();
    $table->string('phone')->nullable();
    $table->text('description')->nullable();
    $table->boolean('is_active')->default(true);
     $table->enum('directorate', ['وسط', 'شمال', 'جنوب', 'يطا'])
     ->nullable();
        $table->integer('capacity')->nullable();
        $table->index('is_active');
        $table->index('capacity');

        $table->enum('site_type', ['school', 'health_center'])->default('school');
            $table->enum('governing_body', ['directorate_of_education', 'ministry_of_health']);
    $table->timestamps();
    $table->softDeletes();

});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_sites');
    }
};
