<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sections', function (Blueprint $table) {
            // Add missing columns if they don't exist
            if (! Schema::hasColumn('sections', 'capacity')) {
                $table->integer('capacity')->default(30)->after('name');
            }
            if (! Schema::hasColumn('sections', 'supervisor_id')) {
                $table->foreignId('supervisor_id')->nullable()->constrained('users')->onDelete('set null')->after('capacity');
            }
            if (! Schema::hasColumn('sections', 'created_by')) {
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->after('supervisor_id');
            }
        });

        if (Schema::hasColumn('sections', 'created_by')) {
            $fallbackUserId = DB::table('users')->orderBy('id')->value('id');

            DB::table('sections')
                ->whereNotNull('created_by')
                ->whereNotIn('created_by', DB::table('users')->select('id'))
                ->update(['created_by' => $fallbackUserId]);
        }

        if (! $this->indexExists('sections', 'sections_course_id_name_index')) {
            Schema::table('sections', function (Blueprint $table) {
                $table->index(['course_id', 'name']);
            });
        }

        if (! $this->indexExists('sections', 'sections_course_id_name_unique')) {
            Schema::table('sections', function (Blueprint $table) {
                $table->unique(['course_id', 'name']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sections', function (Blueprint $table) {
            if (Schema::hasColumn('sections', 'supervisor_id')) {
                $table->dropForeign(['supervisor_id']);
            }
            if (Schema::hasColumn('sections', 'created_by')) {
                $table->dropForeign(['created_by']);
            }
            if ($this->indexExists('sections', 'sections_course_id_name_unique')) {
                $table->dropUnique(['course_id', 'name']);
            }
            $table->dropColumn(array_values(array_filter(
                ['capacity', 'supervisor_id', 'created_by'],
                fn ($column) => Schema::hasColumn('sections', $column)
            )));
        });
    }

    private function indexExists(string $table, string $index): bool
    {
        return collect(Schema::getIndexes($table))->contains(fn ($existing) => ($existing['name'] ?? null) === $index);
    }
};
