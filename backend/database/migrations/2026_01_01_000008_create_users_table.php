<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('university_id')->unique()->nullable();
            $table->string('name');
            $table->string('email')->unique()->nullable();
            $table->string('password');
            $table->timestamp('email_verified_at')->nullable();
            $table->enum('status', ['active', 'inactive', 'suspended'])->default('active');
            $table->string('phone')->nullable();
            $table->string('directorate')->nullable();
            $table->string('major')->nullable();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->foreignId('training_site_id')->nullable()->constrained()->nullOnDelete();
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
            $table->index('status');
            $table->index('department_id');
            $table->index('role_id');
            $table->index('training_site_id');
            $table->index('deleted_at');
            $table->index(['department_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
