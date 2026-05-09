<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            Schema::create('student_eforms_new', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('form_key');
                $table->string('title');
                $table->json('payload')->nullable();
                $table->string('status')->default('draft');
                $table->timestamp('submitted_at')->nullable();
                $table->timestamp('archived_at')->nullable()->index();
                $table->string('archived_period', 50)->nullable();
                $table->timestamps();
                $table->index(['user_id', 'form_key'], 'eforms_user_formkey_idx');
                $table->index(['user_id', 'status']);
            });

            DB::statement('INSERT INTO student_eforms_new SELECT * FROM student_eforms');
            Schema::drop('student_eforms');
            DB::statement('ALTER TABLE student_eforms_new RENAME TO student_eforms');
        } else {
            Schema::table('student_eforms', function (Blueprint $table) {
                $table->dropUnique(['user_id', 'form_key']);
                $table->index(['user_id', 'form_key'], 'eforms_user_formkey_idx');
            });
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            Schema::create('student_eforms_old', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('form_key');
                $table->string('title');
                $table->json('payload')->nullable();
                $table->string('status')->default('draft');
                $table->timestamp('submitted_at')->nullable();
                $table->timestamp('archived_at')->nullable()->index();
                $table->string('archived_period', 50)->nullable();
                $table->timestamps();
                $table->unique(['user_id', 'form_key']);
                $table->index(['user_id', 'status']);
            });

            DB::statement('INSERT INTO student_eforms_old SELECT * FROM student_eforms');
            Schema::drop('student_eforms');
            DB::statement('ALTER TABLE student_eforms_old RENAME TO student_eforms');
        } else {
            Schema::table('student_eforms', function (Blueprint $table) {
                $table->dropIndex('eforms_user_formkey_idx');
                $table->unique(['user_id', 'form_key']);
            });
        }
    }
};
