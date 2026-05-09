<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('workflow_instances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workflow_template_id')->constrained();
            $table->morphs('model'); // يربط مع TrainingRequest
            $table->enum('status', ['in_progress', 'approved', 'rejected'])->default('in_progress');
            $table->unsignedBigInteger('current_step_id')->nullable(); // الخطوة الحالية
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('workflow_instances');
    }
};