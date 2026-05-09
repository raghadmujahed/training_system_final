<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('workflow_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workflow_template_id')->constrained()->onDelete('cascade');
            $table->string('step_name'); // مثلاً "موافقة منسق", "موافقة مديرية", "موافقة مدرسة"
            $table->integer('sequence'); // 1,2,3
            $table->foreignId('role_id')->constrained('roles'); // الدور المسؤول عن هذه الخطوة
            $table->boolean('is_required')->default(true);
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('workflow_steps');
    }
};