<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('workflow_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // مثلاً "طلب تدريب"
            $table->string('model_type'); // App\Models\TrainingRequest
            $table->integer('version')->default(1);
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('workflow_templates');
    }
};