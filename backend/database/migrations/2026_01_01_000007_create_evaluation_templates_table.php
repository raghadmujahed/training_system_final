<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluation_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('form_type')->nullable();
            $table->enum('target_role', ['student', 'teacher', 'supervisor', 'field_supervisor'])->nullable();
            $table->string('department_key')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index('target_role');
            $table->index('form_type');
            $table->index('department_key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluation_templates');
    }
};
