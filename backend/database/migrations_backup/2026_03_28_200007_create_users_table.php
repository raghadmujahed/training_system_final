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

            $table->string('university_id')->unique()->index()->nullable();
            $table->string('name');
            $table->string('email')->nullable()->unique();
            $table->string('password');

            $table->timestamp('email_verified_at')->nullable();

            $table->enum('status', ['active', 'inactive', 'suspended'])
                ->default('active');


            // Department
            $table->unsignedBigInteger('department_id')->nullable();

            $table->foreignId('role_id')->constrained()->cascadeOnDelete();

            $table->foreign('department_id')
                ->references('id')
                ->on('departments')
                ->nullOnDelete();

            // Additional fields
            $table->string('phone')->nullable();

            $table->rememberToken();
            $table->softDeletes();
            $table->timestamps();

            // =========================
            // INDEXES (added section)
            // =========================
            $table->index('status');
            $table->index('department_id');
            $table->index('deleted_at');

            $table->index(['department_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};