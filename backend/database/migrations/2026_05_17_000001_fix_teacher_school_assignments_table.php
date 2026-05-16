<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('teacher_school_assignments')) {
            Schema::create('teacher_school_assignments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('school_id')->constrained('training_sites')->cascadeOnDelete();
                $table->string('academic_year')->nullable();
                $table->date('start_date');
                $table->date('end_date')->nullable();
                $table->boolean('is_active')->default(true);
                $table->string('status')->default('active');
                $table->string('action_type')->nullable();
                $table->text('reason')->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('approved_at')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->index(['teacher_id', 'is_active'], 'tsa_teacher_active_idx');
                $table->index(['school_id', 'is_active'], 'tsa_school_active_idx');
                $table->index(['academic_year', 'is_active'], 'tsa_year_active_idx');
                $table->index(['status', 'created_at'], 'tsa_status_created_idx');
            });

            return;
        }

        Schema::table('teacher_school_assignments', function (Blueprint $table) {
            if (! Schema::hasColumn('teacher_school_assignments', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        $this->dropLegacyUniqueIndexes();
    }

    public function down(): void
    {
        if (! Schema::hasTable('teacher_school_assignments')) {
            return;
        }

        Schema::table('teacher_school_assignments', function (Blueprint $table) {
            if (Schema::hasColumn('teacher_school_assignments', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });
    }

    private function dropLegacyUniqueIndexes(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        $legacy = ['tsa_teacher_school_active_unique', 'tsa_teacher_active_unique'];

        if ($driver === 'mysql') {
            foreach ($legacy as $indexName) {
                $exists = DB::select(
                    'SHOW INDEX FROM teacher_school_assignments WHERE Key_name = ?',
                    [$indexName]
                );
                if (! empty($exists)) {
                    DB::statement("ALTER TABLE teacher_school_assignments DROP INDEX `{$indexName}`");
                }
            }

            return;
        }

        if ($driver === 'pgsql') {
            foreach ($legacy as $indexName) {
                DB::statement("DROP INDEX IF EXISTS {$indexName}");
            }
        }
    }
};
