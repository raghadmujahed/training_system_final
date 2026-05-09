<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_eforms', function (Blueprint $table) {
            if (! Schema::hasColumn('student_eforms', 'title')) {
                $table->string('title')->nullable();
            }
            if (! Schema::hasColumn('student_eforms', 'payload')) {
                $table->json('payload')->nullable();
            }
        });

        // Migrate existing data if old columns exist
        if (Schema::hasColumn('student_eforms', 'form_type') && Schema::hasColumn('student_eforms', 'title')) {
            \DB::statement('UPDATE student_eforms SET title = form_type WHERE title IS NULL AND form_type IS NOT NULL');
        }
        if (Schema::hasColumn('student_eforms', 'data') && Schema::hasColumn('student_eforms', 'payload')) {
            \DB::statement('UPDATE student_eforms SET payload = data WHERE payload IS NULL AND data IS NOT NULL');
        }

        Schema::table('student_eforms', function (Blueprint $table) {
            if (Schema::hasColumn('student_eforms', 'form_type')) {
                $table->dropColumn('form_type');
            }
            if (Schema::hasColumn('student_eforms', 'data')) {
                $table->dropColumn('data');
            }
        });
    }

    public function down(): void
    {
        Schema::table('student_eforms', function (Blueprint $table) {
            if (! Schema::hasColumn('student_eforms', 'form_type')) {
                $table->string('form_type')->nullable();
            }
            if (! Schema::hasColumn('student_eforms', 'data')) {
                $table->json('data')->nullable();
            }
        });

        if (Schema::hasColumn('student_eforms', 'title') && Schema::hasColumn('student_eforms', 'form_type')) {
            \DB::statement('UPDATE student_eforms SET form_type = title WHERE form_type IS NULL AND title IS NOT NULL');
        }
        if (Schema::hasColumn('student_eforms', 'payload') && Schema::hasColumn('student_eforms', 'data')) {
            \DB::statement('UPDATE student_eforms SET data = payload WHERE data IS NULL AND payload IS NOT NULL');
        }

        Schema::table('student_eforms', function (Blueprint $table) {
            if (Schema::hasColumn('student_eforms', 'title')) {
                $table->dropColumn('title');
            }
            if (Schema::hasColumn('student_eforms', 'payload')) {
                $table->dropColumn('payload');
            }
        });
    }
};
